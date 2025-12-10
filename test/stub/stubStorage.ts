import { randomUUID, randomBytes } from 'crypto';
import { Readable } from 'stream';
import { CreateWriteStreamOptions } from '@google-cloud/storage';
import { faker } from '@faker-js/faker';
import { stub } from 'sinon';
import { StubbedStorage } from './stubStorage.types';
import { GoogleCloudStorage } from 'entities/Storage';
import {
  UploadDestinationOptions,
  StorageUploadedFile
} from 'entities/Storage';

/** Create a stub for the Storage entity */
export function stubStorage(
  uploadOverride: Partial<StorageUploadedFile> = {}
): StubbedStorage {
  const upload = stub(GoogleCloudStorage, 'upload').callsFake(
    async (
      readStream: Readable,
      bucket: string,
      destinationOptions: UploadDestinationOptions = {},
      storageOptions: CreateWriteStreamOptions = {}
    ) => {
      readStream.resume(); // Pause the stream
      const path = GoogleCloudStorage.generateFileDestination(destinationOptions);
      return {
        kind: 'storage#object',
        id: `${bucket}/${path}/${randomUUID()}`,
        selfLink: `https://www.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(path)}`,
        mediaLink: `https://storage.googleapis.com/download/storage/v1/b/${bucket}/o/${encodeURIComponent(
          path
        )}?generation=1610116408152540&alt=media`,
        name: path,
        bucket,
        generation: randomUUID(),
        metageneration: '1',
        contentType: (
          storageOptions.metadata as {
            /** file type */
            fileType: string;
          }
        )?.fileType,
        storageClass: 'STANDARD',
        size: '4',
        md5Hash: 'CY9rzUYh03PK3k6DJie09g==',
        crc32c: 'hqBywA==',
        etag: 'CNyjuITHjO4CEAE=',
        timeCreated: new Date().toISOString(),
        updated: new Date().toISOString(),
        timeStorageClassUpdated: new Date().toISOString(),
        ...uploadOverride
      };
    }
  );
  const remove = stub(Storage, 'delete').resolves();

  const download = stub(Storage, 'download').callsFake(
    async (bucket: string, path: string) => {
      const stream = new Readable();
      stream.push(faker.lorem.paragraph());
      stream.push(null); // EOF
      const metadata: StorageUploadedFile = {
        bucket,
        name: path,
        contentType: faker.system.mimeType(),
        size: `${faker.number.int()}`,
        timeCreated: new Date().toISOString(),
        updated: new Date().toISOString(),
        md5Hash: randomBytes(32).toString('base64'),
        crc32c: randomBytes(32).toString('base64'),
        storageClass: 'normal'
      };
      return { stream, metadata };
    }
  );
  return { upload, remove, download };
}
