export interface CurrencyOption {
  code: string;
  name: string;
  emoji: string;
  symbol: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'PYG', name: 'Guaraní', emoji: '🇵🇾', symbol: 'Gs.' },
  { code: 'USD', name: 'Dólar', emoji: '🇺🇸', symbol: '$' },
  { code: 'EUR', name: 'Euro', emoji: '🇪🇺', symbol: '€' },
  { code: 'ARS', name: 'Peso Argentino', emoji: '🇦🇷', symbol: '$' },
  { code: 'BRL', name: 'Real', emoji: '🇧🇷', symbol: 'R$' },
  { code: 'CLP', name: 'Peso Chileno', emoji: '🇨🇱', symbol: '$' }
];

export function formatAmount(amount: number, currencyCode: string): string {
  const currency = CURRENCY_OPTIONS.find(c => c.code === currencyCode);
  if (!currency) return `${amount}`; // Fallback to just the number

  const formatter = new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: currencyCode,
    currencyDisplay: 'symbol',
    minimumFractionDigits: currencyCode === 'PYG' ? 0 : 2,
    maximumFractionDigits: currencyCode === 'PYG' ? 0 : 2
  });

  return formatter.format(amount);
}

export function getCurrencySymbol(currencyCode: string): string {
  const currency = CURRENCY_OPTIONS.find(c => c.code === currencyCode);
  return currency?.symbol || currencyCode;
}

export function getCurrencyOption(currencyCode: string): CurrencyOption | undefined {
  return CURRENCY_OPTIONS.find(c => c.code === currencyCode);
} 