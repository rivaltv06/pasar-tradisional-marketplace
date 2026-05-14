import { BottomNav } from '@/components/BottomNav'
import { TopBar } from '@/components/TopBar'
import { useAuthStore } from '@/stores/authStore'
import { useEffect } from 'react'

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate)
  const hydrated = useAuthStore((s) => s.hydrated)

  useEffect(() => {
    if (!hydrated) hydrate()
  }, [hydrate, hydrated])

  return (
    <div className="min-h-dvh pb-24 md:pb-10">
      <TopBar />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <BottomNav />
    </div>
  )
}

