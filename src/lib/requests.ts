import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { files, leadRequests, requestMessages, users, type LeadRequest } from '@/db/schema';

export const MAX_FILE_BYTES = 4 * 1024 * 1024; // Vercel caps request bodies at 4.5 MB

export const requestHref = (role: 'admin' | 'rep', id: number) => (role === 'admin' ? `/admin/requests/${id}` : `/portal/requests/${id}`);

export function describeRequest(r: Pick<LeadRequest, 'quantity' | 'niche' | 'area'>) {
  const what = [r.niche, r.area && `in ${r.area}`].filter(Boolean).join(' ');
  return `${r.quantity} lead${r.quantity === 1 ? '' : 's'}${what ? ` — ${what}` : ''}`;
}

// Validates an uploaded File from a form. Returns null when no file was chosen.
export async function readUpload(file: FormDataEntryValue | null): Promise<{ name: string; contentType: string; data: Buffer } | { error: string } | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_FILE_BYTES) return { error: 'That file is over 4 MB. Split it into smaller files or zip it.' };
  return {
    name: file.name.replace(/[^\w.\- ()]+/g, '_').slice(0, 120) || 'file',
    contentType: file.type || 'application/octet-stream',
    data: Buffer.from(await file.arrayBuffer()),
  };
}

export const isCsvLike = (f: { name: string; contentType: string }) =>
  /\.(csv|tsv|txt)$/i.test(f.name) || ['text/csv', 'text/tab-separated-values', 'text/plain'].includes(f.contentType);

export async function addMessage(
  requestId: number,
  msg: { authorId: number | null; body?: string | null; kind?: 'message' | 'event'; file?: { name: string; contentType: string; data: Buffer; importedCount?: number | null } },
) {
  const db = await getDb();
  let fileId: number | null = null;
  if (msg.file) {
    const [row] = await db
      .insert(files)
      .values({
        requestId,
        uploadedBy: msg.authorId,
        name: msg.file.name,
        contentType: msg.file.contentType,
        size: msg.file.data.length,
        data: msg.file.data,
        importedCount: msg.file.importedCount ?? null,
      })
      .returning({ id: files.id });
    fileId = row.id;
  }
  await db.insert(requestMessages).values({ requestId, authorId: msg.authorId, body: msg.body || null, kind: msg.kind ?? 'message', fileId });
  await db.update(leadRequests).set({ lastMessageAt: new Date() }).where(eq(leadRequests.id, requestId));
}

export async function loadThread(requestId: number) {
  const db = await getDb();
  return db
    .select({
      id: requestMessages.id,
      kind: requestMessages.kind,
      body: requestMessages.body,
      createdAt: requestMessages.createdAt,
      authorId: requestMessages.authorId,
      authorName: users.name,
      authorRole: users.role,
      fileId: files.id,
      fileName: files.name,
      fileSize: files.size,
      importedCount: files.importedCount,
    })
    .from(requestMessages)
    .leftJoin(users, eq(users.id, requestMessages.authorId))
    .leftJoin(files, eq(files.id, requestMessages.fileId))
    .where(eq(requestMessages.requestId, requestId))
    .orderBy(asc(requestMessages.createdAt), asc(requestMessages.id));
}
export type ThreadItem = Awaited<ReturnType<typeof loadThread>>[number];
