import express from 'express';
import multer from 'multer';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'fs';
import path from 'path';
import tmp from 'tmp';
import { reportError, reportDebug } from 'utils/report';
import { checkEnvironment } from 'utils/checkEnvironment';
import { envAssert } from 'utils/envAssert';

const namespace = 'engine:middleware:geminiFileUploader';

const apiKey = process.env.GOOGLE_AI_KEY ?? '';
const fileManager = new GoogleAIFileManager(apiKey);

const storage = multer.memoryStorage();

async function uploadToGemini(
  buffer: Buffer,
  mimeType: string,
  originalName: string
): Promise<{ name: string; uri: string; mimeType: string }> {
  // Add 'name' to the return type
  const tempFile = tmp.fileSync({ postfix: path.extname(originalName) });

  fs.writeFileSync(tempFile.name, buffer);

  const uploadResult = await fileManager.uploadFile(tempFile.name, {
    mimeType,
    displayName: originalName
  });

  tempFile.removeCallback();

  const file = uploadResult.file;
  reportDebug({
    namespace,
    message: 'Uploaded file',
    data: { displayName: file.displayName, name: file.name }
  });
  return { name: file.name, uri: file.uri, mimeType: file.mimeType }; // Include 'name' in the return object
}

async function waitForFilesActive(
  files: { name: string; uri: string; mimeType: string }[]
): Promise<void> {
  reportDebug({
    namespace,
    message: 'Waiting for file processing...'
  });
  for (const { name } of files) {
    let file = await fileManager.getFile(name);
    while (file.state === 'PROCESSING') {
      process.stdout.write('.');
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      file = await fileManager.getFile(name);
    }
    if (file.state !== 'ACTIVE') {
      reportError(`File ${file.name} failed to process`);
    }
  }
  reportDebug({
    namespace,
    message: 'all files ready...\n'
  });
}

export async function geminiFileUploader(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  try {
    checkEnvironment({
      GOOGLE_AI_KEY: envAssert.isString()
    });
    // Use multer.single() inside the middleware
    const uploadSingle = multer({ storage }).single('file');

    uploadSingle(req, res, async (err) => {
      if (err) {
        reportError(`Error uploading file`);
        next(err);
        return;
      }

      const file = req.file;
      if (!file) {
        reportError(`No file uploaded`);
        next(`No file uploaded`);
        return;
      }
      const mimeType = file.mimetype;

      const uploadedFile = await uploadToGemini(
        file.buffer,
        mimeType,
        file.originalname
      );

      await waitForFilesActive([uploadedFile]);

      // Set the fileUri and mimeType in the request object for the next middleware/route handler
      req.body.file = {
        fileUri: uploadedFile.uri,
        mimeType: uploadedFile.mimeType,
        originalname: file.originalname
      };

      next(); // Proceed to the next middleware or route handler
    });
  } catch (error) {
    console.error(error);
    reportError(`Failed to upload or process file`);
    next(error);
  }
}
