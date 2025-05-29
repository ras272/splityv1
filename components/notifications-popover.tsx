"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { createClient } from "@/utils/supabase/client"
import { Bell } from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"

interface Notification {
  id: string
  user_id: string
  title: string
  description: string | null
  read: boolean
  created_at: string
}

export default function NotificationsPopover() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  // Cargar notificaciones
  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error("No user found")
        return
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("read", { ascending: true })
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching notifications:", error)
        throw error
      }

      setNotifications(data || [])
      setUnreadCount(data?.filter((n: Notification) => !n.read).length || 0)
    } catch (error) {
      console.error("Error fetching notifications:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las notificaciones",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    fetchNotifications()

    const channel = supabase
      .channel('notifications_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          fetchNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Actualizar al abrir el popover
  useEffect(() => {
    if (open) {
      fetchNotifications()
    }
  }, [open])

  // Formatear fecha relativa
  const formatDate = (date: string) => {
    const now = new Date()
    const notificationDate = new Date(date)
    const diffInHours = Math.abs(now.getTime() - notificationDate.getTime()) / 36e5

    if (diffInHours < 24) {
      return formatDistanceToNow(notificationDate, { 
        addSuffix: true,
        locale: es 
      })
    }

    if (notificationDate.getFullYear() === now.getFullYear()) {
      return format(notificationDate, "d 'de' MMMM", { locale: es })
    }

    return format(notificationDate, "d 'de' MMMM, yyyy", { locale: es })
  }

  // Marcar como leída
  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id)

      if (error) throw error

      // Actualizar estado local
      setNotifications(prev => 
        prev.map((n: Notification) => n.id === id ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full h-9 w-9 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all duration-200"
        >
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
              {unreadCount}
            </span>
          )}
          <Bell className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="end"
        side="bottom"
        sideOffset={5}
      >
        <div className="p-2">
          <div className="flex items-center justify-between text-sm font-medium text-muted-foreground mb-2 px-2 pt-1">
            <span>Notificaciones</span>
            {unreadCount > 0 && (
              <span className="text-xs bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                {unreadCount} sin leer
              </span>
            )}
          </div>
          <ScrollArea className="h-[300px] px-2">
            {loading ? (
              <div className="flex items-center justify-center h-20">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                No tienes notificaciones
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    className={`w-full text-left p-3 rounded-lg transition-colors duration-200 ${
                      notification.read 
                        ? "hover:bg-muted/50" 
                        : "bg-emerald-50/50 dark:bg-emerald-900/10 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20"
                    }`}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                        notification.read 
                          ? "bg-gray-300 dark:bg-gray-600" 
                          : "bg-emerald-500"
                      }`} />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {notification.title}
                        </p>
                        {notification.description && (
                          <p className="text-sm text-muted-foreground">
                            {notification.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDate(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  )
} 