import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion, useInView } from "framer-motion"
import { useRef, useState } from "react"

interface CategoryStat {
  name: string
  amount: number
  count: number
  emoji: string
  percentage: number
}

interface CategoryBreakdownProps {
  categories: CategoryStat[]
  formatCurrency: (amount: number) => string
  maxItems?: number
}

// Colores vibrantes para las categorías (mejorados para modo oscuro)
const categoryColors = [
  'from-emerald-500 to-teal-600 dark:from-emerald-400 dark:to-teal-500',
  'from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500', 
  'from-purple-500 to-pink-600 dark:from-purple-400 dark:to-pink-500',
  'from-orange-500 to-red-600 dark:from-orange-400 dark:to-red-500',
  'from-yellow-500 to-orange-600 dark:from-yellow-400 dark:to-orange-500',
  'from-green-500 to-emerald-600 dark:from-green-400 dark:to-emerald-500',
  'from-cyan-500 to-blue-600 dark:from-cyan-400 dark:to-blue-500',
  'from-rose-500 to-pink-600 dark:from-rose-400 dark:to-pink-500'
]

export function CategoryBreakdown({ 
  categories, 
  formatCurrency, 
  maxItems = 5 
}: CategoryBreakdownProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  
  const topCategories = categories.slice(0, maxItems)
  const maxAmount = Math.max(...topCategories.map(cat => cat.amount))

  // Variantes de animación
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
      x: -50,
      scale: 0.8
    },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12,
        duration: 0.6
      }
    }
  }

  const barVariants = {
    hidden: { width: 0 },
    visible: (percentage: number) => ({
      width: `${percentage}%`,
      transition: {
        duration: 1.2,
        ease: "easeOut",
        delay: 0.3
      }
    })
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
          <CardHeader className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/50 dark:via-teal-950/50 dark:to-emerald-950/50 relative overflow-hidden border-b border-emerald-100 dark:border-emerald-800">
            {/* Efecto de ondas en el header mejorado */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-emerald-100/60 via-teal-100/60 to-emerald-100/60 dark:from-emerald-400/20 dark:via-teal-400/20 dark:to-emerald-400/20"
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
            />
            <CardTitle className="flex items-center gap-2 relative z-10 text-gray-900 dark:text-gray-100">
              <motion.span 
                className="text-xl"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                🏷️
              </motion.span>
              <span className="bg-gradient-to-r from-emerald-700 to-teal-700 dark:from-emerald-300 dark:to-teal-300 bg-clip-text text-transparent font-bold">
                Gastos por Categoría
              </span>
            </CardTitle>
          </CardHeader>
        </motion.div>
        
        <CardContent className="p-6 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50">
          <motion.div 
            className="space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            {topCategories.map((category, index) => {
              const percentage = (category.amount / maxAmount) * 100
              const colorClass = categoryColors[index % categoryColors.length]
              const isHovered = hoveredIndex === index
              
              return (
                <motion.div 
                  key={category.name} 
                  className="group cursor-pointer"
                  variants={itemVariants}
                  whileHover={{ 
                    scale: 1.02,
                    transition: { duration: 0.2 }
                  }}
                  onHoverStart={() => setHoveredIndex(index)}
                  onHoverEnd={() => setHoveredIndex(null)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <motion.div 
                        className="relative"
                        whileHover={{ scale: 1.2, rotate: 15 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <span className="text-2xl transition-transform duration-200 drop-shadow-sm">
                          {category.emoji}
                        </span>
                        {/* Efecto de brillo en hover mejorado */}
                        {isHovered && (
                          <motion.div
                            className="absolute inset-0 bg-yellow-300 dark:bg-yellow-400 rounded-full blur-md"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 0.4, scale: 1.8 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                          />
                        )}
                      </motion.div>
                      <div>
                        <motion.p 
                          className="font-semibold text-gray-900 dark:text-gray-100 transition-colors duration-200"
                          animate={isHovered ? { 
                            color: "rgb(16 185 129)",
                            x: 5
                          } : { 
                            color: "inherit",
                            x: 0
                          }}
                        >
                          {category.name}
                        </motion.p>
                        <motion.p 
                          className="text-sm text-muted-foreground"
                          initial={{ opacity: 0.7 }}
                          animate={isHovered ? { opacity: 1, scale: 1.05 } : { opacity: 0.7, scale: 1 }}
                        >
                          {category.count} transacción{category.count !== 1 ? 'es' : ''}
                        </motion.p>
                      </div>
                    </div>
                    <motion.div 
                      className="text-right"
                      whileHover={{ scale: 1.05 }}
                    >
                      <motion.p 
                        className="font-bold text-lg text-gray-900 dark:text-gray-100"
                        animate={isHovered ? { scale: 1.1 } : { scale: 1 }}
                      >
                        {formatCurrency(category.amount)}
                      </motion.p>
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Badge 
                          variant="secondary" 
                          className="text-xs bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700 shadow-sm"
                        >
                          {category.percentage.toFixed(1)}%
                        </Badge>
                      </motion.div>
                    </motion.div>
                  </div>
                  
                  {/* Barra de progreso mejorada para modo oscuro */}
                  <div className="relative">
                    <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner border border-gray-200 dark:border-gray-600">
                      <motion.div
                        className={`h-full bg-gradient-to-r ${colorClass} rounded-full relative overflow-hidden shadow-sm`}
                        variants={barVariants}
                        custom={percentage}
                        initial="hidden"
                        animate={isInView ? "visible" : "hidden"}
                      >
                        {/* Efecto de brillo animado mejorado */}
                        <motion.div 
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent"
                          animate={{
                            x: ['-100%', '200%']
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear",
                            delay: index * 0.2
                          }}
                        />
                        
                        {/* Efecto de ondas mejorado */}
                        <motion.div 
                          className="absolute right-0 top-0 h-full w-2 bg-white/50 dark:bg-white/30 rounded-full"
                          animate={isHovered ? { 
                            scale: [1, 1.2, 1],
                            opacity: [0.5, 0.9, 0.5]
                          } : {}}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                      </motion.div>
                    </div>
                    
                    {/* Indicador de porcentaje flotante mejorado */}
                    {percentage > 15 && (
                      <motion.div
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1 + (index * 0.1) }}
                        whileHover={{ scale: 1.2 }}
                      >
                        <span className="text-xs font-bold text-white drop-shadow-lg">
                          {percentage.toFixed(0)}%
                        </span>
                      </motion.div>
                    )}
                  </div>
                  
                  {/* Línea decorativa animada mejorada */}
                  <motion.div 
                    className="mt-4 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-600 to-transparent"
                    initial={{ scaleX: 0 }}
                    animate={isInView ? { scaleX: 1 } : {}}
                    transition={{ delay: 0.5 + (index * 0.1), duration: 0.8 }}
                  />
                </motion.div>
              )
            })}
            
            {categories.length > maxItems && (
              <motion.div 
                className="pt-4 border-t border-dashed border-gray-300 dark:border-gray-600"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: topCategories.length * 0.15 + 0.5 }}
              >
                <div className="text-center">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Badge 
                      variant="outline" 
                      className="text-sm hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                    >
                      +{categories.length - maxItems} categorías más
                    </Badge>
                  </motion.div>
                </div>
              </motion.div>
            )}
            
            {topCategories.length === 0 && (
              <motion.div 
                className="text-center py-8"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
              >
                <motion.div 
                  className="text-4xl mb-2"
                  animate={{ 
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  📊
                </motion.div>
                <p className="text-muted-foreground">No hay categorías para mostrar</p>
              </motion.div>
            )}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
} 