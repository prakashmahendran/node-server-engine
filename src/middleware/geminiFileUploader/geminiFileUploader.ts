import express from 'express';
import multer from 'multer';
import { reportError, geminiFileUpload, reportDebug } from 'utils';
import { checkEnvironment } from 'utils/checkEnvironment';
import { envAssert } from 'utils/envAssert';

const namespace = 'engine:middleware:geminiFileUploader';
const storage = multer.memoryStorage();

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

      reportDebug({
        namespace,
        message: 'Upload to Gemini AI',
        data: {
          hasBuffer: !!file.buffer,
          mimeType,
          originalFileName: file.originalname
        }
      });

      const fileResponse = await geminiFileUpload(
        file.buffer,
        mimeType,
        file.originalname
      );

      reportDebug({
        namespace,
        message: 'File Uploaded to Gemini AI',
        data: fileResponse
      });

      req.body.file = fileResponse;

      next();
    });
  } catch (error) {
    console.error(error);
    reportError(`Failed to upload or process file`);
    next(error);
  }
}
