import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { getMouvements } from "@/services/achatVenteService"
import { ArrowLeftRight, RefreshCw, Package, Search, Calendar, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

function formatDate(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

export default function MouvementsPage() {
  const [typeFilter, setTypeFilter] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")

  const params = typeFilter ? { movement_type: typeFilter } : undefined
  const { data: allMouvements = [], isLoading, refetch } = useQuery({
    queryKey: ["mouvements", typeFilter],
    queryFn: () => getMouvements(params),
  })

  const filteredMouvements = allMouvements.filter(m => {
    const matchesSearch =
      (m.produit_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.reason || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.referrence || "").toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter
      ? m.movement_type === typeFilter
      : m.movement_type === "IN" || m.movement_type === "OUT"
    return matchesSearch && matchesType
  })

  const totalIn = allMouvements.filter(m => m.movement_type === "IN").length
  const totalOut = allMouvements.filter(m => m.movement_type === "OUT").length
  const totalCredit = allMouvements.filter(m => m.movement_type === "OUT" && m.notes === "Crédit").length

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-200">
            <ArrowLeftRight className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Transactions Achats & Ventes</h1>
            <p className="text-sm text-muted-foreground font-medium">
              Historique des mouvements de stock liés aux achats et ventes confirmés
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> Actualiser
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Transactions Filtrées", value: filteredMouvements.length, sub: "Selon les filtres", color: "text-violet-600" },
          { label: "Achats (Entrées)", value: totalIn, sub: "Produits reçus", color: "text-emerald-600" },
          { label: "Ventes (Sorties)", value: totalOut, sub: "Produits vendus", color: "text-red-600" },
          { label: "Ventes à Crédit", value: totalCredit, sub: "Parmi les sorties", color: "text-amber-600" },
        ].map((k, i) => (
          <div key={i} className="bg-card p-5 rounded-2xl border border-border shadow-sm hover:border-violet-200 transition-all">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{k.label}</p>
            <div className="flex items-end gap-2">
              <span className={`text-2xl font-bold ${k.color}`}>{k.value}</span>
              <span className="text-[10px] text-muted-foreground mb-1">{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl border border-border overflow-x-auto w-full md:w-auto">
          <Button variant={!typeFilter ? "secondary" : "ghost"} size="sm" onClick={() => setTypeFilter("")} className="h-8 text-xs font-bold">
            TOUS
          </Button>
          <Button variant={typeFilter === "IN" ? "secondary" : "ghost"} size="sm" onClick={() => setTypeFilter("IN")} className="h-8 text-xs font-bold text-emerald-600">
            ACHATS
          </Button>
          <Button variant={typeFilter === "OUT" ? "secondary" : "ghost"} size="sm" onClick={() => setTypeFilter("OUT")} className="h-8 text-xs font-bold text-red-600">
            VENTES
          </Button>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher produit, raison..."
            className="pl-9 bg-card rounded-xl"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-bold text-muted-foreground">DATE & HEURE</th>
                <th className="px-6 py-4 font-bold text-muted-foreground">TYPE</th>
                <th className="px-6 py-4 font-bold text-muted-foreground">PRODUIT</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-center">QTÉ</th>
                <th className="px-6 py-4 font-bold text-muted-foreground">RAISON / RÉF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                    Chargement...
                  </td>
                </tr>
              ) : filteredMouvements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-muted-foreground font-medium">
                    Aucune transaction trouvée
                  </td>
                </tr>
              ) : (
                filteredMouvements.map(m => (
                  <tr key={m.id} className="hover:bg-muted/10 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span className="font-medium">{formatDate(m.timestamp)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        {m.movement_type === "IN" ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                            ACHAT
                          </Badge>
                        ) : m.movement_type === "OUT" ? (
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">
                            VENTE
                          </Badge>
                        ) : (
                          <Badge variant="outline">{m.movement_type}</Badge>
                        )}
                        {/* Indicateur Vente à Crédit */}
                        {m.movement_type === "OUT" && m.notes === "Crédit" && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full">
                            <Zap className="h-2.5 w-2.5" /> CRÉDIT
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 font-bold text-foreground">
                        <Package className="h-4 w-4 text-violet-500" />
                        {m.produit_name || m.produit_dv_name || `#${m.produit}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-lg">
                      <span className={m.movement_type === "IN" ? "text-emerald-600" : "text-red-600"}>
                        {m.movement_type === "IN" ? "+" : "-"}{m.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-[240px]">
                        <p className="font-medium text-foreground truncate">{m.reason || "—"}</p>
                        <p className="text-[10px] text-muted-foreground font-mono uppercase truncate">
                          {m.referrence || "N/A"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
