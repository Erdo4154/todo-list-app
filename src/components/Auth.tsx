import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'

type Mode = 'sign-in' | 'sign-up'

export default function Auth() {
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)

    const { error: authError } =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    if (authError) {
      setError(authError.message)
    } else if (mode === 'sign-up') {
      setMessage('Kayit olustu. Supabase ayarina gore e-postani onaylaman gerekebilir.')
    }

    setLoading(false)
  }

  return (
    <div className="auth-card">
      <h1>Supabase Todo</h1>
      <p className="subtitle">{mode === 'sign-in' ? 'Hesabina giris yap' : 'Yeni hesap olustur'}</p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="email">E-posta</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label htmlFor="password">Sifre</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={6}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Bekle...' : mode === 'sign-in' ? 'Giris yap' : 'Kayit ol'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {message && <p className="info">{message}</p>}

      <button
        type="button"
        className="link-button"
        onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
      >
        {mode === 'sign-in' ? 'Hesabin yok mu? Kayit ol' : 'Zaten hesabin var mi? Giris yap'}
      </button>
    </div>
  )
}
