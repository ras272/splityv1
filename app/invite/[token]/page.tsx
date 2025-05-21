"use client"

import { useEffect, useState } from "react"
import { use } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createGroupJoinNotification } from "@/utils/notifications"
import { createNotification } from "@/utils/notifications"
import { toast } from "react-hot-toast"

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invitation, setInvitation] = useState<any>(null)
  const [group, setGroup] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    const checkInvitation = async () => {
      try {
        setLoading(true)
        
        // 1. Verificar si el usuario está autenticado
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        
        if (!currentUser) {
          // Guardar el token en localStorage para usarlo después del login
          localStorage.setItem('pendingInviteToken', token)
          router.push(`/login?redirect=/invite/${token}`)
          return
        }
        
        setUser(currentUser)
        
        // 2. Obtener la invitación
        const { data: invitation, error: invitationError } = await supabase
          .from('invitations')
          .select('*')
          .eq('token', token)
          .single()
        
        if (invitationError || !invitation) {
          setError('Invitación inválida')
          setLoading(false)
          return
        }
        
        // 3. Verificar si la invitación ha expirado
        if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
          setError('La invitación ha expirado.')
          setLoading(false)
          return
        }
        
        // 4. Obtener información del grupo
        const { data: group, error: groupError } = await supabase
          .from('groups')
          .select('*')
          .eq('id', invitation.group_id)
          .single()
        
        if (groupError || !group) {
          setError('El grupo no existe o ha sido eliminado.')
          setLoading(false)
          return
        }
        
        // 5. Verificar si el usuario ya es miembro del grupo
        const { data: existingMember, error: memberError } = await supabase
          .from('group_members')
          .select('*')
          .eq('group_id', group.id)
          .eq('user_id', currentUser.id)
          .maybeSingle()
        
        if (existingMember) {
          setError('Ya eres miembro de este grupo.')
          setLoading(false)
          return
        }
        
        setInvitation(invitation)
        setGroup(group)
        setLoading(false)
      } catch (err) {
        console.error('Error checking invitation:', err)
        setError('Ha ocurrido un error al verificar la invitación.')
        setLoading(false)
      }
    }
    
    checkInvitation()
  }, [token, router, supabase])
  
  const handleJoinGroup = async () => {
    try {
      setJoining(true)
      
      // 1. Verificar autenticación del usuario
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !currentUser) {
        console.error("Error de autenticación:", authError)
        setError("Por favor, inicia sesión para unirte al grupo")
        router.push(`/login?redirect=/invite/${token}`)
        return
      }

      console.log("Usuario autenticado:", {
        id: currentUser.id,
        email: currentUser.email,
        metadata: currentUser.user_metadata
      })
      
      // 2. Verificar si el usuario ya es miembro del grupo
      const { data: existingMember, error: checkError } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", group.id)
        .eq("user_id", currentUser.id)
        .maybeSingle()

      console.log("Verificación de membresía:", {
        existingMember,
        checkError,
        groupId: group.id,
        userId: currentUser.id
      })

      if (checkError) {
        console.error("Error al verificar membresía:", checkError)
        setError("Error al verificar tu membresía en el grupo")
        setJoining(false)
        return
      }

      // Si ya es miembro, mostrar mensaje y redirigir
      if (existingMember) {
        console.log("Usuario ya es miembro del grupo")
        toast.info("Ya eres miembro de este grupo")
        
        const { error: updateError } = await supabase
          .from("invitations")
          .update({ accepted: true })
          .eq("token", token)

        if (updateError) {
          console.error("Error actualizando invitación:", updateError)
        }

        router.push(`/dashboard?group=${group.id}`)
        return
      }

      // 3. Intentar insertar nuevo miembro
      console.log("Intentando insertar nuevo miembro:", {
        groupId: group.id,
        userId: currentUser.id
      })

      const { error: insertError } = await supabase
        .from("group_members")
        .insert({
          group_id: group.id,
          user_id: currentUser.id,
          role: "member"
        })

      if (insertError) {
        console.error("Error detallado al insertar miembro:", {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint
        })

        if (insertError.code === "23505") {
          // Si hay un conflicto, verificar membresía nuevamente
          const { data: member } = await supabase
            .from("group_members")
            .select("id")
            .eq("group_id", group.id)
            .eq("user_id", currentUser.id)
            .single()

          if (member) {
            toast.info("Ya eres miembro de este grupo")
            
            const { error: updateError } = await supabase
              .from("invitations")
              .update({ accepted: true })
              .eq("token", token)

            router.push(`/dashboard?group=${group.id}`)
            return
          }
        }

        setError("No se pudo completar tu ingreso al grupo")
        setJoining(false)
        return
      }

      // 4. Actualizar invitación
      console.log("Actualizando estado de invitación")
      const { error: updateError } = await supabase
        .from("invitations")
        .update({ accepted: true })
        .eq("token", token)

      if (updateError) {
        console.error("Error actualizando invitación:", updateError)
      }

      // 5. Crear notificación
      console.log("Creando notificación para el admin")
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: group.created_by,
          title: "📥 Nuevo miembro",
          description: `${currentUser.user_metadata.full_name || "Un usuario"} se unió a tu grupo`
        })

      if (notificationError) {
        console.error("Error creando notificación:", notificationError)
      }

      // 6. Redirigir al dashboard con mensaje de éxito
      toast.success("¡Te has unido al grupo exitosamente!")
      router.push(`/dashboard?group=${group.id}`)
    } catch (err) {
      console.error("Error en el proceso de unión al grupo:", err)
      setError("Ha ocurrido un error al unirte al grupo")
      setJoining(false)
    }
  }
  
  // Si está cargando, mostrar un indicador de carga
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full border-4 border-t-emerald-500 animate-spin"></div>
            </div>
            <p className="text-center mt-4">Verificando invitación...</p>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  // Si hay un error, mostrar el mensaje de error
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitación no válida</CardTitle>
            <CardDescription>No se pudo procesar tu invitación</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Ir al Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }
  
  // Si la invitación es válida, mostrar la información del grupo y el botón para unirse
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md">
          <span className="text-xl font-medium">S</span>
        </div>
        <h1 className="text-3xl font-bold">Splity</h1>
        <p className="text-muted-foreground">Divide gastos con amigos fácilmente</p>
      </div>
      
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl bg-${group.color}-100`}>
              <span>{group.emoji}</span>
            </div>
          </div>
          <CardTitle className="text-center">Invitación a grupo</CardTitle>
          <CardDescription className="text-center">
            Has sido invitado a unirte al grupo <span className="font-medium">{group.name}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center mb-6">
            {group.description || 'Únete a este grupo para compartir gastos con amigos y familiares.'}
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button 
            onClick={handleJoinGroup} 
            className="w-full" 
            disabled={joining}
          >
            {joining ? 'Uniéndose...' : 'Unirse al grupo'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard')} 
            className="w-full"
          >
            Cancelar
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
} 