import { createClient } from '@/utils/supabase/client'

interface NotificationData {
  user_id: string
  title: string
  description?: string
}

export async function createNotification(data: NotificationData) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('notifications')
    .insert([{
      ...data,
      created_at: new Date().toISOString()
    }])
    
  if (error) {
    console.error('Error creating notification:', error)
    throw error
  }
}

export async function createExpenseNotification(
  expense: { 
    amount: number, 
    title: string, 
    group_id: string,
    paid_by: string,
    split_between: string[]
  },
  groupName: string
) {
  const supabase = createClient()
  
  // Solo notificar a los usuarios involucrados en el gasto
  const involvedUsers = [...new Set([...expense.split_between])]
  
  // Obtener el nombre del pagador
  const { data: payer } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', expense.paid_by)
    .single()
    
  const payerName = payer?.full_name || 'Alguien'
  
  // Crear notificación para cada usuario involucrado
  for (const userId of involvedUsers) {
    // No notificar al usuario que creó el gasto
    if (userId === expense.paid_by) continue
    
    await createNotification({
      user_id: userId,
      title: '💸 Nuevo gasto compartido',
      description: `${payerName} registró un gasto de Gs. ${expense.amount.toLocaleString()} por "${expense.title}" en "${groupName}"`
    })
  }
}

export async function createSettlementNotification(
  settlement: {
    amount: number,
    paid_by: string,
    paid_to: string,
    group_id: string
  },
  groupName: string
) {
  const supabase = createClient()
  
  // Obtener nombres de los usuarios
  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', [settlement.paid_by, settlement.paid_to])
  
  const payer = users?.find((u: { id: string, full_name: string }) => u.id === settlement.paid_by)?.full_name || 'Alguien'
  const receiver = users?.find((u: { id: string, full_name: string }) => u.id === settlement.paid_to)?.full_name || 'Alguien'
  
  // Notificar al receptor del pago
  await createNotification({
    user_id: settlement.paid_to,
    title: '📤 Liquidación recibida',
    description: `${payer} te pagó Gs. ${settlement.amount.toLocaleString()} en "${groupName}"`
  })
}

export async function createGroupInviteNotification(
  invitedUserId: string,
  groupName: string,
  invitedByName: string
) {
  await createNotification({
    user_id: invitedUserId,
    title: '🙋 Nueva invitación',
    description: `${invitedByName} te invitó al grupo "${groupName}"`
  })
}

export async function createGroupJoinNotification(
  groupId: string,
  newMemberId: string,
  groupName: string
) {
  const supabase = createClient()
  
  try {
    // Obtener todos los miembros actuales del grupo
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .neq('user_id', newMemberId)
    
    if (membersError) throw membersError
    
    // Obtener el nombre del nuevo miembro
    const { data: newMember, error: newMemberError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', newMemberId)
      .single()
    
    if (newMemberError) throw newMemberError
    
    const newMemberName = newMember?.full_name || 'Alguien'
    
    // Notificar a todos los miembros existentes
    for (const member of (members || [])) {
      await createNotification({
        user_id: member.user_id, // Este es el ID del usuario que recibirá la notificación
        title: '➕ Nuevo miembro',
        description: `${newMemberName} se unió al grupo "${groupName}"`
      })
    }
  } catch (error) {
    console.error('Error creating group join notifications:', error)
    throw error
  }
}

export async function createDebtNotification(
  debtorId: string,
  creditorName: string,
  amount: number,
  groupName: string
) {
  await createNotification({
    user_id: debtorId,
    title: '📤 Deuda actualizada',
    description: `Le debes Gs. ${amount.toLocaleString()} a ${creditorName} en "${groupName}"`
  })
} 