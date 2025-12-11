import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  S3ClientConfig
} from '@aws-sdk/client-s3';
import fileSizeParser from 'filesize-parser';
import mimeTypes from 'mime-types';
import {
  S3UploadDestinationOptions,
  S3UploadedFile,
  S3UploaderOptions,
  S3GetResponse,
  S3DownloadResponse,
  AWSS3Config,
  S3FileMetadata
} from './AWSS3.types';
import { WebError } from 'entities/WebError';
import { reportDebug } from 'utils/report';
import { trimPathSlash } from 'utils/trimPathSlash';

const namespace = 'engine:aws-s3';

/**
 * Generic AWS S3 wrapper for easy file operations
 * Provides methods for uploading, downloading, streaming, and deleting files
 * Compatible with AWS S3 and S3-compatible services (MinIO, LocalStack, etc.)
 * 
 * @example
 * ```typescript
 * // Initialize with custom configuration
 * AWSS3.init({
 *   region: 'us-east-1',
 *   accessKeyId: 'YOUR_ACCESS_KEY',
 *   secretAccessKey: 'YOUR_SECRET_KEY'
 * });
 * 
 * // Upload a file
 * const result = await AWSS3.upload(
 *   fileStream,
 *   'my-bucket',
 *   { directory: 'uploads', mime: 'image/png' }
 * );
 * 
 * // Download a file
 * const { data, metadata } = await AWSS3.get('my-bucket', 'uploads/file.png');
 * 
 * // Delete a file
 * await AWSS3.delete('my-bucket', 'uploads/file.png');
 * ```
 */
export const AWSS3 = {
  s3Client: null as S3Client | null,

  /**
   * Initialize AWS S3 with configuration
   * Call this method before using any other methods
   * @param config - AWS S3 configuration options
   */
  init(config?: AWSS3Config): void {
    const s3Config: S3ClientConfig = {};

    if (config) {
      if (config.region) s3Config.region = config.region;
      if (config.endpoint) s3Config.endpoint = config.endpoint;
      if (config.forcePathStyle !== undefined) s3Config.forcePathStyle = config.forcePathStyle;
      
      if (config.accessKeyId && config.secretAccessKey) {
        s3Config.credentials = {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
          ...(config.sessionToken && { sessionToken: config.sessionToken })
        };
      }
    } else {
      // Use environment variables as fallback
      if (process.env.AWS_REGION) s3Config.region = process.env.AWS_REGION;
      if (process.env.AWS_S3_ENDPOINT) s3Config.endpoint = process.env.AWS_S3_ENDPOINT;
      if (process.env.AWS_S3_FORCE_PATH_STYLE === 'true') s3Config.forcePathStyle = true;
      
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        s3Config.credentials = {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          ...(process.env.AWS_SESSION_TOKEN && { sessionToken: process.env.AWS_SESSION_TOKEN })
        };
      }
    }

    this.s3Client = new S3Client(s3Config);
    reportDebug({
      namespace,
      message: 'AWS S3 initialized',
      data: { region: s3Config.region, endpoint: s3Config.endpoint }
    });
  },

  /**
   * Get the S3 client instance (auto-initializes if needed)
   * @private
   */
  getS3Client(): S3Client {
    if (!this.s3Client) {
      this.init();
    }
    return this.s3Client!;
  },

  /**
   * Upload a file to AWS S3
   * @param readStream - Readable stream of the file content
   * @param bucket - Bucket name where the file should be stored
   * @param destinationOptions - Options for file destination (directory, fileName, etc.)
   * @param uploaderOptions - Additional options like maxSize
   * @param metadata - Optional metadata to attach to the file
   * @returns Promise with file upload result
   * 
   * @example
   * ```typescript
   * const fileStream = fs.createReadStream('photo.jpg');
   * const result = await AWSS3.upload(
   *   fileStream,
   *   'my-bucket',
   *   { directory: 'photos', mime: 'image/jpeg' },
   *   { maxSize: '5MB' },
   *   { userId: '123', uploadedBy: 'user@example.com' }
   * );
   * console.log(result.Key); // photos/uuid.jpeg
   * ```
   */
  async upload(
    readStream: Readable,
    bucket: string,
    destinationOptions: S3UploadDestinationOptions = {},
    uploaderOptions: S3UploaderOptions = {},
    metadata?: Record<string, string>
  ): Promise<S3UploadedFile> {
    const client = this.getS3Client();
    const { maxSize } = uploaderOptions;

    reportDebug({
      namespace,
      message: 'Uploading file to S3',
      data: { bucket, destinationOptions, uploaderOptions }
    });

    // Generate the file path
    const { fileName, directory } = destinationOptions;

    let key: string;
    if (fileName) {
      const trimmedDirectory = trimPathSlash(directory ?? '/');
      key = trimmedDirectory ? `${trimmedDirectory}/${fileName}` : fileName;
    } else {
      key = this.generateFileDestination(destinationOptions);
    }

    // Collect stream data with size validation
    const chunks: Buffer[] = [];
    let receivedSize = 0;
    const intMaxSize = maxSize && fileSizeParser(maxSize);

    for await (const chunk of readStream) {
      receivedSize += chunk.length;
      
      if (intMaxSize && receivedSize > intMaxSize) {
        throw new WebError({
          statusCode: 413,
          errorCode: 'file-too-large',
          message: 'File size exceeds the maximum allowed limit',
          hint: { maxSize },
          data: {
            bucket,
            destinationOptions,
            receivedSize,
            maxSize
          }
        });
      }
      
      chunks.push(chunk);
    }

    const body = Buffer.concat(chunks);

    // Determine content type
    const contentType = destinationOptions.mime || 'application/octet-stream';

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ...(metadata && { Metadata: metadata })
    });

    const response = await client.send(command);

    reportDebug({
      namespace,
      message: 'File uploaded to S3',
      data: { bucket, key, etag: response.ETag }
    });

    return {
      Bucket: bucket,
      Key: key,
      ETag: response.ETag,
      Location: `https://${bucket}.s3.amazonaws.com/${key}`,
      ServerSideEncryption: response.ServerSideEncryption,
      VersionId: response.VersionId
    };
  },

  /**
   * Download a file from AWS S3 and return its content as Buffer
   * @param bucket - Bucket name
   * @param key - File key (path) in the bucket
   * @returns Promise with file data and metadata
   * 
   * @example
   * ```typescript
   * const { data, metadata } = await AWSS3.get('my-bucket', 'photos/image.jpg');
   * console.log(metadata.ContentLength); // File size in bytes
   * console.log(data); // Buffer with file content
   * ```
   */
  async get(bucket: string, key: string): Promise<S3GetResponse> {
    const client = this.getS3Client();

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });

    const response = await client.send(command);

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as Readable) {
      chunks.push(chunk);
    }
    const data = Buffer.concat(chunks);

    const metadata: S3FileMetadata = {
      ContentType: response.ContentType,
      ContentLength: response.ContentLength,
      LastModified: response.LastModified,
      ETag: response.ETag,
      Metadata: response.Metadata,
      ServerSideEncryption: response.ServerSideEncryption,
      VersionId: response.VersionId
    };

    reportDebug({
      namespace,
      message: 'Downloaded file from S3',
      data: { bucket, key, size: data.length }
    });

    return { data, metadata };
  },

  /**
   * Get a readable stream for a file from AWS S3
   * Use this for large files or when you need to stream the content
   * @param bucket - Bucket name
   * @param key - File key (path) in the bucket
   * @returns Promise with readable stream and metadata
   * 
   * @example
   * ```typescript
   * const { stream, metadata } = await AWSS3.download('my-bucket', 'videos/video.mp4');
   * stream.pipe(res); // Stream to HTTP response
   * ```
   */
  async download(bucket: string, key: string): Promise<S3DownloadResponse> {
    const client = this.getS3Client();

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });

    const response = await client.send(command);

    const metadata: S3FileMetadata = {
      ContentType: response.ContentType,
      ContentLength: response.ContentLength,
      LastModified: response.LastModified,
      ETag: response.ETag,
      Metadata: response.Metadata,
      ServerSideEncryption: response.ServerSideEncryption,
      VersionId: response.VersionId
    };

    reportDebug({
      namespace,
      message: 'Fetched file stream from S3',
      data: { bucket, key, metadata }
    });

    return {
      stream: response.Body as Readable,
      metadata
    };
  },

  /**
   * Get a readable stream for a file (without fetching all metadata first)
   * Use this when you don't need metadata and want faster streaming
   * @param bucket - Bucket name
   * @param key - File key (path) in the bucket
   * @returns Promise with readable stream
   * 
   * @example
   * ```typescript
   * const stream = await AWSS3.getFileStream('my-bucket', 'audio/song.mp3');
   * stream.pipe(res); // Direct streaming
   * ```
   */
  async getFileStream(bucket: string, key: string): Promise<Readable> {
    const client = this.getS3Client();

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });

    const response = await client.send(command);

    reportDebug({
      namespace,
      message: "Fetched file stream from S3's bucket",
      data: { bucket, key }
    });

    return response.Body as Readable;
  },

  /**
   * Get file metadata without downloading the file
   * @param bucket - Bucket name
   * @param key - File key (path) in the bucket
   * @returns Promise with file metadata
   * 
   * @example
   * ```typescript
   * const metadata = await AWSS3.getMetadata('my-bucket', 'photos/image.jpg');
   * console.log(metadata.ContentLength); // File size
   * console.log(metadata.ContentType); // MIME type
   * ```
   */
  async getMetadata(bucket: string, key: string): Promise<S3FileMetadata> {
    const client = this.getS3Client();

    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key
    });

    const response = await client.send(command);

    return {
      ContentType: response.ContentType,
      ContentLength: response.ContentLength,
      LastModified: response.LastModified,
      ETag: response.ETag,
      Metadata: response.Metadata,
      ServerSideEncryption: response.ServerSideEncryption,
      VersionId: response.VersionId
    };
  },

  /**
   * Delete a file from AWS S3
   * @param bucket - Bucket name
   * @param key - File key (path) in the bucket
   * @returns Promise that resolves when deletion is complete
   * 
   * @example
   * ```typescript
   * await AWSS3.delete('my-bucket', 'temp/old-file.txt');
   * ```
   */
  async delete(bucket: string, key: string): Promise<void> {
    const client = this.getS3Client();

    reportDebug({
      namespace,
      message: 'Deleting file from S3',
      data: { bucket, key }
    });

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    });

    await client.send(command);
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
   * const path1 = AWSS3.generateFileDestination();
   * // 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
   * 
   * // With directory and MIME type
   * const path2 = AWSS3.generateFileDestination({
   *   directory: 'uploads/images',
   *   mime: 'image/jpeg'
   * });
   * // 'uploads/images/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpeg'
   * ```
   */
  generateFileDestination(options: S3UploadDestinationOptions = {}): string {
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
