import { cn } from "@/lib/utils"

interface SkeletonLoaderProps {
  className?: string
  variant?: "card" | "text" | "chart" | "metric"
}

export function SkeletonLoader({ className = "", variant = "text" }: SkeletonLoaderProps) {
  if (variant === "card") {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="h-4 bg-slate-200 rounded w-3/4 mb-3"></div>
        <div className="h-8 bg-slate-200 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-slate-200 rounded w-1/3"></div>
      </div>
    )
  }

  if (variant === "chart") {
    return (
      <div className={cn("animate-pulse flex items-end justify-between h-64 gap-2 p-4", className)}>
        {[...Array(12)].map((_, i) => (
          <div 
            key={i} 
            className="bg-slate-200 rounded-t w-full"
            style={{ height: `${Math.random() * 60 + 20}%` }}
          />
        ))}
      </div>
    )
  }

  if (variant === "metric") {
    return (
      <div className={cn("animate-pulse p-6 border rounded-lg bg-white", className)}>
        <div className="flex justify-between items-start mb-4">
          <div className="h-4 bg-slate-200 rounded w-24"></div>
          <div className="h-10 w-10 bg-slate-200 rounded-xl"></div>
        </div>
        <div className="h-8 bg-slate-200 rounded w-32 mb-2"></div>
        <div className="h-3 bg-slate-200 rounded w-20 mb-3"></div>
        <div className="flex items-center gap-2">
          <div className="h-6 bg-slate-200 rounded-full w-16"></div>
          <div className="h-3 bg-slate-200 rounded w-24"></div>
        </div>
      </div>
    )
  }

  // Default text skeleton
  return (
    <div className={cn("animate-pulse space-y-2", className)}>
      <div className="h-4 bg-slate-200 rounded w-3/4"></div>
      <div className="h-4 bg-slate-200 rounded w-1/2"></div>
      <div className="h-4 bg-slate-200 rounded w-5/6"></div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-10 bg-slate-200 rounded w-1/3"></div>
        <div className="h-5 bg-slate-200 rounded w-2/3"></div>
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <SkeletonLoader key={i} variant="metric" />
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border rounded-lg bg-white p-6">
          <div className="h-6 bg-slate-200 rounded w-1/2 mb-4"></div>
          <SkeletonLoader variant="chart" className="h-64" />
        </div>
        <div className="border rounded-lg bg-white p-6">
          <div className="h-6 bg-slate-200 rounded w-1/2 mb-4"></div>
          <SkeletonLoader variant="chart" className="h-64" />
        </div>
      </div>

      {/* Critical Products Skeleton */}
      <div className="border rounded-lg bg-white p-6">
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-slate-200 rounded-lg"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-32"></div>
                  <div className="h-3 bg-slate-200 rounded w-24"></div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="h-6 bg-slate-200 rounded-full w-20"></div>
                <div className="h-8 bg-slate-200 rounded w-24"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}