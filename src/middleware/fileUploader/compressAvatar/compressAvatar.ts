import { Readable } from 'stream';
import sharp from 'sharp';
import { CompressionOptions } from './compressAvatar.types';

/**
 * Compress the user's avatar before uploading
 */
export function compressAvatar(
  fileStream: Readable,
  options: CompressionOptions
): Readable {
  const {
    resize: { height, width },
    quality
  } = options;
  const transform = sharp()
    .resize(width, height, {
      fit: 'cover'
    })
    .toFormat('jpeg', {
      quality: quality
    });
  fileStream.pipe(transform);
  return fileStream;
}
