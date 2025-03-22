// Extend Express request object to include `files`
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Uploaded files mapped by field name */
      multipartFile?: {
        isPending: boolean;
        originalname: string;
        uniqueID: string;
        filePath?: string;
        chunkIndex?: number;
        totalChunks?: number;
      };
    }
  }
}

/** Configuration for Multi part file upload */
export interface MultiPartFileUploaderConfig {
  required?: boolean;
  maxSize?: string;
}
