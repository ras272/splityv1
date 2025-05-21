require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testInvitationsTable() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  console.log('Verificando tabla invitations...');
  
  try {
    // Verificar si la tabla existe
    const { data: tableInfo, error: tableError } = await supabase
      .from('invitations')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.log('Error al verificar tabla:', tableError);
    } else {
      console.log('La tabla invitations existe:', tableInfo ? 'Sí' : 'No (o vacía)');
    }
    
    // Verificar usuario y sesión
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Usuario actual:', user ? `ID: ${user.id}` : 'No autenticado');
    
    // Intentar insertar datos de prueba
    console.log('\nIntentando insertar un registro de prueba...');
    
    const testData = {
      token: `test-${Math.random().toString(36).substring(2, 10)}`,
      group_id: '00000000-0000-0000-0000-000000000000', // Este ID no existe, es solo para prueba
      email: 'test@example.com',
      created_by: user?.id || '00000000-0000-0000-0000-000000000000', // Usar ID del usuario o uno de prueba
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    
    console.log('Datos a insertar:', testData);
    
    const { data: insertData, error: insertError } = await supabase
      .from('invitations')
      .insert(testData);
    
    if (insertError) {
      console.log('Error al insertar:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      
      // Verificar políticas RLS para inserción
      console.log('\nVerificando si el usuario tiene acceso al grupo...');
      
      if (user) {
        const { data: isAdmin, error: adminError } = await supabase
          .from('group_members')
          .select('*')
          .eq('user_id', user.id)
          .eq('group_id', testData.group_id)
          .eq('role', 'admin')
          .single();
        
        if (adminError) {
          console.log('Error al verificar si es admin:', adminError);
          console.log('La política RLS podría estar bloqueando la inserción porque:');
          console.log('1. El usuario no es admin del grupo');
          console.log('2. El grupo no existe');
          console.log('3. El ID del grupo es incorrecto');
        } else {
          console.log('El usuario es admin del grupo:', isAdmin);
        }
      }
    } else {
      console.log('Inserción exitosa:', insertData);
    }
    
    // Verificar estructura de la tabla
    console.log('\nVerificando estructura de la tabla invitations...');
    
    // Listar grupos disponibles para seleccionar uno válido
    console.log('\nGrupos disponibles:');
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('id, name, created_by');
    
    if (groupsError) {
      console.log('Error al obtener grupos:', groupsError);
    } else {
      console.log(groups);
    }
    
  } catch (err) {
    console.error('Error en la verificación:', err);
  }
}

testInvitationsTable(); 