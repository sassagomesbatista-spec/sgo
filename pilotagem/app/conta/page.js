import fs from 'fs';
import db, { BACKUP_DIR } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { changePasswordAction } from '@/app/actions';
import Icon from '@/app/icons';

export default function ContaPage() {
  const session = getSession();
  const isAdmin = session.role === 'admin';
  const usuarios = isAdmin ? db.prepare('SELECT usuario, nome, role FROM usuarios').all() : [];
  const backupsAutomaticos = isAdmin && fs.existsSync(BACKUP_DIR)
    ? fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.db')).sort().reverse()
    : [];

  return (
    <div className="card">
      <h1>
        <span className="card-icon">
          <Icon name="account" />
        </span>
        Minha Conta
      </h1>
      <p className="subtitle">
        Logada como {session.nome} ({isAdmin ? 'Administradora' : 'Assistente'})
      </p>

      <h2>Trocar Senha</h2>
      <form action={changePasswordAction} className="form">
        {isAdmin ? (
          <label>
            Usuário
            <select name="usuario_alvo" defaultValue={session.usuario}>
              {usuarios.map((u) => (
                <option key={u.usuario} value={u.usuario}>
                  {u.nome} ({u.usuario})
                </option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" name="usuario_alvo" value={session.usuario} />
        )}
        <label>
          Nova Senha
          <input type="password" name="nova_senha" minLength={4} required />
        </label>
        <button className="btn" type="submit">
          Salvar Nova Senha
        </button>
      </form>

      {isAdmin && (
        <>
          <h2>Backup dos Dados</h2>
          <p className="subtitle">
            O sistema salva uma cópia automática dos dados todo dia. Você também pode baixar
            uma cópia na hora, sempre que quiser.
          </p>
          <a href="/api/backup" className="btn" download>
            Baixar Backup Agora
          </a>

          {backupsAutomaticos.length > 0 && (
            <>
              <h2>Backups Automáticos</h2>
              <ul className="totals">
                {backupsAutomaticos.slice(0, 14).map((f) => (
                  <li key={f}>
                    <span>{f.replace('pilotagem-', '').replace('.db', '')}</span>
                    <a href={`/api/backup?file=${f}`} download>
                      Baixar
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
