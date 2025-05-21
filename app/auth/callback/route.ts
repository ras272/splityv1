import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    const cookieStore = await cookies()
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.exchangeCodeForSession(code)

    if (user) {
      console.log("Callback iniciado para usuario:", user.id);
      try {
        // PASO 1: Verificar si ya existe un grupo personal para este usuario
        console.log("Buscando grupo personal en callback para:", user.id);
        const { data: existingPersonalGroup, error: groupCheckError } = await supabase
          .from("groups")
          .select("id")
          .eq("created_by", user.id)
          .eq("is_personal", true)
          .limit(1)
          .single();

        // Si hay un error que no sea "no se encontraron registros", es un error real
        if (groupCheckError && groupCheckError.code !== "PGRST116") {
          console.error("Error al buscar grupo personal:", groupCheckError);
          return NextResponse.redirect(new URL("/error", requestUrl.origin));
        }

        // PASO 2: Si no existe un grupo personal, crearlo
        let personalGroupId = existingPersonalGroup?.id;
        
        if (!existingPersonalGroup) {
          console.log("No existe grupo personal. Procediendo a crearlo...");
          const { data: newGroup, error: groupInsertError } = await supabase
            .from("groups")
            .insert([{
              name: "Personal",
              description: "Grupo personal",
              emoji: "👤",
              color: "gray",
              created_by: user.id,
              // Usamos un valor temporal para currency para satisfacer la restricción NOT NULL
              currency: "USD",
              is_personal: true
            }])
            .select()
            .single();

          if (groupInsertError || !newGroup) {
            console.error("❌ Error al crear grupo personal:", groupInsertError);
            return NextResponse.redirect(new URL("/error", requestUrl.origin));
          } else {
            console.log("✅ Grupo personal creado con ID:", newGroup.id);
            personalGroupId = newGroup.id;
          }

          // Agregar al usuario como miembro admin del grupo
          const { error: memberError } = await supabase
            .from("group_members")
            .insert([{
              group_id: personalGroupId,
              user_id: user.id,
              role: "admin"
            }]);

          if (memberError) {
            console.error("Error agregando usuario al grupo:", memberError);
            // Borrar el grupo si falló agregar al miembro
            await supabase.from("groups").delete().eq("id", personalGroupId);
            return NextResponse.redirect(new URL("/error", requestUrl.origin));
          }
           
          // PASO 3: Confirmar que el grupo personal existe ahora
          console.log("Confirmando la creación del grupo personal...");
          const { data: confirmedGroup, error: confirmError } = await supabase
            .from("groups")
            .select("id")
            .eq("id", personalGroupId)
            .single();
           
          if (confirmError || !confirmedGroup) {
            console.error("No se pudo confirmar la creación del grupo personal:", confirmError);
            return NextResponse.redirect(new URL("/error", requestUrl.origin));
          }
           
          console.log("Grupo personal confirmado, ID:", confirmedGroup.id);
        } else {
          console.log("Grupo personal ya existe, ID:", existingPersonalGroup.id);
        }

        // PASO 4: Verificar si el usuario necesita seleccionar moneda
        const { data: profile } = await supabase
          .from("profiles")
          .select("default_currency")
          .eq("id", user.id)
          .single();

        // Si no tiene moneda predeterminada, redirigir a selección de moneda
        if (!profile?.default_currency) {
          console.log("El usuario necesita seleccionar moneda, redirigiendo a /currency-selection");
          return NextResponse.redirect(new URL("/currency-selection", requestUrl.origin));
        }

        // Ya tiene moneda predeterminada, redirigir al dashboard
        console.log("El usuario ya tiene moneda predeterminada, redirigiendo a /dashboard");
        return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
      } catch (error) {
        console.error("Error en auth callback:", error);
        return NextResponse.redirect(new URL("/error", requestUrl.origin));
      }
    }
  }

  return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
}
