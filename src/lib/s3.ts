import {
  GetObjectCommand,
  type GetObjectCommandInput,
  PutObjectCommand,
  type PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import type { Readable } from 'node:stream';
import { env } from './env';

export type UploadStreamOptions = {
  contentType?: string;
  metadata?: Record<string, string>;
  acl?: 'private' | 'public-read' | 'public-read-write' | 'authenticated-read';
  partSizeBytes?: number;
  queueSize?: number;
};

export type GetStreamOptions = {
  range?: string;
  ifMatch?: string;
  ifNoneMatch?: string;
};

export class S3Service {
  private s3: S3Client;
  private defaultBucket: string;

  constructor(defaultBucket = env().AWS_BUCKET_NAME) {
    this.s3 = new S3Client({
      region: env().AWS_REGION,
      credentials: {
        accessKeyId: env().AWS_ACCESS_KEY_ID,
        secretAccessKey: env().AWS_SECRET_ACCESS_KEY,
      },
    });
    this.defaultBucket = defaultBucket;
  }

  /** Multipart streaming upload — safe for bodies of unknown length. */
  public async uploadStream(
    key: string,
    body: Readable | ReadableStream | Buffer,
    opts: UploadStreamOptions = {},
    bucket = this.defaultBucket,
  ): Promise<{ bucket: string; key: string; etag?: string; versionId?: string }> {
    const upload = new Upload({
      client: this.s3,
      params: {
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: opts.contentType,
        Metadata: opts.metadata,
        ACL: opts.acl,
      },
      partSize: opts.partSizeBytes ?? 8 * 1024 * 1024,
      queueSize: opts.queueSize ?? 4,
      leavePartsOnError: false,
    });

    const res = (await upload.done()) as { ETag?: string; VersionId?: string };
    return { bucket, key, etag: res.ETag, versionId: res.VersionId };
  }

  public async putObjectStream(
    key: string,
    body: Readable | Buffer,
    opts: UploadStreamOptions & { contentLength?: number } = {},
    bucket = this.defaultBucket,
  ): Promise<{ bucket: string; key: string; etag?: string; versionId?: string }> {
    const res = await this.s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: opts.contentType,
        ContentLength: opts.contentLength,
        Metadata: opts.metadata,
        ACL: opts.acl,
      }),
    );
    return { bucket, key, etag: res.ETag, versionId: res.VersionId };
  }

  public async getObjectStream(
    key: string,
    opts: GetStreamOptions = {},
    bucket = this.defaultBucket,
  ): Promise<{
    stream: Readable;
    contentType?: string;
    contentLength?: number;
    etag?: string;
    lastModified?: Date;
  }> {
    const input: GetObjectCommandInput = {
      Bucket: bucket,
      Key: key,
      Range: opts.range,
      IfMatch: opts.ifMatch,
      IfNoneMatch: opts.ifNoneMatch,
    };
    const res = await this.s3.send(new GetObjectCommand(input));
    if (!res.Body) throw new Error('S3: empty body');

    return {
      stream: res.Body as Readable,
      contentType: res.ContentType,
      contentLength: typeof res.ContentLength === 'number' ? res.ContentLength : undefined,
      etag: res.ETag,
      lastModified: res.LastModified,
    };
  }

  public async putJson<T>(
    key: string,
    data: T,
    bucket = this.defaultBucket,
  ): Promise<{ key: string; bucket: string }> {
    const body = Buffer.from(JSON.stringify(data));
    await this.s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: 'application/json; charset=utf-8',
        ContentLength: body.length,
      }),
    );
    return { key, bucket };
  }

  public async getJson<T>(key: string, bucket = this.defaultBucket): Promise<T> {
    return (await this.getJsonWithEtag<T>(key, bucket)).data;
  }

  public async getJsonWithEtag<T>(
    key: string,
    bucket = this.defaultBucket,
  ): Promise<{ data: T; etag: string | null }> {
    const res = await this.s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!res.Body) throw new Error('S3: empty body');

    const chunks: Buffer[] = [];
    for await (const chunk of res.Body as unknown as Readable) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return {
      data: JSON.parse(Buffer.concat(chunks).toString('utf-8')) as T,
      etag: res.ETag ?? null,
    };
  }

  /** Optimistic concurrency: IfMatch on a known etag, IfNoneMatch:* to create. */
  public async putJsonConditional<T>(
    key: string,
    data: T,
    etag: string | null,
    bucket = this.defaultBucket,
  ): Promise<{ key: string; bucket: string; etag: string | null }> {
    const body = Buffer.from(JSON.stringify(data));
    const params: PutObjectCommandInput = {
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: 'application/json; charset=utf-8',
      ContentLength: body.length,
    };
    if (etag) params.IfMatch = etag;
    else params.IfNoneMatch = '*';

    const res = await this.s3.send(new PutObjectCommand(params));
    return { key, bucket, etag: res.ETag ?? null };
  }
}

let service: S3Service | null = null;

export function getS3(): S3Service {
  if (!service) service = new S3Service();
  return service;
}
