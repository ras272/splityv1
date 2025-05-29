// Tipos para el sistema de recibos
export interface Receipt {
  id: string
  transaction_id: string
  file_url: string
  file_name: string
  file_size: number
  mime_type: string
  ocr_data: OCRData
  ocr_status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  created_by: string
  updated_at: string
}

export interface OCRData {
  // Datos extraídos del recibo
  amount?: number
  date?: string
  merchant_name?: string
  items?: ReceiptItem[]
  tax_amount?: number
  subtotal?: number
  payment_method?: string
  raw_text?: string
  confidence_score?: number
  processing_time?: number
}

export interface ReceiptItem {
  name: string
  quantity?: number
  price?: number
  category?: string
}

export interface ReceiptUploadData {
  file: File
  transaction_id?: string // Si ya existe la transacción
}

export interface OCRSuggestions {
  title: string
  amount: number
  date: Date
  category?: string
  confidence: number
  merchant?: string
}

// Para el formulario de crear gasto con recibo
export interface ExpenseWithReceipt {
  title: string
  amount: string
  paidBy: string
  splitWith: string[]
  note: string
  groupId: string
  categoryId: string
  receipt?: File
}

// Para mostrar recibos en las transacciones
export interface TransactionWithReceipt {
  id: string
  title: string
  amount: number
  type: string
  date: Date
  paidBy: string
  receipt?: Receipt
  // ... otros campos de Transaction
} 