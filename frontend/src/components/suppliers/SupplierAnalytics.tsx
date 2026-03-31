import { useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search } from "lucide-react"
import { BarChart } from "@/components/charts/BarChart"
import type { SupplierLike } from "@/types/suppliers"

interface SupplierAnalyticsProps {
  suppliers: SupplierLike[]
  search: string
  onSearch: (v: string) => void
}

export function SupplierAnalytics({ suppliers, search, onSearch }: SupplierAnalyticsProps) {
  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term) ||
        s.phone.includes(search)
    )
  }, [suppliers, search])

  const leadTimeData = filtered.map((s) => ({ name: s.name, leadTime: s.leadTime }))
  const orderRangeData = filtered.map((s) => ({
    name: s.name,
    minOrderQuantity: s.minOrderQuantity,
    maxOrderQuantity: s.maxOrderQuantity,
  }))

  return (
    <div className="space-y-6">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher des fournisseurs d'analyses..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aucun fournisseur ne correspond à votre recherche.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Délai de livraison par fournisseur</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart
                data={leadTimeData}
                xAxisKey="name"
                bars={[{ key: "leadTime", name: "Lead Time (days)", color: "hsl(var(--primary))" }]}
                height={320}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plage de quantités commandées</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart
                data={orderRangeData}
                xAxisKey="name"
                bars={[
                  { key: "minOrderQuantity", name: "Minimum", color: "hsl(var(--secondary))" },
                  { key: "maxOrderQuantity", name: "Maximum", color: "hsl(var(--primary))" },
                ]}
                height={320}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
