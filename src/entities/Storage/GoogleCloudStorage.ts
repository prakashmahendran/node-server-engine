import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import {
  Storage as CloudStorage,
  CreateWriteStreamOptions,
  File,
  StorageOptions
} from '@google-cloud/storage';
import fileSizeParser from 'filesize-parser';
import mimeTypes from 'mime-types';
import {
  UploadDestinationOptions,
  StorageUploadedFile,
  UploaderOptions,
  StorageGetResponse,
  StorageDownloadResponse,
  GoogleCloudStorageConfig
} from './GoogleCloudStorage.types';
import { WebError } from 'entities/WebError';
import { reportDebug } from 'utils/report';
import { trimPathSlash } from 'utils/trimPathSlash';

const namespace = 'engine:google-cloud-storage';

/**
 * Generic Google Cloud Storage wrapper for easy file operations
 * Provides methods for uploading, downloading, streaming, and deleting files
 * 
 * @example
 * ```typescript
 * // Initialize with custom configuration
 * GoogleCloudStorage.init({
 *   projectId: 'my-project',
 *   keyFilename: '/path/to/keyfile.json'
 * });
 * 
 * // Upload a file
 * const result = await GoogleCloudStorage.upload(
 *   fileStream,
 *   'my-bucket',
 *   { directory: 'uploads', mime: 'image/png' }
 * );
 * 
 * // Download a file
 * const { data, metadata } = await GoogleCloudStorage.get('my-bucket', 'uploads/file.png');
 * 
 * // Delete a file
 * await GoogleCloudStorage.delete('my-bucket', 'uploads/file.png');
 * ```
 */
export const GoogleCloudStorage = {
  cloudStorage: null as CloudStorage | null,

  /**
   * Initialize Google Cloud Storage with configuration
   * Call this method before using any other methods
   * @param config - Google Cloud Storage configuration options
   */
  init(config?: GoogleCloudStorageConfig): void {
    const storageConfig: StorageOptions = {};

    if (config) {
      if (config.projectId) storageConfig.projectId = config.projectId;
      if (config.keyFilename) storageConfig.keyFilename = config.keyFilename;
      if (config.credentials) storageConfig.credentials = config.credentials;
      if (config.apiEndpoint) storageConfig.apiEndpoint = config.apiEndpoint;
    } else {
      // Use environment variables as fallback
      if (process.env.GC_PROJECT) storageConfig.projectId = process.env.GC_PROJECT;
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        storageConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      }
    }

    this.cloudStorage = new CloudStorage(storageConfig);
    reportDebug({
      namespace,
      message: 'Google Cloud Storage initialized',
      data: { projectId: storageConfig.projectId }
    });
  },

  /**
   * Get the Cloud Storage instance (auto-initializes if needed)
   * @private
   */
  getStorageInstance(): CloudStorage {
    if (!this.cloudStorage) {
      this.init();
    }
    return this.cloudStorage!;
  },

  /**
   * Upload a file to Google Cloud Storage
   * @param readStream - Readable stream of the file content
   * @param bucket - Bucket name where the file should be stored
   * @param destinationOptions - Options for file destination (directory, fileName, etc.)
   * @param storageOptions - Google Cloud Storage write stream options
   * @param uploaderOptions - Additional options like maxSize
   * @returns Promise with file metadata
   * 
   * @example
   * ```typescript
   * const fileStream = fs.createReadStream('photo.jpg');
   * const result = await GoogleCloudStorage.upload(
   *   fileStream,
   *   'my-bucket',
   *   { directory: 'photos', mime: 'image/jpeg' },
   *   { metadata: { contentType: 'image/jpeg' } },
   *   { maxSize: '5MB' }
   * );
   * console.log(result.name); // photos/uuid.jpeg
   * ```
   */
  async upload(
    readStream: Readable,
    bucket: string,
    destinationOptions: UploadDestinationOptions = {},
    storageOptions: CreateWriteStreamOptions = {},
    uploaderOptions: UploaderOptions = {}
  ): Promise<StorageUploadedFile> {
    const storage = this.getStorageInstance();
    const { maxSize } = uploaderOptions;

    let file: File;
    reportDebug({
      namespace,
      message: 'Uploading file to storage',
      data: { bucket, destinationOptions, storageOptions, uploaderOptions }
    });

    // Generate the file path
    const { fileName, directory } = destinationOptions;

    // Upload file with given file name
    if (fileName) {
      const trimmedDirectory = trimPathSlash(directory ?? '/');
      const path = trimmedDirectory ? `${trimmedDirectory}/${fileName}` : fileName;
      file = storage.bucket(bucket).file(path);
    }
    // Generate random destination for file and check that it is not already occupied
    else {
      do {
        const path = this.generateFileDestination(destinationOptions);
        file = storage.bucket(bucket).file(path);
      } while ((await file.exists())[0]);
    }

    // Pipe user's file stream to the storage
    return new Promise((resolve, reject) => {
      let receivedSize = 0;
      const writeStream = file.createWriteStream(storageOptions);
      const intMaxSize = maxSize && fileSizeParser(maxSize);
      
      // Calculate transferred size and write to storage stream
      readStream.on('data', function (data: Buffer) {
        receivedSize += data.length;
        // Fail if transferred data over max size
        if (intMaxSize && receivedSize > intMaxSize) {
          reject(
            new WebError({
              statusCode: 413,
              errorCode: 'file-too-large',
              message: 'File size exceeds the maximum allowed limit',
              hint: { maxSize },
              data: {
                bucket,
                destinationOptions,
                storageOptions,
                receivedSize,
                maxSize
              }
            })
          );
          return;
        }
        writeStream.write(data);
      });
      
      // Error handling
      readStream.on('error', (err) => {
        reject(err);
      });
      writeStream.on('error', (err) => {
        reject(err);
      });
      
      // Graceful termination of the read
      readStream.on('end', () => {
        writeStream.end();
      });
      
      // Graceful termination of the write
      writeStream.on('finish', () => {
        (async (): Promise<void> => {
          const [metadata] = (await file.getMetadata()) as [
            StorageUploadedFile,
            unknown
          ];
          reportDebug({
            namespace,
            message: 'File uploaded to storage',
            data: metadata
          });
          resolve(metadata);
        })().catch((error) => {
          reject(error);
        });
      });
    });
  },

  /**
   * Download a file from Google Cloud Storage and return its content as Buffer
   * @param bucket - Bucket name
   * @param path - File path in the bucket
   * @returns Promise with file data and metadata
   * 
   * @example
   * ```typescript
   * const { data, metadata } = await GoogleCloudStorage.get('my-bucket', 'photos/image.jpg');
   * console.log(metadata.size); // File size in bytes
   * console.log(data); // Buffer with file content
   * ```
   */
  async get(bucket: string, path: string): Promise<StorageGetResponse> {
    const storage = this.getStorageInstance();
    const file = storage.bucket(bucket).file(path);
    const [[metadata], [data]] = (await Promise.all([
      file.getMetadata(),
      file.download()
    ])) as [[StorageUploadedFile, unknown], [Buffer]];
    reportDebug({
      namespace,
      message: 'Downloaded file from storage',
      data: { bucket, path, metadata }
    });
    return {
      data,
      metadata
    };
  },

  /**
   * Get a readable stream for a file from Google Cloud Storage
   * Use this for large files or when you need to stream the content
   * @param bucket - Bucket name
   * @param path - File path in the bucket
   * @returns Promise with readable stream and metadata
   * 
   * @example
   * ```typescript
   * const { stream, metadata } = await GoogleCloudStorage.download('my-bucket', 'videos/video.mp4');
   * stream.pipe(res); // Stream to HTTP response
   * ```
   */
  async download(
    bucket: string,
    path: string
  ): Promise<StorageDownloadResponse> {
    const storage = this.getStorageInstance();
    const file = storage.bucket(bucket).file(path);
    const [metadata] = (await file.getMetadata()) as [
      StorageUploadedFile,
      unknown
    ];
    reportDebug({
      namespace,
      message: 'Fetched file stream from storage',
      data: { bucket, path, metadata }
    });
    return {
      stream: file.createReadStream(),
      metadata
    };
  },

  /**
   * Get a readable stream for a file (without fetching metadata)
   * Use this when you don't need metadata and want faster streaming
   * @param bucket - Bucket name
   * @param path - File path in the bucket
   * @returns Readable stream
   * 
   * @example
   * ```typescript
   * const stream = GoogleCloudStorage.getFileStream('my-bucket', 'audio/song.mp3');
   * stream.pipe(res); // Direct streaming without metadata fetch
   * ```
   */
  getFileStream(bucket: string, path: string): Readable {
    const storage = this.getStorageInstance();
    const file = storage.bucket(bucket).file(path);
    reportDebug({
      namespace,
      message: "Fetched file stream from storage's bucket",
      data: { bucket, path }
    });
    return file.createReadStream();
  },

  /**
   * Delete a file from Google Cloud Storage
   * @param bucket - Bucket name
   * @param path - File path in the bucket
   * @returns Promise that resolves when deletion is complete
   * 
   * @example
   * ```typescript
   * await GoogleCloudStorage.delete('my-bucket', 'temp/old-file.txt');
   * ```
   */
  async delete(bucket: string, path: string): Promise<void> {
    const storage = this.getStorageInstance();
    reportDebug({
      namespace,
      message: 'Deleting file from storage',
      data: { bucket, path }
    });
    await storage.bucket(bucket).file(path).delete();
  },

  /**
   * Generate a random file path with optional directory and extension
   * Useful for creating unique file names
   * @param options - Options for file destination generation
   * @returns Generated file path
   * 
   * @example
   * ```typescript
   * // Generate UUID only
   * const path1 = GoogleCloudStorage.generateFileDestination();
   * // 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
   * 
   * // With directory and MIME type
   * const path2 = GoogleCloudStorage.generateFileDestination({
   *   directory: 'uploads/images',
   *   mime: 'image/jpeg'
   * });
   * // 'uploads/images/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpeg'
   * ```
   */
  generateFileDestination(options: UploadDestinationOptions = {}): string {
    const { directory = '/', mime, noExtension = false } = options;

    // Determine file extension from MIME type
    const extension =
      mime && mimeTypes.extension(mime) ? mimeTypes.extension(mime) : undefined;
    
    // Build the full name with or without extension
    const fullName =
      extension && !noExtension ? `${randomUUID()}.${extension}` : randomUUID();
    
    // Clean up directory path
    const trimmedDirectory = trimPathSlash(directory);
    return `${trimmedDirectory ? `${trimmedDirectory}/` : ''}${fullName}`;
  }
};
