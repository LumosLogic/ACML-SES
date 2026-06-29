"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { decodeToken } from "./auth"
import { getAdminClients, getClientInfo, ClientKey } from "./api"

interface ClientContextValue {
  role: string
  clients: ClientKey[]
  selectedClientId: string
  selectedClientName: string
  setSelectedClientId: (id: string) => void
  username: string
}

const ClientContext = createContext<ClientContextValue>({
  role: "",
  clients: [],
  selectedClientId: "",
  selectedClientName: "",
  setSelectedClientId: () => {},
  username: "",
})

export function ClientProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState("")
  const [username, setUsername] = useState("")
  const [clients, setClients] = useState<ClientKey[]>([])
  const [selectedClientId, setSelectedClientId] = useState("")
  const [clientName, setClientName] = useState("")

  useEffect(() => {
    const payload = decodeToken()
    if (!payload) return
    setRole(payload.role)
    setUsername(payload.username)

    if (payload.role === "admin") {
      getAdminClients()
        .then(({ keys }) => {
          setClients(keys)
          const stored = localStorage.getItem("acml_selected_client")
          setSelectedClientId(stored && keys.find(k => k.id === stored) ? stored : (keys[0]?.id ?? ""))
        })
        .catch(() => {})
    } else {
      // client: fixed to their own client_id, fetch their company name
      setSelectedClientId(payload.clientId ?? "")
      if (payload.clientId) {
        getClientInfo()
          .then(({ client }) => setClientName(client.client_name))
          .catch(() => {})
      }
    }
  }, [])

  function handleSelect(id: string) {
    setSelectedClientId(id)
    localStorage.setItem("acml_selected_client", id)
  }

  const selected = clients.find(c => c.id === selectedClientId)
  const selectedClientName = selected?.client_name ?? clientName

  return (
    <ClientContext.Provider value={{ role, clients, selectedClientId, selectedClientName, setSelectedClientId: handleSelect, username }}>
      {children}
    </ClientContext.Provider>
  )
}

export function useClient() {
  return useContext(ClientContext)
}
