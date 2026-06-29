"use client"

import { useState, useEffect, useCallback } from "react"
import { Mail } from "lucide-react"
import { getRecentEmails, getAdminClientEmails, getClientEmails } from "@/lib/api"
import { useClient } from "@/lib/clientContext"
import { decodeToken } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface EmailLogEntry {
  id: string
  messageId: string
  recipient: string
  subject: string
  sentAt: string
  status: "sent" | "failed"
  jobId: string
  delivered?: boolean
  opened?: boolean
  bounced?: boolean
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (local.length <= 2) return `${local[0]}***@${domain}`
  return `${local.slice(0, 2)}***@${domain}`
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function SkeletonRow() {
  return (
    <tr className="border-b border-[var(--border)]">
      {[...Array(8)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-[var(--muted)] animate-pulse" />
        </td>
      ))}
    </tr>
  )
}

type Preset = "all" | "1" | "7" | "30" | "90" | "custom"
type StatusFilter = "all" | "sent" | "delivered" | "bounced" | "failed"

const LIMIT_OPTIONS = [100, 200, 500, 1000]

function getEmailStatus(email: EmailLogEntry): StatusFilter {
  if (email.bounced) return "bounced"
  if (email.delivered) return "delivered"
  if (email.status === "sent") return "sent"
  return "failed"
}

function StatusBadge({ email }: { email: EmailLogEntry }) {
  if (email.bounced) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        Bounced
      </span>
    )
  }
  if (email.delivered) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        Delivered
      </span>
    )
  }
  if (email.status === "sent") {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
        Sent
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
      Failed
    </span>
  )
}

export default function RecentEmailsPage() {
  const { role, selectedClientId } = useClient()
  const [emails, setEmails] = useState<EmailLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [limit, setLimit] = useState(100)
  const [preset, setPreset] = useState<Preset>("all")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const fetchEmails = useCallback(async () => {
    setLoading(true)
    try {
      let params: Parameters<typeof getRecentEmails>[0] = { limit }

      if (preset === "custom" && customFrom && customTo) {
        params = { limit, from: customFrom, to: customTo }
      } else if (preset !== "all") {
        params = { limit, days: parseInt(preset) }
      }

      const effectiveRole = decodeToken()?.role
      const isAdmin = effectiveRole === "admin"
      const isClient = effectiveRole === "client"
      let data: { emails: EmailLogEntry[] }
      if (isAdmin && selectedClientId) {
        const adminData = await getAdminClientEmails(selectedClientId, { limit })
        data = { emails: adminData.emails as EmailLogEntry[] }
      } else if (isClient) {
        const clientData = await getClientEmails({ limit })
        data = { emails: clientData.emails as unknown as EmailLogEntry[] }
      } else {
        data = await getRecentEmails(params)
      }
      setEmails(data.emails ?? [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [limit, preset, customFrom, customTo, role, selectedClientId])

  useEffect(() => {
    if (preset !== "custom") {
      fetchEmails()
      const interval = setInterval(fetchEmails, 30_000)
      return () => clearInterval(interval)
    }
  }, [preset, limit, fetchEmails])

  const handleCustomApply = () => {
    if (customFrom && customTo) fetchEmails()
  }

  const filteredEmails = statusFilter === "all"
    ? emails
    : emails.filter(e => getEmailStatus(e) === statusFilter)

  const counts = {
    all: emails.length,
    sent: emails.filter(e => getEmailStatus(e) === "sent").length,
    delivered: emails.filter(e => getEmailStatus(e) === "delivered").length,
    bounced: emails.filter(e => getEmailStatus(e) === "bounced").length,
    failed: emails.filter(e => getEmailStatus(e) === "failed").length,
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-indigo-500" />
            <div>
              <h1 className="text-lg font-bold leading-none">Recent Emails</h1>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                Email history from your database
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Date preset */}
            <Select value={preset} onValueChange={(v) => setPreset(v as Preset)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="1">Today</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 3 months</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>

            {/* Limit */}
            <select
              value={limit}
              onChange={(e) => { setLoading(true); setLimit(Number(e.target.value)); }}
              className="text-sm border border-[var(--border)] rounded-md px-3 py-1.5 bg-[var(--background)] text-[var(--foreground)] cursor-pointer"
            >
              {LIMIT_OPTIONS.map(opt => (
                <option key={opt} value={opt}>Limit {opt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom date row */}
        {preset === "custom" && (
          <div className="px-6 pb-3 flex items-center gap-3">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="text-sm border border-[var(--border)] rounded-md px-3 py-1.5 bg-[var(--background)] text-[var(--foreground)]"
            />
            <span className="text-sm text-[var(--muted-foreground)]">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="text-sm border border-[var(--border)] rounded-md px-3 py-1.5 bg-[var(--background)] text-[var(--foreground)]"
            />
            <Button size="sm" onClick={handleCustomApply} disabled={!customFrom || !customTo}>
              Apply
            </Button>
          </div>
        )}
      </header>

      <main className="px-6 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
            {error}. Make sure the backend is running at{" "}
            <code className="font-mono">http://localhost:3006</code>
          </div>
        )}

        {/* Status filter buttons */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {(["all", "sent", "delivered", "bounced", "failed"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${
                statusFilter === f
                  ? f === "bounced" || f === "failed"
                    ? "bg-red-500 text-white border-red-500"
                    : f === "delivered"
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : f === "sent"
                    ? "bg-yellow-500 text-white border-yellow-500"
                    : "bg-indigo-500 text-white border-indigo-500"
                  : "bg-[var(--background)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--foreground)]"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}{!loading && ` (${counts[f]})`}
            </button>
          ))}
        </div>

        {!loading && (
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            Showing {filteredEmails.length} email{filteredEmails.length !== 1 ? "s" : ""}
            {statusFilter !== "all" && ` · filtered by "${statusFilter}"`}
          </p>
        )}

        <div className="rounded-lg border border-[var(--border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)] w-10">#</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Email</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Subject</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Status</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--muted-foreground)]">Sent</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--muted-foreground)]">Delivered</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--muted-foreground)]">Bounced</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
              ) : filteredEmails.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--muted-foreground)]">
                      <Mail className="h-10 w-10 opacity-30" />
                      <p className="text-sm">No emails found for this period</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmails.map((email, index) => (
                  <tr
                    key={email.id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">{index + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs">{maskEmail(email.recipient)}</td>
                    <td className="px-4 py-3 text-[var(--foreground)] max-w-xs truncate">{email.subject}</td>
                    <td className="px-4 py-3">
                      <StatusBadge email={email} />
                    </td>
                    <td className="px-4 py-3 text-center text-emerald-500">✓</td>
                    <td className="px-4 py-3 text-center">
                      {email.delivered ? <span className="text-emerald-500">✓</span> : <span className="text-[var(--muted-foreground)]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {email.bounced ? <span className="text-red-500">✓</span> : <span className="text-[var(--muted-foreground)]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)] whitespace-nowrap">
                      {formatTime(email.sentAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
