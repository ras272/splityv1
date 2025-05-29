"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Moon, Sun, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Theme = "light" | "dark" | "system"

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem("theme") as Theme
    if (savedTheme) {
      setTheme(savedTheme)
      applyTheme(savedTheme)
    } else {
      applyTheme("system")
    }
  }, [])

  const applyTheme = (newTheme: Theme) => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")

    if (newTheme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      root.classList.add(systemTheme)
    } else {
      root.classList.add(newTheme)
    }
  }

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    applyTheme(newTheme)
  }

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="w-9 h-9">
        <div className="h-4 w-4" />
      </Button>
    )
  }

  const getCurrentIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="h-4 w-4" />
      case "dark":
        return <Moon className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-9 h-9 relative overflow-hidden bg-gradient-to-br from-amber-50 to-blue-50 dark:from-blue-950 dark:to-purple-950 border border-amber-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={theme}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="absolute inset-0 flex items-center justify-center"
              >
                {getCurrentIcon()}
              </motion.div>
            </AnimatePresence>
            
            {/* Efecto de brillo */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{
                x: ['-100%', '200%']
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          </Button>
        </motion.div>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-48 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-gray-200 dark:border-gray-700 shadow-xl"
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <DropdownMenuItem 
            onClick={() => handleThemeChange("light")}
            className="cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
          >
            <motion.div 
              className="flex items-center gap-3 w-full"
              whileHover={{ x: 2 }}
            >
              <div className="p-1 rounded-full bg-amber-100 dark:bg-amber-900">
                <Sun className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="font-medium">Modo Claro</span>
              {theme === "light" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-auto w-2 h-2 bg-amber-500 rounded-full"
                />
              )}
            </motion.div>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => handleThemeChange("dark")}
            className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
          >
            <motion.div 
              className="flex items-center gap-3 w-full"
              whileHover={{ x: 2 }}
            >
              <div className="p-1 rounded-full bg-blue-100 dark:bg-blue-900">
                <Moon className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-medium">Modo Oscuro</span>
              {theme === "dark" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-auto w-2 h-2 bg-blue-500 rounded-full"
                />
              )}
            </motion.div>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => handleThemeChange("system")}
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <motion.div 
              className="flex items-center gap-3 w-full"
              whileHover={{ x: 2 }}
            >
              <div className="p-1 rounded-full bg-gray-100 dark:bg-gray-800">
                <Monitor className="h-3 w-3 text-gray-600 dark:text-gray-400" />
              </div>
              <span className="font-medium">Sistema</span>
              {theme === "system" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-auto w-2 h-2 bg-gray-500 rounded-full"
                />
              )}
            </motion.div>
          </DropdownMenuItem>
        </motion.div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 