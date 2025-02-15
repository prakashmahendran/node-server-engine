import express from 'express';
import multer from 'multer';
import { reportError } from 'utils';
import { checkEnvironment } from 'utils/checkEnvironment';
import { envAssert } from 'utils/envAssert';
import { uploadToGemini } from 'utils/geminiFileUpload';

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

      req.body.file = await uploadToGemini(
        file.buffer,
        mimeType,
        file.originalname
      );

      next(); // Proceed to the next middleware or route handler
    });
  } catch (error) {
    console.error(error);
    reportError(`Failed to upload or process file`);
    next(error);
  }
}
