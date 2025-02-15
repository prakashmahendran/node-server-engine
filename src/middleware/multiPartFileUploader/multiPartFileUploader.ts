import express from 'express';
import multer from 'multer';
import fs from 'fs-extra';
import path from 'path';
import { reportDebug, reportError } from 'utils';

const TEMP_DIR: string =
  process.env.TEMP_CHUNK_FOLDER || './uploads/temp_chunks';

const namespace = 'engine:middleware:multiPartFileUploader';

fs.ensureDirSync(TEMP_DIR);

const storage = multer.memoryStorage();

async function multiPartFileUploader(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  try {
    const uploadSingle = multer({ storage }).single('file');

    uploadSingle(req, res, async (err) => {
      if (err) {
        reportError('Error uploading chunk');
        return next(err);
      }

      const { filename, totalChunks, chunkIndex, uniqueID } = req.body;

      if (
        !filename ||
        !totalChunks ||
        chunkIndex === undefined ||
        !uniqueID ||
        !req.file
      ) {
        req.body.uploadDetails = {
          status: 'failed',
          message: 'Missing required fields',
          details: {
            filename,
            totalChunks,
            chunkIndex,
            uniqueID,
            receivedChunk: !!req.file
          }
        };
        reportDebug({
          namespace,
          message: `Missing required fields`,
          data: {
            status: 'failed',
            details: {
              filename,
              totalChunks,
              chunkIndex,
              uniqueID
            }
          }
        });
        return next();
      }

      const sessionFolder = path.join(TEMP_DIR, uniqueID);
      fs.ensureDirSync(sessionFolder);

      const chunkPath = path.join(
        sessionFolder,
        `${filename}.part${chunkIndex}`
      );

      try {
        await fs.writeFile(chunkPath, req.file.buffer);
      } catch (writeErr) {
        reportError(
          `Failed to write chunk ${chunkIndex}: ${(writeErr as Error).message}`
        );
        return next(writeErr);
      }

      const uploadedChunks = await fs.readdir(sessionFolder);

      if (uploadedChunks.length === parseInt(totalChunks, 10)) {
        reportDebug({
          namespace,
          message: `All chunks uploaded. Merging file...`
        });

        try {
          await mergeChunks(filename, totalChunks, sessionFolder);
        } catch (mergeErr) {
          reportError(`File merging failed: ${(mergeErr as Error).message}`);
          return next(mergeErr);
        }

        const finalFilePath = path.join(sessionFolder, filename);

        if (!fs.existsSync(finalFilePath)) {
          reportError('File merging failed: File does not exist');
          return next(new Error('File merging failed'));
        }

        req.body.uploadDetails = {
          status: 'completed',
          message: 'File uploaded and merged successfully',
          details: { filename, uniqueID }
        };
        reportDebug({
          namespace,
          message: `File merged successfully`,
          data: {
            status: 'completed',
            details: { filename, uniqueID }
          }
        });

        return next();
      }

      reportDebug({
        namespace,
        message: `Chunk uploaded successfully`,
        data: {
          filename,
          uniqueID,
          chunkIndex,
          totalChunks
        }
      });

      req.body.uploadDetails = {
        status: 'pending',
        message: 'Chunk uploaded successfully',
        details: { filename, uniqueID, chunkIndex, totalChunks }
      };

      return next();
    });
  } catch (error) {
    reportError(
      `Failed to upload or process chunk: ${(error as Error).message}`
    );
    next(error);
  }
}

async function mergeChunks(
  filename: string,
  totalChunks: string | number,
  sessionFolder: string
): Promise<void> {
  const finalFilePath = path.join(sessionFolder, filename);
  const writeStream = fs.createWriteStream(finalFilePath);

  for (let i = 0; i < parseInt(totalChunks as string, 10); i++) {
    const partPath = path.join(sessionFolder, `${filename}.part${i}`);

    try {
      const chunkData = await fs.readFile(partPath);
      writeStream.write(chunkData);
    } catch (error) {
      reportError(`Error reading chunk ${i}: ${(error as Error).message}`);
      throw error;
    }

    fs.remove(partPath).catch((err: Error) =>
      reportError(`Error removing part ${partPath}: ${err.message}`)
    );
  }

  writeStream.end();

  return new Promise<void>((resolve, reject) => {
    writeStream.on('finish', () => resolve(undefined));
    writeStream.on('error', (error) => {
      reportError(`Error merging chunks: ${(error as Error).message}`);
      reject(error);
    });
  });
}

export { multiPartFileUploader };
