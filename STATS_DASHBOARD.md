# 📊 Dashboard de Estadísticas - Splity

## Descripción

El Dashboard de Estadísticas es una nueva funcionalidad que proporciona análisis detallados de los gastos y balances de los usuarios en Splity. Ofrece visualizaciones interactivas y métricas clave para ayudar a los usuarios a entender mejor sus patrones de gasto.

## 🚀 Características

### 📈 Métricas Principales
- **Total Gastado**: Suma total de gastos del usuario en el período seleccionado
- **Número de Transacciones**: Cantidad total de transacciones realizadas
- **Promedio por Transacción**: Gasto promedio por transacción
- **Balance Actual**: Balance neto del usuario (lo que debe o le deben)
- **Grupos Activos**: Número de grupos en los que participa el usuario

### 🎯 Filtros Disponibles
- **Por Grupo**: Ver estadísticas de todos los grupos o de un grupo específico
- **Por Período**: 
  - Último mes
  - Últimos 3 meses
  - Últimos 6 meses
  - Último año

### 📊 Visualizaciones

#### 1. Desglose por Categorías
- Muestra las top 5 categorías de gasto
- Incluye porcentaje del total y número de transacciones
- Barras de progreso para comparación visual

#### 2. Tendencia Mensual
- Gráfico de barras mostrando gastos por mes
- Número de transacciones por mes
- Visualización de tendencias temporales

#### 3. Actividad por Grupo
- Gastos totales por grupo
- Número de transacciones por grupo
- Identificación visual con emojis

### 🎨 Componentes Reutilizables

#### StatsCard
```tsx
<StatsCard
  title="Total Gastado"
  value={formatCurrency(totalSpent)}
  icon={PieChart}
  trend={{
    value: monthlyTrend,
    label: "vs mes anterior",
    isPositive: monthlyTrend < 0
  }}
  className="border-emerald-200"
/>
```

#### CategoryBreakdown
```tsx
<CategoryBreakdown 
  categories={categoryBreakdown}
  formatCurrency={formatCurrency}
  maxItems={5}
/>
```

#### MonthlyChart
```tsx
<MonthlyChart 
  data={monthlyData}
  formatCurrency={formatCurrency}
/>
```

## 🛠️ Implementación Técnica

### Estructura de Archivos
```
app/dashboard/stats/
├── page.tsx                    # Página principal de estadísticas

components/stats/
├── index.ts                    # Exportaciones
├── StatsCard.tsx              # Tarjeta de estadística reutilizable
├── CategoryBreakdown.tsx      # Desglose por categorías
└── MonthlyChart.tsx           # Gráfico de tendencia mensual
```

### Interfaces TypeScript
```typescript
interface StatsData {
  totalSpent: number
  totalTransactions: number
  averageTransaction: number
  monthlyTrend: number
  categoryBreakdown: CategoryStat[]
  groupBreakdown: GroupStat[]
  monthlyData: MonthlyData[]
  balance: number
}

interface CategoryStat {
  name: string
  amount: number
  count: number
  emoji: string
  percentage: number
}
```

### Consultas de Base de Datos
- Utiliza Supabase para obtener transacciones con joins a categorías y grupos
- Filtra por rango de fechas y grupo seleccionado
- Incluye splits de transacciones para cálculos precisos

## 🎯 Acceso

### Desde el Dashboard Principal
1. En el sidebar derecho, sección "Activity"
2. Botón "Ver Estadísticas Detalladas" con icono 📊
3. Navegación directa a `/dashboard/stats`

### URL Directa
```
/dashboard/stats
```

## 🔄 Flujo de Datos

1. **Carga de Usuario**: Obtiene información del usuario autenticado
2. **Carga de Grupos**: Obtiene grupos donde el usuario es miembro
3. **Filtros**: Usuario selecciona grupo y período de tiempo
4. **Consulta de Transacciones**: Obtiene transacciones filtradas con relaciones
5. **Cálculo de Estadísticas**: Procesa datos para generar métricas
6. **Renderizado**: Muestra componentes con datos calculados

## 🎨 Diseño y UX

### Principios de Diseño
- **Consistencia**: Utiliza el sistema de diseño existente de Splity
- **Claridad**: Información presentada de forma clara y comprensible
- **Interactividad**: Filtros responsivos y animaciones suaves
- **Responsividad**: Adaptable a diferentes tamaños de pantalla

### Animaciones
- Entrada suave con `framer-motion`
- Transiciones en hover para tarjetas
- Barras de progreso animadas

### Colores Temáticos
- Verde esmeralda para valores positivos
- Rojo para valores negativos
- Colores neutros para información general

## 🚀 Funcionalidades Futuras

### Próximas Mejoras
- [ ] Gráficos más avanzados (Chart.js o Recharts)
- [ ] Exportación de datos (PDF, CSV)
- [ ] Comparación entre períodos
- [ ] Predicciones de gasto
- [ ] Alertas de presupuesto
- [ ] Análisis de patrones de gasto
- [ ] Integración con metas financieras

### Optimizaciones Técnicas
- [ ] Cache de consultas frecuentes
- [ ] Paginación para grandes volúmenes de datos
- [ ] Lazy loading de componentes
- [ ] Service Workers para datos offline

## 🔧 Mantenimiento

### Consideraciones
- Las consultas están optimizadas para evitar N+1 queries
- Los componentes son modulares y reutilizables
- El código incluye manejo de errores y estados de carga
- Compatible con el sistema de tipos existente

### Testing
- Componentes diseñados para ser fácilmente testeable
- Interfaces bien definidas para mocking
- Separación clara entre lógica y presentación

---

**Nota**: Esta funcionalidad es completamente aditiva y no afecta el funcionamiento existente de Splity. Todos los componentes y páginas existentes permanecen intactos. 