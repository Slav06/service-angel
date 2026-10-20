import { eq } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/db';
import { files, leadRequests } from '@/db/schema';
import { getUser } from '@/lib/auth';

// Download a request attachment. Only the owner/admins and the rep who made the request may see it.
export async function GET(_req: NextRequest, ctx: RouteContext<'/files/[id]'>) {
  const user = await getUser();
  if (!user) return new NextResponse('Sign in first.', { status: 401 });
  const db = await getDb();
  const [row] = await db
    .select({ file: files, repId: leadRequests.repId })
    .from(files)
    .innerJoin(leadRequests, eq(leadRequests.id, files.requestId))
    .where(eq(files.id, Number((await ctx.params).id) || 0));
  if (!row || (user.role !== 'admin' && row.repId !== user.id)) return new NextResponse('Not found.', { status: 404 });
  return new NextResponse(new Uint8Array(row.file.data), {
    headers: {
      'Content-Type': row.file.contentType,
      'Content-Disposition': `attachment; filename="${row.file.name.replace(/"/g, '')}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
