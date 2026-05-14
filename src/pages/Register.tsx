import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Register() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const register = useAuthStore((s) => s.register)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (token && user) navigate('/', { replace: true })
  }, [navigate, token, user])

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="paper grain rounded-[32px] p-7 md:p-9">
        <div className="font-display text-3xl">Daftar</div>
        <div className="mt-2 text-sm text-[hsl(var(--muted))]">
          Buat akun untuk belanja di Belanjaku.
        </div>

        <div className="mt-6 grid gap-4">
          <div>
            <label className="text-sm text-[hsl(var(--muted))]">Nama</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama kamu"
              className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none placeholder:text-[hsl(var(--muted))] focus:border-[hsl(var(--leaf)_/_0.25)]"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm text-[hsl(var(--muted))]">Nomor HP (opsional)</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812xxxxxx"
                className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none placeholder:text-[hsl(var(--muted))] focus:border-[hsl(var(--leaf)_/_0.25)]"
              />
            </div>
            <div>
              <label className="text-sm text-[hsl(var(--muted))]">Email (opsional)</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none placeholder:text-[hsl(var(--muted))] focus:border-[hsl(var(--leaf)_/_0.25)]"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-[hsl(var(--muted))]">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Minimal 8 karakter"
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
                const payload = {
                  role: 'buyer' as const,
                  name: name.trim(),
                  phone: phone.trim() || undefined,
                  email: email.trim() || undefined,
                  password,
                }
                await register(payload)
                navigate('/', { replace: true })
              } catch (e) {
                setError((e as Error).message)
              } finally {
                setSubmitting(false)
              }
            }}
          >
            {submitting ? 'Membuat akun...' : 'Buat Akun'}
          </Button>

          <div className="text-center text-sm text-[hsl(var(--muted))]">
            Sudah punya akun?{' '}
            <Link to="/masuk" className="text-[hsl(var(--leaf))] underline underline-offset-4">
              Masuk
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
