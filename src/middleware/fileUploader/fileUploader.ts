import Busboy from 'busboy';
import { Request, Response, NextFunction } from 'express';
import { Schema } from 'express-validator';
import { compressAvatar } from './compressAvatar';
import { FileUploaderConfig } from './fileUploader.types';
import { isMultipart } from './isMultiPart';
import { validate } from './validate';
import { Storage } from 'entities/Storage';
import { WebError } from 'entities/WebError';
import { reportError, reportDebug } from 'utils/report';
import { Readable } from 'stream';

const namespace = 'engine:middleware:fileUploader';

/**
 * Generate a custom fileUploader middleware
 */
export function fileUploader(
  options: Array<FileUploaderConfig>,
  validator: Schema
) {
  return (
    request: Request,
    response: Response,
    next: NextFunction
  ): Busboy.Busboy =>
    fileUploaderMiddleware(request, response, next, options, validator);
}

/** Handle file upload and generic multi-part parsing */
export function fileUploaderMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
  filesOptions: Array<FileUploaderConfig>,
  validator: Schema
): Busboy.Busboy {
  reportDebug({
    namespace,
    message: 'Received request to upload file',
    data: { filesOptions, validator }
  });
  // Check that the request is a proper multipart request
  if (!isMultipart(request))
    throw new WebError({
      statusCode: 415,
      errorCode: 'invalid-content-type',
      message: 'Request is not of type multipart/form-data',
      data: { contentType: request.get('Content-Type') }
    });
  // If no files to handle ignore
  if (!filesOptions.length) next();
  // Parse multipart data with Busboy
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const busboy = new (Busboy as any)({
    headers: {
      ...request.headers,
      'content-type': request.headers['content-type'] ?? ''
    }
  });

  let hasError = false;

  /**
   * Function called when an error happened in the process
   * It immediately stops and drains all connection and deletes all files that have already been uploaded
   */
  function triggerError(error: unknown): void {
    pendingWrites--;
    if (hasError) return;
    hasError = true;
    request.unpipe(busboy);
    request.on('readable', request.read.bind(request));
    busboy.removeAllListeners();
    next(error);
    if (request.files) {
      Object.values(request.files).forEach((files) => {
        files.forEach((file) => {
          Storage.delete(file.bucket, file.name).catch((error) => {
            reportError(error);
          });
        });
      });
    }
  }

  let readFinished = false;
  let fieldsValidated = false;
  let pendingWrites = 0;

  /** Function called when all the body has been parsed */
  function done(): void {
    if (readFinished && pendingWrites === 0 && fieldsValidated && !hasError) {
      const uploadedFiles = Object.keys(request.files ?? {});
      if (
        filesOptions.some(
          (options) => options.required && !uploadedFiles.includes(options.key)
        )
      ) {
        triggerError(
          new WebError({
            statusCode: 400,
            errorCode: 'missing-field',
            message: 'Some required files have not been uploaded',
            data: { filesOptions, validator, uploadedFiles }
          })
        );
        return;
      }
      next();
    }
  }

  /*
   * On cancel request, while processing
   */
  request.connection.on('close', function () {
    if (!response.writableEnded) triggerError(new Error('Request cancelled'));
  });

  /**
   * Once all the fields have been read they are checked against the validation schema
   */
  async function validateFields(): Promise<void> {
    try {
      await validate(request, validator);
    } catch (error) {
      triggerError(error);
    }
    reportDebug({
      namespace,
      message: 'Validation processed',
      data: { hasError, filesOptions, validator }
    });
    fieldsValidated = true;
    done();
  }

  busboy.on(
    'file',
    (
      field: string,
      file: Readable,
      fileName: string,
      encoding: unknown,
      mimeType: string
    ) => {
      (async (): Promise<void> => {
        reportDebug({
          namespace,
          message: 'Found file in request',
          data: { hasError, field, fileName, encoding, mimeType, pendingWrites }
        });
        // Do not handle the stream if there has been an error previously
        if (hasError) file.destroy();
        pendingWrites++;
        // Find related file options based on the field name
        const options = filesOptions.find(
          (fileOption) => fileOption.key === field
        );
        // Make sure that the field is in the config
        if (!options) {
          triggerError(
            new WebError({
              statusCode: 400,
              errorCode: 'invalid-file-field',
              message: 'Request contains a file at an invalid field',
              hint: { field },
              data: { field }
            })
          );
          return;
        }
        reportDebug({
          namespace,
          message: 'Found options for file',
          data: {
            hasError,
            field,
            fileName,
            encoding,
            mimeType,
            pendingWrites,
            options
          }
        });
        // If a specific MIME type is required check it
        if (options.mimeTypes && !options.mimeTypes.includes(mimeType)) {
          triggerError(
            new WebError({
              statusCode: 415,
              errorCode: 'invalid-mime-type',
              message: 'Request contains a file with an invalid MIME type',
              hint: { field },
              data: { field, mimeType, expected: options.mimeTypes }
            })
          );
          return;
        }
        // Generate the destination path of the file and upload
        reportDebug({
          namespace,
          message: 'Starting file upload',
          data: {
            hasError,
            field,
            fileName,
            encoding,
            mimeType,
            pendingWrites,
            options
          }
        });
        try {
          const fileToUpload = options.image
            ? compressAvatar(file, options.image)
            : file;

          const uploadedFile = await Storage.upload(
            fileToUpload,
            options.bucket,
            {
              directory: options.path,
              mime: mimeType,
              noExtension: options.noExtension
            },
            {
              metadata: { contentType: mimeType }
            },
            { maxSize: options.maxSize }
          );

          reportDebug({
            namespace,
            message: 'File uploaded',
            data: {
              hasError,
              field,
              fileName,
              encoding,
              mimeType,
              pendingWrites,
              options,
              uploadedFile
            }
          });
          if (hasError) {
            // If some other failed before this one terminated
            // Delete file
            await Storage.delete(uploadedFile.bucket, uploadedFile.name);
          } else {
            // Handle successful upload
            // Add the file's data to the request
            pendingWrites--;
            if (!request.files) request.files = {};
            if (!request.files[field]) request.files[field] = [];
            request.files[field].push({
              ...uploadedFile,
              originalFileName: fileName
            });
            done();
          }
        } catch (error) {
          triggerError(error);
        }
      })().catch((error) => {
        triggerError(error);
      });
    }
  );

  /**
   * Handle non file fields
   * These fields will be pushed to the body as array of strings
   */
  busboy.on('field', (fieldName: string, value: unknown) => {
    if (!request.body) request.body = {};

    if (request.body[fieldName]) {
      request.body[fieldName].push(value);
    } else {
      request.body[fieldName] = [value];
    }
  });
  busboy.on('error', function (error: unknown) {
    triggerError(error);
  });
  busboy.on('finish', () => {
    (async (): Promise<void> => {
      reportDebug({
        namespace,
        message: 'Busboy finished reading',
        data: { hasError, filesOptions, validator, pendingWrites }
      });
      readFinished = true;
      await validateFields();
      done();
    })().catch((error) => {
      triggerError(error);
    });
  });
  return request.pipe(busboy);
}
