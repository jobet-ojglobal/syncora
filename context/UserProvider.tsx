'use client'

import { UserRole } from '@/generated/prisma/enums'
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

type Branch = {
  name: string;
  slug: string;
}

export type CurrentUser = {
  id: string
  name: string
  email: string
  image?: string | null
  role: UserRole
  branchId?: string | null
  branch?: Branch
}

type UserContextType = {
  user: CurrentUser | null
  loading: boolean
  refreshUser: () => Promise<void>
}

const UserContext = createContext<UserContextType | null>(null)

export function UserProvider({
  children,
  initialUser
}: {
  children: React.ReactNode
  initialUser: CurrentUser | null
}) {
  const [user, setUser] =
    useState<CurrentUser | null>(initialUser)
  const [loading, setLoading] = useState(!initialUser)

  const refreshUser = async () => {
    try {
      setLoading(true)

      const res = await fetch('/api/me')

      if (!res.ok) {
        setUser(null)
        return
      }

      const data = await res.json()

      setUser(data)
    } catch (error) {
      console.error(error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        refreshUser,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)

  if (!context) {
    throw new Error('useUser must be used inside UserProvider')
  }

  return context
}