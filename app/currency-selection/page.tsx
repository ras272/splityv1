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
      
      // Buscar el grupo personal
      console.log(`Buscando grupo personal para usuario ${user.id}...`)
      const { data: personalGroup, error: groupError } = await supabase
        .from("groups")
        .select()
        .eq("created_by", user.id)
        .eq("is_personal", true)
        .maybeSingle();

      if (groupError) {
        console.error("Error al buscar grupo personal:", groupError);
        throw groupError;
      }

      // Si no existe el grupo personal, crearlo
      let groupId: string;
      
      if (!personalGroup) {
        console.log("No existe grupo personal. Procediendo a crearlo...");
        const { data: newGroup, error: createError } = await supabase
          .from("groups")
          .insert({
            name: "Personal",
            description: "Grupo personal",
            emoji: "👤",
            color: "gray",
            created_by: user.id,
            currency: selectedCurrency,
            is_personal: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as any)
          .select()
          .single();

        if (createError || !newGroup) {
          console.error("❌ Error al crear grupo personal:", createError);
          throw createError || new Error("No se pudo crear el grupo personal");
        }

        console.log("✅ Grupo personal creado con ID:", newGroup.id);
        groupId = newGroup.id;
        
        // Agregar al usuario como miembro admin del grupo
        const { error: memberError } = await supabase
          .from("group_members")
          .insert({
            group_id: groupId,
            user_id: user.id,
            role: "admin",
            created_at: new Date().toISOString()
          } as any);

        if (memberError) {
          console.error("Error agregando usuario al grupo:", memberError);
          // Borrar el grupo si falló agregar al miembro
          await supabase.from("groups").delete().eq("id", groupId);
          throw memberError;
        }
      } else {
        groupId = personalGroup.id;
      }
      
      // Actualizar el perfil del usuario
      console.log(`Actualizando moneda del perfil a ${selectedCurrency}`);
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          default_currency: selectedCurrency,
          updated_at: new Date().toISOString()
        } as any)
        .eq("id", user.id);

      if (profileError) {
        console.error("Error actualizando moneda del perfil:", profileError);
        throw profileError;
      }
      
      console.log("Perfil actualizado correctamente");

      // Actualizar la moneda del grupo personal si ya existía
      if (personalGroup) {
        console.log(`Actualizando moneda del grupo personal ${groupId} a ${selectedCurrency}`);
        const { error: updateGroupError } = await supabase
          .from("groups")
          .update({ 
            currency: selectedCurrency,
            updated_at: new Date().toISOString()
          } as any)
          .eq("id", groupId);

        if (updateGroupError) {
          console.error("Error actualizando moneda del grupo:", updateGroupError);
          throw updateGroupError;
        }
        
        console.log("Grupo personal actualizado correctamente");
      }
      
      // Todo salió bien, redirigir al dashboard
      console.log("Redirigiendo al dashboard");
      router.push("/dashboard");
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