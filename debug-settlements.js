import { createClient } from '@supabase/supabase-js';
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function debugTransactions() {
  try {
    console.log("🔍 Iniciando diagnóstico de transacciones...");
    
    // 1. Obtener TODAS las transacciones
    const { data: allTransactions, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("❌ Error obteniendo transacciones:", error);
      return;
    }

    console.log(`📊 Total de transacciones: ${allTransactions.length}`);
    
    // 2. Agrupar por tipo
    const transactionsByType = {};
    allTransactions.forEach(transaction => {
      const type = transaction.type || 'undefined';
      if (!transactionsByType[type]) {
        transactionsByType[type] = [];
      }
      transactionsByType[type].push(transaction);
    });

    console.log("\n📈 Transacciones por tipo:");
    Object.keys(transactionsByType).forEach(type => {
      console.log(`  ${type}: ${transactionsByType[type].length}`);
    });

    // 3. Buscar transacciones con title "Settlement"
    const settlementsByTitle = allTransactions.filter(t => 
      t.title && t.title.toLowerCase().includes('settlement')
    );
    
    console.log(`\n🏷️ Transacciones con título "Settlement": ${settlementsByTitle.length}`);
    
    // 4. Mostrar detalles de los settlements
    if (settlementsByTitle.length > 0) {
      console.log("\n💰 Detalles de settlements encontrados:");
      settlementsByTitle.forEach((settlement, index) => {
        console.log(`\n  Settlement ${index + 1}:`);
        console.log(`    ID: ${settlement.id}`);
        console.log(`    Título: ${settlement.title}`);
        console.log(`    Tipo: ${settlement.type}`);
        console.log(`    Monto: ${settlement.amount}`);
        console.log(`    Pagado por: ${settlement.paid_by}`);
        console.log(`    Pagado a: ${settlement.paid_to}`);
        console.log(`    Grupo: ${settlement.group_id}`);
        console.log(`    Fecha: ${settlement.created_at}`);
        console.log(`    Tag: ${settlement.tag}`);
        console.log(`    Is Settlement: ${settlement.is_settlement}`);
      });
    }

    // 5. Buscar por campo is_settlement
    const settlementsByFlag = allTransactions.filter(t => t.is_settlement === true);
    console.log(`\n🔖 Transacciones con is_settlement=true: ${settlementsByFlag.length}`);

    // 6. Mostrar transacciones recientes (últimas 10)
    console.log("\n🕐 Últimas 10 transacciones:");
    allTransactions.slice(0, 10).forEach((transaction, index) => {
      console.log(`  ${index + 1}. ${transaction.title} - Tipo: ${transaction.type} - Monto: ${transaction.amount} - ${transaction.created_at}`);
    });

    // 7. Buscar transacciones específicas por los IDs de los logs
    const loggedTransactionIds = [
      'c8da45c6-28f4-47a8-a4a8-adff0e326bbd',
      'a6703a17-f371-4d24-bd6f-a19476c54861',
      'dabdb2c4-09a9-4c63-9e13-5f2bb79c183a'
    ];

    console.log("\n🎯 Verificando transacciones específicas de los logs:");
    for (const id of loggedTransactionIds) {
      const { data: specificTransaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();
      
      if (specificTransaction) {
        console.log(`  ✅ ${id}: ${specificTransaction.title} - Tipo: ${specificTransaction.type} - Monto: ${specificTransaction.amount}`);
      } else {
        console.log(`  ❌ ${id}: No encontrada`);
      }
    }
    
  } catch (error) {
    console.error("💥 Error en diagnóstico:", error);
  }
}

// Ejecutar el diagnóstico
debugTransactions(); 