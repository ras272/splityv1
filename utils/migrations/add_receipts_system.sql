-- Migration: Add receipts system
-- Compatible con estructura existente, no modifica tablas actuales

-- 1. Tabla para almacenar recibos
CREATE TABLE IF NOT EXISTS receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  ocr_data JSONB DEFAULT '{}',
  ocr_status TEXT DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Índices para performance
CREATE INDEX idx_receipts_transaction_id ON receipts(transaction_id);
CREATE INDEX idx_receipts_created_by ON receipts(created_by);
CREATE INDEX idx_receipts_created_at ON receipts(created_at);

-- 3. RLS (Row Level Security) para privacidad
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver recibos de transacciones de sus grupos
CREATE POLICY "Users can view receipts from their group transactions" ON receipts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM transactions t
      JOIN group_members gm ON t.group_id = gm.group_id
      WHERE t.id = receipts.transaction_id 
      AND gm.user_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

-- Política: Los usuarios pueden insertar recibos en sus transacciones
CREATE POLICY "Users can insert receipts for their transactions" ON receipts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions t
      JOIN group_members gm ON t.group_id = gm.group_id
      WHERE t.id = receipts.transaction_id 
      AND gm.user_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

-- Política: Los usuarios pueden actualizar sus propios recibos
CREATE POLICY "Users can update their own receipts" ON receipts
  FOR UPDATE USING (created_by = auth.uid());

-- Política: Los usuarios pueden eliminar sus propios recibos
CREATE POLICY "Users can delete their own receipts" ON receipts
  FOR DELETE USING (created_by = auth.uid());

-- 4. Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_receipts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_receipts_updated_at_trigger
  BEFORE UPDATE ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_receipts_updated_at();

-- 5. Storage bucket para recibos (si no existe)
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- 6. Política de storage para recibos
CREATE POLICY "Users can upload receipts" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'receipts' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view their receipts" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'receipts' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their receipts" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'receipts' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  ); 