import { randomUUID } from 'crypto';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { config } from '../config';

let client: S3Client | null = null;

function getClient() {
  const { accountId, accessKeyId, secretAccessKey, bucketName } = config.r2;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    const error: any = new Error('Avatar storage is not configured.');
    error.statusCode = 503;
    error.code = 'AVATAR_STORAGE_UNAVAILABLE';
    throw error;
  }
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return { client, bucketName };
}

function publicUrl(key: string) {
  const domain = config.r2.publicDomain.trim();
  if (!domain) {
    const error: any = new Error('Avatar storage public domain is not configured.');
    error.statusCode = 503;
    error.code = 'AVATAR_STORAGE_UNAVAILABLE';
    throw error;
  }
  const base = new URL(domain.includes('://') ? domain : `https://${domain}`);
  const prefix = base.pathname.replace(/\/$/, '');
  base.pathname = `${prefix}/${key.split('/').map(encodeURIComponent).join('/')}`;
  return base.toString();
}

export async function uploadAvatar(userId: string, body: Buffer, contentType: string) {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  const extension = extensions[contentType];
  if (!extension) {
    const error: any = new Error('Choose a JPEG, PNG, or WebP image.');
    error.statusCode = 400;
    error.code = 'UNSUPPORTED_IMAGE_TYPE';
    throw error;
  }

  const isJpeg = body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff;
  const isPng = body.length >= 8 && body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isWebp = body.length >= 12 && body.toString('ascii', 0, 4) === 'RIFF' && body.toString('ascii', 8, 12) === 'WEBP';
  if ((contentType === 'image/jpeg' && !isJpeg) || (contentType === 'image/png' && !isPng) || (contentType === 'image/webp' && !isWebp)) {
    const error: any = new Error('The selected file is not a valid JPEG, PNG, or WebP image.');
    error.statusCode = 400;
    error.code = 'INVALID_IMAGE_FILE';
    throw error;
  }

  const key = `avatars/${userId}/${randomUUID()}.${extension}`;
  const { client: storageClient, bucketName } = getClient();
  const url = publicUrl(key);
  await storageClient.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  return { key, url };
}

export async function deleteAvatar(key: string) {
  const { client: storageClient, bucketName } = getClient();
  await storageClient.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
}

