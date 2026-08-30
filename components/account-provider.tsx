"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

type AccountValue = {
  email: string
  credits: number
  setCredits: (credits: number) => void
}

const AccountContext = createContext<AccountValue | null>(null)

export function AccountProvider({
  email,
  initialCredits,
  children,
}: {
  email: string
  initialCredits: number
  children: ReactNode
}) {
  const [credits, setCredits] = useState(initialCredits)
  const value = useMemo(() => ({ email, credits, setCredits }), [credits, email])

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount() {
  const account = useContext(AccountContext)
  if (!account) throw new Error("AccountProvider is missing")
  return account
}
