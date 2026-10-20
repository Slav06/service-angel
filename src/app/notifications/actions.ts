'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { markRead } from '@/lib/notify';

export async function markAllRead() {
  const user = await requireUser();
  await markRead(user.id);
  revalidatePath(user.role === 'admin' ? '/admin' : '/portal', 'layout');
}
