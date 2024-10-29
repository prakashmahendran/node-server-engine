import { CompressionOptions } from './compressAvatar';
import { StorageUploadedFile } from 'entities/Storage';

// Override the Express request object to add the files
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    /** Express request object */
    interface Request {
      /** Configuration for files that are uploaded with the request */
      files?: { [key: string]: Array<UploadedFile> };
    }
  }
}

/** Custom uploaded file metadata */
export interface UploadedFile extends StorageUploadedFile {
  /** File name that was given to the file by the client */
  originalFileName: string;
}

/** Outputs setting for the file upload. Defines where a file should be stored and how it should be processed. */
interface FileUploaderOutputs {
  /** Name of the output */
  name: string;
  /** Path to which this specific output is stored (defaults to default path if not set) */
  path?: string;
  /** Bucket to which this specific output is stored (defaults to default bucket if not set) */
  bucket?: string;
}

/** Configuration for a file upload */
export interface FileUploaderConfig {
  /** Field key for which this configuration applies */
  key: string;
  /** A list of supported MIME Types for the file */
  mimeTypes?: Array<string>;
  /** Base path where the file should be stored (default used when no output config is set, will be used as temporary storage when outputs are set) */
  path?: string;
  /** Bucket in which the file should be stored (will be used as temporary storage when outputs are set) */
  bucket: string;
  /** Maximum size of the file (ex: 2MB) */
  maxSize?: string;
  /** Indicates that the file must be present */
  required?: boolean;
  /** Do not store with an extension (will simply be a uuid) */
  noExtension?: boolean;
  /** Specify multiple outputs with processing */
  outputs?: Array<FileUploaderOutputs>;
  /** @deprecated compression of images */
  image?: CompressionOptions;
}
