import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getRemboursements, updateRemboursement, getBonCommande, getDonneeVente } from "@/services/achatVenteService"
import { RotateCcw, RefreshCw, CheckCircle2, Search, ArrowUpRight, ArrowDownLeft, Eye, Clock, ShieldCheck, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import type { Remboursement, BonCommande, DonneeVente as IVente } from "@/types/achatVente"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

function fmt(n: number | string) {
  return new Intl.NumberFormat("fr-MG", { maximumFractionDigits: 0 }).format(Number(n)) + " Ar"
}

export default function RemboursementsPage() {
  const qc = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [sourceFilter, setSourceFilter] = useState("")
  const [selectedRemb, setSelectedRemb] = useState<Remboursement | null>(null)
  const [sourceDetail, setSourceDetail] = useState<BonCommande | IVente | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const { data: remboursements = [], isLoading, refetch } = useQuery({
    queryKey: ["remboursements"],
    queryFn: () => getRemboursements(),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Remboursement> }) => updateRemboursement(id, data),
    onSuccess: () => {
      toast.success("Statut mis à jour")
      qc.invalidateQueries({ queryKey: ["remboursements"] })
    },
    onError: (e: Error) => toast.error(e.message)
  })

  const filteredRemboursements = remboursements.filter(r => 
    (r.numero_transaction?.toLowerCase() || "").includes(searchTerm.toLowerCase()) &&
    (sourceFilter === "" || r.source_type === sourceFilter)
  )

  const toRefund = remboursements
    .filter(r => r.source_type === 'Vente' && r.statut_reglement === 'Non réglé')
    .reduce((s, r) => s + Number(r.montant), 0)
    
  const toCollect = remboursements
    .filter(r => r.source_type === 'Achat' && r.statut_reglement === 'Non réglé')
    .reduce((s, r) => s + Number(r.montant), 0)

  const handleShowDetail = async (r: Remboursement) => {
    setSelectedRemb(r)
    setLoadingDetail(true)
    try {
      if (r.source_type === 'Achat') {
        const data = await getBonCommande(r.source_id!)
        setSourceDetail(data)
      } else if (r.source_type === 'Vente') {
        const data = await getDonneeVente(r.source_id!)
        setSourceDetail(data)
      } else {
        setSourceDetail(null)
      }
    } catch (e) {
      toast.error("Impossible de charger les détails")
    } finally {
      setLoadingDetail(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-200">
            <RotateCcw className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Remboursements</h1>
            <p className="text-sm text-muted-foreground font-medium">Gestion des règlements et historique des retours</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-red-500">À Rembourser</p>
            <p className="text-3xl font-black text-red-600">{fmt(toRefund)}</p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-500"><ArrowUpRight className="h-7 w-7" /></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">À Encaisser</p>
            <p className="text-3xl font-black text-emerald-600">{fmt(toCollect)}</p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600"><ArrowDownLeft className="h-7 w-7" /></div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl border border-border overflow-x-auto w-full md:w-auto">
            <Button variant={sourceFilter === "" ? "secondary" : "ghost"} size="sm" onClick={() => setSourceFilter("")} className="h-8 text-xs font-bold font-black">Tous</Button>
            <Button variant={sourceFilter === "Vente" ? "secondary" : "ghost"} size="sm" onClick={() => setSourceFilter("Vente")} className="h-8 text-[11px] font-black">🛒 Ventes</Button>
            <Button variant={sourceFilter === "Achat" ? "secondary" : "ghost"} size="sm" onClick={() => setSourceFilter("Achat")} className="h-8 text-[11px] font-black">📦 Achats</Button>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." className="pl-9 bg-card rounded-xl border-border font-medium" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden bg-white">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-black uppercase text-[10px] text-muted-foreground">Source</th>
                <th className="px-6 py-4 font-black uppercase text-[10px] text-muted-foreground">Transaction</th>
                <th className="px-6 py-4 font-black uppercase text-[10px] text-right text-muted-foreground">Montant</th>
                <th className="px-6 py-4 font-black uppercase text-[10px] text-center text-muted-foreground">Statut</th>
                <th className="px-6 py-4 font-black uppercase text-[10px] text-center text-muted-foreground">Détails</th>
                <th className="px-6 py-4 font-black uppercase text-[10px] text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={6} className="py-20 text-center font-bold italic"><RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />Chargement...</td></tr>
              ) : filteredRemboursements.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center text-muted-foreground italic font-medium">Aucun enregistrement</td></tr>
              ) : filteredRemboursements.map(r => (
                <tr key={r.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={`font-bold text-[10px] ${r.source_type === 'Vente' ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>
                      {r.source_type}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-slate-600">{r.numero_transaction}</td>
                  <td className="px-6 py-4 text-right font-black text-orange-600">{fmt(r.montant)}</td>
                  <td className="px-6 py-4 text-center text-[10px] font-bold">
                     <span className={`px-2 py-1 rounded-lg border ${r.statut_reglement === 'Réglé' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                        {r.statut_reglement}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                     <Button variant="ghost" size="icon" onClick={() => handleShowDetail(r)} className="h-8 w-8 text-blue-600 rounded-lg">
                        <Eye className="h-4 w-4" />
                     </Button>
                  </td>
                  <td className="px-6 py-4">
                     {r.statut_reglement !== 'Réglé' ? (
                        <Button variant="outline" size="sm" className="h-8 text-[10px] font-black text-emerald-600 border-emerald-200" onClick={() => updateMut.mutate({ id: r.id, data: { statut_reglement: 'Réglé' } })}>Régler</Button>
                     ) : (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center justify-center"><CheckCircle2 className="h-3 w-3 mr-1" /> Payé</span>
                     )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!selectedRemb} onOpenChange={s => { if(!s) { setSelectedRemb(null); setSourceDetail(null); } }}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl">
           <div className="bg-slate-900 p-6 text-white"><DialogTitle className="text-white">Détails transaction source</DialogTitle></div>
           <div className="p-6 space-y-6">
              {loadingDetail ? (
                <div className="py-12 text-center text-muted-foreground"><RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />Chargement...</div>
              ) : !sourceDetail ? (
                <div className="py-12 text-center text-red-500 font-bold"><XCircle className="h-6 w-6 mx-auto mb-2" />Indisponible</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-2xl">
                    <div><p className="text-[10px] font-black uppercase text-muted-foreground">Réf.</p><p className="font-mono font-bold text-blue-600">{(sourceDetail as any).numero_commande || (sourceDetail as any).numero_vente}</p></div>
                    <div><p className="text-[10px] font-black uppercase text-muted-foreground">Raison</p><p className="text-xs italic text-slate-600">"{selectedRemb?.raison}"</p></div>
                  </div>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr><th className="px-4 py-3 font-black text-[10px]">Article</th><th className="px-4 py-3 text-center font-black text-[10px]">Qté</th><th className="px-4 py-3 text-right font-black text-[10px]">TOTAL</th></tr>
                      </thead>
                      <tbody>
                        {sourceDetail.lignes?.map(l => (
                          <tr key={l.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-bold text-slate-700">{(l as any).produit_name || (l as any).product_name}</td>
                            <td className="px-4 py-3 text-center font-black text-emerald-600">x{l.quantite}</td>
                            <td className="px-4 py-3 text-right font-black text-slate-800">{fmt(l.montant_ligne)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50/80 font-bold border-t border-slate-200">
                          <td colSpan={2} className="px-4 py-4 text-right text-[10px] uppercase font-black">Montant Global</td>
                          <td className="px-4 py-4 text-right text-base text-blue-600">{fmt(sourceDetail.montant_total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
           </div>
           <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200"><Button onClick={() => setSelectedRemb(null)} variant="secondary" className="font-bold">Fermer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
