import './globals.css';
import { getSession } from '@/lib/auth';
import Sidebar from './Sidebar';

export const metadata = {
  title: 'Pilotagem',
  description: 'Controle de pilotagem de peças',
};

export default function RootLayout({ children }) {
  const session = getSession();

  if (!session) {
    return (
      <html lang="pt-BR">
        <body>
          <main className="container">{children}</main>
        </body>
      </html>
    );
  }

  return (
    <html lang="pt-BR">
      <body>
        <div className="app-shell">
          <Sidebar session={session} />
          <main className="app-main">
            <div className="container">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
