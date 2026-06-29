"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Mail, LogOut, Key, Users, Building2 } from "lucide-react"
import { clearAuth } from "@/lib/auth"
import { useClient } from "@/lib/clientContext"

const clientNavItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Recent Emails", href: "/recent", icon: Mail },
]

const adminNavItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Recent Emails", href: "/recent", icon: Mail },
  { label: "Clients", href: "/clients", icon: Key },
  { label: "Users", href: "/users", icon: Users },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { role, clients, selectedClientId, selectedClientName, setSelectedClientId, username } = useClient()

  function handleLogout() {
    clearAuth()
    router.replace("/login")
  }

  const navItems = role === "admin" ? adminNavItems : clientNavItems
  const initials = username ? username.slice(0, 2).toUpperCase() : "?"

  return (
    <aside className="fixed left-0 top-0 h-full w-[220px] bg-slate-900 flex flex-col z-20">
      <div className="px-5 py-5 border-b border-slate-700">
        <h2 className="text-white font-bold text-sm tracking-wide uppercase">Email Dashboard</h2>
      </div>

      {/* Company name — client role */}
      {role === "client" && selectedClientName && (
        <div className="px-3 pt-3 pb-1">
          <p className="text-xs text-slate-500 uppercase tracking-wide px-2 mb-1.5 flex items-center gap-1.5">
            <Building2 className="h-3 w-3" /> Company
          </p>
          <p className="text-xs text-white px-2.5 py-2 bg-slate-800 rounded-lg truncate">{selectedClientName}</p>
        </div>
      )}

      {/* Company selector — admin only */}
      {role === "admin" && clients.length > 0 && (
        <div className="px-3 pt-3 pb-1">
          <p className="text-xs text-slate-500 uppercase tracking-wide px-2 mb-1.5 flex items-center gap-1.5">
            <Building2 className="h-3 w-3" /> Company
          </p>
          <select
            value={selectedClientId}
            onChange={e => setSelectedClientId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 text-white text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.client_name}</option>
            ))}
          </select>
        </div>
      )}

      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Profile + Logout */}
      <div className="px-3 py-4 border-t border-slate-700 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800">
          <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate capitalize">{username || "—"}</p>
            <span className={`inline-block text-xs px-1.5 py-0.5 rounded font-medium ${
              role === "admin" ? "bg-indigo-500/20 text-indigo-300" : "bg-emerald-500/20 text-emerald-300"
            }`}>
              {role || "—"}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  )
}
