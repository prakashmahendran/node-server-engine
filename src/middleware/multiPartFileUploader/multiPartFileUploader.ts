import express from 'express';
import multer from 'multer';
import fs from 'fs-extra';
import path from 'path';
import { reportDebug, reportError, reportInfo } from 'utils';

const TEMP_DIR: string =
  process.env.TEMP_CHUNK_FOLDER || './uploads/temp_chunks';

const namespace = 'engine:Middlware:multiPartFileUploader';

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
          success: false,
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
            success: false,
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
      await fs.writeFile(chunkPath, req.file.buffer);

      const uploadedChunks = await fs.readdir(sessionFolder);

      if (uploadedChunks.length === parseInt(totalChunks, 10)) {
        reportInfo({
          message: `All chunks uploaded. Merging file...`
        });

        await mergeChunks(filename, totalChunks, sessionFolder);

        const finalFilePath = path.join(sessionFolder, filename);

        if (!fs.existsSync(finalFilePath)) {
          reportError('File merging failed: File does not exist');
          return next(new Error('File merging failed'));
        }
        reportInfo({
          message: `File merged successfully.`
        });
        req.body.uploadDetails = {
          success: true,
          message: 'File uploaded and merged successfully',
          details: { filename, uniqueID }
        };
        reportDebug({
          namespace,
          message: `File merged successfully`,
          data: {
            success: true,
            details: { filename, uniqueID }
          }
        });

        return next();
      }
      reportInfo({
        message: `Chunk ${chunkIndex} uploaded successfully.`
      });

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
        success: true,
        message: 'Chunk uploaded successfully',
        details: { filename, uniqueID, chunkIndex, totalChunks }
      };

      return next();
    });
  } catch (error) {
    console.error(error);
    reportError('Failed to upload or process chunk');
    next(error);
  }
}

async function mergeChunks(
  filename: string,
  totalChunks: string | number,
  sessionFolder: string
) {
  const finalFilePath = path.join(sessionFolder, filename);
  const writeStream = fs.createWriteStream(finalFilePath);

  for (let i = 0; i < parseInt(totalChunks as string, 10); i++) {
    const partPath = path.join(sessionFolder, `${filename}.part${i}`);
    const chunkData = await fs.readFile(partPath);
    writeStream.write(chunkData);
    await fs.remove(partPath);
  }

  writeStream.end();

  return new Promise<void>((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
}

export { multiPartFileUploader };
