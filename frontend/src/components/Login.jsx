import React, { useState } from 'react';
import axios from 'axios';
import { API, COLORS } from '../constants';

function Login({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = async () => {
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const body = isRegister
        ? { ...form, email: form.username + '@chat.com' }
        : form;
      const res = await axios.post(`${API}${endpoint}`, body);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('username', res.data.username);
      localStorage.setItem('role', res.data.role);
      onLogin(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: COLORS.bg,
      fontFamily: '"Inter", "Segoe UI", sans-serif'
    }}>
      <div style={{
        background: COLORS.panel, borderRadius: '8px', padding: '40px',
        width: '360px', border: `1px solid ${COLORS.border}`
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
          <h2 style={{ color: COLORS.text, margin: 0, fontSize: '20px' }}>
            {isRegister ? 'Create account' : 'Welcome back'}
          </h2>
          <p style={{ color: COLORS.muted, fontSize: '14px', marginTop: '4px' }}>
            {isRegister ? 'Join the chat' : 'Sign in to continue'}
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(237,66,69,0.15)', border: '1px solid rgba(237,66,69,0.4)',
            borderRadius: '6px', padding: '10px 14px', marginBottom: '16px',
            color: COLORS.red, fontSize: '13px'
          }}>{error}</div>
        )}

        {['username', 'password'].map(field => (
          <div key={field} style={{ marginBottom: '14px' }}>
            <label style={{ color: COLORS.muted, fontSize: '12px', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {field}
            </label>
            <input
              type={field === 'password' ? 'password' : 'text'}
              value={form[field]}
              onChange={e => setForm({ ...form, [field]: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '6px',
                border: `1px solid ${COLORS.border}`, background: COLORS.input,
                color: COLORS.text, fontSize: '14px', boxSizing: 'border-box', outline: 'none'
              }}
            />
          </div>
        ))}

        <button onClick={handleSubmit} style={{
          width: '100%', padding: '11px', background: COLORS.accent,
          color: 'white', border: 'none', borderRadius: '6px',
          cursor: 'pointer', fontSize: '14px', fontWeight: '600', marginTop: '8px'
        }}>
          {isRegister ? 'Create Account' : 'Sign In'}
        </button>

        <button
          onClick={() => window.location.href = 'http://localhost:8080/oauth2/authorization/google'}
          style={{
            width: '100%', padding: '11px', background: 'transparent',
            color: COLORS.text, border: `1px solid ${COLORS.border}`,
            borderRadius: '6px', cursor: 'pointer', fontSize: '14px',
            marginTop: '10px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '8px'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: COLORS.muted }}>
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <button onClick={() => { setIsRegister(!isRegister); setError(''); }}
            style={{ background: 'none', border: 'none', color: COLORS.accent, cursor: 'pointer', fontSize: '13px' }}>
            {isRegister ? 'Sign in' : 'Register'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;
