"use client"

import { useState, useEffect, useCallback } from "react"
import { Key, Plus, CheckCircle2, XCircle, Copy, Check } from "lucide-react"
import { getAdminClients, createAdminClient, revokeAdminClient, activateAdminClient, ClientKey } from "@/lib/api"

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDomain, setNewDomain] = useState("")
  const [creating, setCreating] = useState(false)
  const [newApiKey, setNewApiKey] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    try {
      const data = await getAdminClients()
      setClients(data.keys)
    } catch {
      setError("Failed to load clients")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchClients() }, [fetchClients])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await createAdminClient({ client_name: newName.trim(), allowed_domain: newDomain.trim() })
      setNewApiKey(res.api_key)
      setNewName("")
      setNewDomain("")
      fetchClients()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create")
    } finally {
      setCreating(false)
    }
  }

  async function toggleClient(client: ClientKey) {
    try {
      if (client.is_active) await revokeAdminClient(client.id)
      else await activateAdminClient(client.id)
      fetchClients()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update")
    }
  }

  async function copyKey(key: string, id: string) {
    await navigator.clipboard.writeText(key)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-14 lg:top-0 z-10 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Key className="h-5 w-5 text-indigo-500" />
          <div>
            <h1 className="text-lg font-bold leading-none">Clients</h1>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Manage API keys and client access</p>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setNewApiKey("") }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" /> New Client
        </button>
      </header>

      <main className="px-6 py-8 space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* New client form */}
        {showForm && (
          <div className="rounded-xl border border-[var(--border)] p-6 space-y-4">
            <h2 className="font-semibold text-sm">New Client</h2>
            <form onSubmit={handleCreate} className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs text-[var(--muted-foreground)] mb-1">Client name</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Acme Corp"
                  required className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs text-[var(--muted-foreground)] mb-1">Allowed domain</label>
                <input value={newDomain} onChange={e => setNewDomain(e.target.value)} placeholder="e.g. mail.acme.com"
                  required className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-indigo-500" />
              </div>
              <button type="submit" disabled={creating}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
                {creating ? "Creating…" : "Create"}
              </button>
            </form>

            {newApiKey && (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-4">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-2">
                  ✅ Client created! The full API key is also available via the copy button in the table.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded px-3 py-2 break-all">
                    {newApiKey}
                  </code>
                  <button onClick={() => copyKey(newApiKey, "new")} className="shrink-0 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors">
                    {copiedId === "new" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-emerald-600" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Clients table */}
        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Client</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Domain</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">API Key</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Created</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--muted-foreground)]">Status</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border)]">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-[var(--muted)] animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : clients.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-[var(--muted-foreground)]">No clients yet</td></tr>
              ) : clients.map(client => (
                <tr key={client.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/30">
                  <td className="px-4 py-3 font-medium">{client.client_name}</td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">{client.allowed_domain || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[var(--muted-foreground)]">{client.key_preview}</span>
                      <button
                        onClick={() => copyKey(client.key, client.id)}
                        title="Copy full API key"
                        className="shrink-0 p-1 rounded hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      >
                        {copiedId === client.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">{new Date(client.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">
                    {client.is_active
                      ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />Active</span>
                      : <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500"><XCircle className="h-3.5 w-3.5" />Revoked</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => toggleClient(client)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                        client.is_active
                          ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
                          : "border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                      }`}>
                      {client.is_active ? "Revoke" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
