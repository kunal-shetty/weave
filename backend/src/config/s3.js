import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let s3Client = null;

export function getS3Client() {
  if (!s3Client) {
    const region = process.env.AWS_REGION || 'us-east-1';
    s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

export const S3_BUCKET = process.env.AWS_S3_BUCKET || 'codex-wireframes';

/**
 * Upload a buffer to S3.
 * @param {string} key - S3 object key (e.g. wireframes/sectionId.png)
 * @param {Buffer} buffer - file buffer
 * @param {string} contentType - MIME type
 * @returns {string} public S3 URL or key
 */
export async function uploadToS3(key, buffer, contentType) {
  const client = getS3Client();
  await client.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
}

/**
 * Get a pre-signed URL for temporary access.
 */
export async function getPresignedUrl(key, expiresIn = 3600) {
  const client = getS3Client();
  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Delete object from S3.
 */
export async function deleteFromS3(key) {
  const client = getS3Client();
  await client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
}
