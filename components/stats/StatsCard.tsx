import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { motion, useSpring, useTransform } from "framer-motion"
import { useEffect, useState } from "react"

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: {
    value: number
    label: string
    isPositive?: boolean
  }
  sparklineData?: number[]
  className?: string
}

// Hook para animar números
function useAnimatedNumber(value: number, duration: number = 1000) {
  const [displayValue, setDisplayValue] = useState(0)
  
  useEffect(() => {
    let startTime: number
    let startValue = displayValue
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function (ease out)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const currentValue = startValue + (value - startValue) * easeOut
      
      setDisplayValue(currentValue)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }, [value, duration])
  
  return displayValue
}

// Componente Sparkline
function Sparkline({ data, className = "", color = "emerald" }: { 
  data: number[], 
  className?: string,
  color?: string 
}) {
  if (!data || data.length < 2) return null

  const width = 60
  const height = 20
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
      gradient: "from-emerald-500/30 to-emerald-500/5 dark:from-emerald-400/30 dark:to-emerald-400/5"
    },
    blue: {
      line: "stroke-blue-500 dark:stroke-blue-400", 
      area: "fill-blue-500/20 dark:fill-blue-400/20",
      gradient: "from-blue-500/30 to-blue-500/5 dark:from-blue-400/30 dark:to-blue-400/5"
    },
    purple: {
      line: "stroke-purple-500 dark:stroke-purple-400",
      area: "fill-purple-500/20 dark:fill-purple-400/20", 
      gradient: "from-purple-500/30 to-purple-500/5 dark:from-purple-400/30 dark:to-purple-400/5"
    },
    orange: {
      line: "stroke-orange-500 dark:stroke-orange-400",
      area: "fill-orange-500/20 dark:fill-orange-400/20",
      gradient: "from-orange-500/30 to-orange-500/5 dark:from-orange-400/30 dark:to-orange-400/5"
    }
  }

  const colors = colorClasses[color as keyof typeof colorClasses] || colorClasses.emerald

  return (
    <div className={`relative ${className}`}>
      <svg 
        width={width} 
        height={height} 
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={`sparkline-gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" className="stop-color-current" stopOpacity="0.3" />
            <stop offset="100%" className="stop-color-current" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Área sombreada */}
        <motion.path
          d={areaPath}
          className={colors.area}
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
          style={{ transformOrigin: "bottom" }}
        />

        {/* Línea principal */}
        <motion.path
          d={linePath}
          fill="none"
          className={colors.line}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, delay: 0.7, ease: "easeInOut" }}
        />

        {/* Puntos en los extremos */}
        <motion.circle
          cx={points[0]?.x}
          cy={points[0]?.y}
          r="1.5"
          className={colors.line}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.2, type: "spring", stiffness: 200 }}
        />
        <motion.circle
          cx={points[points.length - 1]?.x}
          cy={points[points.length - 1]?.y}
          r="2"
          className={colors.line}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.4, type: "spring", stiffness: 200 }}
        />

        {/* Punto brillante en el último valor */}
        <motion.circle
          cx={points[points.length - 1]?.x}
          cy={points[points.length - 1]?.y}
          r="4"
          className={colors.line}
          fill="none"
          strokeWidth="1"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.7, 0.3]
          }}
          transition={{ 
            delay: 1.6,
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </svg>
    </div>
  )
}

export function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  sparklineData,
  className = "" 
}: StatsCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  // Extraer número del valor para animación
  const numericValue = typeof value === 'string' 
    ? parseFloat(value.replace(/[^0-9.-]/g, '')) || 0
    : value
  
  const animatedNumber = useAnimatedNumber(numericValue, 1500)
  
  // Formatear el valor animado
  const formatAnimatedValue = (animatedVal: number) => {
    if (typeof value === 'string') {
      // Si es string (como moneda), mantener el formato pero con número animado
      if (value.includes('$') || value.includes('€') || value.includes('£')) {
        return value.replace(/[\d,.-]+/, animatedVal.toLocaleString('es-ES', { 
          minimumFractionDigits: 0,
          maximumFractionDigits: 0 
        }))
      }
      return animatedVal.toFixed(0)
    }
    return animatedVal.toFixed(0)
  }

  // Determinar color del sparkline basado en el título
  const getSparklineColor = () => {
    const titleLower = title.toLowerCase()
    if (titleLower.includes('total') || titleLower.includes('gastado')) return 'emerald'
    if (titleLower.includes('transaccion')) return 'blue'
    if (titleLower.includes('balance')) return 'purple'
    if (titleLower.includes('grupo')) return 'orange'
    return 'emerald'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.6,
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
      whileHover={{ 
        y: -8,
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card className={`relative overflow-hidden transition-all duration-500 border-0 bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 shadow-lg hover:shadow-2xl dark:shadow-gray-900/50 ${className}`}>
        {/* Efecto de brillo animado mejorado */}
        <motion.div 
          className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/40 via-emerald-100/30 to-transparent dark:from-white/10 dark:via-emerald-400/20 dark:to-transparent rounded-bl-full"
          animate={isHovered ? { scale: 1.8, opacity: 0.6 } : { scale: 1, opacity: 0.3 }}
          transition={{ duration: 0.4 }}
        />
        
        {/* Borde brillante en modo oscuro */}
        <motion.div
          className="absolute inset-0 rounded-lg bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-blue-500/20 dark:from-emerald-400/30 dark:via-teal-400/30 dark:to-blue-400/30"
          animate={isHovered ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.3 }}
        />
        
        {/* Partículas flotantes en hover */}
        {isHovered && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-emerald-400 dark:bg-emerald-300 rounded-full"
                initial={{ 
                  x: Math.random() * 100 + '%',
                  y: '100%',
                  opacity: 0
                }}
                animate={{
                  y: '-20%',
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.2,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
              />
            ))}
          </div>
        )}
        
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {title}
          </CardTitle>
          <motion.div 
            className="relative"
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-500 to-blue-500 dark:from-emerald-300 dark:via-teal-400 dark:to-blue-400 rounded-full blur-sm"
              animate={isHovered ? { scale: 1.3, opacity: 0.8 } : { scale: 1, opacity: 0.4 }}
              transition={{ duration: 0.3 }}
            />
            <div className="relative bg-gradient-to-r from-emerald-500 via-teal-600 to-blue-600 dark:from-emerald-400 dark:via-teal-500 dark:to-blue-500 p-2.5 rounded-full shadow-lg">
              <motion.div
                animate={isHovered ? { scale: 1.1 } : { scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Icon className="h-4 w-4 text-white drop-shadow-sm" />
              </motion.div>
            </div>
          </motion.div>
        </CardHeader>
        
        <CardContent className="space-y-3 relative z-10">
          <div className="flex items-end justify-between">
            <motion.div 
              className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            >
              {formatAnimatedValue(animatedNumber)}
            </motion.div>
            
            {/* Mini Sparkline */}
            {sparklineData && sparklineData.length > 1 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="flex-shrink-0"
              >
                <Sparkline 
                  data={sparklineData} 
                  color={getSparklineColor()}
                  className="opacity-80 hover:opacity-100 transition-opacity"
                />
              </motion.div>
            )}
          </div>
          
          {subtitle && (
            <motion.p 
              className="text-sm text-muted-foreground font-medium"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              {subtitle}
            </motion.p>
          )}
          
          {trend && (
            <motion.div 
              className="flex items-center gap-2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              <motion.div 
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
                  trend.isPositive 
                    ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 dark:from-green-900/50 dark:to-emerald-900/50 dark:text-green-300 border border-green-200 dark:border-green-700" 
                    : "bg-gradient-to-r from-red-100 to-rose-100 text-red-700 dark:from-red-900/50 dark:to-rose-900/50 dark:text-red-300 border border-red-200 dark:border-red-700"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.span 
                  className="text-sm"
                  animate={{ 
                    y: trend.isPositive ? [0, -2, 0] : [0, 2, 0]
                  }}
                  transition={{ 
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  {trend.isPositive ? "↗" : "↘"}
                </motion.span>
                {Math.abs(trend.value).toFixed(1)}%
              </motion.div>
              <span className="text-xs text-muted-foreground">{trend.label}</span>
            </motion.div>
          )}
        </CardContent>
        
        {/* Línea decorativa animada mejorada */}
        <motion.div 
          className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500 dark:from-emerald-400 dark:via-teal-400 dark:to-blue-400"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
          style={{ transformOrigin: "left" }}
        />
        
        {/* Efecto de pulso en hover mejorado */}
        <motion.div
          className="absolute inset-0 border-2 border-emerald-400/50 dark:border-emerald-300/50 rounded-lg"
          initial={{ opacity: 0, scale: 1 }}
          animate={isHovered ? { 
            opacity: [0, 0.4, 0],
            scale: [1, 1.02, 1.04]
          } : { opacity: 0, scale: 1 }}
          transition={{ 
            duration: 1.5,
            repeat: isHovered ? Infinity : 0,
            ease: "easeInOut"
          }}
        />
        
        {/* Overlay sutil para modo oscuro */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/5 dark:to-white/5 rounded-lg pointer-events-none" />
      </Card>
    </motion.div>
  )
} 