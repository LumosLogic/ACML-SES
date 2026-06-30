"use client"

import { useState, useEffect, useCallback, Fragment } from "react"
import { Users, Plus, Trash2, KeyRound } from "lucide-react"
import { getAdminUsers, createAdminUser, resetAdminUserPassword, deleteAdminUser, getAdminClients, AdminUser, ClientKey } from "@/lib/api"

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [clients, setClients] = useState<ClientKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ username: "", password: "", role: "client", client_id: "" })
  const [creating, setCreating] = useState(false)
  const [resetId, setResetId] = useState<string | null>(null)
  const [resetPw, setResetPw] = useState("")

  const fetchData = useCallback(async () => {
    try {
      const [usersData, clientsData] = await Promise.all([getAdminUsers(), getAdminClients()])
      setUsers(usersData.users)
      setClients(clientsData.keys)
    } catch {
      setError("Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError("")
    try {
      await createAdminUser({
        username: form.username.trim(),
        password: form.password,
        role: form.role,
        ...(form.role === "client" && form.client_id ? { client_id: form.client_id } : {}),
      })
      setForm({ username: "", password: "", role: "client", client_id: "" })
      setShowForm(false)
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user")
    } finally {
      setCreating(false)
    }
  }

  async function handleResetPassword(id: string) {
    if (!resetPw || resetPw.length < 8) { setError("Password must be at least 8 characters"); return }
    try {
      await resetAdminUserPassword(id, resetPw)
      setResetId(null)
      setResetPw("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password")
    }
  }

  async function handleDelete(id: string, username: string) {
    if (!confirm(`Delete user "${username}"?`)) return
    try {
      await deleteAdminUser(id)
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user")
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-14 lg:top-0 z-10 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-indigo-500" />
          <div>
            <h1 className="text-lg font-bold leading-none">Users</h1>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Manage dashboard accounts</p>
          </div>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="h-4 w-4" /> New User
        </button>
      </header>

      <main className="px-6 py-8 space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* New user form */}
        {showForm && (
          <div className="rounded-xl border border-[var(--border)] p-6 space-y-4">
            <h2 className="font-semibold text-sm">New User</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[var(--muted-foreground)] mb-1">Username</label>
                <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="e.g. john" required
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs text-[var(--muted-foreground)] mb-1">Password (min 8 chars)</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••" required minLength={8}
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs text-[var(--muted-foreground)] mb-1">Role</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-indigo-500">
                  <option value="client">Client</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {form.role === "client" && (
                <div>
                  <label className="block text-xs text-[var(--muted-foreground)] mb-1">Assign to Client</label>
                  <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                    required
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-indigo-500">
                    <option value="">Select client…</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
                  </select>
                </div>
              )}
              <div className="col-span-2 flex justify-end">
                <button type="submit" disabled={creating}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
                  {creating ? "Creating…" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users table */}
        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Username</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Role</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Client</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Created</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border)]">
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-[var(--muted)] animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-[var(--muted-foreground)]">No users yet</td></tr>
              ) : users.map(user => (
                <Fragment key={user.id}>
                  <tr className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/30">
                    <td className="px-4 py-3 font-medium capitalize">{user.username}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${
                        user.role === "admin" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      }`}>{user.role}</span>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">{user.client_name ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                      <button onClick={() => { setResetId(resetId === user.id ? null : user.id); setResetPw("") }}
                        className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
                        <KeyRound className="h-3.5 w-3.5" /> Reset PW
                      </button>
                      <button onClick={() => handleDelete(user.id, user.username)}
                        className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </td>
                  </tr>
                  {resetId === user.id && (
                    <tr className="border-b border-[var(--border)] bg-[var(--muted)]/20">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <input type="password" value={resetPw} onChange={e => setResetPw(e.target.value)}
                            placeholder="New password (min 8 chars)" minLength={8}
                            className="flex-1 border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--background)] focus:outline-none focus:border-indigo-500" />
                          <button onClick={() => handleResetPassword(user.id)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                            Save
                          </button>
                          <button onClick={() => setResetId(null)} className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
