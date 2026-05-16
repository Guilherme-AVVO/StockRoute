import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import './Login.css';

// Mensagens amigáveis exibidas dentro do layout original da tela.
const ERROR_MESSAGES = {
  invalid_credentials: 'Credenciais inválidas. Verifique seu e-mail e senha.',
  inactive_user: 'Usuário inativo. Procure um administrador.',
  rate_limit: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.',
  network: 'Não foi possível conectar ao servidor. Verifique se o backend está rodando.',
  unexpected: 'Erro inesperado ao tentar entrar. Tente novamente.',
};

function Logo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-label="Moto Madeiras">
      <path d="M6 14.5L18 6l12 8.5V30a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V14.5z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" fill="none" />
      <path d="M11 32V22h14v10" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" />
      <circle cx="14.5" cy="26" r="1.1" fill="currentColor" />
      <circle cx="21.5" cy="26" r="1.1" fill="currentColor" />
      <path d="M6 14.5h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="11" width="16" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1.4" fill="currentColor" />
    </svg>
  );
}

function EyeIcon({ off }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      {off ? (
        <>
          <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M10.6 6.2A10 10 0 0 1 12 6c4.5 0 8.4 3 10 6a13.4 13.4 0 0 1-3.4 4.2M6.6 6.6C4.7 8 3.3 9.9 2 12c1.6 3 5.5 6 10 6 1.7 0 3.3-.4 4.7-1.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
        </>
      ) : (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
        </>
      )}
    </svg>
  );
}

function AlertIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="login-spinner" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" fill="none" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function StatusBar() {
  return (
    <div className="ios-status-bar" aria-hidden="true">
      <div className="ios-status-side">
        <span>9:41</span>
      </div>
      <div className="ios-status-icons">
        <svg width="19" height="12" viewBox="0 0 19 12">
          <rect x="0" y="7.5" width="3.2" height="4.5" rx="0.7" fill="currentColor" />
          <rect x="4.8" y="5" width="3.2" height="7" rx="0.7" fill="currentColor" />
          <rect x="9.6" y="2.5" width="3.2" height="9.5" rx="0.7" fill="currentColor" />
          <rect x="14.4" y="0" width="3.2" height="12" rx="0.7" fill="currentColor" />
        </svg>
        <svg width="17" height="12" viewBox="0 0 17 12">
          <path d="M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z" fill="currentColor" />
          <path d="M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z" fill="currentColor" />
          <circle cx="8.5" cy="10.5" r="1.5" fill="currentColor" />
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="currentColor" strokeOpacity="0.35" fill="none" />
          <rect x="2" y="2" width="20" height="9" rx="2" fill="currentColor" />
          <path d="M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z" fill="currentColor" fillOpacity="0.4" />
        </svg>
      </div>
    </div>
  );
}

function LoginField({ id, label, type, value, onChange, error, icon, trailing, autoComplete, inputMode, disabled }) {
  const [focused, setFocused] = useState(false);
  const floating = focused || value.length > 0;

  return (
    <div className="login-field">
      <div className={`login-field-box${focused ? ' is-focused' : ''}${error ? ' has-error' : ''}`}>
        <label className={`login-field-label${floating ? ' is-floating' : ''}`} htmlFor={id}>
          {label}
        </label>
        {icon && <div className="login-field-icon">{icon}</div>}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete}
          inputMode={inputMode}
          disabled={disabled}
        />
        {trailing && <div className="login-field-trailing">{trailing}</div>}
      </div>

      {error && (
        <div className="login-field-error" role="alert">
          <AlertIcon size={14} />
          {error}
        </div>
      )}
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();

  // Estados principais do formulário de login.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados auxiliares mantêm os comportamentos visuais do HTML original.
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});

  function validateForm() {
    const nextErrors = {};

    if (!email) nextErrors.email = 'Informe seu e-mail';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = 'E-mail inválido';

    if (!password) nextErrors.password = 'Informe sua senha';
    else if (password.length < 6) nextErrors.password = 'Mínimo 6 caracteres';

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      // Envia email/password ao backend usando o serviço baseado em fetch nativo.
      await login(email.trim(), password);
      // O AuthContext salva token/usuário e o App troca para o dashboard autenticado.
    } catch (err) {
      // Tratamento de erro sem expor senha ou token em tela/console.
      const message = ERROR_MESSAGES[err.message] ?? ERROR_MESSAGES.unexpected;
      setError(message);
      setPassword('');
    } finally {
      setLoading(false);
    }
  }

  function handleEmailChange(value) {
    setEmail(value);
    if (fieldErrors.email) setFieldErrors((current) => ({ ...current, email: undefined }));
  }

  function handlePasswordChange(value) {
    setPassword(value);
    if (fieldErrors.password) setFieldErrors((current) => ({ ...current, password: undefined }));
  }

  return (
    <div className="login-page">
      <div className="ios-device">
        <div className="ios-dynamic-island" aria-hidden="true" />
        <StatusBar />

        {/* Retorno JSX principal convertido do HTML oficial. */}
        <main className="login-screen">
          <div className="login-blob login-blob-primary" aria-hidden="true" />
          <div className="login-blob login-blob-secondary" aria-hidden="true" />
          <div className="login-blob login-blob-tertiary" aria-hidden="true" />

          <div className="login-content">
            <header className="login-brand">
              <span className="login-logo">
                <Logo size={32} />
              </span>
              <span className="login-brand-name">Moto Madeiras</span>
            </header>

            <section className="login-card" aria-labelledby="login-title">
              <div className="login-heading">
                <h1 id="login-title">Bem-vindo de volta</h1>
                <p>Acesse o painel operacional</p>
              </div>

              {error && (
                <div className="login-error-banner" role="alert">
                  <AlertIcon />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <LoginField
                  id="email"
                  label="E-mail"
                  type="email"
                  icon={<MailIcon />}
                  value={email}
                  onChange={handleEmailChange}
                  error={fieldErrors.email}
                  autoComplete="email"
                  inputMode="email"
                  disabled={loading}
                />

                <LoginField
                  id="password"
                  label="Senha"
                  type={showPassword ? 'text' : 'password'}
                  icon={<LockIcon />}
                  value={password}
                  onChange={handlePasswordChange}
                  error={fieldErrors.password}
                  autoComplete="current-password"
                  disabled={loading}
                  trailing={
                    <button
                      className="login-password-toggle"
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                      disabled={loading}
                    >
                      <EyeIcon off={!showPassword} />
                    </button>
                  }
                />

                <div className="login-options">
                  <label className="login-remember" htmlFor="remember">
                    <span className={`login-checkbox${remember ? ' is-checked' : ''}`} aria-hidden="true">
                      {remember && (
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6.5 5 9.5 10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <input
                      id="remember"
                      type="checkbox"
                      checked={remember}
                      onChange={(event) => setRemember(event.target.checked)}
                      disabled={loading}
                    />
                    Lembrar-me
                  </label>

                  <a href="#" onClick={(event) => event.preventDefault()}>
                    Esqueci minha senha
                  </a>
                </div>

                <button className="login-submit" type="submit" disabled={loading}>
                  {loading && <SpinnerIcon />}
                  {loading ? 'Autenticando...' : 'Entrar'}
                </button>
              </form>
            </section>

            <footer className="login-footer">v3.2.1 · Painel Operacional</footer>
          </div>
        </main>

        <div className="ios-home-indicator" aria-hidden="true" />
      </div>
    </div>
  );
}
