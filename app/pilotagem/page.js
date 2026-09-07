import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { pilotistaStatus } from '@/lib/status';
import Icon from '@/app/icons';
import PilotagemLive from './PilotagemLive';

export default function PilotagemPage() {
  const session = getSession();
  if (session.role !== 'pilotista') redirect('/dashboard');

  const initial = pilotistaStatus(session.pilotista_id);

  return (
    <div>
      <h1>
        <span className="card-icon">
          <Icon name="scissors" />
        </span>
        Olá, {session.nome}
      </h1>
      <p className="subtitle">Sua produção de hoje, em tempo real</p>
      <PilotagemLive initial={initial} />
    </div>
  );
}
