import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Hands the CMS a short-lived link for uploading ONE file. Only members of the `admin` group can ask
// (also enforced by the mutation's auth rule), and only for story / author / narrator files. This is
// what lets the storage rules be read-only for ordinary app users: nobody else can write or delete.
const s3 = new S3Client({});

const KEY_PATTERN = /^(stories|authors|narrators)\/[A-Za-z0-9._\/-]+$/;
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac',
]);
const LINK_SECONDS = 300;

export const handler = async (event: any): Promise<string> => {
  const groups: string[] = event.identity?.groups ?? event.identity?.claims?.['cognito:groups'] ?? [];
  if (!groups.includes('admin')) throw new Error('Not authorized');

  const key: unknown = event.arguments?.key;
  const contentType: unknown = event.arguments?.contentType;
  const bucket = process.env.STORAGE_BUCKET_NAME;

  if (!bucket) throw new Error('Storage is not configured');
  if (typeof key !== 'string' || key.length > 300 || !KEY_PATTERN.test(key) || key.includes('..') || key.includes('//')) {
    throw new Error('Invalid file path');
  }
  if (typeof contentType !== 'string' || !ALLOWED_TYPES.has(contentType)) {
    throw new Error('File type not allowed');
  }

  return getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
    { expiresIn: LINK_SECONDS },
  );
};
