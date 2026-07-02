import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { getS3 } from './s3';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
};

/**
 * Streams a product photo to S3 and returns its public URL path
 * (served back through /uploads/<key> by a streaming route).
 */
export async function saveUpload(file: File): Promise<string> {
  const ext = EXT_BY_MIME[file.type];
  if (!ext) throw new Error(`Unsupported image type: ${file.type}`);
  const key = `products/${crypto.randomUUID()}${ext}`;
  await getS3().uploadStream(
    key,
    Readable.fromWeb(file.stream() as import('node:stream/web').ReadableStream),
    { contentType: file.type },
  );
  return `/uploads/${key}`;
}
