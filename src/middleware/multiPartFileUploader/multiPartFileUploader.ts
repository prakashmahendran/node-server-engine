import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import fs from 'fs-extra';
import path from 'path';
import { Schema } from 'express-validator';
import { reportDebug, reportError } from 'utils';
import { WebError } from 'entities/WebError';
import { validate } from './validate';
import { MultiPartFileUploaderConfig } from './multiPartFileUploader.types';

const namespace = 'engine:middleware:multiPartFileUploader';

const TEMP_DIR: string = path.join(
  process.env.FILE_STORAGE_FOLDER || './uploads',
  'temp_chunks'
);
const FILE_DIR: string = path.join(
  process.env.FILE_STORAGE_FOLDER || './uploads',
  'completed_files'
);

fs.ensureDirSync(FILE_DIR);
fs.ensureDirSync(TEMP_DIR);

const storage = multer.memoryStorage();

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

      const uploadSingle = multer({ storage }).single('file');
      uploadSingle(req, res, async (err) => {
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

        if (
          filesOption?.maxSize &&
          req.file.size > parseInt(filesOption?.maxSize, 10)
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
          `${filename}.part${chunkIndex}`
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

        if (uploadedChunks.length === parseInt(totalChunks, 10)) {
          try {
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

  for (let i = 0; i < parseInt(totalChunks as string, 10); i++) {
    const partPath = path.join(sessionFolder, `${filename}.part${i}`);
    try {
      const chunkData = await fs.readFile(partPath);
      writeStream.write(chunkData);
    } catch (error) {
      throw new WebError({
        statusCode: 500,
        errorCode: 'chunk-read-failed',
        message: `Error reading chunk ${i}`,
        data: { error: (error as Error).message }
      });
    }
    fs.remove(partPath).catch((err: Error) =>
      reportError(`Error removing part ${partPath}: ${err.message}`)
    );
  }

  writeStream.end();
  return new Promise<void>((resolve, reject) => {
    writeStream.on('finish', () => resolve(undefined));
    writeStream.on('error', (error) =>
      reject(
        new WebError({
          statusCode: 500,
          errorCode: 'file-merge-error',
          message: 'Error merging file chunks',
          data: { error: (error as Error).message }
        })
      )
    );
  });
}
