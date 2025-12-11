import { Readable } from 'stream';

/** Google Cloud Storage initialization configuration */
export interface GoogleCloudStorageConfig {
  /** Google Cloud Project ID */
  projectId?: string;
  /** Path to service account key file */
  keyFilename?: string;
  /** Service account credentials object */
  credentials?: {
    client_email?: string;
    private_key?: string;
  };
  /** Custom API endpoint (useful for emulators) */
  apiEndpoint?: string;
}

/** Options to set where an uploaded file is stored in the bucket */
export interface UploadDestinationOptions {
  /** Directory of the bucket in which the file is stored. Defaults to the root directory */
  directory?: string;
  /** Name under which the file is stored. If specified, the file is stored with that name. Otherwise random name generation is done */
  fileName?: string;
  /** When using random file name generation (ie: fileName is undefined). We use the MIME type to determine which is the best extension to apply to the file */
  mime?: string;
  /** When using random file name generation (ie: fileName is undefined), use this parameter to skip adding an extension to the file */
  noExtension?: boolean;
}

/** Options of the file uploader */
export interface UploaderOptions {
  /** Maximum size of the file (ex: 2MB) */
  maxSize?: string;
}

/** Object representing a file that has been uploaded */
export interface StorageUploadedFile {
  /** Bucket in which the file has been uploaded */
  bucket: string;
  /** Name of the stored object with path */
  name: string;
  /** Content-type of the file */
  contentType: string;
  /** Byte size of the file */
  size: string;
  /** ISO string of the creation date */
  timeCreated: string;
  /** ISO string of the update date */
  updated: string;
  /** MD5 hash of the content */
  md5Hash: string;
  /** CRC32C hash of the content */
  crc32c: string;
  /** Storage class applied */
  storageClass: string;
}

/** Return type for a file download */
export interface StorageGetResponse {
  /** The file raw binary content */
  data: Buffer;
  /** The file's metadata */
  metadata: StorageUploadedFile;
}

/** Return time for a file streaming fetching */
export interface StorageDownloadResponse {
  /** A readable stream with the file's content */
  stream: Readable;
  /** The file's metadata */
  metadata: StorageUploadedFile;
}
