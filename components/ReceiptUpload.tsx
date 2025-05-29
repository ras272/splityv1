'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { OCRData } from '@/types/receipts'
import { Upload, FileImage, Sparkles, CheckCircle, XCircle, Camera } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReceiptUploadProps {
  onSuggestions?: (suggestions: OCRData) => void
  onReceiptUploaded?: (receiptId: string) => void
  disabled?: boolean
  className?: string
}

export function ReceiptUpload({ 
  onSuggestions, 
  onReceiptUploaded, 
  disabled = false,
  className 
}: ReceiptUploadProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [ocrData, setOcrData] = useState<OCRData | null>(null)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [isProcessingOCR, setIsProcessingOCR] = useState(false)
  const [ocrError, setOcrError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Manejar archivo seleccionado
  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida')
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('El archivo es muy grande. Máximo 10MB.')
      return
    }

    setSelectedFile(file)
    setOcrError(null)
    
    // Crear preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Procesar OCR con API del servidor
    try {
      setIsProcessingOCR(true)
      setOcrProgress(20)
      
      console.log('🔍 Enviando imagen a API del servidor...')
      
      // Simular progreso mientras esperamos la respuesta
      const progressInterval = setInterval(() => {
        setOcrProgress(prev => Math.min(prev + 10, 80))
      }, 500)
      
      const result = await processImageWithAPI(file)
      
      clearInterval(progressInterval)
      setOcrProgress(100)
      
      console.log('✅ OCR completado por el servidor:', result)
      setOcrData(result)
      onSuggestions?.(result)
      
    } catch (error) {
      console.error('❌ Error procesando OCR:', error)
      setOcrError(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setIsProcessingOCR(false)
    }
  }, [onSuggestions])

  // Drag & Drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  // Input file handler
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  // Aplicar sugerencias
  const applySuggestions = useCallback(() => {
    if (ocrData && onSuggestions) {
      onSuggestions(ocrData)
      setIsOpen(false)
    }
  }, [ocrData, onSuggestions])

  // Reset
  const reset = useCallback(() => {
    setSelectedFile(null)
    setPreview(null)
    setOcrData(null)
    setOcrProgress(0)
    setIsProcessingOCR(false)
    setOcrError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          disabled={disabled}
          className={cn("gap-2", className)}
        >
          <Camera className="h-4 w-4" />
          Escanear Recibo
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileImage className="h-5 w-5" />
            Escanear Recibo con Google Vision
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Zona de Upload */}
          {!selectedFile && (
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                dragActive ? "border-emerald-500 bg-emerald-50" : "border-gray-300 hover:border-gray-400"
              )}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Arrastra tu recibo aquí
              </h3>
              <p className="text-gray-500 mb-4">
                Procesado con Google Vision AI para máxima precisión
              </p>
              <Button 
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
              >
                Seleccionar Imagen
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleInputChange}
              />
              <p className="text-xs text-gray-400 mt-2">
                Formatos soportados: JPG, PNG, WEBP (máx. 10MB)
              </p>
            </div>
          )}

          {/* Preview de la imagen */}
          {selectedFile && preview && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <img
                      src={preview}
                      alt="Vista previa del recibo"
                      className="w-32 h-40 object-cover rounded-lg border"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{selectedFile.name}</h4>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    
                    {/* Estado del procesamiento */}
                    <div className="mt-3">
                      {isProcessingOCR ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 animate-spin text-blue-500" />
                            <span className="text-sm">
                              Procesando en servidor... {Math.round(ocrProgress)}%
                            </span>
                          </div>
                          <Progress value={ocrProgress} className="h-2" />
                        </div>
                      ) : ocrError ? (
                        <div className="space-y-2">
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Error en OCR
                          </Badge>
                          <p className="text-xs text-red-600">{ocrError}</p>
                        </div>
                      ) : ocrData ? (
                        <Badge variant="default" className="bg-emerald-100 text-emerald-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Procesado con Google Vision
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Datos extraídos por Google Vision */}
          {ocrData && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  Datos detectados por Google Vision
                </h4>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {ocrData.merchant_name && (
                    <div>
                      <label className="font-medium text-gray-700">Comercio:</label>
                      <p className="text-gray-900">{ocrData.merchant_name}</p>
                    </div>
                  )}
                  {ocrData.amount && (
                    <div>
                      <label className="font-medium text-gray-700">Monto:</label>
                      <p className="text-gray-900">Gs. {ocrData.amount.toLocaleString()}</p>
                    </div>
                  )}
                  {ocrData.date && (
                    <div>
                      <label className="font-medium text-gray-700">Fecha:</label>
                      <p className="text-gray-900">{ocrData.date}</p>
                    </div>
                  )}
                  <div>
                    <label className="font-medium text-gray-700">Confianza:</label>
                    <p className="text-gray-900">{Math.round((ocrData.confidence_score || 0) * 100)}%</p>
                  </div>
                </div>

                {/* Mostrar texto completo extraído */}
                {ocrData.raw_text && (
                  <details className="mt-4">
                    <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                      Ver texto completo extraído
                    </summary>
                    <div className="mt-2 p-3 bg-white rounded border text-xs whitespace-pre-wrap">
                      {ocrData.raw_text}
                    </div>
                  </details>
                )}
              </CardContent>
            </Card>
          )}

          {/* Acciones */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={reset}>
              Limpiar
            </Button>
            {ocrData && (
              <Button onClick={applySuggestions} className="bg-blue-600 hover:bg-blue-700">
                Usar Datos Detectados
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 