import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import {
  Storage as CloudStorage,
  CreateWriteStreamOptions,
  File
} from '@google-cloud/storage';
import fileSizeParser from 'filesize-parser';
import mimeTypes from 'mime-types';
import {
  UploadDestinationOptions,
  StorageUploadedFile,
  UploaderOptions,
  StorageGetResponse,
  StorageDownloadResponse
} from './Storage.types';
import { WebError } from 'entities/WebError';
import { reportDebug } from 'utils/report';
import { trimPathSlash } from 'utils/trimPathSlash';

const namespace = 'engine:storage';

export const Storage = {
  cloudStorage: new CloudStorage({
    projectId: process.env.GC_PROJECT,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
  }),

  /**
   * Upload a file to the cloud storage
   * @param readStream - Stream of the file content
   * @param  bucket - Bucket in which the file should be stored
   * @param  destinationOptions - Options for the destination generator [see: generateFileDestination(options)]
   * @param  storageOptions - Storage library options
   * @param  uploaderOptions - Options for this service's specific behavior
   * @return {Promise<Object>} - Details regarding the uploaded file's metadata
   */
  async upload(
    readStream: Readable,
    bucket: string,
    destinationOptions: UploadDestinationOptions = {},
    storageOptions: CreateWriteStreamOptions = {},
    uploaderOptions: UploaderOptions = {}
  ): Promise<StorageUploadedFile> {
    const { maxSize } = uploaderOptions;

    let file: File;
    reportDebug({
      namespace,
      message: 'Uploading file to storage',
      data: { bucket, destinationOptions, storageOptions, uploaderOptions }
    });

    // Generate the file path
    // We either use a given file name, or we generate a random file name
    const { fileName, directory } = destinationOptions;

    // Upload file with given file name
    if (fileName) {
      // Only keep required slashes in full path
      const trimmedDirectory = trimPathSlash(directory ?? '/');
      const path = `${trimmedDirectory}/${fileName}`;
      file = this.cloudStorage.bucket(bucket).file(path);
    }
    // Generate random destination for file and check that it is not already occupied
    else {
      do {
        const path = this.generateFileDestination(destinationOptions);
        file = this.cloudStorage.bucket(bucket).file(path);
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
              message: 'Request contains a file that is over the maximum size',
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
   * Return the read stream for a given file and bucket
   */
  async get(bucket: string, path: string): Promise<StorageGetResponse> {
    const file = this.cloudStorage.bucket(bucket).file(path);
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
   * Return the read stream for a given file and bucket
   */
  async download(
    bucket: string,
    path: string
  ): Promise<StorageDownloadResponse> {
    const file = this.cloudStorage.bucket(bucket).file(path);
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
   * Return the read stream for a given file path and bucket
   * @param {String} bucket
   * @param {String} path
   */
  getFileStream(bucket: string, path: string): Readable {
    const file = this.cloudStorage.bucket(bucket).file(path);
    reportDebug({
      namespace,
      message: "Fetched file stream from storage's bucket",
      data: { bucket, path }
    });
    return file.createReadStream();
  },

  /**
   * Delete a file from the cloud storage
   */
  async delete(bucket: string, path: string): Promise<void> {
    reportDebug({
      namespace,
      message: 'Deleting file from storage',
      data: { bucket, path }
    });
    await this.cloudStorage.bucket(bucket).file(path).delete();
  },

  /**
   * Builds the full file path on the cloud and generates it a random name
   */
  generateFileDestination(options: UploadDestinationOptions = {}): string {
    const { directory = '/', mime, noExtension = false } = options;

    // use provided mime type default otherwise
    const extension =
      mime && mimeTypes.extension(mime) ? mimeTypes.extension(mime) : undefined;
    // Build the full name
    const fullName =
      extension && !noExtension ? `${randomUUID()}.${extension}` : randomUUID();
    // Only keep required slashes in full path
    const trimmedDirectory = trimPathSlash(directory);
    return `${trimmedDirectory ? `${trimmedDirectory}/` : ''}${fullName}`;
  }
};
