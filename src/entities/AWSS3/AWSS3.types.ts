import { Readable } from 'stream';

/** AWS S3 initialization configuration */
export interface AWSS3Config {
  /** AWS Region (e.g., 'us-east-1') */
  region?: string;
  /** AWS Access Key ID */
  accessKeyId?: string;
  /** AWS Secret Access Key */
  secretAccessKey?: string;
  /** AWS Session Token (for temporary credentials) */
  sessionToken?: string;
  /** Custom endpoint (useful for S3-compatible services like MinIO, LocalStack) */
  endpoint?: string;
  /** Force path style (required for some S3-compatible services) */
  forcePathStyle?: boolean;
}

/** Options to set where an uploaded file is stored in the S3 bucket */
export interface S3UploadDestinationOptions {
  /** Directory of the bucket in which the file is stored. Defaults to the root directory */
  directory?: string;
  /** Name under which the file is stored. If specified, the file is stored with that name. Otherwise random name generation is done */
  fileName?: string;
  /** When using random file name generation (ie: fileName is undefined). We use the MIME type to determine which is the best extension to apply to the file */
  mime?: string;
  /** When using random file name generation (ie: fileName is undefined), use this parameter to skip adding an extension to the file */
  noExtension?: boolean;
}

/** Options of the S3 file uploader */
export interface S3UploaderOptions {
  /** Maximum size of the file (ex: 2MB) */
  maxSize?: string;
}

/** Object representing a file that has been uploaded to S3 */
export interface S3UploadedFile {
  /** Bucket in which the file has been uploaded */
  Bucket: string;
  /** Key (path) of the stored object */
  Key: string;
  /** ETag of the uploaded file */
  ETag?: string;
  /** Location URL of the uploaded file */
  Location?: string;
  /** Server-side encryption method */
  ServerSideEncryption?: string;
  /** Version ID (if versioning is enabled) */
  VersionId?: string;
}

/** Return type for a file download */
export interface S3GetResponse {
  /** The file raw binary content */
  data: Buffer;
  /** The file's metadata */
  metadata: S3FileMetadata;
}

/** Return type for a file streaming fetching */
export interface S3DownloadResponse {
  /** A readable stream with the file's content */
  stream: Readable;
  /** The file's metadata */
  metadata: S3FileMetadata;
}

/** S3 file metadata */
export interface S3FileMetadata {
  /** Content type of the file */
  ContentType?: string;
  /** Content length in bytes */
  ContentLength?: number;
  /** Last modified date */
  LastModified?: Date;
  /** ETag */
  ETag?: string;
  /** Metadata key-value pairs */
  Metadata?: Record<string, string>;
  /** Server-side encryption */
  ServerSideEncryption?: string;
  /** Version ID */
  VersionId?: string;
}
