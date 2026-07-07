import './globals.css';
import { getSession } from '@/lib/auth';
import Nav from './Nav';

export const metadata = {
  title: 'Pilotagem',
  description: 'Controle de pilotagem de peças',
};

export default function RootLayout({ children }) {
  const session = getSession();
  return (
    <html lang="pt-BR">
      <body>
        {session && <Nav session={session} />}
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
