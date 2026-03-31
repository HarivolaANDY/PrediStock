import { ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

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
    default: "border-border",
    blue: "border-blue-500/20 bg-blue-500/5",
    success: "border-success/20 bg-success/5",
    warning: "border-warning/20 bg-warning/5", 
    destructive: "border-destructive/20 bg-destructive/5",
    prediction: "border-prediction/20 bg-prediction/5"
  }

  const iconStyles = {
    default: "text-muted-foreground",
    blue: "text-blue-500",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive", 
    prediction: "text-prediction"
  }

  return (
    <Card className={cn(variantStyles[variant], className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && (
          <div className={cn("h-4 w-4", iconStyles[variant])}>
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <CardDescription className="text-xs">{description}</CardDescription>
        )}
        {trend && (
          <div className="flex items-center space-x-1 text-xs mt-1">
            <span className={cn(
              "font-medium",
              trend.value > 0 ? "text-success" : trend.value < 0 ? "text-destructive" : "text-muted-foreground"
            )}>
              {trend.value > 0 ? "+" : ""}{trend.value}%
            </span>
            <span className="text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}