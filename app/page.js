import { redirect } from 'next/navigation';
import { getSession, homeFor } from '@/lib/auth';

export default function Home() {
  const session = getSession();
  if (!session) redirect('/login');
  redirect(homeFor(session.role));
}
