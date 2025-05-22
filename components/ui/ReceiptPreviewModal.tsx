"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, X } from "lucide-react"

interface ReceiptPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  onDownload: () => void
}

export function ReceiptPreviewModal({
  isOpen,
  onClose,
  imageUrl,
  onDownload,
}: ReceiptPreviewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-700">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Previsualización del comprobante</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Vista previa del comprobante generado. Puedes descargarlo usando el botón inferior.
          </DialogDescription>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-100"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="p-4">
          {/* Preview de la imagen */}
          <div className="rounded-lg overflow-hidden mb-4">
            {imageUrl ? (
              <img src={imageUrl} alt="Comprobante" className="w-full" />
            ) : null}
          </div>
          
          {/* Botón de descarga */}
          <Button 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={onDownload}
          >
            <Download className="mr-2 h-4 w-4" />
            Descargar comprobante
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 