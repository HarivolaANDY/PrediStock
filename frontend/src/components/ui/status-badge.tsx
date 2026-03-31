import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case "in_stock":
      case "en_stock":
        return {
          label: "En stock",
          className: "status-badge-success"
        }
      case "out_of_stock":
      case "rupture":
        return {
          label: "Rupture",
          className: "status-badge-error"
        }
      case "low_stock":
      case "stock_faible":
        return {
          label: "Stock faible",
          className: "status-badge-warning"
        }
      default:
        return {
          label: "Inconnu",
          className: "status-badge-error"
        }
    }
  }

  const config = getStatusConfig(status)

  return (
    <span className={cn(config.className, className)}>
      {config.label}
    </span>
  )
}