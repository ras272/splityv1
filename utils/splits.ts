import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

type BaseTransaction = Database['public']['Tables']['transactions']['Row'];

interface ExtendedTransaction extends BaseTransaction {
  split_type?: 'equal' | 'custom' | 'personal';
  transaction_splits?: TransactionSplit[];
}

type TransactionSplit = {
  id: string;
  user_id: string;
  amount: number;
  is_payer: boolean;
  transaction_id: string;
  percentage?: number | null;
};

type DatabaseTransaction = Database['public']['Tables']['transactions']['Row'] & {
  transaction_splits?: TransactionSplit[];
};

export interface SplitDetail {
  user_id: string;
  amount: number;
  is_payer: boolean;
  percentage?: number;
}

export interface DetailedSplit {
  transaction_id: string;
  total_amount: number;
  splits: SplitDetail[];
  payer_id: string;
}

export interface CustomSplitInput {
  user_id: string;
  percentage: number;
}

export interface SplitSummary {
  total_amount: number;
  split_type: 'equal' | 'custom' | 'personal';
  participants: number;
  amount_per_person: number;
  payer_name: string;
  splits: Array<{
    user_name: string;
    amount: number;
    percentage?: number;
    is_payer: boolean;
  }>;
}

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Distribuye el monto total asegurando que la suma sea exacta
 * Maneja correctamente los decimales
 */
export const distributeAmountEvenly = (totalAmount: number, participants: number): number[] => {
  const baseAmount = Math.floor((totalAmount * 100) / participants) / 100; // Redondeo hacia abajo
  const remainder = totalAmount - (baseAmount * participants);
  const remainderCents = Math.round(remainder * 100);
  
  const amounts = new Array(participants).fill(baseAmount);
  
  // Distribuir los centavos restantes
  for (let i = 0; i < remainderCents; i++) {
    amounts[i] += 0.01;
  }
  
  return amounts.map(amount => Math.round(amount * 100) / 100);
};

/**
 * Distribuye según porcentajes asegurando que la suma sea exacta
 */
export const distributeByPercentages = (totalAmount: number, percentages: number[]): number[] => {
  const amounts = percentages.map(pct => 
    Math.floor((totalAmount * pct / 100) * 100) / 100
  );
  
  const totalDistributed = amounts.reduce((sum, amount) => sum + amount, 0);
  const difference = totalAmount - totalDistributed;
  const differenceCents = Math.round(difference * 100);
  
  // Distribuir la diferencia en centavos
  for (let i = 0; i < Math.abs(differenceCents); i++) {
    const index = i % amounts.length;
    amounts[index] += differenceCents > 0 ? 0.01 : -0.01;
    amounts[index] = Math.round(amounts[index] * 100) / 100;
  }
  
  return amounts;
};

export const calculateDetailedSplits = async (
  transaction: Transaction,
  participants: string[]
): Promise<DetailedSplit> => {
  if (!participants || participants.length === 0) {
    throw new Error('No hay participantes para el split');
  }

  let splits: SplitDetail[];

  if (transaction.split_type === 'custom') {
    // Para custom splits, obtener los datos de la BD
    const { data: existingSplits, error } = await supabase
      .from('transaction_splits')
      .select('user_id, amount, percentage, is_payer')
      .eq('transaction_id', transaction.id);

    if (error) throw error;
    if (!existingSplits || existingSplits.length === 0) {
      throw new Error('No se encontraron splits personalizados');
    }

    splits = existingSplits.map(split => ({
      user_id: split.user_id,
      amount: split.amount,
      is_payer: split.is_payer,
      percentage: split.percentage || undefined
    }));

  } else {
    // Split igual (equal)
    const amounts = distributeAmountEvenly(transaction.amount, participants.length);
    const percentagePerPerson = 100 / participants.length;

    splits = participants.map((userId, index) => ({
      user_id: userId,
      amount: amounts[index],
      is_payer: userId === transaction.paid_by,
      percentage: percentagePerPerson
    }));
  }

  return {
    transaction_id: transaction.id,
    total_amount: transaction.amount,
    splits: splits,
    payer_id: transaction.paid_by
  };
};

export const validateCustomSplits = (splits: CustomSplitInput[]): boolean => {
  const total = splits.reduce((sum, split) => sum + split.percentage, 0);
  return Math.abs(total - 100) < 0.01;
};

export const createCustomSplit = async (
  transaction: Transaction,
  customSplits: CustomSplitInput[]
): Promise<DetailedSplit> => {
  if (!validateCustomSplits(customSplits)) {
    throw new Error('Los porcentajes deben sumar 100%');
  }

  const percentages = customSplits.map(split => split.percentage);
  const amounts = distributeByPercentages(transaction.amount, percentages);

  const splits: SplitDetail[] = customSplits.map((split, index) => ({
    user_id: split.user_id,
    amount: amounts[index],
    is_payer: split.user_id === transaction.paid_by,
    percentage: split.percentage
  }));

  // Actualizar transacción
  const { error: updateError } = await supabase
    .from('transactions')
    .update({ split_type: 'custom' })
    .eq('id', transaction.id);

  if (updateError) throw updateError;

  // Insertar splits
  const { error: splitsError } = await supabase
    .from('transaction_splits')
    .insert(
      splits.map(split => ({
        transaction_id: transaction.id,
        user_id: split.user_id,
        amount: split.amount,
        is_payer: split.is_payer,
        percentage: split.percentage
      }))
    );

  if (splitsError) throw splitsError;

  return {
    transaction_id: transaction.id,
    total_amount: transaction.amount,
    splits: splits,
    payer_id: transaction.paid_by
  };
};

interface TransactionSplitWithTransaction {
  id: string;
  transaction_id: string;
  user_id: string;
  amount: number;
  is_payer: boolean;
  transactions?: {
    id: string;
    amount: number;
    type: string;
    group_id: string;
  };
}

interface TransactionWithSplits {
  id: string;
  amount: number;
  paid_by: string;
  paid_to?: string;
  type?: 'expense' | 'settlement';
  transaction_splits?: {
    id: string;
    user_id: string;
    amount: number;
    is_payer: boolean;
  }[];
}

export const calculateUserBalance = (userId: string, transactions: TransactionWithSplits[]): number => {
  console.log("⚙️ Calculando balance para usuario:", userId, "- Transacciones:", transactions.length);

  let balance = 0;
  let settlementTotal = 0;
  let expenseTotal = 0;

  for (const transaction of transactions) {
    console.log(`\n🔍 Procesando transacción: ${transaction.id}`);
    console.log(`   Tipo: ${transaction.type}`);
    console.log(`   Monto: ${transaction.amount}`);
    console.log(`   Paid by: ${transaction.paid_by}`);
    console.log(`   Paid to: ${transaction.paid_to || 'N/A'}`);
    
    // Si es un settlement, manejarlo de forma especial
    if (transaction.type === 'settlement') {
      if (transaction.paid_by === userId) {
        // El usuario actual pagó (reduce su deuda)
        console.log(`💰 Settlement pagado: +${transaction.amount} (mejora balance)`);
        balance += transaction.amount;
        settlementTotal += transaction.amount;
      } else if (transaction.paid_to === userId) {
        // El usuario actual recibió el pago (esto REDUCE su balance porque ya no le deben)
        console.log(`💰 Settlement recibido: -${transaction.amount} (reduce balance - ya no me deben)`);
        balance -= transaction.amount;
        settlementTotal -= transaction.amount;
      }
      console.log(`   Settlement balance parcial: ${balance}`);
      continue;
    }

    // Si no hay splits o no es un gasto normal, saltamos la transacción
    if (!transaction.transaction_splits || transaction.transaction_splits.length === 0) {
      console.log(`   ⚠️ Sin splits, saltando transacción`);
      continue;
    }

    console.log(`   Splits:`, transaction.transaction_splits.map(s => `${s.user_id}: ${s.amount}`));

    // Procesar gastos normales
    if (transaction.paid_by === userId) {
      // Suma todo menos su parte
      const userSplit = transaction.transaction_splits.find(split => split.user_id === userId);
      if (userSplit) {
        const toAdd = transaction.amount - userSplit.amount;
        console.log(`   💚 Yo pagué: +${toAdd} (total: ${transaction.amount} - mi parte: ${userSplit.amount})`);
        balance += toAdd;
        expenseTotal += toAdd;
    }
    } else {
      // Solo resta su parte
      const userSplit = transaction.transaction_splits.find(split => split.user_id === userId);
      if (userSplit) {
        console.log(`   💸 Yo debo: -${userSplit.amount}`);
        balance -= userSplit.amount;
        expenseTotal -= userSplit.amount;
      }
    }
    
    console.log(`   Balance parcial: ${balance}`);
  }

  console.log(`\n📊 RESUMEN:`);
  console.log(`   Total settlements: ${settlementTotal}`);
  console.log(`   Total expenses: ${expenseTotal}`);
  console.log(`🏁 Balance final: ${balance}`);
  
  return Number(balance.toFixed(2));
};

/**
 * Calcula balances detallados entre usuarios específicos usando transaction_splits
 */
export const calculateDetailedBalances = async (
  userId: string, 
  groupId: string
): Promise<Record<string, number>> => {
  // Obtener todas las transacciones del grupo con sus splits
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select(`
      id,
      amount,
      type,
      paid_by,
      paid_to,
      transaction_splits!transaction_splits_transaction_id_fkey (
        user_id,
        amount,
        is_payer
      )
    `)
    .eq('group_id', groupId);

  if (error) throw error;
  if (!transactions) return {};

  const balances: Record<string, number> = {};

  for (const transaction of transactions) {
    if (transaction.type === 'expense') {
      // Buscar mi split en esta transacción
      const mySplit = transaction.transaction_splits.find(split => split.user_id === userId);
      
      if (mySplit) {
        if (mySplit.is_payer) {
          // Yo pagué, calcular cuánto me debe cada participante
          transaction.transaction_splits.forEach(split => {
            if (split.user_id !== userId) {
              balances[split.user_id] = (balances[split.user_id] || 0) + split.amount;
            }
          });
        } else {
          // Yo participo pero no pagué, le debo al pagador
          const payerId = transaction.paid_by;
          balances[payerId] = (balances[payerId] || 0) - mySplit.amount;
        }
      }
    }
    
    // Manejar settlements
    else if (transaction.type === 'settlement') {
      if (transaction.paid_by === userId && transaction.paid_to) {
        // Yo pagué a esta persona, reduce mi deuda hacia ella
        balances[transaction.paid_to] = (balances[transaction.paid_to] || 0) + transaction.amount;
      } else if (transaction.paid_to === userId) {
        // Esta persona me pagó, reduce su deuda hacia mí
        balances[transaction.paid_by] = (balances[transaction.paid_by] || 0) - transaction.amount;
      }
    }
  }

  // Redondear todos los balances
  Object.keys(balances).forEach(key => {
    balances[key] = Math.round(balances[key] * 100) / 100;
  });

  return balances;
};

// Mantener las funciones existentes que funcionan bien
export const calculateExactSplitAmount = async (
  transaction_id: string
): Promise<number> => {
  const { data, error } = await supabase.rpc(
    'calculate_equal_split_amount',
    { p_transaction_id: transaction_id }
  );
  
  if (error) throw error;
  return data;
};

export const calculateCustomSplitAmount = async (
  transaction_id: string,
  user_id: string
): Promise<number> => {
  const { data, error } = await supabase.rpc(
    'calculate_custom_split_amount',
    { 
      p_transaction_id: transaction_id,
      p_user_id: user_id 
    }
  );
  
  if (error) throw error;
  return data;
};

export const getUserBalance = async (
  user_id: string,
  group_id: string
): Promise<number> => {
  const { data, error } = await supabase.rpc(
    'get_user_balance',
    { 
      p_user_id: user_id,
      p_group_id: group_id 
    }
  );
  
  if (error) throw error;
  return data;
};

interface TransactionSplitWithProfile {
  amount: number;
  percentage: number | null;
  is_payer: boolean;
  profiles: {
    full_name: string | null;
  };
}

export const getSplitSummary = async (
  transaction_id: string
): Promise<SplitSummary> => {
  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .select(`
      *,
      profiles!transactions_paid_by_fkey (
        full_name
      ),
      transaction_splits (
        amount,
        percentage,
        is_payer,
        profiles (
          full_name
        )
      )
    `)
    .eq('id', transaction_id)
    .single();

  if (transactionError) throw transactionError;
  if (!transaction) throw new Error('Transacción no encontrada');

  const splits = transaction.transaction_splits.map((split: TransactionSplitWithProfile) => ({
    user_name: split.profiles.full_name || 'Usuario sin nombre',
    amount: split.amount,
    percentage: split.percentage,
    is_payer: split.is_payer
  }));

  return {
    total_amount: transaction.amount,
    split_type: transaction.split_type || 'equal',
    participants: splits.length,
    amount_per_person: transaction.split_type === 'equal' 
      ? transaction.amount / splits.length 
      : 0,
    payer_name: transaction.profiles.full_name || 'Usuario sin nombre',
    splits
  };
};