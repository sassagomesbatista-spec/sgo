import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default function Home() {
  const session = getSession();
  if (!session) redirect('/login');
  redirect(session.role === 'admin' ? '/dashboard' : '/lancar');
}
