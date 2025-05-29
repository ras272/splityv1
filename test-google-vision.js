// Script para probar Google Vision de forma independiente
const { ImageAnnotatorClient } = require('@google-cloud/vision');
require('dotenv').config({ path: '.env.local' });

async function testGoogleVision() {
  try {
    console.log('🔍 Probando Google Vision...');
    
    // Verificar variables de entorno
    const hasCredentialsFile = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const hasCredentialsJson = !!process.env.GOOGLE_VISION_CREDENTIALS;
    const hasProjectId = !!process.env.GOOGLE_CLOUD_PROJECT_ID;
    
    console.log('🔍 Configuración detectada:');
    console.log('📁 GOOGLE_APPLICATION_CREDENTIALS:', hasCredentialsFile ? '✅' : '❌');
    console.log('📋 GOOGLE_VISION_CREDENTIALS:', hasCredentialsJson ? '✅' : '❌');
    console.log('🆔 GOOGLE_CLOUD_PROJECT_ID:', hasProjectId ? '✅' : '❌');
    
    if (!hasProjectId) {
      throw new Error('❌ GOOGLE_CLOUD_PROJECT_ID no configurado');
    }
    
    console.log('📋 Project ID:', process.env.GOOGLE_CLOUD_PROJECT_ID);
    
    let client;
    
    // Método 1: Archivo de credenciales (recomendado)
    if (hasCredentialsFile) {
      console.log('🗂️ Usando archivo de credenciales:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
      
      client = new ImageAnnotatorClient({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
      });
      
      console.log('✅ Cliente creado con archivo');
      
    } else if (hasCredentialsJson) {
      console.log('📝 Usando credenciales JSON inline...');
      
      // Parsear credenciales
      const credentials = JSON.parse(process.env.GOOGLE_VISION_CREDENTIALS);
      console.log('✅ Credenciales parseadas');
      console.log('📧 Service Account:', credentials.client_email);
      
      // Limpiar private key
      if (credentials.private_key) {
        credentials.private_key = credentials.private_key
          .replace(/\\n/g, '\n')
          .trim();
        console.log('🔑 Private key procesada');
      }
      
      client = new ImageAnnotatorClient({
        credentials,
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
      });
      
      console.log('✅ Cliente creado con JSON');
      
    } else {
      throw new Error('❌ Necesitas GOOGLE_APPLICATION_CREDENTIALS o GOOGLE_VISION_CREDENTIALS');
    }
    
    // Probar con imagen de prueba simple
    console.log('🔍 Probando detección de texto...');
    
    // Crear una imagen simple con texto
    const fs = require('fs');
    const path = require('path');
    
    // Si existe una imagen de prueba, usarla
    const testImagePath = './test-receipt.jpg';
    let imageBuffer;
    
    if (fs.existsSync(testImagePath)) {
      console.log('📷 Usando imagen de prueba local');
      imageBuffer = fs.readFileSync(testImagePath);
    } else {
      console.log('🖼️ Creando imagen de prueba básica...');
      // Imagen base64 simple (1x1 pixel transparente)
      imageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      );
    }
    
    const [result] = await client.textDetection({
      image: { content: imageBuffer }
    });
    
    console.log('✅ Google Vision API respondió exitosamente');
    console.log('📝 Detecciones:', result.textAnnotations?.length || 0);
    
    if (result.textAnnotations && result.textAnnotations.length > 0) {
      console.log('📄 Texto detectado:', result.textAnnotations[0].description?.substring(0, 100) + '...');
    } else {
      console.log('ℹ️ No se detectó texto (normal para imagen de prueba básica)');
    }
    
    console.log('🎉 ¡Google Vision funciona correctamente!');
    console.log('💡 Ahora puedes probar el OCR en tu aplicación');
    
  } catch (error) {
    console.error('❌ Error probando Google Vision:', error);
    
    if (error.message.includes('DECODER routines::unsupported')) {
      console.error('🔧 SOLUCIÓN: Usa archivo de credenciales en lugar de JSON inline');
      console.error('   1. Pon tus credenciales en google-vision-credentials.json');
      console.error('   2. Configura GOOGLE_APPLICATION_CREDENTIALS=./google-vision-credentials.json');
      console.error('   3. Comenta GOOGLE_VISION_CREDENTIALS en .env.local');
    } else if (error.message.includes('credentials')) {
      console.error('🔑 Problema de credenciales - revisa tu Service Account');
    } else if (error.message.includes('permission') || error.message.includes('forbidden')) {
      console.error('🚫 Problema de permisos - revisa los roles del Service Account');
    } else if (error.message.includes('disabled')) {
      console.error('📴 Vision API no habilitada en tu proyecto');
    } else {
      console.error('🔍 Error específico:', error.code, error.message);
    }
  }
}

// Ejecutar test
testGoogleVision(); 