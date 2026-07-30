import { loginAction } from '@/app/actions';

export default function LoginPage({ searchParams }) {
  return (
    <div className="auth-card">
      <h1>Pilotagem</h1>
      <p className="subtitle">Entre com seu usuário e senha</p>
      {searchParams?.erro && <p className="error">Usuário ou senha inválidos.</p>}
      <form action={loginAction} className="form">
        <label>
          Usuário
          <input name="usuario" required autoFocus />
        </label>
        <label>
          Senha
          <input type="password" name="senha" required />
        </label>
        <button className="btn" type="submit">
          Entrar
        </button>
      </form>
    </div>
  );
}
