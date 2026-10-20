import type { User } from '@/db/schema';

// Where someone lands after signing in: the owner's admin, or the rep's portal.
export const homeFor = (user: Pick<User, 'role'>) => (user.role === 'admin' ? '/admin' : '/portal');
