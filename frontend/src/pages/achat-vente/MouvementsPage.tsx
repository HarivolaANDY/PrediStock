import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { getMouvements, getRemboursements } from "@/services/achatVenteService"
import { ArrowLeftRight, RefreshCw, Package, Search, Calendar, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { estAnnulation, estAnnule, natureMouvement } from "@/utils/mouvements"

function formatDate(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

// Ligne fusionnée mouvement de stock / remboursement, pour un affichage unifié dans le tableau
interface CombinedTransaction {
  id: number | string
  timestamp: string
  movement_type: string
  produit_name?: string
  produit_dv_name?: string
  produit_display_name?: string
  produit?: number | null
  produit_dv?: number | null
  quantity: number
  reason: string | null
  referrence: string | null
  notes?: string | null
  montant?: number
  isRefund: boolean
  source_type?: string
  annule?: number | null
  annule_par?: number | null
  lot_numero?: string | null
}

// Un achat/une vente annulé(e) laisse DEUX mouvements : l'original (annulé) et son inverse
// (voir @/utils/mouvements). Les remboursements n'ont pas de lien d'annulation.
const isCancellation = (m: CombinedTransaction) => !m.isRefund && estAnnulation(m)
const isCancelled = (m: CombinedTransaction) => !m.isRefund && estAnnule(m)
const nature = (m: CombinedTransaction) => (m.isRefund ? null : natureMouvement(m))

export default function MouvementsPage() {
  const [typeFilter, setTypeFilter] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")

  // Tous les mouvements sont chargés : le filtre Achats/Ventes est appliqué ici, car un filtre
  // serveur sur le sens (IN/OUT) séparerait à tort un achat de son annulation.
  const { data: allMouvements = [], isLoading: isLoadingMvmts, refetch: refetchMvmts } = useQuery({
    queryKey: ["mouvements"],
    queryFn: () => getMouvements(),
  })

  const { data: allRemboursements = [], isLoading: isLoadingRefunds, refetch: refetchRefunds } = useQuery({
    queryKey: ["remboursements"],
    queryFn: () => getRemboursements(),
  })

  const isLoading = isLoadingMvmts || isLoadingRefunds
  const refetch = () => { refetchMvmts(); refetchRefunds(); }

  // Fusionner et normaliser pour l'affichage
  const combinedTransactions: CombinedTransaction[] = [
    ...allMouvements.map(m => ({ ...m, isRefund: false as const })),
    ...allRemboursements.map(r => ({
      id: `refund-${r.id}`,
      timestamp: r.date_remboursement,
      movement_type: r.source_type === "Achat" ? "REFUND_IN" : "REFUND_OUT",
      produit_name: "Remboursement financier",
      quantity: 0,
      reason: r.raison,
      referrence: r.numero_transaction,
      montant: r.montant,
      isRefund: true as const,
      source_type: r.source_type
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const filteredMouvements = combinedTransactions.filter(m => {
    const matchesSearch =
      (m.produit_display_name || m.produit_name || m.produit_dv_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.reason || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.referrence || "").toLowerCase().includes(searchTerm.toLowerCase())
    
    if (typeFilter === "REFUND") return m.isRefund && matchesSearch
    if (typeFilter === "IN") return nature(m) === "achat" && matchesSearch
    if (typeFilter === "OUT") return nature(m) === "vente" && matchesSearch

    return matchesSearch
  })

  // Indicateurs : transactions réelles uniquement (ni annulées, ni mouvements d'annulation)
  const totalIn = allMouvements.filter(m => m.movement_type === "IN" && m.annule == null && m.annule_par == null).length
  const totalOut = allMouvements.filter(m => m.movement_type === "OUT" && m.annule == null && m.annule_par == null).length

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
          { label: "Remboursements", value: allRemboursements.length, sub: "Flux financiers", color: "text-blue-600" },
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
          <Button variant={typeFilter === "REFUND" ? "secondary" : "ghost"} size="sm" onClick={() => setTypeFilter("REFUND")} className="h-8 text-xs font-bold text-blue-600">
            REMBOURSEMENTS
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
                filteredMouvements.map((m) => (
                  <tr key={m.id} className={`hover:bg-muted/10 transition-colors group ${isCancelled(m) ? "opacity-60" : ""}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span className="font-medium">{formatDate(m.timestamp)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        {m.isRefund ? (
                           <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 uppercase text-[9px]">
                             REMB. {m.source_type === "Achat" ? "ENCAISSER" : "VERSER"}
                           </Badge>
                        ) : isCancellation(m) ? (
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 uppercase text-[9px]">
                            ANNUL. {nature(m) === "achat" ? "ACHAT" : "VENTE"}
                          </Badge>
                        ) : m.movement_type === "IN" ? (
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
                        {isCancelled(m) && (
                          <span className="inline-flex items-center text-[9px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-full">
                            ANNULÉ
                          </span>
                        )}
                        {/* Indicateur Vente à Crédit */}
                        {!m.isRefund && !isCancellation(m) && m.movement_type === "OUT" && m.notes === "Crédit" && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full">
                            <Zap className="h-2.5 w-2.5" /> CRÉDIT
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 font-bold text-foreground">
                        {m.isRefund ? (
                          <div className="h-4 w-4 text-blue-500 font-black text-xs flex items-center justify-center border border-blue-500 rounded-sm">R</div>
                        ) : (
                          <Package className="h-4 w-4 text-violet-500" />
                        )}
                        {m.produit_display_name || m.produit_name || m.produit_dv_name || `#${m.produit || m.produit_dv || '?'}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-sm">
                      {m.isRefund ? (
                        <span className="text-blue-600">
                          {new Intl.NumberFormat("fr-MG").format(m.montant ?? 0)} Ar
                        </span>
                      ) : (
                        <span className={m.movement_type === "IN" ? "text-emerald-600" : "text-red-600"}>
                          {m.movement_type === "IN" ? "+" : "-"}{m.quantity}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-[240px]">
                        <p className="font-medium text-foreground truncate">{m.reason || "—"}</p>
                        <p className="text-[10px] text-muted-foreground font-mono uppercase truncate">
                          {m.referrence || "N/A"}
                        </p>
                      {m.lot_numero && (
                        <p className="text-[10px] text-violet-600 font-mono truncate">Lot {m.lot_numero}</p>
                      )}
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
