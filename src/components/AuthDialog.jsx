import { useState } from 'react';

export function AuthDialog({ initialMode = 'login', onClose, onSubmit }) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      await onSubmit(mode, { name, email, password });
    } catch (submitError) {
      setError(submitError.message || 'We could not complete that request.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="auth-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="auth-close" type="button" onClick={onClose} aria-label="Close account dialog">×</button>
        <div className="auth-dialog-mark">T</div>
        <p className="auth-eyebrow">Welcome to TrustRank</p>
        <h2 id="auth-title">{mode === 'register' ? 'Create your account' : 'Welcome back'}</h2>
        <p className="auth-intro">Sign in to share one review for each product.</p>
        <div className="auth-mode-switch" role="tablist" aria-label="Account action">
          <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>Sign in</button>
          <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); }}>Create account</button>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <label>Display name
              <input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={60} required />
            </label>
          )}
          <label>Email address
            <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required />
          </label>
          <label>Password
            <input type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={10} maxLength={128} required />
            {mode === 'register' && <span className="auth-field-hint">Use at least 10 characters.</span>}
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button type="submit" className="auth-submit" disabled={pending}>
            {pending ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <p className="auth-footnote">Demo account · Use at least 10 characters for your password.</p>
      </section>
    </div>
  );
}

export default AuthDialog;
