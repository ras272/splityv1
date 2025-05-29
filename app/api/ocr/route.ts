import { NextRequest, NextResponse } from 'next/server'
import { ImageAnnotatorClient } from '@google-cloud/vision'

let visionClient: ImageAnnotatorClient | null = null

function initializeVisionClient() {
  if (!visionClient) {
    try {
      console.log('🔧 Inicializando cliente de Google Vision...')
      
      // Opción 1: Usar archivo de credenciales (recomendado para Windows)
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log('🗂️ Usando archivo de credenciales:', process.env.GOOGLE_APPLICATION_CREDENTIALS)
        
        visionClient = new ImageAnnotatorClient({
          keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
          projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
        })
        
        console.log('✅ Cliente creado con archivo de credenciales')
        return visionClient
      }
      
      // Opción 2: JSON inline (fallback)
      if (!process.env.GOOGLE_VISION_CREDENTIALS) {
        throw new Error('Necesitas configurar GOOGLE_APPLICATION_CREDENTIALS (archivo) o GOOGLE_VISION_CREDENTIALS (JSON)')
      }
      
      if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
        throw new Error('GOOGLE_CLOUD_PROJECT_ID no está configurado en .env.local')
      }

      console.log('📋 Project ID:', process.env.GOOGLE_CLOUD_PROJECT_ID)
      console.log('🔑 Usando credenciales JSON inline...')
      
      // Intentar parsear las credenciales
      let credentials
      try {
        credentials = JSON.parse(process.env.GOOGLE_VISION_CREDENTIALS)
        console.log('✅ Credenciales JSON parseadas correctamente')
        console.log('📧 Service Account Email:', credentials.client_email)
        
        // Verificar y limpiar private key
        if (credentials.private_key) {
          // Limpiar espacios y caracteres problemáticos
          credentials.private_key = credentials.private_key
            .replace(/\\n/g, '\n')  // Convertir \\n a \n
            .trim()
          
          console.log('🗝️ Private Key procesada correctamente')
        }
        
      } catch (parseError) {
        console.error('❌ Error parseando JSON de credenciales:', parseError)
        throw new Error(`JSON de credenciales mal formateado: ${parseError}`)
      }

      visionClient = new ImageAnnotatorClient({
        credentials,
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
      })
      
      console.log('✅ Cliente de Google Vision inicializado con JSON')
    } catch (error) {
      console.error('❌ Error inicializando Google Vision:', error)
      throw error
    }
  }
  return visionClient
}

// NUEVA RUTA GET para diagnosticar configuración
export async function GET() {
  try {
    console.log('🔍 Verificando configuración de Google Vision...')
    
    // Verificar variables de entorno
    const hasCredentials = !!process.env.GOOGLE_VISION_CREDENTIALS
    const hasProjectId = !!process.env.GOOGLE_CLOUD_PROJECT_ID
    
    console.log('🔑 GOOGLE_VISION_CREDENTIALS existe:', hasCredentials)
    console.log('📋 GOOGLE_CLOUD_PROJECT_ID existe:', hasProjectId)
    
    if (!hasCredentials || !hasProjectId) {
      return NextResponse.json({
        success: false,
        error: 'Variables de entorno faltantes',
        missing: {
          credentials: !hasCredentials,
          projectId: !hasProjectId
        }
      })
    }
    
    // Verificar formato de credenciales
    let credentialsValid = false
    let credentialsInfo = {}
    
    try {
      const creds = JSON.parse(process.env.GOOGLE_VISION_CREDENTIALS!)
      credentialsValid = true
      credentialsInfo = {
        type: creds.type,
        project_id: creds.project_id,
        client_email: creds.client_email,
        hasPrivateKey: !!creds.private_key
      }
    } catch (e) {
      credentialsInfo = { parseError: e instanceof Error ? e.message : 'Error desconocido' }
    }
    
    // Intentar inicializar cliente
    let clientInitialized = false
    let clientError = null
    
    try {
      const client = initializeVisionClient()
      clientInitialized = true
    } catch (e) {
      clientError = e instanceof Error ? e.message : 'Error desconocido'
    }
    
    return NextResponse.json({
      success: true,
      diagnosis: {
        hasCredentials,
        hasProjectId,
        credentialsValid,
        credentialsInfo,
        clientInitialized,
        clientError,
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
      }
    })
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 API OCR: Iniciando procesamiento...')
    
    // Verificar configuración básica - aceptar cualquiera de las dos opciones
    const hasCredentialsFile = !!process.env.GOOGLE_APPLICATION_CREDENTIALS
    const hasCredentialsJson = !!process.env.GOOGLE_VISION_CREDENTIALS
    const hasProjectId = !!process.env.GOOGLE_CLOUD_PROJECT_ID
    
    console.log('🔍 Configuración detectada:')
    console.log('📁 GOOGLE_APPLICATION_CREDENTIALS:', hasCredentialsFile ? '✅' : '❌')
    console.log('📋 GOOGLE_VISION_CREDENTIALS:', hasCredentialsJson ? '✅' : '❌')
    console.log('🆔 GOOGLE_CLOUD_PROJECT_ID:', hasProjectId ? '✅' : '❌')
    
    if (!hasProjectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID no está configurado en .env.local')
    }
    
    if (!hasCredentialsFile && !hasCredentialsJson) {
      throw new Error('Necesitas configurar GOOGLE_APPLICATION_CREDENTIALS (archivo) o GOOGLE_VISION_CREDENTIALS (JSON) en .env.local')
    }

    // Obtener imagen del request
    const formData = await request.formData()
    const file = formData.get('image') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No se envió imagen' }, { status: 400 })
    }

    console.log(`📷 Procesando archivo: ${file.name} (${file.size} bytes)`)

    // Convertir a buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    console.log(`🔄 Buffer creado: ${buffer.length} bytes`)

    // Inicializar cliente (aquí puede fallar si las credenciales están mal)
    console.log('🔧 Inicializando cliente para OCR...')
    const client = initializeVisionClient()

    console.log('🔍 Enviando imagen a Google Vision API...')
    console.log('📊 Configuración:')
    console.log('   - Project ID:', process.env.GOOGLE_CLOUD_PROJECT_ID)
    
    try {
      // Ejecutar OCR con timeout y manejo de errores específico
      const startTime = Date.now()
      
      const [result] = await Promise.race([
        client.textDetection({
          image: { content: buffer }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout en Google Vision API')), 30000)
        )
      ]) as any

      const processingTime = Date.now() - startTime
      console.log(`⏱️ Google Vision respondió en ${processingTime}ms`)

      const detections = result.textAnnotations
      const extractedText = detections?.[0]?.description || ''
      
      console.log('✅ Texto extraído por Google Vision:', extractedText.substring(0, 200) + '...')
      console.log('📊 Detecciones encontradas:', detections?.length || 0)

      // Parsear datos estructurados
      const structuredData = parseReceiptText(extractedText)

      return NextResponse.json({
        success: true,
        data: {
          raw_text: extractedText,
          ...structuredData,
          confidence_score: 0.95,
          processing_time: processingTime
        }
      })

    } catch (visionError) {
      console.error('❌ Error específico de Google Vision:', visionError)
      
      // Logging detallado del error de Google Vision
      if (visionError instanceof Error) {
        console.error('🔍 Error name:', visionError.name)
        console.error('🔍 Error message:', visionError.message)
        console.error('🔍 Error stack:', visionError.stack)
      }
      
      throw new Error(`Error en Google Vision API: ${visionError}`)
    }

  } catch (error) {
    console.error('❌ Error en API OCR:', error)
    
    // Dar mensajes más específicos según el tipo de error
    let errorMessage = 'Error desconocido'
    
    if (error instanceof Error) {
      console.error('🔍 Error completo:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
      
      if (error.message.includes('JSON')) {
        errorMessage = 'Credenciales de Google Vision mal configuradas. Revisa el formato JSON en .env.local'
      } else if (error.message.includes('credentials') || error.message.includes('authentication')) {
        errorMessage = 'Error de autenticación con Google Vision. Verifica tus credenciales'
      } else if (error.message.includes('GOOGLE_VISION') || error.message.includes('GOOGLE_APPLICATION_CREDENTIALS')) {
        errorMessage = 'Variables de entorno de Google Vision no configuradas'
      } else if (error.message.includes('DECODER') || error.message.includes('metadata')) {
        errorMessage = 'Credenciales de Google Vision inválidas. Verifica que el JSON sea correcto y las claves válidas'
      } else if (error.message.includes('Timeout')) {
        errorMessage = 'Timeout conectando con Google Vision. Intenta de nuevo'
      } else if (error.message.includes('Google Vision API')) {
        errorMessage = `Error en Google Vision: ${error.message}`
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
}

function parseReceiptText(text: string) {
  console.log('🔍 Parseando texto:', text)
  
  const patterns = {
    amounts: [
      /(?:total|amount|suma|importe|precio|costo|pagar|cobrar|pago)[:\s]*\$?\s*(\d{1,6}[.,]?\d{0,3})/gi,
      /(\d{1,6}[.,]?\d{0,3})\s*(?:€|usd|peso|cop|mxn|ars|gs|guaraní|guaranies|₲)/gi,
      /[\$₲€]\s*(\d{1,6}[.,]?\d{0,3})/g,
      /(\d{1,3}\.\d{3}(?:\.\d{2})?)/g,
      /(\d{1,6}[.,]\d{2,3})(?:\s|$)/g,
      /(?:^|\s)(\d{4,6})(?=\s|$)(?!.*(?:20[0-9][0-9]|19[0-9][0-9]))/g,
    ],
    dates: [
      /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g,
      /(\d{1,2}\s+(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+\d{2,4})/gi,
      /(\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/g,
    ],
    merchants: [
      /^(Pago\s+de\s+.+)/gmi,
      /^([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{2,40})$/gm,
      /(?:restaurant|restaurante|tienda|store|market|mercado|farmacia|pharmacy|supermercado|mall|centro|comercial|servicios)\s*(.+)/gi,
    ]
  }

  // Extraer montos
  let detectedAmounts: Array<{ value: number; confidence: number }> = []
  
  patterns.amounts.forEach((pattern, index) => {
    const matches = text.matchAll(pattern)
    
    for (const match of matches) {
      if (match[1]) {
        let cleanAmount = match[1]
        
        if (/\d{1,3}\.\d{3}$/.test(cleanAmount)) {
          cleanAmount = cleanAmount.replace('.', '')
        } else if (/\d+,\d{2}$/.test(cleanAmount)) {
          cleanAmount = cleanAmount.replace(',', '.')
        }
        
        const amount = parseFloat(cleanAmount)
        
        if (amount > 0 && amount < 9999999 && !(amount >= 2020 && amount <= 2030)) {
          let confidence = 0.5
          if (index === 0) confidence = 0.9
          if (/\$|₲|total|pago/i.test(match[0])) confidence += 0.3
          
          detectedAmounts.push({ value: amount, confidence })
        }
      }
    }
  })
  
  detectedAmounts.sort((a, b) => b.confidence - a.confidence || b.value - a.value)

  // Extraer fechas
  const dates = extractMatches(text, patterns.dates)

  // Extraer comercio
  let merchantName = null
  const merchantMatches = extractMatches(text, patterns.merchants)
  if (merchantMatches.length > 0) {
    merchantName = merchantMatches[0]
  }

  console.log('💰 Montos:', detectedAmounts)
  console.log('📅 Fechas:', dates)
  console.log('🏪 Comercio:', merchantName)

  return {
    amount: detectedAmounts[0]?.value,
    date: dates[0],
    merchant_name: merchantName?.trim(),
  }
}

function extractMatches(text: string, patterns: RegExp[]): string[] {
  const matches: string[] = []
  
  patterns.forEach(pattern => {
    const regex = new RegExp(pattern.source, pattern.flags)
    const allMatches = text.matchAll(regex)
    
    for (const match of allMatches) {
      if (match[1]) {
        matches.push(match[1].trim())
      }
    }
  })
  
  return [...new Set(matches)]
} 