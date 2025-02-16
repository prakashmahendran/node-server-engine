// Extend Express request object to include `files`
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Uploaded files mapped by field name */
      files?:
        | { [key: string]: Express.Multer.File[] }
        | Express.Multer.File[]
        | undefined;
    }
  }
}

/** Custom uploaded file metadata */
export interface UploadedFile extends Express.Multer.File {
  /** Original file name (use `originalname` from `Express.Multer.File`) */
  originalFileName: string;
  /** File data buffer (use `buffer` from `Express.Multer.File`) */
  file: Buffer;
}

/** Configuration for file upload */
export interface FileUploaderConfig {
  /** Field name expected in the request */
  key: string;
  /** Allowed MIME types */
  mimeTypes?: Array<string>;
  /** Maximum file size (e.g., "2MB") */
  maxSize?: string;
  /** Whether the file is required */
  required?: boolean;
  /** Whether to store without an extension */
  noExtension?: boolean;
}
