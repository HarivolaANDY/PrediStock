import { ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, Minus } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string | number
  description?: string
  icon?: ReactNode
  variant?: "default" | "success" | "warning" | "destructive" | "prediction" | "blue"
  trend?: {
    value: number
    label: string
  }
  className?: string
}

export function MetricCard({
  title,
  value,
  description,
  icon,
  variant = "default",
  trend,
  className
}: MetricCardProps) {
  const variantStyles = {
    default: "border-border bg-gradient-to-br from-white to-slate-50",
    blue: "border-blue-500/20 bg-gradient-to-br from-blue-50 to-white",
    success: "border-green-500/20 bg-gradient-to-br from-green-50 to-white",
    warning: "border-yellow-500/20 bg-gradient-to-br from-yellow-50 to-white", 
    destructive: "border-red-500/20 bg-gradient-to-br from-red-50 to-white",
    prediction: "border-indigo-500/20 bg-gradient-to-br from-indigo-50 to-white"
  }

  const iconStyles = {
    default: "text-slate-600",
    blue: "text-blue-600",
    success: "text-green-600",
    warning: "text-yellow-600",
    destructive: "text-red-600", 
    prediction: "text-indigo-600"
  }

  const getTrendIcon = (value: number) => {
    if (value > 0) return <ArrowUp className="h-3 w-3" />
    if (value < 0) return <ArrowDown className="h-3 w-3" />
    return <Minus className="h-3 w-3" />
  }

  const getTrendColor = (value: number) => {
    if (value > 0) return "text-green-600"
    if (value < 0) return "text-red-600"
    return "text-slate-500"
  }

  return (
    <Card className={cn(
      variantStyles[variant], 
      "relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-0",
      className
    )}>
      {/* Decorative corner accents */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br opacity-20 rounded-full blur-xl scale-150 transform -translate-x-12 -translate-y-12" 
           style={{ background: variant === "blue" ? "linear-gradient(135deg, #3b82f6, #818cf8)" : 
                           variant === "success" ? "linear-gradient(135deg, #10b981, #34d399)" :
                           variant === "warning" ? "linear-gradient(135deg, #f59e0b, #fbbf24)" :
                           variant === "destructive" ? "linear-gradient(135deg, #ef4444, #f87171)" :
                           variant === "prediction" ? "linear-gradient(135deg, #6366f1, #8b5cf6)" :
                           "linear-gradient(135deg, #64748b, #94a3b8)" }} />
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-slate-700">{title}</CardTitle>
          {description && (
            <CardDescription className="text-xs text-slate-500">{description}</CardDescription>
          )}
        </div>
        {icon && (
          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center bg-white/50 backdrop-blur-sm shadow-sm", iconStyles[variant])}>
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent" 
             style={{ background: variant === "blue" ? "linear-gradient(135deg, #1e3a8a, #3b82f6)" : 
                             variant === "success" ? "linear-gradient(135deg, #059669, #10b981)" :
                             variant === "warning" ? "linear-gradient(135deg, #b45309, #f59e0b)" :
                             variant === "destructive" ? "linear-gradient(135deg, #991b1b, #ef4444)" :
                             variant === "prediction" ? "linear-gradient(135deg, #4338ca, #6366f1)" :
                             "linear-gradient(135deg, #334155, #64748b)" }}>
          {value}
        </div>
        {trend && (
          <div className="flex items-center space-x-2 text-xs mt-2">
            <div className={cn(
              "flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium transition-colors duration-200",
              trend.value > 0 ? "bg-green-100 text-green-700" : 
              trend.value < 0 ? "bg-red-100 text-red-700" : 
              "bg-slate-100 text-slate-700"
            )}>
              {getTrendIcon(trend.value)}
              <span className={getTrendColor(trend.value)}>
                {trend.value > 0 ? "+" : ""}{trend.value}%
              </span>
            </div>
            <span className="text-slate-500">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}