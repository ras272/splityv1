import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion, useInView } from "framer-motion"
import { useRef, useState } from "react"
import { TrendingUp, TrendingDown, Activity, BarChart3, PieChart, Users } from "lucide-react"

interface SparklineData {
  title: string
  values: number[]
  currentValue: number
  previousValue: number
  unit: string
  color: 'emerald' | 'blue' | 'purple' | 'orange' | 'pink' | 'indigo'
  icon: any
}

interface SparklineGridProps {
  data: SparklineData[]
  formatCurrency: (amount: number) => string
}

// Componente Sparkline Grande
function LargeSparkline({ 
  data, 
  color = "emerald",
  isHovered = false 
}: { 
  data: number[], 
  color: string,
  isHovered?: boolean 
}) {
  if (!data || data.length < 2) return null

  const width = 120
  const height = 40
  const maxValue = Math.max(...data)
  const minValue = Math.min(...data)
  const range = maxValue - minValue || 1

  // Generar puntos para la línea
  const points = data.map((value, index) => ({
    x: (index / (data.length - 1)) * width,
    y: height - ((value - minValue) / range) * height
  }))

  // Crear path para la línea
  const linePath = points.length > 0 
    ? `M ${points[0].x} ${points[0].y} ` + 
      points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : ''

  // Crear path para el área
  const areaPath = points.length > 0
    ? `M ${points[0].x} ${height} L ${points[0].x} ${points[0].y} ` +
      points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') +
      ` L ${points[points.length - 1].x} ${height} Z`
    : ''

  const colorClasses = {
    emerald: {
      line: "stroke-emerald-500 dark:stroke-emerald-400",
      area: "fill-emerald-500/20 dark:fill-emerald-400/20",
      glow: "drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]"
    },
    blue: {
      line: "stroke-blue-500 dark:stroke-blue-400", 
      area: "fill-blue-500/20 dark:fill-blue-400/20",
      glow: "drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]"
    },
    purple: {
      line: "stroke-purple-500 dark:stroke-purple-400",
      area: "fill-purple-500/20 dark:fill-purple-400/20",
      glow: "drop-shadow-[0_0_8px_rgba(147,51,234,0.4)]"
    },
    orange: {
      line: "stroke-orange-500 dark:stroke-orange-400",
      area: "fill-orange-500/20 dark:fill-orange-400/20",
      glow: "drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]"
    },
    pink: {
      line: "stroke-pink-500 dark:stroke-pink-400",
      area: "fill-pink-500/20 dark:fill-pink-400/20",
      glow: "drop-shadow-[0_0_8px_rgba(236,72,153,0.4)]"
    },
    indigo: {
      line: "stroke-indigo-500 dark:stroke-indigo-400",
      area: "fill-indigo-500/20 dark:fill-indigo-400/20",
      glow: "drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]"
    }
  }

  const colors = colorClasses[color as keyof typeof colorClasses] || colorClasses.emerald

  return (
    <div className="relative">
      <svg 
        width={width} 
        height={height} 
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={`large-sparkline-gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" className="stop-color-current" stopOpacity="0.4" />
            <stop offset="100%" className="stop-color-current" stopOpacity="0.05" />
          </linearGradient>
          <filter id={`glow-${color}`}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Líneas de cuadrícula sutiles */}
        {[0.25, 0.5, 0.75].map((ratio, i) => (
          <motion.line
            key={i}
            x1="0"
            y1={height - ratio * height}
            x2={width}
            y2={height - ratio * height}
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeWidth="0.5"
            className="text-gray-400 dark:text-gray-600"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
          />
        ))}

        {/* Área sombreada */}
        <motion.path
          d={areaPath}
          className={colors.area}
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
          style={{ transformOrigin: "bottom" }}
        />

        {/* Línea principal */}
        <motion.path
          d={linePath}
          fill="none"
          className={`${colors.line} ${isHovered ? colors.glow : ''}`}
          strokeWidth={isHovered ? "3" : "2.5"}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={isHovered ? `url(#glow-${color})` : undefined}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, delay: 0.5, ease: "easeInOut" }}
          style={{ transition: "stroke-width 0.3s ease" }}
        />

        {/* Puntos en los extremos */}
        <motion.circle
          cx={points[0]?.x}
          cy={points[0]?.y}
          r="2"
          className={colors.line}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.5, type: "spring", stiffness: 200 }}
        />
        <motion.circle
          cx={points[points.length - 1]?.x}
          cy={points[points.length - 1]?.y}
          r="3"
          className={colors.line}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.7, type: "spring", stiffness: 200 }}
        />

        {/* Punto brillante en el último valor */}
        <motion.circle
          cx={points[points.length - 1]?.x}
          cy={points[points.length - 1]?.y}
          r="6"
          className={colors.line}
          fill="none"
          strokeWidth="1.5"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.8, 0.4]
          }}
          transition={{ 
            delay: 1.9,
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </svg>
    </div>
  )
}

export function SparklineGrid({ data, formatCurrency }: SparklineGridProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.9
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
        duration: 0.6
      }
    }
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <Card className="overflow-hidden shadow-lg hover:shadow-2xl dark:shadow-gray-900/50 transition-shadow duration-500 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <CardHeader className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/50 dark:via-purple-950/50 dark:to-pink-950/50 relative overflow-hidden border-b border-indigo-100 dark:border-indigo-800">
            {/* Efecto de ondas en el header */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-indigo-100/60 via-purple-100/60 to-pink-100/60 dark:from-indigo-400/20 dark:via-purple-400/20 dark:to-pink-400/20"
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear"
              }}
            />
            <CardTitle className="flex items-center gap-2 relative z-10 text-gray-900 dark:text-gray-100">
              <motion.span 
                className="text-xl"
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                ⚡
              </motion.span>
              <span className="bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 dark:from-indigo-300 dark:via-purple-300 dark:to-pink-300 bg-clip-text text-transparent font-bold">
                Tendencias Rápidas
              </span>
            </CardTitle>
          </CardHeader>
        </motion.div>
        
        <CardContent className="p-6 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            {data.map((item, index) => {
              const isHovered = hoveredIndex === index
              const change = item.currentValue - item.previousValue
              const changePercent = item.previousValue > 0 ? (change / item.previousValue) * 100 : 0
              const isPositive = change >= 0
              
              return (
                <motion.div 
                  key={item.title} 
                  className="group cursor-pointer"
                  variants={itemVariants}
                  whileHover={{ 
                    scale: 1.03,
                    y: -5,
                    transition: { duration: 0.2 }
                  }}
                  onHoverStart={() => setHoveredIndex(index)}
                  onHoverEnd={() => setHoveredIndex(null)}
                >
                  <div className={`p-4 rounded-xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-300 ${
                    isHovered 
                      ? `ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 ring-${item.color}-500` 
                      : ''
                  }`}
                  >
                    {/* Header con icono y título */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <motion.div 
                          className={`p-2 rounded-lg bg-gradient-to-br from-${item.color}-100 to-${item.color}-200 dark:from-${item.color}-900/50 dark:to-${item.color}-800/50`}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                        >
                          <item.icon className={`h-4 w-4 text-${item.color}-600 dark:text-${item.color}-400`} />
                        </motion.div>
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                          {item.title}
                        </h3>
                      </div>
                      
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                      >
                        <Badge 
                          variant={isPositive ? "default" : "destructive"}
                          className={`text-xs ${
                            isPositive 
                              ? `bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-700` 
                              : `bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-700`
                          }`}
                        >
                          {isPositive ? '+' : ''}{changePercent.toFixed(1)}%
                        </Badge>
                      </motion.div>
                    </div>

                    {/* Valor actual */}
                    <motion.div 
                      className="mb-3"
                      animate={isHovered ? { scale: 1.05 } : { scale: 1 }}
                    >
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {item.unit === 'currency' 
                          ? formatCurrency(item.currentValue)
                          : item.currentValue.toLocaleString()
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.unit === 'currency' ? 'Valor actual' : 'Cantidad actual'}
                      </p>
                    </motion.div>

                    {/* Sparkline */}
                    <div className="flex justify-center mb-3">
                      <LargeSparkline 
                        data={item.values} 
                        color={item.color}
                        isHovered={isHovered}
                      />
                    </div>

                    {/* Cambio vs anterior */}
                    <motion.div 
                      className="flex items-center justify-between text-sm"
                      initial={{ opacity: 0.7 }}
                      animate={isHovered ? { opacity: 1 } : { opacity: 0.7 }}
                    >
                      <div className="flex items-center gap-1">
                        {isPositive ? (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                        <span className={`font-medium ${
                          isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {item.unit === 'currency' 
                            ? formatCurrency(Math.abs(change))
                            : Math.abs(change).toLocaleString()
                          }
                        </span>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        vs anterior
                      </span>
                    </motion.div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>

          {data.length === 0 && (
            <motion.div 
              className="text-center py-12"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
            >
              <motion.div 
                className="text-6xl mb-4"
                animate={{ 
                  y: [0, -10, 0],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                ⚡
              </motion.div>
              <p className="text-muted-foreground">No hay datos de tendencias para mostrar</p>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
} 