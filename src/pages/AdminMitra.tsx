import { apiGet, apiSend } from '@/api/http'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

type Application = {
  id: string
  name: string
  email?: string
  phone: string
  addressText: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  reviewedAt?: string
  reviewedByUserId?: string
  approvedUserId?: string
}

export default function AdminMitra() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  const [rows, setRows] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | Application['status']>('all')

  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return rows
    return rows.filter((r) => r.status === statusFilter)
  }, [rows, statusFilter])

  const reload = async () => {
    if (!token) return
    const data = await apiGet<Application[]>('/api/admin/mitra-applications', token)
    setRows(data)
  }

  useEffect(() => {
    if (!user || !token) {
      navigate('/masuk?next=/admin/mitra', { replace: true })
      return
    }
    if (user.role !== 'admin') navigate('/', { replace: true })
  }, [navigate, token, user])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!token) return
      try {
        setLoading(true)
        setError(null)
        const data = await apiGet<Application[]>('/api/admin/mitra-applications', token)
        if (cancelled) return
        setRows(data)
      } catch (e) {
        if (cancelled) return
        setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <div className="space-y-6">
      <div className="paper grain rounded-[32px] p-6 md:p-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-display text-3xl">Admin Mitra</div>
            <div className="mt-1 text-sm text-[hsl(var(--muted))]">Approve pendaftaran mitra (karyawan).</div>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <Link to="/admin/pesanan">
              <Button variant="ghost">Pesanan</Button>
            </Link>
            <Link to="/admin/produk">
              <Button variant="ghost">Produk</Button>
            </Link>
            <Button variant="ghost" onClick={() => reload()}>
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {error ? <div className="paper rounded-3xl p-5 text-sm text-[hsl(var(--chili))]">{error}</div> : null}
      {notice ? <div className="paper rounded-3xl p-5 text-sm text-[hsl(var(--leaf))]">{notice}</div> : null}

      <div className="paper grain rounded-[32px] p-6 md:p-7">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm text-[hsl(var(--muted))]">Filter status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | Application['status'])}
              className="mt-2 h-11 w-full rounded-2xl border border-[hsl(var(--ink)_/_0.10)] bg-[hsl(var(--bg)_/_0.55)] px-4 text-[15px] outline-none focus:border-[hsl(var(--leaf)_/_0.25)]"
            >
              <option value="all">Semua</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="flex items-end text-sm text-[hsl(var(--muted))]">
            Total: {filteredRows.length} • Pending: {rows.filter((r) => r.status === 'pending').length}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="paper h-[340px] animate-pulse rounded-[32px] bg-[hsl(var(--ink)_/_0.04)]" />
      ) : filteredRows.length ? (
        <div className="space-y-3">
          {filteredRows.map((r) => (
            <div key={r.id} className="paper grain rounded-[28px] p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="font-display text-xl">{r.name}</div>
                  <div className="mt-1 text-sm text-[hsl(var(--muted))]">
                    {r.phone}
                    {r.email ? ` • ${r.email}` : ''}
                  </div>
                  <div className="mt-2 text-sm text-[hsl(var(--muted))]">{r.addressText}</div>
                  <div className="mt-2 text-xs text-[hsl(var(--muted))]">
                    {new Date(r.createdAt).toLocaleString('id-ID')} • {r.status.toUpperCase()}
                  </div>
                </div>

                {r.status === 'pending' ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      disabled={submitting}
                      onClick={async () => {
                        if (!token) return
                        try {
                          setSubmitting(true)
                          setError(null)
                          setNotice(null)
                          await apiSend(`/api/admin/mitra-applications/${encodeURIComponent(r.id)}`, 'PATCH', { action: 'approve' }, token)
                          setNotice('Mitra disetujui.')
                          await reload()
                        } catch (e) {
                          setError((e as Error).message)
                        } finally {
                          setSubmitting(false)
                        }
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={submitting}
                      onClick={async () => {
                        if (!token) return
                        try {
                          setSubmitting(true)
                          setError(null)
                          setNotice(null)
                          await apiSend(`/api/admin/mitra-applications/${encodeURIComponent(r.id)}`, 'PATCH', { action: 'reject' }, token)
                          setNotice('Mitra ditolak.')
                          await reload()
                        } catch (e) {
                          setError((e as Error).message)
                        } finally {
                          setSubmitting(false)
                        }
                      }}
                    >
                      Tolak
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="paper grain rounded-[32px] p-10 text-center">
          <div className="font-display text-3xl">Belum ada pendaftaran</div>
          <div className="mt-2 text-sm text-[hsl(var(--muted))]">Nanti pendaftaran mitra muncul di sini.</div>
        </div>
      )}
    </div>
  )
}
