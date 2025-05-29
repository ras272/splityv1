// Script para probar la conexión a Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Obtener las variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Verificar que las variables estén definidas
if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no están definidos en .env.local');
  process.exit(1);
}

// Crear el cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Probar la conexión
async function testConnection() {
  try {
    // Intenta hacer una solicitud básica
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) throw error;
    
    console.log('✅ Conexión exitosa a Supabase!');
    console.log('Respuesta:', data); 
    return true;
  } catch (error) {
    console.error('❌ Error al conectar con Supabase:', error.message);
    return false;
  }
}

// Ejecutar la prueba
testConnection().then(success => {
  if (!success) {
    console.log('\nVerifica los siguientes puntos:');
    console.log('1. Las claves en .env.local son correctas');
    console.log('2. Tu proyecto de Supabase está activo');
    console.log('3. La tabla "profiles" existe en tu base de datos');
  }
}); 