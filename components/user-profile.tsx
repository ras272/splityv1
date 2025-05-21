"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import type { User } from "@supabase/supabase-js"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, UserIcon, FileText, Palette, Camera } from "lucide-react"
import { useTheme } from "next-themes"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

interface UserProfileProps {
  className?: string
}

interface UserProfile {
  id: string
  full_name: string
  avatar_url?: string
  created_at: string
}

interface StorageBucket {
  id: string
  name: string
  owner: string
  public: boolean
  created_at: string
  updated_at: string
}

export default function UserProfile({ className }: UserProfileProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [initials, setInitials] = useState("?")
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [hasGroups, setHasGroups] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    async function getUser() {
      setLoading(true)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          // Get user profile data
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single()

          setProfile(profileData)

          // Check if user belongs to any group
          const { data: groupMembers } = await supabase
            .from("group_members")
            .select("group_id")
            .eq("user_id", user.id)

          setHasGroups(groupMembers && groupMembers.length > 0)

          // Set initials based on profile data
          if (profileData?.full_name) {
            const nameParts = profileData.full_name.split(" ")
            setInitials(`${nameParts[0].charAt(0)}${nameParts.length > 1 ? nameParts[1].charAt(0) : ""}`)
          } else if (user.email) {
            setInitials(user.email.charAt(0).toUpperCase())
          }
        }
      } catch (error) {
        console.error("Error fetching user:", error)
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [supabase])

  const formatMemberSince = (date: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long' }
    return new Date(date).toLocaleDateString('es-ES', options)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    // Validar tipo y tamaño
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Por favor selecciona una imagen válida",
        variant: "destructive"
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "La imagen no debe superar los 5MB",
        variant: "destructive"
      })
      return
    }

    // Mostrar preview
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)

    try {
      setUploading(true)

      // Subir a Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      
      // Intentar subir directamente sin verificar buckets
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        console.error('Upload error details:', uploadError)
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Error de almacenamiento: Bucket no encontrado. Por favor contacta al administrador.')
        }
        if (uploadError.message.includes('Permission denied')) {
          throw new Error('Error de permisos: No tienes acceso para subir archivos.')
        }
        throw new Error(`Error al subir la imagen: ${uploadError.message}`)
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Actualizar perfil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) {
        console.error('Profile update error:', updateError)
        throw new Error('No se pudo actualizar el perfil con el nuevo avatar')
      }

      // Actualizar estado local
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null)
      
      toast({
        title: "¡Listo!",
        description: "Tu avatar ha sido actualizado",
      })

    } catch (error) {
      console.error('Error completo:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar el avatar",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
      URL.revokeObjectURL(objectUrl)
      setPreviewUrl(null)
      // Limpiar input para permitir subir el mismo archivo de nuevo si es necesario
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  if (loading) {
    return (
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-gray-400 to-gray-300 dark:from-gray-600 dark:to-gray-700 rounded-full blur opacity-0 group-hover:opacity-30 transition duration-300"></div>
        <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-700 dark:text-gray-200 animate-pulse">
          <span className="text-sm font-medium">...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <button onClick={() => router.push("/login")} className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-emerald-300 dark:from-emerald-600 dark:to-emerald-700 rounded-full blur opacity-0 group-hover:opacity-30 transition duration-300"></div>
        <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-700 dark:to-emerald-800 text-emerald-700 dark:text-emerald-200">
          <span className="text-sm font-medium">?</span>
        </div>
      </button>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-1 bg-gradient-to-r from-gray-400 to-gray-300 dark:from-gray-600 dark:to-gray-700 rounded-full blur opacity-0 group-hover:opacity-30 transition duration-300"></div>
            <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-700 dark:text-gray-200 cursor-pointer shadow-sm hover:shadow transition-all overflow-hidden">
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile?.full_name || "Avatar"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium">{initials}</span>
              )}
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56 mt-1 rounded-xl border border-emerald-100/20 dark:border-emerald-900/20"
        >
          <div className="flex items-center p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 mr-3 overflow-hidden">
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile?.full_name || "Avatar"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium">{initials}</span>
              )}
            </div>
            <div>
              <p className="font-medium">{profile?.full_name || user.email}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <DropdownMenuSeparator className="bg-emerald-100/20 dark:bg-emerald-900/20" />
          <DropdownMenuItem 
            className="cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors duration-200 focus:bg-emerald-50 dark:focus:bg-emerald-900/20"
            onClick={() => setShowProfileDialog(true)}
          >
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Perfil</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors duration-200 focus:bg-emerald-50 dark:focus:bg-emerald-900/20">
            <FileText className="mr-2 h-4 w-4" />
            <span>Exportar historial</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors duration-200 focus:bg-emerald-50 dark:focus:bg-emerald-900/20"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Palette className="mr-2 h-4 w-4" />
            <span>Cambiar tema</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-emerald-100/20 dark:bg-emerald-900/20" />
          <DropdownMenuItem
            className="cursor-pointer text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors duration-200 focus:bg-red-50 dark:focus:bg-red-900/10"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Tu perfil</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  {(previewUrl || profile?.avatar_url) ? (
                    <AvatarImage 
                      src={previewUrl || profile?.avatar_url} 
                      alt={profile?.full_name || "Avatar"}
                    />
                  ) : (
                    <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xl">
                      {initials}
                    </AvatarFallback>
                  )}
                </Avatar>
                <Button
                  size="icon"
                  variant="outline"
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                  onClick={handleAvatarClick}
                  disabled={uploading}
                >
                  {uploading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  <span className="sr-only">Cambiar avatar</span>
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="font-semibold text-lg">
                  {loading ? "Cargando..." : (profile?.full_name || "Sin nombre")}
                </h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <p className="text-xs text-muted-foreground">
                  Miembro desde {loading ? "..." : (profile?.created_at ? formatMemberSince(profile.created_at) : "...")}
                </p>
                <Badge variant={hasGroups ? "default" : "outline"} className="mt-2">
                  {loading ? "..." : (hasGroups ? "Activo" : "Sin grupo aún")}
                </Badge>
              </div>

              <Button variant="outline" className="w-full mt-4">
                Editar perfil
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
