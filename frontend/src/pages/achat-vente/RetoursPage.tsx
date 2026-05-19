import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { getRemboursements } from "@/services/achatVenteService"
import { RotateCcw, RefreshCw, CheckCircle2, Search, Filter, ArrowUpRight, ArrowDownLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

function fmt(n: number | string) {
  return new Intl.NumberFormat("fr-MG", { maximumFractionDigits: 0 }).format(Number(n)) + " Ar"
}

export default function RemboursementsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [sourceFilter, setSourceFilter] = useState("")

  const { data: remboursements = [], isLoading, refetch } = useQuery({
    queryKey: ["remboursements"],
    queryFn: () => getRemboursements(),
  })

  const filteredRemboursements = remboursements.filter(r => 
    (r.numero_transaction?.toLowerCase() || "").includes(searchTerm.toLowerCase()) &&
    (sourceFilter === "" || r.source_type === sourceFilter)
  )

  const totalAmount = filteredRemboursements.reduce((s, r) => s + Number(r.montant), 0)
  const countVente = filteredRemboursements.filter(r => r.source_type === 'Vente').length
  const countAchat = filteredRemboursements.filter(r => r.source_type === 'Achat').length

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-200">
            <RotateCcw className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Remboursements</h1>
            <p className="text-sm text-muted-foreground font-medium">Historique des annulations et flux financiers associés</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Actualiser
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Remboursé", value: fmt(totalAmount), sub: `${filteredRemboursements.length} opérations`, color: "text-orange-600", icon: <RotateCcw className="h-4 w-4" /> },
          { label: "Annulations Ventes", value: countVente, sub: "Retour fonds clients", color: "text-blue-600", icon: <ArrowUpRight className="h-4 w-4" /> },
          { label: "Annulations Achats", value: countAchat, sub: "Récupération fonds fournisseurs", color: "text-emerald-600", icon: <ArrowDownLeft className="h-4 w-4" /> },
        ].map((k, i) => (
          <div key={i} className="bg-card p-5 rounded-2xl border border-border shadow-sm hover:border-orange-200 transition-all">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{k.label}</p>
              <div className={`p-1.5 rounded-lg bg-muted ${k.color}`}>{k.icon}</div>
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-2xl font-bold ${k.color}`}>{k.value}</span>
              <span className="text-[10px] text-muted-foreground mb-1 font-medium">{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Table */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl border border-border overflow-x-auto w-full md:w-auto">
            <Button variant={sourceFilter === "" ? "secondary" : "ghost"} size="sm" onClick={() => setSourceFilter("")} className="h-8 text-xs font-bold">Tous</Button>
            <Button variant={sourceFilter === "Vente" ? "secondary" : "ghost"} size="sm" onClick={() => setSourceFilter("Vente")} className="h-8 text-xs font-bold">Ventes</Button>
            <Button variant={sourceFilter === "Achat" ? "secondary" : "ghost"} size="sm" onClick={() => setSourceFilter("Achat")} className="h-8 text-xs font-bold">Achats</Button>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher par N° transaction..." 
              className="pl-9 bg-card rounded-xl" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Source</th>
                  <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Transaction</th>
                  <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Produit</th>
                  <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px] text-center">Qté</th>
                  <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px] text-right">Montant</th>
                  <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Date</th>
                  <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Raison</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={7} className="py-20 text-center"><RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />Chargement...</td></tr>
                ) : filteredRemboursements.length === 0 ? (
                  <tr><td colSpan={7} className="py-20 text-center text-muted-foreground font-medium">Aucun remboursement trouvé</td></tr>
                ) : filteredRemboursements.map(r => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={r.source_type === 'Vente' ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"}>
                        {r.source_type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-muted-foreground">{r.numero_transaction}</td>
                    <td className="px-6 py-4 font-medium">{r.produit_name || "Produit supprimé"}</td>
                    <td className="px-6 py-4 text-center font-bold">{r.quantite}</td>
                    <td className="px-6 py-4 text-right font-bold text-orange-600 tabular-nums">{fmt(r.montant)}</td>
                    <td className="px-6 py-4 text-muted-foreground font-medium text-xs">{new Date(r.date_remboursement).toLocaleDateString("fr-FR")}</td>
                    <td className="px-6 py-4 text-muted-foreground text-xs italic truncate max-w-[150px]">{r.raison}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
