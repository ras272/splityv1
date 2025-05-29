'use client'

import { useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Receipt, OCRData, OCRSuggestions } from '@/types/receipts'
import { toast } from '@/hooks/use-toast'

export function useReceipts() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [ocrProgress, setOcrProgress] = useState(0)
  
  const supabase = createClientComponentClient()

  // Función para procesar imagen con la API del servidor
  const processImageWithAPI = async (file: File): Promise<OCRData> => {
    const formData = new FormData()
    formData.append('image', file)

    const response = await fetch('/api/ocr', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Error procesando imagen')
    }

    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Error en el procesamiento')
    }

    return result.data
  }

  const uploadReceipt = async (
    file: File,
    transactionId: string,
    userId: string
  ): Promise<Receipt> => {
    setIsUploading(true)
    setUploadProgress(0)
    setOcrProgress(0)

    try {
      console.log('🔄 Iniciando proceso de recibo...')
      
      // 1. Procesar imagen con API del servidor
      console.log('🔍 Procesando OCR con API del servidor...')
      setOcrProgress(0)
      
      // Simular progreso
      const progressInterval = setInterval(() => {
        setOcrProgress(prev => Math.min(prev + 10, 80))
      }, 500)
      
      const ocrData: OCRData = await processImageWithAPI(file)
      
      clearInterval(progressInterval)
      setOcrProgress(100)
      
      console.log('✅ OCR completado:', ocrData)
      setUploadProgress(30)

      // 2. Subir archivo a Supabase Storage
      console.log('📤 Subiendo archivo...')
      const fileName = `receipt_${transactionId}_${Date.now()}.${file.name.split('.').pop()}`
      const filePath = `receipts/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file)

      if (uploadError) {
        throw new Error(`Error subiendo archivo: ${uploadError.message}`)
      }

      setUploadProgress(60)

      // 3. Obtener URL pública del archivo
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath)

      setUploadProgress(80)

      // 4. Crear registro en la base de datos
      console.log('💾 Guardando en base de datos...')
      const { data: receiptData, error: dbError } = await supabase
        .rpc('create_receipt', {
          p_transaction_id: transactionId,
          p_file_url: publicUrl,
          p_file_name: fileName,
          p_file_size: file.size,
          p_mime_type: file.type,
          p_ocr_data: ocrData,
          p_created_by: userId
        })

      if (dbError) {
        throw new Error(`Error guardando en BD: ${dbError.message}`)
      }

      setUploadProgress(100)
      console.log('✅ Recibo guardado exitosamente')

      return receiptData
    } catch (error) {
      console.error('❌ Error subiendo recibo:', error)
      throw error
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      setOcrProgress(0)
    }
  }

  // Obtener recibos de una transacción usando SQL directo
  const getReceiptsByTransaction = async (transactionId: string): Promise<Receipt[]> => {
    const { data, error } = await supabase
      .rpc('get_receipts_by_transaction', {
        p_transaction_id: transactionId
      })

    if (error) {
      console.error('Error obteniendo recibos:', error)
      return []
    }

    return data || []
  }

  return {
    uploadReceipt,
    getReceiptsByTransaction,
    isUploading,
    uploadProgress,
    ocrProgress
  }
}

// Función auxiliar para extraer texto de imagen (OCR básico)
async function extractTextFromImage(file: File): Promise<string> {
  // Por simplicidad, implementamos detección básica de patrones
  // En una implementación real usarías Tesseract.js o una API de OCR
  
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      // Simulamos extracción de texto
      // En realidad aquí iría la lógica de OCR
      resolve("TOTAL: 25000 FECHA: 20/12/2024 COMERCIO: SUPERMERCADO XYZ")
    }
    reader.readAsDataURL(file)
  })
}

// Función para parsear texto y extraer datos estructurados
function parseReceiptText(text: string): OCRData {
  // Patrones regex para extraer información común de recibos
  const amountPattern = /(?:total|amount|precio|monto)[:\s]*(\d+(?:\.\d{2})?)/i
  const datePattern = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/
  const merchantPattern = /(?:comercio|merchant|tienda)[:\s]*([a-zA-Z\s]+)/i

  const amountMatch = text.match(amountPattern)
  const dateMatch = text.match(datePattern)
  const merchantMatch = text.match(merchantPattern)

  return {
    amount: amountMatch ? parseFloat(amountMatch[1]) : undefined,
    date: dateMatch ? dateMatch[1] : undefined,
    merchant_name: merchantMatch ? merchantMatch[1].trim() : undefined,
    raw_text: text,
    confidence_score: 0.7, // Score simulado
    processing_time: Date.now()
  }
} 