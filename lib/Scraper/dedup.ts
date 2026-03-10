import crypto from 'crypto';

export function contentHash(title: string, content: string): string {
  const normalized = (title + content.slice(0, 100))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}
