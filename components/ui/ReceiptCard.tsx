"use client"

import { formatAmount } from "@/utils/currency"

interface ReceiptCardProps {
  transaction: {
    title: string
    amount: number
    date: Date
    paidBy: string
    paidByUser?: {
      id?: string
      full_name?: string
      avatar_url?: string
    }
    categoryEmoji?: string
    category?: string
    groupId: string
    groupName?: string
    groupEmoji?: string
    splitBetween?: string[]
    currency?: string
  }
}

export function ReceiptCard({ transaction }: ReceiptCardProps) {
  const avatarFallback = transaction.paidBy?.charAt(0)?.toUpperCase() || "?"
  const hasAvatar = transaction.paidByUser?.avatar_url
  const isPersonalGroup = transaction.groupId === "personal" || transaction.groupName === "Personal"
  const shouldShowSplitBetween = !isPersonalGroup && transaction.splitBetween && transaction.splitBetween.length > 1

  // Log para diagnóstico del avatar
  console.log("🖼️ Estado del avatar en ReceiptCard:", {
    paidBy: transaction.paidBy,
    paidByUser: transaction.paidByUser,
    hasAvatar,
    avatar_url: transaction.paidByUser?.avatar_url,
    avatar_url_type: typeof transaction.paidByUser?.avatar_url,
    avatar_url_length: transaction.paidByUser?.avatar_url?.length
  });

  return (
    <div className="w-[320px] bg-zinc-900 text-zinc-100 rounded-xl px-6 py-5 shadow-md border border-zinc-700">
      {/* Header con logo */}
      <div className="space-y-2 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">🧾 Comprobante de gasto</span>
          <span className="font-semibold text-emerald-400">Splity</span>
        </div>
        {transaction.groupName && (
          <p className="text-sm text-zinc-400">
            {transaction.groupEmoji} Grupo: {transaction.groupName}
          </p>
        )}
      </div>

      {/* Avatar y nombre */}
      <div className="flex items-center gap-3 mb-6">
        {hasAvatar && transaction.paidByUser?.avatar_url ? (
          <img 
            src={transaction.paidByUser.avatar_url} 
            alt={transaction.paidBy || 'Usuario'} 
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 font-medium">
            {avatarFallback}
          </div>
        )}
        <div className="flex flex-col justify-center">
          <p className="text-sm text-zinc-400 leading-none mb-1">Pagado por</p>
          <p className="font-medium leading-none">{transaction.paidBy || 'Usuario'}</p>
        </div>
      </div>

      {/* Monto */}
      <div className="mb-6">
        <p className="text-sm text-zinc-400 mb-1">Monto</p>
        <p className="text-3xl font-bold text-emerald-400">
          {formatAmount(transaction.amount, transaction.currency || 'PYG')}
        </p>
      </div>

      {/* Detalles */}
      <div className="space-y-4">
        <div>
          <p className="text-sm text-zinc-400 mb-1">Concepto</p>
          <p className="font-medium">{transaction.title}</p>
        </div>

        {transaction.category && (
          <div>
            <p className="text-sm text-zinc-400 mb-1">Categoría</p>
            <div className="flex items-center gap-2">
              <span>{transaction.categoryEmoji}</span>
              <span>{transaction.category}</span>
            </div>
          </div>
        )}

        <div>
          <p className="text-sm text-zinc-400 mb-1">Fecha</p>
          <p className="font-medium">
            {transaction.date.toLocaleDateString('es', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })}
          </p>
        </div>

        {/* Participantes - solo si no es grupo personal y hay más de un participante */}
        {shouldShowSplitBetween && transaction.splitBetween && (
          <div>
            <p className="text-sm text-zinc-400 mb-1">Dividido entre</p>
            <div className="space-y-1">
              {transaction.splitBetween.map((person, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs">
                    {person.charAt(0).toUpperCase()}
                  </div>
                  <span>{person}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer con línea punteada */}
      <div className="mt-6 pt-6 pb-4 border-t border-dashed border-zinc-700">
        <p className="text-sm text-zinc-300 text-center">
          Generado por Splity • {new Date().toLocaleDateString('es', { 
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })}
        </p>
      </div>
    </div>
  )
}