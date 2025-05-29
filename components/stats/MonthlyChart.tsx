import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { motion, useInView } from "framer-motion"
import { useState, useRef } from "react"

interface MonthlyData {
  month: string
  amount: number
  transactions: number
}

interface MonthlyChartProps {
  data: MonthlyData[]
  formatCurrency: (amount: number) => string
}

export function MonthlyChart({ data, formatCurrency }: MonthlyChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [isChartHovered, setIsChartHovered] = useState(false)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  
  const maxAmount = Math.max(...data.map(d => d.amount), 1)
  const chartHeight = 200
  const chartWidth = 100

  // Calcular puntos para el gráfico de líneas
  const points = data.map((item, index) => ({
    x: (index / Math.max(data.length - 1, 1)) * chartWidth,
    y: chartHeight - (item.amount / maxAmount) * chartHeight,
    data: item
  }))

  // Crear path para la línea
  const linePath = points.length > 0 
    ? `M ${points[0].x} ${points[0].y} ` + 
      points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : ''

  // Crear path para el área sombreada
  const areaPath = points.length > 0
    ? `M ${points[0].x} ${chartHeight} L ${points[0].x} ${points[0].y} ` +
      points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') +
      ` L ${points[points.length - 1].x} ${chartHeight} Z`
    : ''

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
          <CardHeader className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 dark:from-blue-950/50 dark:via-indigo-950/50 dark:to-blue-950/50 relative overflow-hidden border-b border-blue-100 dark:border-blue-800">
            {/* Efecto de ondas en el header mejorado */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-blue-100/60 via-indigo-100/60 to-blue-100/60 dark:from-blue-400/20 dark:via-indigo-400/20 dark:to-blue-400/20"
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
                  y: [0, -3, 0],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                📈
              </motion.span>
              <span className="bg-gradient-to-r from-blue-700 to-indigo-700 dark:from-blue-300 dark:to-indigo-300 bg-clip-text text-transparent font-bold">
                Tendencia Mensual
              </span>
            </CardTitle>
          </CardHeader>
        </motion.div>
        
        <CardContent className="p-6 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
          {data.length > 0 ? (
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              {/* Gráfico SVG mejorado */}
              <motion.div 
                className="relative"
                onHoverStart={() => setIsChartHovered(true)}
                onHoverEnd={() => setIsChartHovered(false)}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={isInView ? { scale: 1, opacity: 1 } : {}}
                transition={{ delay: 0.6, duration: 0.8, type: "spring" }}
              >
                <svg 
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                  className="w-full h-48 overflow-visible transition-all duration-300"
                  style={{ 
                    filter: isChartHovered 
                      ? 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.15)) drop-shadow(0 0 20px rgba(59, 130, 246, 0.3))' 
                      : 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))'
                  }}
                >
                  {/* Gradientes mejorados para modo oscuro */}
                  <defs>
                    <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.5" />
                      <stop offset="30%" stopColor="rgb(99, 102, 241)" stopOpacity="0.3" />
                      <stop offset="70%" stopColor="rgb(139, 92, 246)" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="rgb(168, 85, 247)" stopOpacity="0.05" />
                    </linearGradient>
                    <linearGradient id="areaGradientDark" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="rgb(96, 165, 250)" stopOpacity="0.4" />
                      <stop offset="30%" stopColor="rgb(129, 140, 248)" stopOpacity="0.25" />
                      <stop offset="70%" stopColor="rgb(167, 139, 250)" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="rgb(196, 181, 253)" stopOpacity="0.05" />
                    </linearGradient>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgb(59, 130, 246)" />
                      <stop offset="25%" stopColor="rgb(99, 102, 241)" />
                      <stop offset="50%" stopColor="rgb(139, 92, 246)" />
                      <stop offset="75%" stopColor="rgb(168, 85, 247)" />
                      <stop offset="100%" stopColor="rgb(192, 132, 252)" />
                    </linearGradient>
                    <linearGradient id="lineGradientDark" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgb(96, 165, 250)" />
                      <stop offset="25%" stopColor="rgb(129, 140, 248)" />
                      <stop offset="50%" stopColor="rgb(167, 139, 250)" />
                      <stop offset="75%" stopColor="rgb(196, 181, 253)" />
                      <stop offset="100%" stopColor="rgb(221, 214, 254)" />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge> 
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                    <filter id="glowDark">
                      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                      <feMerge> 
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Líneas de cuadrícula animadas mejoradas */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                    <motion.line
                      key={i}
                      x1="0"
                      y1={chartHeight - ratio * chartHeight}
                      x2={chartWidth}
                      y2={chartHeight - ratio * chartHeight}
                      stroke="currentColor"
                      strokeOpacity="0.1"
                      strokeWidth="1"
                      className="text-gray-400 dark:text-gray-500"
                      initial={{ pathLength: 0 }}
                      animate={isInView ? { pathLength: 1 } : {}}
                      transition={{ delay: 0.8 + i * 0.1, duration: 0.8 }}
                    />
                  ))}

                  {/* Área sombreada con animación mejorada */}
                  <motion.path
                    d={areaPath}
                    fill="url(#areaGradient)"
                    className="dark:fill-[url(#areaGradientDark)]"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 1.5, delay: 1, ease: "easeOut" }}
                  />

                  {/* Línea principal con efecto de dibujo mejorado */}
                  <motion.path
                    d={linePath}
                    fill="none"
                    stroke="url(#lineGradient)"
                    className="dark:stroke-[url(#lineGradientDark)] dark:filter-[url(#glowDark)]"
                    strokeWidth={isChartHovered ? "4" : "3"}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glow)"
                    initial={{ pathLength: 0 }}
                    animate={isInView ? { pathLength: 1 } : {}}
                    transition={{ duration: 2.5, delay: 1.2, ease: "easeInOut" }}
                    style={{ transition: "stroke-width 0.3s ease" }}
                  />

                  {/* Puntos interactivos mejorados */}
                  {points.map((point, index) => (
                    <motion.g key={index}>
                      {/* Círculo de fondo con pulso mejorado */}
                      <motion.circle
                        cx={point.x}
                        cy={point.y}
                        r={hoveredIndex === index ? "10" : "6"}
                        fill="white"
                        stroke="url(#lineGradient)"
                        className="dark:fill-gray-800 dark:stroke-[url(#lineGradientDark)] cursor-pointer transition-all duration-200 dark:filter-[url(#glowDark)]"
                        strokeWidth="3"
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={isInView ? { scale: 1, opacity: 1 } : {}}
                        transition={{ delay: 1.5 + index * 0.1, type: "spring", stiffness: 200 }}
                        whileHover={{ scale: 1.3 }}
                        filter="url(#glow)"
                      />
                      
                      {/* Anillo de pulso en hover mejorado */}
                      {hoveredIndex === index && (
                        <motion.circle
                          cx={point.x}
                          cy={point.y}
                          r="15"
                          fill="none"
                          stroke="rgb(59, 130, 246)"
                          className="dark:stroke-blue-400"
                          strokeWidth="2"
                          strokeOpacity="0.6"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ 
                            scale: [1, 1.5, 2],
                            opacity: [0.6, 0.3, 0]
                          }}
                          transition={{ 
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeOut"
                          }}
                        />
                      )}
                    </motion.g>
                  ))}
                </svg>

                {/* Tooltip flotante mejorado para modo oscuro */}
                {hoveredIndex !== null && (
                  <motion.div
                    className="absolute bg-white/95 dark:bg-gray-800/95 border border-gray-200 dark:border-gray-600 rounded-xl p-4 shadow-2xl dark:shadow-gray-900/50 pointer-events-none z-10 backdrop-blur-md"
                    style={{
                      left: `${(points[hoveredIndex].x / chartWidth) * 100}%`,
                      top: `${(points[hoveredIndex].y / chartHeight) * 100}%`,
                      transform: 'translate(-50%, -120%)'
                    }}
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <div className="text-center">
                      <motion.p 
                        className="font-semibold text-sm mb-1 text-gray-900 dark:text-gray-100"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        {points[hoveredIndex].data.month}
                      </motion.p>
                      <motion.p 
                        className="text-lg font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                      >
                        {formatCurrency(points[hoveredIndex].data.amount)}
                      </motion.p>
                      <motion.p 
                        className="text-xs text-muted-foreground"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        {points[hoveredIndex].data.transactions} transacciones
                      </motion.p>
                    </div>
                    {/* Flecha del tooltip con gradiente mejorada */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white dark:border-t-gray-800" />
                  </motion.div>
                )}
              </motion.div>

              {/* Etiquetas de meses con animación escalonada mejorada */}
              <motion.div 
                className="flex justify-between text-sm text-muted-foreground"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1,
                      delayChildren: 2
                    }
                  }
                }}
                initial="hidden"
                animate={isInView ? "visible" : "hidden"}
              >
                {data.map((item, index) => (
                  <motion.div
                    key={item.month}
                    className="text-center"
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      visible: { opacity: 1, y: 0 }
                    }}
                    whileHover={{ scale: 1.05, y: -2 }}
                  >
                    <p className="font-medium text-gray-700 dark:text-gray-300">{item.month}</p>
                  </motion.div>
                ))}
              </motion.div>

              {/* Estadísticas resumidas con animaciones mejoradas para modo oscuro */}
              <motion.div 
                className="grid grid-cols-3 gap-4 pt-4 border-t border-dashed border-gray-300 dark:border-gray-600"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 2.5, duration: 0.8 }}
              >
                <motion.div 
                  className="text-center group cursor-pointer p-3 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-700"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.p 
                    className="text-2xl font-bold text-blue-600 dark:text-blue-400"
                    initial={{ scale: 0 }}
                    animate={isInView ? { scale: 1 } : {}}
                    transition={{ delay: 2.7, type: "spring", stiffness: 200 }}
                  >
                    {formatCurrency(Math.max(...data.map(d => d.amount)))}
                  </motion.p>
                  <p className="text-xs text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Máximo</p>
                </motion.div>
                
                <motion.div 
                  className="text-center group cursor-pointer p-3 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-700"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.p 
                    className="text-2xl font-bold text-emerald-600 dark:text-emerald-400"
                    initial={{ scale: 0 }}
                    animate={isInView ? { scale: 1 } : {}}
                    transition={{ delay: 2.8, type: "spring", stiffness: 200 }}
                  >
                    {formatCurrency(data.reduce((sum, d) => sum + d.amount, 0) / data.length)}
                  </motion.p>
                  <p className="text-xs text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Promedio</p>
                </motion.div>
                
                <motion.div 
                  className="text-center group cursor-pointer p-3 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200 dark:border-purple-700"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.p 
                    className="text-2xl font-bold text-purple-600 dark:text-purple-400"
                    initial={{ scale: 0 }}
                    animate={isInView ? { scale: 1 } : {}}
                    transition={{ delay: 2.9, type: "spring", stiffness: 200 }}
                  >
                    {data.reduce((sum, d) => sum + d.transactions, 0)}
                  </motion.p>
                  <p className="text-xs text-muted-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Total Trans.</p>
                </motion.div>
              </motion.div>
            </motion.div>
          ) : (
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
                📈
              </motion.div>
              <p className="text-muted-foreground">No hay datos para mostrar</p>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
} 