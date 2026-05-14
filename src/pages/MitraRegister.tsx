import { apiSend } from '@/api/http'
import { Button } from '@/components/ui/Button'
import { useState } from 'react'

export default function MitraRegister() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [addressText, setAddressText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="paper grain rounded-[32px] p-7 md:p-9">
        <div className="font-display text-3xl">Pendaftaran Mitra</div>
        <div className="mt-2 text-sm text-[hsl(var(--muted))]">
          Untuk karyawan Belanjaku yang belanja dan mengantarkan pesanan. Setelah daftar, admin akan menyetujui dulu.
        </div>

        {done ? (
          <div className="mt-6 rounded-3xl bg-[hsl(var(--leaf)_/_0.08)] p-5 text-sm text-[hsl(var(--leaf))]">
            Pendaftaran terkirim. Silakan tunggu approval admin, lalu masuk memakai email/HP dan password yang kamu buat.
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            <div>
              <label className="text-sm text-[hsl(var(--muted))]">Nama</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
                placeholder="Nama lengkap"
              />
            </div>
            <div>
              <label className="text-sm text-[hsl(var(--muted))]">Nomor HP (WhatsApp)</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
                placeholder="08xxxxxxxxxx"
              />
            </div>
            <div>
              <label className="text-sm text-[hsl(var(--muted))]">Email (opsional)</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
                placeholder="nama@email.com"
              />
            </div>
            <div>
              <label className="text-sm text-[hsl(var(--muted))]">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
                placeholder="Minimal 8 karakter"
              />
            </div>
            <div>
              <label className="text-sm text-[hsl(var(--muted))]">Alamat</label>
              <textarea
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                className="mt-2 h-28 w-full resize-none rounded-3xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] p-4 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
                placeholder="Alamat lengkap"
              />
            </div>

            {error ? <div className="text-sm text-[hsl(var(--chili))]">{error}</div> : null}

            <Button
              disabled={submitting}
              onClick={async () => {
                try {
                  setSubmitting(true)
                  setError(null)
                  await apiSend('/api/mitra/register', 'POST', {
                    name: name.trim(),
                    phone: phone.trim(),
                    email: email.trim() || undefined,
                    password,
                    addressText: addressText.trim(),
                  })
                  setDone(true)
                } catch (e) {
                  setError((e as Error).message)
                } finally {
                  setSubmitting(false)
                }
              }}
            >
              {submitting ? 'Mengirim...' : 'Kirim pendaftaran'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

