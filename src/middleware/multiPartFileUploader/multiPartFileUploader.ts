import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import fs from 'fs-extra';
import path from 'path';
import { Schema } from 'express-validator';
import { reportDebug, reportError } from 'utils';
import { WebError } from 'entities/WebError';
import { validate } from './validate';
import { MultiPartFileUploaderConfig } from './multiPartFileUploader.types';
import bytes from 'bytes';

const namespace = 'engine:middleware:multiPartFileUploader';

const TEMP_DIR: string = path.join(
  process.env.FILE_STORAGE_FOLDER || './uploads',
  'temp_chunks'
);
const FILE_DIR: string = path.join(
  process.env.FILE_STORAGE_FOLDER || './uploads',
  'completed_files'
);

// The folders are created when an upload arrives, not when the engine loads: a service that never
// uploads files must not need write access to its working directory.

const storage = multer.memoryStorage();

/** Default maximum size of a single chunk when no limit is configured */
const DEFAULT_MAX_CHUNK_SIZE = 32 * 1024 * 1024;
/** Maximum number of chunks a single upload can be split into */
const MAX_CHUNKS = Number(process.env.UPLOAD_MAX_CHUNKS) || 10000;
/** Upload session IDs are restricted to a safe charset so they can be used as a folder name */
const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/** Check that a client supplied file name cannot escape its destination folder */
function isSafeFilename(filename: string): boolean {
  return (
    filename.length > 0 &&
    filename.length <= 255 &&
    filename !== '.' &&
    filename !== '..' &&
    !/[/\\\0]/.test(filename) &&
    path.basename(filename) === filename
  );
}

export function multiPartFileUploader(
  filesOption: MultiPartFileUploaderConfig,
  validator: Schema
) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      reportDebug({ namespace, message: 'Starting file upload middleware' });

      // Bound the size of a single chunk held in memory
      const chunkSizeLimit =
        (filesOption?.maxSize && bytes(filesOption.maxSize)) ||
        (process.env.UPLOAD_MAX_SIZE && bytes(process.env.UPLOAD_MAX_SIZE)) ||
        DEFAULT_MAX_CHUNK_SIZE;
      const uploadSingle = multer({
        storage,
        limits: { fileSize: chunkSizeLimit, files: 1 }
      }).single('file');
      uploadSingle(req, res, async (err) => {
        if (
          (err as { code?: string } | undefined)?.code === 'LIMIT_FILE_SIZE'
        ) {
          return next(
            new WebError({
              statusCode: 413,
              errorCode: 'chunk-too-large',
              message: 'Uploaded chunk exceeds the maximum allowed size',
              data: { maxSize: chunkSizeLimit }
            })
          );
        }
        if (err) {
          reportError('Error uploading chunk');
          return next(
            new WebError({
              statusCode: 500,
              errorCode: 'upload-failed',
              message: 'Error uploading file chunk',
              data: { error: err.message }
            })
          );
        }

        try {
          reportDebug({ namespace, message: 'Validating request' });
          await validate(req, validator);
        } catch (error) {
          reportDebug({
            namespace,
            message: 'Validation failed',
            data: { error }
          });
          return next(
            new WebError({
              statusCode: 400,
              errorCode: 'validation-failed',
              message: 'Validation failed for file upload',
              data: { error: (error as Error).message }
            })
          );
        }

        const { filename, totalChunks, chunkIndex, uniqueID } = req.body;
        reportDebug({
          namespace,
          message: 'Received chunk data',
          data: { filename, totalChunks, chunkIndex, uniqueID }
        });

        if (
          !filename ||
          !totalChunks ||
          chunkIndex === undefined ||
          !uniqueID ||
          !req.file
        ) {
          return next(
            new WebError({
              statusCode: 400,
              errorCode: 'missing-field',
              message: 'Missing required fields',
              data: {
                filename,
                totalChunks,
                chunkIndex,
                uniqueID,
                receivedChunk: !!req.file
              }
            })
          );
        }

        // Client supplied values are used to build file system paths, they must be strictly validated
        // to prevent path traversal (e.g. uniqueID="../../etc") and resource exhaustion
        const chunkIndexNum = Number(chunkIndex);
        const totalChunksNum = Number(totalChunks);
        if (
          typeof uniqueID !== 'string' ||
          !SAFE_ID_PATTERN.test(uniqueID) ||
          typeof filename !== 'string' ||
          !isSafeFilename(filename) ||
          !Number.isInteger(totalChunksNum) ||
          totalChunksNum < 1 ||
          totalChunksNum > MAX_CHUNKS ||
          !Number.isInteger(chunkIndexNum) ||
          chunkIndexNum < 0 ||
          chunkIndexNum >= totalChunksNum
        ) {
          return next(
            new WebError({
              statusCode: 400,
              errorCode: 'invalid-field',
              message: 'Invalid chunk upload parameters',
              data: { filename, totalChunks, chunkIndex, uniqueID }
            })
          );
        }

        if (
          filesOption?.maxSize &&
          req.file.size > (bytes(filesOption.maxSize) || 0)
        ) {
          return next(
            new WebError({
              statusCode: 400,
              errorCode: 'chunk-too-large',
              message: 'Uploaded chunk exceeds the maximum allowed size',
              data: {
                maxSize: filesOption.maxSize,
                receivedSize: req.file.size
              }
            })
          );
        }

        const sessionFolder = path.join(TEMP_DIR, uniqueID);
        fs.ensureDirSync(sessionFolder);
        const chunkPath = path.join(
          sessionFolder,
          `${filename}.part${chunkIndexNum}`
        );

        try {
          reportDebug({
            namespace,
            message: 'Writing chunk to disk',
            data: { chunkPath }
          });
          await fs.writeFile(chunkPath, req.file.buffer);
        } catch (writeErr) {
          return next(
            new WebError({
              statusCode: 500,
              errorCode: 'chunk-write-failed',
              message: 'Failed to write chunk',
              data: { chunkIndex, error: (writeErr as Error).message }
            })
          );
        }

        const uploadedChunks = await fs.readdir(sessionFolder);
        reportDebug({
          namespace,
          message: 'Uploaded chunk count',
          data: { uploadedChunks: uploadedChunks.length, totalChunks }
        });

        if (uploadedChunks.length === totalChunksNum) {
          try {
            fs.ensureDirSync(FILE_DIR);
            const finalFilePath = path.join(
              FILE_DIR,
              `${uniqueID}_${filename}`
            );
            await mergeChunks(
              filename,
              totalChunks,
              sessionFolder,
              finalFilePath
            );
            req.multipartFile = {
              isPending: false,
              originalname: filename,
              uniqueID,
              filePath: finalFilePath
            };
          } catch (mergeErr) {
            return next(
              new WebError({
                statusCode: 500,
                errorCode: 'file-merge-failed',
                message: 'Error merging file chunks',
                data: { error: (mergeErr as Error).message }
              })
            );
          }
          return next();
        }

        req.multipartFile = {
          isPending: true,
          originalname: filename,
          uniqueID,
          chunkIndex,
          totalChunks
        };
        next();
      });
    } catch (error) {
      next(
        new WebError({
          statusCode: 500,
          errorCode: 'unexpected-error',
          message: 'Unexpected error in file upload',
          data: { error: (error as Error).message }
        })
      );
    }
  };
}

async function mergeChunks(
  filename: string,
  totalChunks: string | number,
  sessionFolder: string,
  finalFilePath: string
): Promise<void> {
  const writeStream = fs.createWriteStream(finalFilePath);
  reportDebug({
    namespace,
    message: 'Merging file chunks',
    data: { finalFilePath }
  });

  const totalChunksNum = parseInt(totalChunks as string, 10);
  const chunks: Buffer[] = [];

  // Read all chunks into memory first
  for (let i = 0; i < totalChunksNum; i++) {
    const partPath = path.join(sessionFolder, `${filename}.part${i}`);
    try {
      const chunkData = await fs.readFile(partPath);
      chunks.push(chunkData);
    } catch (error) {
      // Cleanup on error
      await fs
        .remove(sessionFolder)
        .catch((cleanupErr: Error) =>
          reportError(
            `Error cleaning up folder ${sessionFolder}: ${cleanupErr.message}`
          )
        );
      throw new WebError({
        statusCode: 500,
        errorCode: 'chunk-read-failed',
        message: `Error reading chunk ${i}`,
        data: { error: (error as Error).message }
      });
    }
  }

  // Write all chunks sequentially
  for (const chunkData of chunks) {
    writeStream.write(chunkData);
  }

  // Remove temp files
  for (let i = 0; i < totalChunksNum; i++) {
    const partPath = path.join(sessionFolder, `${filename}.part${i}`);
    fs.remove(partPath).catch((err: Error) =>
      reportError(`Error removing part ${partPath}: ${err.message}`)
    );
  }

  writeStream.end();
  return new Promise<void>((resolve, reject) => {
    writeStream.on('finish', () => {
      // Clean up temp folder after successful merge
      fs.remove(sessionFolder)
        .then(() => resolve(undefined))
        .catch((cleanupErr: Error) => {
          reportError(
            `Error cleaning up temp folder ${sessionFolder}: ${cleanupErr.message}`
          );
          resolve(undefined); // Don't fail the merge if cleanup fails
        });
    });
    writeStream.on('error', (error) => {
      // Cleanup on write error
      fs.remove(sessionFolder).catch((cleanupErr: Error) =>
        reportError(
          `Error cleaning up folder after write error: ${cleanupErr.message}`
        )
      );
      reject(
        new WebError({
          statusCode: 500,
          errorCode: 'file-merge-error',
          message: 'Error merging file chunks',
          data: { error: (error as Error).message }
        })
      );
    });
  });
}
