import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Leer el archivo .env.local manualmente
try {
  const envLocal = readFileSync('.env.local', 'utf8');
  const envVars = {};
  
  envLocal.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=');
      envVars[key] = value;
    }
  });
  
  // Configurar las variables de entorno
  Object.keys(envVars).forEach(key => {
    process.env[key] = envVars[key];
  });
  
} catch (error) {
  console.error("❌ Error leyendo .env.local:", error.message);
  process.exit(1);
}

console.log("🔧 Variables de entorno cargadas");
console.log("📡 Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Configurada" : "❌ Faltante");
console.log("🔑 Supabase Key:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Configurada" : "❌ Faltante");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function cleanDuplicateSettlements() {
  try {
    console.log("🧹 Iniciando limpieza de settlements duplicados...");
    
    // 1. Obtener todos los settlements
    const { data: settlements, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'settlement')
      .order('created_at', { ascending: true });

    if (error) {
      console.error("❌ Error obteniendo settlements:", error);
      return;
    }

    console.log(`📊 Encontrados ${settlements.length} settlements`);
    
    // 2. Agrupar settlements por paid_by, paid_to, group_id y amount
    const groupedSettlements = {};
    
    settlements.forEach(settlement => {
      const key = `${settlement.paid_by}-${settlement.paid_to}-${settlement.group_id}-${settlement.amount}`;
      
      if (!groupedSettlements[key]) {
        groupedSettlements[key] = [];
      }
      groupedSettlements[key].push(settlement);
    });

    // 3. Identificar duplicados
    let duplicatesFound = 0;
    const settlementsToDelete = [];

    Object.keys(groupedSettlements).forEach(key => {
      const group = groupedSettlements[key];
      if (group.length > 1) {
        console.log(`🔄 Grupo con ${group.length} duplicados:`, {
          key,
          settlements: group.map(s => ({ id: s.id, amount: s.amount, created_at: s.created_at }))
        });
        
        // Mantener solo el más reciente (último en el array ya que están ordenados por created_at)
        const toKeep = group[group.length - 1];
        const toDelete = group.slice(0, -1);
        
        console.log(`  ✅ Manteniendo:`, { id: toKeep.id, created_at: toKeep.created_at });
        console.log(`  🗑️ Eliminando ${toDelete.length} duplicados`);
        
        settlementsToDelete.push(...toDelete.map(s => s.id));
        duplicatesFound += toDelete.length;
      }
    });

    if (duplicatesFound === 0) {
      console.log("✅ No se encontraron settlements duplicados");
      return;
    }

    console.log(`🚮 Eliminando ${duplicatesFound} settlements duplicados...`);
    
    // 4. Eliminar duplicados
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .in('id', settlementsToDelete);

    if (deleteError) {
      console.error("❌ Error eliminando duplicados:", deleteError);
      return;
    }

    console.log(`✅ Limpieza completada! Eliminados ${duplicatesFound} settlements duplicados`);
    
    // 5. Mostrar estado final
    const { data: finalSettlements } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'settlement')
      .order('created_at', { ascending: true });

    console.log(`📊 Settlements restantes: ${finalSettlements?.length || 0}`);
    
  } catch (error) {
    console.error("💥 Error en limpieza:", error);
  }
}

// Ejecutar la limpieza
cleanDuplicateSettlements(); 