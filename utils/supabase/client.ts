import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

export const createClient = () => {
  return createClientComponentClient<Database>({
    options: {
      db: {
        schema: 'public'
      },
      realtime: {
        eventsPerSecond: 10,
        realtimeUrl: 'realtime-us-east-2.supabase.co'
      },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: {
          getItem: async (key: string) => {
            if (typeof window === 'undefined') return null
            try {
              const item = localStorage.getItem(key)
              if (!item) return null

              // Si la clave es para la sesión de auth, intentar decodificar base64
              if (key.includes('auth.token')) {
                if (item.startsWith('base64-')) {
                  const base64Data = item.replace('base64-', '')
                  return JSON.parse(atob(base64Data))
                }
              }

              return JSON.parse(item)
            } catch (error) {
              console.error('Error reading from storage:', error)
              return null
            }
          },
          setItem: async (key: string, value: any) => {
            if (typeof window === 'undefined') return
            try {
              // Si la clave es para la sesión de auth, codificar en base64
              if (key.includes('auth.token')) {
                const base64Data = btoa(JSON.stringify(value))
                localStorage.setItem(key, `base64-${base64Data}`)
              } else {
                localStorage.setItem(key, JSON.stringify(value))
              }
            } catch (error) {
              console.error('Error writing to storage:', error)
            }
          },
          removeItem: async (key: string) => {
            if (typeof window === 'undefined') return
            localStorage.removeItem(key)
          }
        }
      }
    }
  })
}
