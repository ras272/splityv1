"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CURRENCY_OPTIONS } from "@/utils/currency"
import { toast } from "@/hooks/use-toast"

export default function CurrencySelection() {
  const router = useRouter()
  const supabase = createClient()
  const [selectedCurrency, setSelectedCurrency] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    async function checkUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          console.log("No user found, redirecting to login")
          router.push("/login")
          return
        }

        console.log("Usuario autenticado:", user.id);
        setUser(user)

        // Check if user already has a default currency
        const { data: profile } = await supabase
          .from("profiles")
          .select("default_currency")
          .eq("id", user.id)
          .single()

        if (profile?.default_currency) {
          console.log("User already has a default currency, redirecting to dashboard")
          router.push("/dashboard")
        }
      } catch (error) {
        console.error("Error checking user:", error)
        router.push("/login")
      }
    }

    checkUser()
  }, [router, supabase])

  const handleCurrencySelection = async () => {
    if (!user || !selectedCurrency) {
      toast({
        title: "Error",
        description: "Por favor selecciona una moneda para continuar",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    console.log(`Iniciando proceso de configuración de moneda: ${selectedCurrency} para usuario ${user.id}`)
    
    try {
      // Verificar que tenemos un ID de usuario válido
      if (!user.id) {
        throw new Error("ID de usuario no disponible");
      }
      
      // Verificar si existe un grupo 'Personal' sin el flag is_personal
      console.log(`Verificando si existe grupo 'Personal' para usuario ${user.id}...`)
      const { data: existingPersonalGroup } = await supabase
        .from("groups")
        .select("id, name, is_personal")
        .eq("created_by", user.id)
        .eq("name", "Personal")
        .maybeSingle()
        
      if (existingPersonalGroup) {
        console.log(`Grupo 'Personal' encontrado, id: ${existingPersonalGroup.id}, is_personal: ${existingPersonalGroup.is_personal}`)
        
        // Si existe pero no tiene is_personal = true, actualizarlo
        if (existingPersonalGroup.is_personal !== true) {
          console.log(`Actualizando flag is_personal para grupo ${existingPersonalGroup.id}`)
          await supabase
            .from("groups")
            .update({ is_personal: true })
            .eq("created_by", user.id)
            .eq("name", "Personal")
        }
      } else {
        console.log("Grupo personal no encontrado para este usuario")
      }
      
      // Buscar el grupo personal con una consulta explícita
      console.log("Buscando grupo personal para usuario:", user.id)
      
      const { data: group, error } = await supabase
        .from("groups")
        .select("*")
        .eq("created_by", user.id)
        .eq("is_personal", true)
        .maybeSingle()
      
      console.log("Resultado de búsqueda de grupo personal:", { group, error })
      
      if (!group) {
        console.error("❌ Grupo personal no encontrado para este usuario")
        toast({
          title: "Error",
          description: "No se pudo encontrar tu grupo personal. Por favor, contacta a soporte.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }
      
      console.log(`Grupo personal encontrado, ID: ${group.id}, creado: ${group.created_at}`)
      
      // Actualizar el perfil primero
      console.log(`Actualizando moneda del perfil a ${selectedCurrency}`)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ default_currency: selectedCurrency })
        .eq("id", user.id)

      if (profileError) {
        console.error("Error actualizando moneda del perfil:", profileError)
        throw profileError
      }
      
      console.log("Perfil actualizado correctamente")

      // Ahora actualizar el grupo personal
      console.log(`Actualizando moneda del grupo personal ${group.id} a ${selectedCurrency}`)
      const { error: updateGroupError } = await supabase
        .from("groups")
        .update({ currency: selectedCurrency })
        .eq("id", group.id)

      if (updateGroupError) {
        console.error("Error actualizando moneda del grupo:", updateGroupError)
        throw updateGroupError
      }
      
      console.log("Grupo personal actualizado correctamente")
      
      // Todo salió bien, redirigir al dashboard
      console.log("Redirigiendo al dashboard")
      router.push("/dashboard")
    } catch (error: any) {
      console.error("Error detallado en la configuración de moneda:", {
        error,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint
      })
      
      toast({
        title: "Error",
        description: error?.message || "No se pudo configurar la moneda. Por favor intenta de nuevo.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return null // Or a loading state
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">¿Con qué moneda querés usar Splity?</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Podés cambiar esto más adelante en tu grupo personal
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona una moneda" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    <div className="flex items-center gap-2">
                      <span>{currency.emoji}</span>
                      <span>{currency.name} ({currency.code})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            className="w-full"
            onClick={handleCurrencySelection}
            disabled={loading || !selectedCurrency}
          >
            {loading ? "Configurando..." : "Continuar"}
          </Button>
        </div>
      </div>
    </div>
  )
} 