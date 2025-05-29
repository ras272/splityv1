"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import { motion, AnimatePresence, useInView } from "framer-motion"
import { ArrowLeft, TrendingUp, TrendingDown, Calendar, Users, PieChart, BarChart3, Target, Download, DollarSign, CreditCard, Sparkles, Activity, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useRouter } from "next/navigation"
import { CURRENCY_OPTIONS, formatAmount } from "@/utils/currency"
import { StatsCard } from "@/components/stats/StatsCard"
import { CategoryBreakdown } from "@/components/stats/CategoryBreakdown"
import { MonthlyChart } from "@/components/stats/MonthlyChart"
import { Skeleton } from "@/components/ui/skeleton"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { SparklineGrid } from '@/components/stats'

// Interfaces
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

interface GroupStat {
  id: string
  name: string
  amount: number
  count: number
  emoji: string
  balance: number
}

interface MonthlyData {
  month: string
  amount: number
  transactions: number
}

interface ExpenseGroup {
  id: string
  name: string
  emoji: string
  currency: string
}

export default function StatsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [groups, setGroups] = useState<ExpenseGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all")
  const [timeRange, setTimeRange] = useState<string>("3months")
  const [statsData, setStatsData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  // Referencias para animaciones en viewport
  const headerRef = useRef(null)
  const filtersRef = useRef(null)
  const statsRef = useRef(null)
  const chartsRef = useRef(null)
  
  const headerInView = useInView(headerRef, { once: true })
  const filtersInView = useInView(filtersRef, { once: true })
  const statsInView = useInView(statsRef, { once: true })
  const chartsInView = useInView(chartsRef, { once: true })

  useEffect(() => {
    loadUser()
    loadGroups()
  }, [])

  useEffect(() => {
    if (user) {
      loadStatsData()
    }
  }, [user, selectedGroupId, timeRange])

  const loadUser = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const loadGroups = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    try {
      const { data: groupMemberships } = await supabase
        .from('group_members')
        .select(`
          groups (
            id,
            name,
            emoji,
            currency
          )
        `)
        .eq('user_id', user.id as any)

      const groupsData = groupMemberships?.map((membership: any) => membership.groups).filter(Boolean) || []
      setGroups(groupsData as ExpenseGroup[])
    } catch (error) {
      console.error('Error loading groups:', error)
      setGroups([])
    }
  }

  const loadStatsData = async () => {
    if (!user) return
    
    setLoading(true)
    const supabase = createClient()

    try {
      // Calcular rango de fechas
      const endDate = new Date()
      const startDate = new Date()
      
      switch (timeRange) {
        case '1month':
          startDate.setMonth(endDate.getMonth() - 1)
          break
        case '3months':
          startDate.setMonth(endDate.getMonth() - 3)
          break
        case '6months':
          startDate.setMonth(endDate.getMonth() - 6)
          break
        case '1year':
          startDate.setFullYear(endDate.getFullYear() - 1)
          break
      }

      // Query base para transacciones
      let query = supabase
        .from('transactions')
        .select(`
          *,
          transaction_splits!transaction_splits_transaction_id_fkey (
            user_id,
            amount
          ),
          categories (
            name,
            emoji
          ),
          groups (
            name,
            emoji,
            currency
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      // Filtrar por grupo si no es "all"
      if (selectedGroupId !== "all") {
        query = query.eq('group_id', selectedGroupId as any)
      }

      const { data: transactions, error } = await query

      if (error) {
        console.error('❌ Error en consulta:', error)
        return
      }

      if (transactions) {
        const stats = calculateStats(transactions)
        setStatsData(stats)
      } else {
        setStatsData({
          totalSpent: 0,
          totalTransactions: 0,
          averageTransaction: 0,
          monthlyTrend: 0,
          categoryBreakdown: [],
          groupBreakdown: [],
          monthlyData: [],
          balance: 0
        })
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (transactions: any[]): StatsData => {
    // Filtrar solo transacciones donde el usuario participó
    const userTransactions = transactions.filter(t => 
      t.transaction_splits?.some((split: any) => split.user_id === user?.id) ||
      t.paid_by === user?.id
    )

    // Calcular totales - mejorado para considerar tanto splits como montos directos
    const totalSpent = userTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => {
        // Primero intentar obtener el split del usuario
        const userSplit = t.transaction_splits?.find((s: any) => s.user_id === user?.id)
        let amount = 0
        
        if (userSplit) {
          // Si hay split, usar ese monto
          amount = userSplit.amount || 0
        } else if (t.paid_by === user?.id) {
          // Si no hay split pero el usuario pagó, usar el monto total de la transacción
          amount = t.amount || 0
        }
        
        return sum + amount
      }, 0)

    const totalTransactions = userTransactions.length
    const averageTransaction = totalTransactions > 0 ? totalSpent / totalTransactions : 0

    // Calcular tendencia mensual (comparar con mes anterior)
    const currentMonth = new Date().getMonth()
    const currentMonthTransactions = userTransactions.filter(t => 
      new Date(t.created_at).getMonth() === currentMonth
    )
    const previousMonthTransactions = userTransactions.filter(t => 
      new Date(t.created_at).getMonth() === currentMonth - 1
    )

    const currentMonthSpent = currentMonthTransactions.reduce((sum, t) => {
      const userSplit = t.transaction_splits?.find((s: any) => s.user_id === user?.id)
      let amount = 0
      
      if (userSplit) {
        amount = userSplit.amount || 0
      } else if (t.paid_by === user?.id) {
        amount = t.amount || 0
      }
      
      return sum + amount
    }, 0)

    const previousMonthSpent = previousMonthTransactions.reduce((sum, t) => {
      const userSplit = t.transaction_splits?.find((s: any) => s.user_id === user?.id)
      let amount = 0
      
      if (userSplit) {
        amount = userSplit.amount || 0
      } else if (t.paid_by === user?.id) {
        amount = t.amount || 0
      }
      
      return sum + amount
    }, 0)

    const monthlyTrend = previousMonthSpent > 0 
      ? ((currentMonthSpent - previousMonthSpent) / previousMonthSpent) * 100 
      : 0

    // Breakdown por categorías
    const categoryMap = new Map()
    userTransactions.forEach(t => {
      if (t.type === 'expense') {
        const categoryName = t.categories?.name || 'Sin categoría'
        const categoryEmoji = t.categories?.emoji || '📦'
        
        const userSplit = t.transaction_splits?.find((s: any) => s.user_id === user?.id)
        let amount = 0
        
        if (userSplit) {
          amount = userSplit.amount || 0
        } else if (t.paid_by === user?.id) {
          amount = t.amount || 0
        }

        if (categoryMap.has(categoryName)) {
          const existing = categoryMap.get(categoryName)
          categoryMap.set(categoryName, {
            ...existing,
            amount: existing.amount + amount,
            count: existing.count + 1
          })
        } else {
          categoryMap.set(categoryName, {
            name: categoryName,
            amount,
            count: 1,
            emoji: categoryEmoji,
            percentage: 0
          })
        }
      }
    })

    const categoryBreakdown = Array.from(categoryMap.values())
      .map(cat => ({
        ...cat,
        percentage: totalSpent > 0 ? (cat.amount / totalSpent) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)

    // Breakdown por grupos
    const groupMap = new Map()
    userTransactions.forEach(t => {
      const groupName = t.groups?.name || 'Personal'
      const groupEmoji = t.groups?.emoji || '👤'
      
      const userSplit = t.transaction_splits?.find((s: any) => s.user_id === user?.id)
      let amount = 0
      
      if (userSplit) {
        amount = userSplit.amount || 0
      } else if (t.paid_by === user?.id) {
        amount = t.amount || 0
      }

      if (groupMap.has(t.group_id)) {
        const existing = groupMap.get(t.group_id)
        groupMap.set(t.group_id, {
          ...existing,
          amount: existing.amount + amount,
          count: existing.count + 1
        })
      } else {
        groupMap.set(t.group_id, {
          id: t.group_id,
          name: groupName,
          amount,
          count: 1,
          emoji: groupEmoji,
          balance: 0 // Se calculará después
        })
      }
    })

    const groupBreakdown = Array.from(groupMap.values())
      .sort((a, b) => b.amount - a.amount)

    // Datos mensuales para gráficos
    const monthlyMap = new Map()
    userTransactions.forEach(t => {
      const date = new Date(t.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthName = date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
      
      const userSplit = t.transaction_splits?.find((s: any) => s.user_id === user?.id)
      let amount = 0
      
      if (userSplit) {
        amount = userSplit.amount || 0
      } else if (t.paid_by === user?.id) {
        amount = t.amount || 0
      }

      if (monthlyMap.has(monthKey)) {
        const existing = monthlyMap.get(monthKey)
        monthlyMap.set(monthKey, {
          ...existing,
          amount: existing.amount + amount,
          transactions: existing.transactions + 1
        })
      } else {
        monthlyMap.set(monthKey, {
          month: monthName,
          amount,
          transactions: 1
        })
      }
    })

    const monthlyData = Array.from(monthlyMap.values())
      .sort((a, b) => a.month.localeCompare(b.month))

    // Calcular balance simple (por ahora 0, se puede mejorar después)
    const balance = 0

    const finalStats = {
      totalSpent,
      totalTransactions,
      averageTransaction,
      monthlyTrend,
      categoryBreakdown,
      groupBreakdown,
      monthlyData,
      balance
    }

    return finalStats
  }

  // Función para generar datos de sparkline
  const generateSparklineData = (type: string, monthlyData: MonthlyData[]) => {
    if (!monthlyData || monthlyData.length === 0) {
      // Generar datos de ejemplo si no hay datos reales
      const baseValue = Math.random() * 100 + 50
      return Array.from({ length: 8 }, (_, i) => {
        const variation = (Math.random() - 0.5) * 20
        const trend = type === 'increasing' ? i * 5 : type === 'decreasing' ? -i * 3 : 0
        return Math.max(0, baseValue + variation + trend)
      })
    }

    // Usar datos reales si están disponibles
    const values = monthlyData.map(d => {
      switch (type) {
        case 'totalSpent':
          return d.amount
        case 'transactions':
          return d.transactions
        case 'average':
          return d.transactions > 0 ? d.amount / d.transactions : 0
        default:
          return d.amount
      }
    })

    // Asegurar que tengamos al menos 6 puntos para un buen sparkline
    if (values.length < 6) {
      const lastValue = values[values.length - 1] || 0
      const trend = values.length > 1 ? values[values.length - 1] - values[0] : 0
      const avgChange = trend / Math.max(values.length - 1, 1)
      
      while (values.length < 8) {
        const nextValue = values[values.length - 1] + avgChange + (Math.random() - 0.5) * avgChange * 0.3
        values.push(Math.max(0, nextValue))
      }
    }

    return values.slice(-8) // Últimos 8 puntos
  }

  const formatCurrency = (amount: number) => {
    const currency = selectedGroupId !== "all" 
      ? groups.find(g => g.id === selectedGroupId)?.currency || 'PYG'
      : 'PYG'
    
    return formatAmount(amount, currency)
  }

  // Variantes de animación para contenedores
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  }

  // Animación de carga mejorada
  const LoadingSkeleton = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      {/* Header skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-6 w-96" />
      </div>

      {/* Filters skeleton */}
      <motion.div 
        className="flex gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {[1, 2, 3].map((i) => (
          <motion.div key={i} variants={itemVariants}>
            <Skeleton className="h-10 w-32" />
          </motion.div>
        ))}
      </motion.div>

      {/* Stats cards skeleton */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {[1, 2, 3, 4].map((i) => (
          <motion.div key={i} variants={itemVariants}>
            <Card className="p-6">
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts skeleton */}
      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {[1, 2].map((i) => (
          <motion.div key={i} variants={itemVariants}>
            <Card className="p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-48 w-full" />
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )

  // Función para generar datos de sparkline para el grid
  const generateSparklineGridData = (monthlyData: any[], statsData: StatsData) => {
    const sparklineData = [
      {
        title: 'Gastos Totales',
        values: monthlyData.map(m => m.totalSpent),
        currentValue: statsData.totalSpent,
        previousValue: monthlyData.length > 1 ? monthlyData[monthlyData.length - 2]?.totalSpent || 0 : 0,
        unit: 'currency',
        color: 'emerald' as const,
        icon: PieChart
      },
      {
        title: 'Transacciones',
        values: monthlyData.map(m => m.transactions),
        currentValue: statsData.totalTransactions,
        previousValue: monthlyData.length > 1 ? monthlyData[monthlyData.length - 2]?.transactions || 0 : 0,
        unit: 'count',
        color: 'blue' as const,
        icon: BarChart3
      },
      {
        title: 'Balance',
        values: monthlyData.map(m => Math.abs(m.balance || 0)),
        currentValue: Math.abs(statsData.balance),
        previousValue: monthlyData.length > 1 ? Math.abs(monthlyData[monthlyData.length - 2]?.balance || 0) : 0,
        unit: 'currency',
        color: 'purple' as const,
        icon: Target
      },
      {
        title: 'Promedio por Transacción',
        values: monthlyData.map(m => m.averageTransaction || 0),
        currentValue: statsData.averageTransaction,
        previousValue: monthlyData.length > 1 ? monthlyData[monthlyData.length - 2]?.averageTransaction || 0 : 0,
        unit: 'currency',
        color: 'orange' as const,
        icon: Activity
      },
      {
        title: 'Grupos Activos',
        values: monthlyData.map(m => m.activeGroups || 0),
        currentValue: statsData.groupBreakdown.length,
        previousValue: monthlyData.length > 1 ? monthlyData[monthlyData.length - 2]?.activeGroups || 0 : 0,
        unit: 'count',
        color: 'pink' as const,
        icon: Users
      },
      {
        title: 'Categorías Usadas',
        values: monthlyData.map(m => m.categoriesUsed || 0),
        currentValue: statsData.categoryBreakdown.length,
        previousValue: monthlyData.length > 1 ? monthlyData[monthlyData.length - 2]?.categoriesUsed || 0 : 0,
        unit: 'count',
        color: 'indigo' as const,
        icon: Calendar
      }
    ]

    return sparklineData.filter(item => item.values.length > 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 transition-colors duration-500">
      {/* Header */}
      <div className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60 border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.back()}
                  className="gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver
                </Button>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <motion.h1 
                  className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 dark:from-emerald-400 dark:via-teal-400 dark:to-blue-400 bg-clip-text text-transparent"
                  animate={{ 
                    backgroundPosition: ['0%', '100%', '0%']
                  }}
                  transition={{ 
                    duration: 8,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  style={{ backgroundSize: '200% 100%' }}
                >
                  📊 Estadísticas Detalladas
                </motion.h1>
                <p className="text-muted-foreground">Análisis completo de tus gastos y balances</p>
              </motion.div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  variant="outline" 
                  className="gap-2 bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300"
                >
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="container mx-auto px-4 py-6">
        <motion.div 
          className="flex flex-col sm:flex-row gap-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger className="w-full sm:w-[200px] bg-white/70 dark:bg-gray-800/70 border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-all duration-300">
                <SelectValue placeholder="Seleccionar grupo" />
              </SelectTrigger>
              <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-gray-200 dark:border-gray-700">
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <span>🌍</span>
                    <span>Todos los grupos</span>
                  </div>
                </SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    <div className="flex items-center gap-2">
                      <span>{group.emoji}</span>
                      <span>{group.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-full sm:w-[200px] bg-white/70 dark:bg-gray-800/70 border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-all duration-300">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-gray-200 dark:border-gray-700">
                <SelectItem value="1month">Último mes</SelectItem>
                <SelectItem value="3months">Últimos 3 meses</SelectItem>
                <SelectItem value="6months">Últimos 6 meses</SelectItem>
                <SelectItem value="1year">Último año</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>
        </motion.div>

        {/* Stats Cards */}
        {statsData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Mostrar mensaje si no hay datos */}
            {statsData.totalTransactions === 0 && (
              <Card className="border-dashed border-2 border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <motion.div 
                    className="text-6xl mb-4"
                    animate={{ 
                      y: [0, -10, 0],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ 
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    📊
                  </motion.div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">¡Bienvenido a las Estadísticas!</h3>
                  <p className="text-muted-foreground text-center mb-6 max-w-md">
                    No se encontraron transacciones para el período y grupo seleccionados. 
                    Para ver estadísticas detalladas, necesitas agregar algunas transacciones primero.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl mb-6">
                    <motion.div 
                      className="text-center p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800"
                      whileHover={{ scale: 1.05, y: -2 }}
                    >
                      <div className="text-2xl mb-2">🏠</div>
                      <h4 className="font-medium mb-1">1. Crea un Grupo</h4>
                      <p className="text-sm text-muted-foreground">Organiza tus gastos por grupos</p>
                    </motion.div>
                    <motion.div 
                      className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border border-blue-200 dark:border-blue-800"
                      whileHover={{ scale: 1.05, y: -2 }}
                    >
                      <div className="text-2xl mb-2">💰</div>
                      <h4 className="font-medium mb-1">2. Agrega Gastos</h4>
                      <p className="text-sm text-muted-foreground">Registra tus transacciones</p>
                    </motion.div>
                    <motion.div 
                      className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg border border-purple-200 dark:border-purple-800"
                      whileHover={{ scale: 1.05, y: -2 }}
                    >
                      <div className="text-2xl mb-2">📈</div>
                      <h4 className="font-medium mb-1">3. Ve Estadísticas</h4>
                      <p className="text-sm text-muted-foreground">Analiza tus patrones de gasto</p>
                    </motion.div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button 
                        onClick={() => router.push('/dashboard')}
                        className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Ir al Dashboard
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setTimeRange('1year')
                          setSelectedGroupId('all')
                        }}
                        className="gap-2 bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                      >
                        <Calendar className="h-4 w-4" />
                        Ver Último Año
                      </Button>
                    </motion.div>
                  </div>

                  <div className="mt-6 text-xs text-muted-foreground">
                    <p>💡 <strong>Consejo:</strong> Prueba cambiar el período de tiempo o seleccionar "Todos los grupos"</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Overview Cards - Solo mostrar si hay datos */}
            {statsData.totalTransactions > 0 && (
              <>
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, staggerChildren: 0.1 }}
                >
                  <StatsCard
                    title="Total Gastado"
                    value={formatCurrency(statsData.totalSpent)}
                    icon={PieChart}
                    trend={{
                      value: statsData.monthlyTrend,
                      label: "vs mes anterior",
                      isPositive: statsData.monthlyTrend < 0
                    }}
                    sparklineData={generateSparklineData('totalSpent', statsData.monthlyData)}
                    className="border-emerald-200 dark:border-emerald-800"
                  />

                  <StatsCard
                    title="Transacciones"
                    value={statsData.totalTransactions}
                    subtitle={`Promedio: ${formatCurrency(statsData.averageTransaction)}`}
                    icon={BarChart3}
                    sparklineData={generateSparklineData('transactions', statsData.monthlyData)}
                  />

                  <StatsCard
                    title="Balance Actual"
                    value={formatCurrency(Math.abs(statsData.balance))}
                    subtitle={statsData.balance >= 0 ? 'Te deben' : 'Debes'}
                    icon={Target}
                    sparklineData={generateSparklineData('balance', statsData.monthlyData)}
                    className={statsData.balance >= 0 ? "border-green-200 dark:border-green-800" : "border-red-200 dark:border-red-800"}
                  />

                  <StatsCard
                    title="Grupos Activos"
                    value={statsData.groupBreakdown.length}
                    subtitle={`${statsData.categoryBreakdown.length} categorías`}
                    icon={Users}
                    sparklineData={generateSparklineData('groups', statsData.monthlyData)}
                  />
                </motion.div>

                {/* Sparkline Grid */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                >
                  <SparklineGrid 
                    data={generateSparklineGridData(statsData.monthlyData, statsData)}
                    formatCurrency={formatCurrency}
                  />
                </motion.div>

                {/* Charts and Breakdowns */}
                <motion.div 
                  className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                >
                  <CategoryBreakdown 
                    categories={statsData.categoryBreakdown}
                    formatCurrency={formatCurrency}
                  />
                  
                  <MonthlyChart 
                    data={statsData.monthlyData}
                    formatCurrency={formatCurrency}
                  />
                </motion.div>

                {/* Group Breakdown */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                >
                  <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-gray-200 dark:border-gray-700">
                    <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                      <CardTitle className="flex items-center gap-2">
                        <span>👥</span>
                        Actividad por Grupo
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {statsData.groupBreakdown.map((group, index) => (
                          <motion.div 
                            key={group.id} 
                            className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border border-gray-200 dark:border-gray-600"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.9 + index * 0.1 }}
                            whileHover={{ scale: 1.02, x: 5 }}
                          >
                            <div className="flex items-center gap-3">
                              <motion.span 
                                className="text-lg"
                                whileHover={{ scale: 1.2, rotate: 15 }}
                              >
                                {group.emoji}
                              </motion.span>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">{group.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {group.count} transacciones
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(group.amount)}</p>
                            </div>
                          </motion.div>
                        ))}
                        
                        {statsData.groupBreakdown.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <motion.div
                              animate={{ 
                                y: [0, -5, 0],
                                opacity: [0.5, 1, 0.5]
                              }}
                              transition={{ 
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            >
                              <p>No hay actividad en grupos para mostrar</p>
                            </motion.div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
} 