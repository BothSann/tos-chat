import { CUID } from '../common/parse-cuid.pipe.js';

export interface MessageCursor {
  createdAt: Date;
  id: string;
}

const ISO_TIMESTAMP = /^[1-9]\d{3}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function encodeCursor({ createdAt, id }: MessageCursor): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString('base64url');
}

export function decodeCursor(cursor: string): MessageCursor | null {
  const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
  const [timestamp = '', id = '', ...rest] = decoded.split('|');
  if (rest.length > 0 || !ISO_TIMESTAMP.test(timestamp) || !CUID.test(id)) {
    return null;
  }

  const createdAt = new Date(timestamp);
  if (Number.isNaN(createdAt.getTime())) return null;

  const parsed = { createdAt, id };
  return encodeCursor(parsed) === cursor ? parsed : null;
}
