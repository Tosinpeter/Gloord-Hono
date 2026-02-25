import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { writeFile, mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { db } from '../db/index.js';
import { uploadedFiles, type UploadedFileRow } from '../db/schema.js';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export const uploadRoute = new Hono();

function toPublicFile(row: UploadedFileRow) {
  return {
    id: row.id,
    name: row.filename,
    filename: row.filename,
    size: row.size_bytes,
    size_bytes: row.size_bytes,
    mimeType: row.mime_type ?? undefined,
    createdAt: row.createdAt,
  };
}

// Ensure uploads directory exists
async function ensureUploadsDir() {
  await mkdir(UPLOADS_DIR, { recursive: true });
}

// POST /api/upload - upload a file (multipart: file, userId)
uploadRoute.post('/', async (c) => {
  try {
    await ensureUploadsDir();
    const body = await c.req.parseBody();
    const file = body['file'];
    const userId = typeof body['userId'] === 'string' ? body['userId'] : undefined;

    if (!userId) {
      return c.json({ success: false, error: 'user_id_required' }, 400);
    }

    if (!file || typeof file === 'string') {
      return c.json({ success: false, error: 'file_required' }, 400);
    }

    const buffer = await (file as File).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const sizeBytes = bytes.length;
    const ext = path.extname((file as File).name) || '';
    const filename = (file as File).name;
    const storedName = `${randomUUID()}${ext}`;
    const filePath = path.join(UPLOADS_DIR, storedName);

    await writeFile(filePath, bytes);

    const [inserted] = await db
      .insert(uploadedFiles)
      .values({
        user_id: userId,
        filename,
        file_path: filePath,
        mime_type: (file as File).type || null,
        size_bytes: sizeBytes,
      })
      .returning();

    if (!inserted) {
      return c.json({ success: false, error: 'insert_failed' }, 500);
    }

    return c.json({
      success: true,
      data: toPublicFile(inserted),
    });
  } catch (err) {
    console.error('Upload error:', err);
    return c.json({ success: false, error: 'upload_failed' }, 500);
  }
});

// GET /api/upload?userId=... - list files for user
uploadRoute.get('/', async (c) => {
  const userId = c.req.query('userId');
  if (!userId) {
    return c.json({ success: false, error: 'user_id_required' }, 400);
  }

  const rows = await db
    .select()
    .from(uploadedFiles)
    .where(eq(uploadedFiles.user_id, userId))
    .orderBy(uploadedFiles.createdAt);

  return c.json({
    success: true,
    data: rows.map(toPublicFile),
  });
});

// DELETE /api/upload?fileId=... - delete file and record
uploadRoute.delete('/', async (c) => {
  const fileId = c.req.query('fileId');
  if (!fileId) {
    return c.json({ success: false, error: 'file_id_required' }, 400);
  }

  const [row] = await db
    .select()
    .from(uploadedFiles)
    .where(eq(uploadedFiles.id, fileId))
    .limit(1);

  if (!row) {
    return c.json({ success: false, error: 'file_not_found' }, 404);
  }

  try {
    await unlink(row.file_path);
  } catch {
    // ignore if file already missing
  }

  await db.delete(uploadedFiles).where(eq(uploadedFiles.id, fileId));

  return c.json({ success: true });
});
