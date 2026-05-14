import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/'
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const login = useAuthStore((s) => s.login)

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (token && user) navigate(next, { replace: true })
  }, [navigate, next, token, user])

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="paper grain rounded-[32px] p-7 md:p-9">
        <div className="font-display text-3xl">Masuk</div>
        <div className="mt-2 text-sm text-[hsl(var(--muted))]">
          Gunakan email atau nomor HP yang terdaftar.
        </div>

        <div className="mt-6 grid gap-4">
          <div>
            <label className="text-sm text-[hsl(var(--muted))]">Email / Nomor HP</label>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="0812xxxxxx atau email"
              className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none placeholder:text-[hsl(var(--muted))] focus:border-[hsl(var(--leaf)_/_0.25)]"
            />
          </div>
          <div>
            <label className="text-sm text-[hsl(var(--muted))]">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none placeholder:text-[hsl(var(--muted))] focus:border-[hsl(var(--leaf)_/_0.25)]"
            />
          </div>

          {error ? <div className="text-sm text-[hsl(var(--chili))]">{error}</div> : null}

          <Button
            disabled={submitting}
            onClick={async () => {
              try {
                setSubmitting(true)
                setError(null)
                await login({ identifier: identifier.trim(), password })
                navigate(next, { replace: true })
              } catch (e) {
                setError((e as Error).message)
              } finally {
                setSubmitting(false)
              }
            }}
          >
            {submitting ? 'Masuk...' : 'Masuk'}
          </Button>

          <div className="text-center text-sm text-[hsl(var(--muted))]">
            Belum punya akun?{' '}
            <Link to="/daftar" className="text-[hsl(var(--leaf))] underline underline-offset-4">
              Daftar
            </Link>
          </div>
          <div className="text-center text-sm text-[hsl(var(--muted))]">
            Mau daftar mitra?{' '}
            <Link to="/mitra/daftar" className="text-[hsl(var(--leaf))] underline underline-offset-4">
              Daftar Mitra
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
