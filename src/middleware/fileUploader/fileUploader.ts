import { Request, Response, NextFunction } from 'express';
import { Schema } from 'express-validator';
import { WebError } from 'entities/WebError';
import { reportDebug } from 'utils/report';
import multer from 'multer';
import { FileUploaderConfig } from './fileUploader.types';
import { validate } from './validate';

const namespace = 'engine:middleware:fileUploader';

/**
 * Middleware for handling file uploads.
 * @param filesOptions Configuration options for expected files.
 * @param validator Validation schema for request fields.
 */
export function fileUploader(
  filesOptions: Array<FileUploaderConfig>,
  validator: Schema
) {
  return async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    reportDebug({
      namespace,
      message: 'Received request to upload file',
      data: { filesOptions, validator }
    });

    // Setup multer with memory storage
    const storage = multer.memoryStorage();
    const upload = multer({
      storage,
      limits: { fileSize: 10 * 1024 * 1024 } // Limit file size to 10MB
    }).any();

    upload(request, response, async (err) => {
      if (err) {
        reportDebug({
          namespace,
          message: 'Multer upload error',
          data: { error: err.message }
        });
        return next(err);
      }

      // Ensure `request.files` is properly typed
      let uploadedFiles: Express.Multer.File[] = [];
      if (Array.isArray(request.files)) {
        uploadedFiles = request.files;
      } else if (typeof request.files === 'object') {
        uploadedFiles = Object.values(request.files).flat();
      }

      // Log uploaded files
      reportDebug({
        namespace,
        message: 'Files Received',
        data: { uploadedFiles: uploadedFiles.map((file) => file.originalname) }
      });

      // Validate request body fields
      try {
        await validate(request, validator);
      } catch (error) {
        reportDebug({
          namespace,
          message: 'Validation failed',
          data: { error }
        });
        return next(error);
      }

      // Extract uploaded field names
      const uploadedFileKeys = uploadedFiles.map((file) => file.fieldname);

      // Check for missing required files
      const missingFiles = filesOptions.filter(
        (option) => option.required && !uploadedFileKeys.includes(option.key)
      );

      if (missingFiles.length > 0) {
        reportDebug({
          namespace,
          message: 'Missing required files',
          data: { missingFiles, uploadedFileKeys }
        });

        return next(
          new WebError({
            statusCode: 400,
            errorCode: 'missing-field',
            message: 'Some required files have not been uploaded',
            data: { missingFiles, uploadedFileKeys }
          })
        );
      }

      next();
    });
  };
}
