export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
} 