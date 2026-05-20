import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getDonneeVentes, createDonneeVente, searchProduits, updateDonneeVente, deleteDonneeVente, getRemboursements } from "@/services/achatVenteService"
import { DollarSign, ShoppingBag, RefreshCw, Plus, Search, Eye, Package, Trash2, FileText, ChevronDown, CreditCard, Ban, MoreVertical, AlertTriangle, TrendingUp, Clock, CheckCircle2, ShieldCheck, Calendar } from "lucide-react"
import type { DonneeVente, CreateLigneVenteData } from "@/types/achatVente"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function fmt(n: number | string) {
  return new Intl.NumberFormat("fr-MG", { maximumFractionDigits: 0 }).format(Number(n)) + " Ar"
}

const STATUS_PAIEMENT_CONFIG: Record<string, { label: string; color: string }> = {
  "Non payé": { label: "Non payé", color: "bg-red-100 text-red-700 border-red-200" },
  "Payé":     { label: "Payé",     color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
}

const SALE_STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  "En attente": { label: "En attente", color: "bg-amber-50 text-amber-700 border-amber-100", icon: <Clock className="h-3 w-3" /> },
  "Livré":     { label: "Livré",     color: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: <CheckCircle2 className="h-3 w-3" /> },
  "Annulé":     { label: "Annulé",     color: "bg-red-50 text-red-700 border-red-100", icon: <Ban className="h-3 w-3" /> },
}

const MODE_PAIEMENT_OPTIONS = [
  { value: "Espèces", label: "Espèces" },
  { value: "Virement", label: "Virement" },
  { value: "Chèque", label: "Chèque" },
  { value: "Orange Money", label: "Orange Money" },
  { value: "YAS", label: "YAS" },
  { value: "Airtel Money", label: "Airtel Money" },
  { value: "Autre", label: "Autre" },
]

function PaymentStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_PAIEMENT_CONFIG[status] ?? STATUS_PAIEMENT_CONFIG["Non payé"]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

export default function VentePage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [selectedSale, setSelectedSale] = useState<DonneeVente | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Queries
  const { data: remboursements = [] } = useQuery({ 
    queryKey: ["remboursements"], 
    queryFn: () => getRemboursements() 
  })
  const refundedSaleIds = remboursements.filter(r => r.source_type === 'Vente').map(r => r.source_id)

  const { data: ventes = [], isLoading, refetch } = useQuery({
    queryKey: ["donnee-ventes", statusFilter, refundedSaleIds],
    queryFn: () => getDonneeVentes(statusFilter ? { status: statusFilter } : undefined),
    select: (data) => data.filter(v => !refundedSaleIds.includes(v.id))
  })

  const { data: productsAndSubProducts = [] } = useQuery({ 
    queryKey: ["produits-search-combined"], 
    queryFn: () => searchProduits("") 
  })

  // Form state
  const [lines, setLines] = useState<CreateLigneVenteData[]>([
    { produit: null, produit_dv: null, quantite: 1, prix_unitaire: 0, remise_applique: 0 }
  ])
  const [form, setForm] = useState({
    segment_clientele: "Particulier",
    mode_paiement: "Espèces",
    type_vente: "Normal",
    delai_paiement: "" as string
  })

  const createMut = useMutation({
    mutationFn: createDonneeVente,
    onSuccess: () => {
      toast.success("Vente enregistrée")
      qc.invalidateQueries({ queryKey: ["donnee-ventes"] })
      setShowModal(false)
      resetForm()
    },
    onError: (e: Error) => toast.error(e.message)
  })

  const resetForm = () => {
    setLines([{ produit: null, produit_dv: null, quantite: 1, prix_unitaire: 0, remise_applique: 0 }])
    setForm({ segment_clientele: "Particulier", mode_paiement: "Espèces", type_vente: "Normal", delai_paiement: "" })
  }

  const deleteMut = useMutation({
    mutationFn: deleteDonneeVente,
    onSuccess: () => {
      toast.success("Vente supprimée")
      qc.invalidateQueries({ queryKey: ["donnee-ventes"] })
      setDeleteConfirmId(null)
      setSelectedIds([])
    }
  })

  const updateSaleMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      updateDonneeVente(id, data),
    onSuccess: () => {
      toast.success("Mise à jour réussie")
      qc.invalidateQueries({ queryKey: ["donnee-ventes"] })
    },
    onError: (e: Error) => toast.error(e.message)
  })

  const handleAddLine = () => setLines([...lines, { produit: null, produit_dv: null, quantite: 1, prix_unitaire: 0, remise_applique: 0 }])
  const handleRemoveLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx))
  const handleUpdateLine = (idx: number, data: Partial<CreateLigneVenteData>) => {
    const newLines = [...lines]
    newLines[idx] = { ...newLines[idx], ...data }
    setLines(newLines)
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (lines.some(l => !l.produit && !l.produit_dv)) return toast.error("Veuillez choisir un produit ou sous-produit")
    
    // Credit constraints
    if (form.type_vente === "Crédit") {
      if (form.segment_clientele !== "VIP/Fidélisé") {
        return toast.error("La vente à crédit est réservée aux clients VIP/Fidélisés.")
      }
      if (!form.delai_paiement) {
        return toast.error("Veuillez préciser un délai de paiement pour la vente à crédit.")
      }
    }

    const userStr = localStorage.getItem("user")
    const userId = userStr ? JSON.parse(userStr).id : null
    
    if (!userId) return toast.error("Utilisateur non identifié. Veuillez vous reconnecter.")

    // Stock validation before mutating
    for (const l of lines) {
      const selected = productsAndSubProducts.find((p: any) => l.produit_dv ? (p.is_deriv && p.id === l.produit_dv) : (!p.is_deriv && p.id === l.produit));
      if (selected && selected.stock !== undefined) {
        if (l.quantite > selected.stock) {
          return toast.error(`Stock insuffisant pour "${selected.name}". Disponible: ${selected.stock}, Demandé: ${l.quantite}`);
        }
      }
    }

    createMut.mutate({
      ...form,
      utilisateur: userId,
      lignes_data: lines,
      delai_paiement: form.type_vente === "Crédit" ? form.delai_paiement : null
    })
  }

  const activeVentes = ventes.filter(v => v.status !== "Annulé")
  const totalRevenu = activeVentes.reduce((s, v) => s + Number(v.montant_total), 0)
  const amountPaid = activeVentes.reduce((s, v) => s + Number(v.montant_paye || 0), 0)
  
  const creditVentes = ventes.filter(v => v.type_vente === "Crédit" && v.status !== "Annulé")
  const totalCreditAmount = creditVentes.reduce((s, v) => s + Number(v.montant_total), 0)
  const totalCreditPaid = creditVentes.reduce((s, v) => s + Number(v.montant_paye), 0)

  const filteredVentes = ventes.filter(v => 
    (v.numero_vente?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  )

  const totalPages = Math.ceil(filteredVentes.length / itemsPerPage)
  const paginatedVentes = filteredVentes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(paginatedVentes.map(v => v.id))
    else setSelectedIds([])
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const canChangeStatus = (v: DonneeVente) => {
    if (v.status === "Annulé") return false;
    if (v.statut_paiement === "Payé" && v.status === "Livré") return false;
    if (!v.delai_paiement) return true;
    return new Date() <= new Date(v.delai_paiement);
  }

  const totalFormAmount = lines.reduce((acc, l) => acc + (l.quantite * l.prix_unitaire - (l.remise_applique || 0)), 0)

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ventes</h1>
            <p className="text-sm text-muted-foreground font-medium">Performance commerciale et historique des transactions</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Actualiser
          </Button>
          <Button onClick={() => setShowModal(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-2 text-white shadow-lg shadow-emerald-200 border-none transition-all hover:scale-105 active:scale-95">
            <Plus className="h-4 w-4" /> Nouvelle vente
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Ventes", value: activeVentes.length, sub: "Transactions", color: "text-emerald-600", icon: <ShoppingBag className="h-4 w-4" /> },
          { label: "Encaissements", value: fmt(amountPaid), sub: `/ ${fmt(totalRevenu)}`, color: "text-blue-600", icon: <DollarSign className="h-4 w-4" /> },
          { label: "Ventes à crédit", value: fmt(totalCreditAmount), sub: `${creditVentes.length} dossiers`, color: "text-amber-600", icon: <Clock className="h-4 w-4" /> },
          { label: "Reste à recouvrer", value: fmt(totalCreditAmount - totalCreditPaid), sub: "Créances clients", color: "text-red-500", icon: <TrendingUp className="h-4 w-4" /> },
        ].map((k, i) => (
          <div key={i} className="bg-card p-5 rounded-2xl border border-border shadow-sm hover:border-emerald-200 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{k.label}</p>
              <div className={`p-1.5 rounded-lg bg-muted ${k.color}`}>{k.icon}</div>
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-xl font-bold ${k.color}`}>{k.value}</span>
              <span className="text-[10px] text-muted-foreground mb-1 font-medium">{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl border border-border w-full md:w-auto overflow-x-auto">
          <Button 
            variant={statusFilter === "" ? "default" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter("")}
            className={`rounded-lg font-bold text-[10px] px-4 ${statusFilter === "" ? "bg-white text-slate-700 shadow-sm" : "text-muted-foreground"}`}
          >
            Tous
          </Button>
          <Button 
            variant={statusFilter === "En attente" ? "default" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter("En attente")}
            className={`rounded-lg font-bold text-[10px] px-4 ${statusFilter === "En attente" ? "bg-white text-amber-600 shadow-sm" : "text-muted-foreground"}`}
          >
            En attente
          </Button>
          <Button 
            variant={statusFilter === "Livré" ? "default" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter("Livré")}
            className={`rounded-lg font-bold text-[10px] px-4 ${statusFilter === "Livré" ? "bg-white text-emerald-600 shadow-sm" : "text-muted-foreground"}`}
          >
            Livrées
          </Button>
          <Button 
            variant={statusFilter === "Annulé" ? "default" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter("Annulé")}
            className={`rounded-lg font-bold text-[10px] px-4 ${statusFilter === "Annulé" ? "bg-white text-red-600 shadow-sm" : "text-muted-foreground"}`}
          >
            Annulées
          </Button>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par numéro de vente..." className="pl-9 bg-card rounded-xl border-border focus:ring-emerald-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="px-6 py-4 w-10 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-border" 
                      checked={selectedIds.length === paginatedVentes.length && paginatedVentes.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-4 font-bold text-muted-foreground">RÉFÉRENCE</th>
                  <th className="px-6 py-4 font-bold text-muted-foreground">STATUS</th>
                  <th className="px-6 py-4 font-bold text-muted-foreground text-right">MONTANT</th>
                  <th className="px-6 py-4 font-bold text-muted-foreground text-center">PAIEMENT</th>
                  <th className="px-6 py-4 font-bold text-muted-foreground">MODE</th>
                  <th className="px-6 py-4 font-bold text-muted-foreground">CLIENT</th>
                  <th className="px-6 py-4 font-bold text-muted-foreground">DÉLAI</th>
                  <th className="px-6 py-4 font-bold text-muted-foreground">DATE</th>
                  <th className="px-6 py-4 font-bold text-muted-foreground">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={10} className="py-20 text-center"><RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />Chargement...</td></tr>
                ) : paginatedVentes.length === 0 ? (
                  <tr><td colSpan={10} className="py-20 text-center text-muted-foreground font-medium">Aucune vente enregistrée</td></tr>
                ) : paginatedVentes.map(v => (
                  <tr key={v.id} className={`hover:bg-muted/30 transition-colors group ${selectedIds.includes(v.id) ? 'bg-emerald-50/50' : ''}`}>
                    <td className="px-6 py-4 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-border text-emerald-600 focus:ring-emerald-500" 
                        checked={selectedIds.includes(v.id)}
                        onChange={() => toggleSelect(v.id)}
                      />
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-emerald-600">{v.numero_vente || `VT-${v.id}`}</td>
                    <td className="px-6 py-4">
                      {v.status && (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${SALE_STATUS_CONFIG[v.status]?.color}`}>
                          {SALE_STATUS_CONFIG[v.status]?.icon}
                          {v.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-right tabular-nums">{fmt(v.montant_total)}</td>
                    <td className="px-6 py-4 text-center"><PaymentStatusBadge status={v.statut_paiement} /></td>
                    <td className="px-6 py-4"><Badge variant="outline" className="font-semibold text-[10px] border-emerald-100 text-emerald-700 bg-emerald-50/30 uppercase">{v.mode_paiement}</Badge></td>
                    <td className="px-6 py-4 font-medium text-muted-foreground">{v.segment_clientele}</td>
                    <td className="px-6 py-4">
                      {v.delai_paiement ? (
                        <div className={`flex items-center gap-1.5 text-[10px] font-bold ${new Date(v.delai_paiement) < new Date() ? 'text-red-500' : 'text-amber-600'}`}>
                          <Clock className="h-3 w-3" />
                          {new Date(v.delai_paiement).toLocaleDateString()}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-muted-foreground">{new Date(v.date_vente).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedSale(v)} className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted rounded-lg">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 p-1 rounded-xl">
                            <DropdownMenuLabel className="text-[10px] font-bold uppercase text-muted-foreground px-2 py-1.5">Actions de vente</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            <div className="flex flex-col gap-1">
                              {v.status !== "Annulé" && (
                                <>
                                  {/* Actions conditionnelles basées sur canChangeStatus (Paiement/Livraison) */}
                                  {canChangeStatus(v) && (
                                    <>
                                      {v.statut_paiement !== "Payé" && (
                                        <DropdownMenuItem onClick={() => updateSaleMut.mutate({ id: v.id, data: { statut_paiement: "Payé", montant_paye: v.montant_total } })} className="gap-2 text-xs font-bold text-blue-600 py-2 cursor-pointer focus:bg-blue-50 focus:text-blue-700">
                                          <CreditCard className="h-4 w-4" /> Marquer comme payé
                                        </DropdownMenuItem>
                                      )}
                                      {v.status !== "Livré" && (
                                         <DropdownMenuItem onClick={() => updateSaleMut.mutate({ id: v.id, data: { status: "Livré" } })} className="gap-2 text-xs font-bold text-emerald-600 py-2 cursor-pointer focus:bg-emerald-50 focus:text-emerald-700">
                                          <ShieldCheck className="h-4 w-4" /> Marquer comme livré
                                        </DropdownMenuItem>
                                      )}
                                    </>
                                  )}

                                  {/* Annulation - Toujours disponible si non annulé */}
                                  <DropdownMenuItem onClick={() => updateSaleMut.mutate({ id: v.id, data: { status: "Annulé" } })} className="gap-2 text-xs font-bold text-red-600 py-2 cursor-pointer focus:bg-red-50 focus:text-red-700">
                                    <Ban className="h-4 w-4" /> Annuler la vente
                                  </DropdownMenuItem>
                                </>
                              )}

                              {v.status === "Annulé" && (
                                <div className="px-3 py-2 text-[10px] italic text-slate-400 bg-slate-50 rounded-lg mx-1 mb-2">
                                  Vente déjà annulée
                                </div>
                              )}
                            </div>

                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteConfirmId(v.id)} className="gap-2 text-xs font-bold text-red-600/70 py-2 cursor-pointer hover:bg-red-50">
                              <Trash2 className="h-4 w-4" /> Supprimer l'enregistrement
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-muted/20 border-t border-border">
              <p className="text-xs text-muted-foreground font-medium italic">Page {currentPage} sur {totalPages}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-8 rounded-lg font-bold">Précédent</Button>
                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-8 rounded-lg font-bold">Suivant</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={s => { if(!s) resetForm(); setShowModal(s); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
          <div className="bg-emerald-600 p-6 text-white flex items-center justify-between">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
                <ShoppingBag className="h-6 w-6" />
                Nouvelle Vente
              </DialogTitle>
              <DialogDescription className="text-emerald-100 font-medium">Enregistrement d'une transaction commerciale</DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleCreate} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Segment Clientèle</label>
                <select 
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  value={form.segment_clientele}
                  onChange={e => setForm({...form, segment_clientele: e.target.value})}
                >
                  <option value="Particulier">Particulier</option>
                  <option value="Professionnel">Professionnel</option>
                  <option value="Grossiste">Grossiste</option>
                  <option value="VIP/Fidélisé">VIP / Fidélisé</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Type de Vente</label>
                <select 
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  value={form.type_vente}
                  onChange={e => setForm({...form, type_vente: e.target.value})}
                >
                  <option value="Normal">Vente Directe (Comptant)</option>
                  <option value="Crédit">Vente à Crédit</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Mode de Paiement</label>
                <select 
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  value={form.mode_paiement}
                  onChange={e => setForm({...form, mode_paiement: e.target.value})}
                >
                  {MODE_PAIEMENT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {form.type_vente === "Crédit" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-red-500 px-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Délai de paiement
                  </label>
                  <Input 
                    type="date"
                    className="rounded-xl border-red-200 bg-red-50/30 font-bold focus:ring-red-500 text-sm"
                    value={form.delai_paiement}
                    onChange={e => setForm({...form, delai_paiement: e.target.value})}
                    required
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4 text-emerald-600" /> Articles Selectionnés
                </h3>
                <Button type="button" variant="ghost" size="sm" onClick={handleAddLine} className="h-8 text-emerald-600 font-black hover:bg-emerald-50 gap-2 border border-dashed border-emerald-200 rounded-lg px-4">
                  <Plus className="h-3.5 w-3.5" /> Ajouter
                </Button>
              </div>

              <div className="space-y-3">
                {lines.map((line, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row gap-4 bg-muted/20 p-4 rounded-2xl border border-border relative group/line">
                    <div className="flex-[3] space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Produit / Variante</label>
                      <select 
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                        value={line.produit_dv ? `dv-${line.produit_dv}` : (line.produit ? `pr-${line.produit}` : "")}
                        onChange={e => {
                          const val = e.target.value;
                          if (!val) return;
                          const [type, idStr] = val.split('-');
                          const id = Number(idStr);
                          const selected = productsAndSubProducts.find((p: any) => (type === 'dv' ? p.is_deriv && p.id === id : !p.is_deriv && p.id === id));
                          const price = selected?.price || 0;
                          if (type === 'dv') {
                            handleUpdateLine(idx, { produit_dv: id, produit: (selected as any)?.parent_id || null, prix_unitaire: Number(price) });
                          } else {
                            handleUpdateLine(idx, { produit: id, produit_dv: null, prix_unitaire: Number(price) });
                          }
                        }}
                      >
                        <option value="">Selectionner un article...</option>
                        {productsAndSubProducts.map((p: any) => (
                          <option key={`${p.is_deriv ? 'dv' : 'pr'}-${p.id}`} value={`${p.is_deriv ? 'dv' : 'pr'}-${p.id}`} disabled={p.stock <= 0}>
                            {p.is_deriv ? `🏷️ [Variante] ${p.name}` : `📦 ${p.name}`} (Stock: {p.stock}) — {fmt(p.price)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full md:w-24 space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Qté</label>
                      <Input type="number" step="0.001" className="h-9 text-xs rounded-xl bg-background font-bold text-center" value={line.quantite} onChange={e => handleUpdateLine(idx, { quantite: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="w-full md:w-32 space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">P.U</label>
                      <Input type="number" className="h-9 text-xs rounded-xl bg-background font-bold text-right" value={line.prix_unitaire} onChange={e => handleUpdateLine(idx, { prix_unitaire: Number(e.target.value) })} />
                    </div>
                    <div className="w-full md:w-32 flex flex-col justify-end items-end pb-1 pr-2">
                       <span className="font-bold text-sm text-emerald-600">{fmt(line.quantite * line.prix_unitaire)}</span>
                    </div>
                    {lines.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveLine(idx)} className="md:absolute md:-right-2 md:-top-2 h-7 w-7 rounded-full bg-white border border-border shadow-sm text-red-500 hover:bg-red-50 hover:text-red-600 scale-0 group-hover/line:scale-100 transition-all">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center p-6 bg-slate-50 rounded-3xl border border-slate-200">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Articles</p>
                  <p className="text-xl font-bold text-slate-700">{lines.reduce((s, l) => s + l.quantite, 0)} unités</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total</p>
                  <p className="text-3xl font-black text-emerald-600">{fmt(totalFormAmount)}</p>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-3 sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => { setShowModal(false); resetForm(); }} className="rounded-xl font-bold px-8">Annuler</Button>
              <Button type="submit" disabled={createMut.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-12 font-black shadow-lg shadow-emerald-200 border-none transition-all active:scale-95">
                {createMut.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : "Confirmer la vente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedSale} onOpenChange={s => { if(!s) setSelectedSale(null) }}>
        <DialogContent className="max-w-3xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-3 text-white">
                <Badge variant="outline" className="font-mono text-emerald-400 border-emerald-800 bg-emerald-950/50 px-3 py-1">{selectedSale?.numero_vente}</Badge>
                Détails de la vente
              </DialogTitle>
            </DialogHeader>
            <Button variant="ghost" size="sm" onClick={() => window.print()} className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950 font-bold gap-2">
              <FileText className="h-4 w-4" /> Print
            </Button>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: "Client", value: selectedSale?.segment_clientele },
                { label: "Type", value: selectedSale?.type_vente },
                { label: "Date", value: selectedSale ? new Date(selectedSale.date_vente).toLocaleDateString() : "" },
                { label: "Utilisateur", value: selectedSale?.utilisateur_name },
              ].map((info, i) => (
                <div key={i}>
                  <p className="text-[10px] font-black text-muted-foreground uppercase">{info.label}</p>
                  <p className="text-xs font-bold text-slate-700">{info.value}</p>
                </div>
              ))}
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-black text-slate-500 uppercase">Produit</th>
                    <th className="px-6 py-4 font-black text-slate-500 uppercase text-center">Qté</th>
                    <th className="px-6 py-4 font-black text-slate-500 uppercase text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedSale?.lignes?.map(l => (
                    <tr key={l.id}>
                      <td className="px-6 py-4 font-bold text-slate-700">{l.produit_name}</td>
                      <td className="px-6 py-4 text-center font-black text-emerald-600">x{l.quantite}</td>
                      <td className="px-6 py-4 text-right font-black text-slate-800">{fmt(l.montant_ligne)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200">
            <Button onClick={() => setSelectedSale(null)} variant="secondary" className="rounded-xl font-bold px-8">Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmId} onOpenChange={s => !s && setDeleteConfirmId(null)}>
        <DialogContent className="rounded-3xl p-6">
           <DialogHeader>
              <DialogTitle className="text-red-600">Confirmer suppression</DialogTitle>
              <DialogDescription>Action irréversible.</DialogDescription>
           </DialogHeader>
           <DialogFooter className="gap-2 mt-4">
              <Button variant="ghost" onClick={() => setDeleteConfirmId(null)} className="rounded-xl font-bold">Annuler</Button>
              <Button onClick={() => deleteMut.mutate(deleteConfirmId!)} variant="destructive" className="rounded-xl font-bold px-8">Supprimer</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
