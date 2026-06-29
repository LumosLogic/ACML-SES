"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { decodeToken } from "./auth"
import { getAdminClients, ClientKey } from "./api"

interface ClientContextValue {
  role: string
  clients: ClientKey[]
  selectedClientId: string
  selectedClientName: string
  setSelectedClientId: (id: string) => void
}

const ClientContext = createContext<ClientContextValue>({
  role: "",
  clients: [],
  selectedClientId: "",
  selectedClientName: "",
  setSelectedClientId: () => {},
})

export function ClientProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState("")
  const [clients, setClients] = useState<ClientKey[]>([])
  const [selectedClientId, setSelectedClientId] = useState("")

  useEffect(() => {
    const payload = decodeToken()
    if (!payload) return
    setRole(payload.role)

    if (payload.role === "admin") {
      getAdminClients()
        .then(({ keys }) => {
          setClients(keys)
          const stored = localStorage.getItem("acml_selected_client")
          setSelectedClientId(stored && keys.find(k => k.id === stored) ? stored : (keys[0]?.id ?? ""))
        })
        .catch(() => {})
    } else {
      // client: fixed to their own client_id
      setSelectedClientId(payload.clientId ?? "")
    }
  }, [])

  function handleSelect(id: string) {
    setSelectedClientId(id)
    localStorage.setItem("acml_selected_client", id)
  }

  const selected = clients.find(c => c.id === selectedClientId)
  const selectedClientName = selected?.client_name ?? ""

  return (
    <ClientContext.Provider value={{ role, clients, selectedClientId, selectedClientName, setSelectedClientId: handleSelect }}>
      {children}
    </ClientContext.Provider>
  )
}

export function useClient() {
  return useContext(ClientContext)
}
