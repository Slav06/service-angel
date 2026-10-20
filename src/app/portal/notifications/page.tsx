import { NotificationList } from '@/components/notification-list';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Notifications() {
  return <NotificationList user={await requireUser()} />;
}
