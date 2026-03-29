import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = 'article-images';
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

export async function uploadImage(buffer: Buffer, fileName: string, contentType: string): Promise<string> {
  await R2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: fileName,
    Body: buffer,
    ContentType: contentType,
  }));
  return `${PUBLIC_URL}/${fileName}`;
}
