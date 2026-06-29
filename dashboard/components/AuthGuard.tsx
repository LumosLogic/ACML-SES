"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"
import { Sidebar } from "@/components/Sidebar"
import { ClientProvider } from "@/lib/clientContext"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (pathname === "/login") {
      setReady(true)
      return
    }
    if (!isAuthenticated()) {
      router.replace("/login")
    } else {
      setReady(true)
    }
  }, [pathname, router])

  if (!ready) return null

  if (pathname === "/login") {
    return <>{children}</>
  }

  return (
    <ClientProvider>
      <Sidebar />
      <div className="ml-[220px] flex flex-col min-h-full">{children}</div>
    </ClientProvider>
  )
}
