import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getBonCommandes, createBonCommande, updateBonCommande, deleteBonCommande, searchProduits, getFournisseurs, getRemboursements } from "@/services/achatVenteService"
import {
  ShoppingCart, Plus, RefreshCw,
  Clock, Truck, XCircle, ChevronDown, Eye, Trash2, Package, Search, ExternalLink,
  CreditCard, ShieldCheck,
  Calendar
} from "lucide-react"
import type { BonCommande, BonCommandeStatus, CreateLigneData } from "@/types/achatVente"
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
import { ProductForm } from "@/components/ProductForm"
import { SupplierForm } from "@/components/SupplierForm"

const STATUS_CONFIG: Record<BonCommandeStatus, { label: string; color: string; icon: any }> = {
  "En attente": { label: "En attente", color: "bg-amber-50 text-amber-700 border-amber-100", icon: <Clock className="h-3 w-3" /> },
  "Livré":    { label: "Livré",     color: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: <Truck className="h-3 w-3" /> },
  "Annulé":     { label: "Annulé",     color: "bg-red-50 text-red-700 border-red-100", icon: <XCircle className="h-3 w-3" /> },
}

const STATUS_PAIEMENT_CONFIG: Record<string, { label: string; color: string }> = {
  "Non payé": { label: "Non payé", color: "bg-red-100 text-red-700 border-red-200" },
  "Partiel":  { label: "Partiel",  color: "bg-amber-100 text-amber-700 border-amber-200" },
  "Payé":     { label: "Payé",     color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
}

const MODE_PAIEMENT_OPTIONS = [
  "Espèces", "Virement", "Chèque", "Orange Money", "YAS", "Airtel Money", "Autre"
]

const ALL_STATUSES: BonCommandeStatus[] = ["En attente", "Livré", "Annulé"]

function StatusBadge({ status }: { status: BonCommandeStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["En attente"]
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

function PaymentStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_PAIEMENT_CONFIG[status] ?? STATUS_PAIEMENT_CONFIG["Non payé"]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

function formatDate(s: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

function formatAmount(n: number) {
  return new Intl.NumberFormat("fr-MG", { style: "decimal", maximumFractionDigits: 0 }).format(n) + " Ar"
}

export default function AchatPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [showModal, setShowModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<BonCommande | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // State for adding product/supplier
  const [showProductForm, setShowProductForm] = useState(false)
  const [showSupplierForm, setShowSupplierForm] = useState(false)

  // Form state
  const [lines, setLines] = useState<CreateLigneData[]>([
    { produit: null, produit_dv: null, quantite: 1, prix_unitaire: 0 }
  ])
  const [form, setForm] = useState({
    fournisseur: null as number | null,
    livraison_prevue: "" as string,
    date_commande: "" as string,
    mode_paiement: "Espèces"
  })

  // Queries
  const { data: remboursements = [] } = useQuery({ 
    queryKey: ["remboursements"], 
    queryFn: () => getRemboursements() 
  })
  
  const refundedOrderIds = remboursements
    .filter(r => r.source_type === 'Achat')
    .map(r => r.source_id)

  const { data: commandes = [], isLoading, refetch } = useQuery({
    queryKey: ["bon-commandes", statusFilter, refundedOrderIds],
    queryFn: () => getBonCommandes(statusFilter ? { status: statusFilter } : undefined),
    select: (data) => data.filter(c => !refundedOrderIds.includes(c.id))
  })

  const { data: fournisseurs = [] } = useQuery({ queryKey: ["fournisseurs"], queryFn: getFournisseurs })
  
  const { data: productsAndSubProducts = [] } = useQuery({ 
    queryKey: ["produits-search-combined"], 
    queryFn: () => searchProduits("") 
  })

  const createMut = useMutation({
    mutationFn: createBonCommande,
    onSuccess: () => {
      toast.success("Bon de commande créé avec succès")
      qc.invalidateQueries({ queryKey: ["bon-commandes"] })
      setShowModal(false)
      resetForm()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateOrderMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BonCommande> }) =>
      updateBonCommande(id, data),
    onSuccess: () => {
      toast.success("Mise à jour réussie")
      qc.invalidateQueries({ queryKey: ["bon-commandes"] })
    },
    onError: (e: Error) => toast.error(e.message)
  })

  const deleteMut = useMutation({
    mutationFn: deleteBonCommande,
    onSuccess: () => {
      toast.success("Opération réussie")
      qc.invalidateQueries({ queryKey: ["bon-commandes"] })
      setDeleteConfirmId(null)
      setSelectedIds([])
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const resetForm = () => {
    setForm({ fournisseur: null, livraison_prevue: "", date_commande: "", mode_paiement: "Espèces" })
    setLines([{ produit: null, produit_dv: null, quantite: 1, prix_unitaire: 0 }])
  }

  const handleAddLine = () => setLines([...lines, { produit: null, produit_dv: null, quantite: 1, prix_unitaire: 0 }])
  const handleRemoveLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx))
  const handleUpdateLine = (idx: number, data: Partial<CreateLigneData>) => {
    const newLines = [...lines]
    newLines[idx] = { ...newLines[idx], ...data }
    setLines(newLines)
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fournisseur) return toast.error("Veuillez choisir un fournisseur")
    if (!form.date_commande) return toast.error("La date de commande est obligatoire. Veuillez la préciser.")
    if (lines.some(l => !l.produit && !l.produit_dv)) return toast.error("Veuillez choisir un produit ou sous-produit pour chaque ligne")

    const userStr = localStorage.getItem("user")
    const userId = userStr ? JSON.parse(userStr).id : null
    
    if (!userId) return toast.error("Utilisateur non identifié. Veuillez vous reconnecter.")

    createMut.mutate({
      ...form,
      fournisseur: form.fournisseur,
      utilisateur: userId,
      livraison_prevue: form.livraison_prevue || null,
      lignes_data: lines
    })
  }

  const supplierProducts = form.fournisseur 
    ? productsAndSubProducts.filter((p: any) => p.supplier === Number(form.fournisseur))
    : productsAndSubProducts

  const filteredCommandes = commandes.filter(c => 
    c.numero_commande.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.fournisseur_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPages = Math.ceil(filteredCommandes.length / itemsPerPage)
  const paginatedCommandes = filteredCommandes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(paginatedCommandes.map(c => c.id))
    else setSelectedIds([])
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const totalFormAmount = lines.reduce((acc, l) => acc + (l.quantite * l.prix_unitaire), 0)

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Achats</h1>
            <p className="text-sm text-muted-foreground font-medium">Flux d'approvisionnement et commandes fournisseurs</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Actualiser
          </Button>
          <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Plus className="h-4 w-4" /> Nouvelle commande
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Commandes", value: commandes.filter(c => c.status !== "Annulé").length, sub: "Toutes périodes", color: "text-blue-600", bg: "bg-blue-50" },
          { label: "En Attente", value: commandes.filter(c => c.status === "En attente").length, sub: "Nécessite action", color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Livrées", value: commandes.filter(c => c.status === "Livré").length, sub: "Stock mis à jour", color: "text-emerald-600", bg: "bg-emerald-50" },
          { 
            label: "Payé / Total", 
            value: `${formatAmount(commandes.filter(c => c.status !== "Annulé").reduce((s, c) => s + Number(c.montant_paye), 0))} / ${formatAmount(commandes.filter(c => c.status !== "Annulé").reduce((s, c) => s + Number(c.montant_total), 0))}`, 
            sub: "Suivi trésorerie", color: "text-slate-700", bg: "bg-slate-50" 
          },
        ].map((k, i) => (
          <div key={i} className={`p-5 rounded-2xl border border-border shadow-sm hover:translate-y-[-2px] transition-all duration-200 ${k.bg}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{k.label}</p>
            <div className="flex items-end gap-2">
              <span className={`text-xl font-black ${k.color}`}>{k.value}</span>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl border border-border w-full md:w-auto overflow-x-auto">
          <Button 
            variant={statusFilter === "" ? "secondary" : "ghost"} 
            size="sm" 
            onClick={() => setStatusFilter("")} 
            className="h-8 text-[11px] font-black uppercase"
          >Tous les bons</Button>
          {ALL_STATUSES.map(s => (
            <Button 
              key={s} 
              variant={statusFilter === s ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setStatusFilter(s)} 
              className="h-8 text-[11px] font-black uppercase whitespace-nowrap"
            >{s}</Button>
          ))}
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="N° commande, fournisseur..." 
            className="pl-9 bg-card rounded-xl border-border focus:ring-blue-500 font-medium" 
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
                <th className="px-6 py-4 w-10 text-center">
                  <input 
                    type="checkbox" 
                    className="rounded border-border" 
                    checked={selectedIds.length === paginatedCommandes.length && paginatedCommandes.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-6 py-4 font-black text-muted-foreground uppercase tracking-widest text-[10px]">Référence</th>
                <th className="px-6 py-4 font-black text-muted-foreground uppercase tracking-widest text-[10px]">Fournisseur</th>
                <th className="px-6 py-4 font-black text-muted-foreground uppercase tracking-widest text-[10px]">Status</th>
                <th className="px-6 py-4 font-black text-muted-foreground uppercase tracking-widest text-[10px] text-right">Montant</th>
                <th className="px-6 py-4 font-black text-muted-foreground uppercase tracking-widest text-[10px] text-center">Paiement</th>
                <th className="px-6 py-4 font-black text-muted-foreground uppercase tracking-widest text-[10px]">Date Commande</th>
                <th className="px-6 py-4 font-black text-muted-foreground uppercase tracking-widest text-[10px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={8} className="py-20 text-center font-bold text-muted-foreground italic"><RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />Chargement...</td></tr>
              ) : paginatedCommandes.length === 0 ? (
                <tr><td colSpan={8} className="py-20 text-center text-muted-foreground font-medium italic">Aucun bon de commande trouvé</td></tr>
              ) : paginatedCommandes.map(c => (
                <tr key={c.id} className={`hover:bg-muted/30 transition-colors group ${selectedIds.includes(c.id) ? 'bg-blue-50/50' : ''}`}>
                  <td className="px-6 py-4 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-border text-blue-600" 
                      checked={selectedIds.includes(c.id)}
                      onChange={() => toggleSelect(c.id)}
                    />
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-blue-600">{c.numero_commande}</td>
                  <td className="px-6 py-4 font-bold text-slate-700">{c.fournisseur_name}</td>
                  <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                  <td className="px-6 py-4 font-black text-right tabular-nums">{formatAmount(c.montant_total)}</td>
                  <td className="px-6 py-4 text-center"><PaymentStatusBadge status={c.statut_paiement} /></td>
                  <td className="px-6 py-4 text-xs font-bold text-muted-foreground">{formatDate(c.date_commande)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(c)} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 shadow-xl border-slate-200">
                          <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground px-2 py-1.5 tracking-tighter">Actions logistiques</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {c.status === "En attente" && (
                            <>
                              <DropdownMenuItem 
                                onClick={() => updateOrderMut.mutate({ id: c.id, data: { statut_paiement: "Payé", montant_paye: c.montant_total } })}
                                className="gap-2 text-xs font-bold text-blue-600 py-2.5 cursor-pointer focus:bg-blue-50 focus:text-blue-700"
                              >
                                <CreditCard className="h-4 w-4" /> Marquer comme payé
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => updateOrderMut.mutate({ id: c.id, data: { status: "Livré", statut_paiement: "Payé", montant_paye: c.montant_total } })}
                                className="gap-2 text-xs font-bold text-emerald-600 py-2.5 cursor-pointer focus:bg-emerald-50 focus:text-emerald-700"
                              >
                                <ShieldCheck className="h-4 w-4" /> Marquer comme livré
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => updateOrderMut.mutate({ id: c.id, data: { status: "Annulé" } })}
                                className="gap-2 text-xs font-bold text-red-600 py-2.5 cursor-pointer focus:bg-red-50 focus:text-red-700"
                              >
                                <XCircle className="h-4 w-4" /> Annuler la commande
                              </DropdownMenuItem>
                            </>
                          )}
                          {c.status === "Livré" && c.statut_paiement !== "Payé" && (
                             <DropdownMenuItem 
                                onClick={() => updateOrderMut.mutate({ id: c.id, data: { statut_paiement: "Payé", montant_paye: c.montant_total } })}
                                className="gap-2 text-xs font-bold text-emerald-600 py-2.5 cursor-pointer focus:bg-emerald-50 focus:text-emerald-700"
                              >
                                <CreditCard className="h-4 w-4" /> Encaisser paiement
                              </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeleteConfirmId(c.id)} className="gap-2 text-xs font-bold text-slate-500 py-2.5 cursor-pointer hover:bg-slate-50">
                            <Trash2 className="h-4 w-4" /> Supprimer l'entrée
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

      <Dialog open={showModal} onOpenChange={s => { if(!s) resetForm(); setShowModal(s); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-blue-600" /> Nouvelle Commande Fournisseur
            </DialogTitle>
            <DialogDescription className="font-medium text-muted-foreground">Enregistrement d'un nouvel approvisionnement stock</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground px-1">Fournisseur</label>
                <div className="flex gap-2">
                  <select 
                    className="flex-1 bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={form.fournisseur || ""}
                    onChange={e => setForm({...form, fournisseur: Number(e.target.value)})}
                  >
                    <option value="">Sélectionner un fournisseur</option>
                    {Array.isArray(fournisseurs) && fournisseurs.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  <Button type="button" variant="outline" size="icon" onClick={() => setShowSupplierForm(true)} className="shrink-0 rounded-xl border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 h-10 w-10">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground px-1">Date de commande (Obligatoire)</label>
                <div className="relative">
                  <Input 
                    type="date"
                    className="rounded-xl border-border bg-muted/40 font-bold focus:ring-blue-500 h-11 pl-10"
                    value={form.date_commande}
                    onChange={e => setForm({...form, date_commande: e.target.value})}
                    required
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-muted-foreground px-1">Mode de paiement</label>
                <select 
                  className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={form.mode_paiement}
                  onChange={e => setForm({...form, mode_paiement: e.target.value})}
                >
                  {MODE_PAIEMENT_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground px-1">Livraison Prévue</label>
                <div className="relative">
                  <Input 
                    type="date"
                    className="rounded-xl border-border bg-muted/40 font-bold focus:ring-blue-500 h-11 pl-10"
                    value={form.livraison_prevue}
                    onChange={e => setForm({...form, livraison_prevue: e.target.value})}
                  />
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-600" /> Articles Selectionnés
                </h3>
                <Button type="button" variant="ghost" size="sm" onClick={handleAddLine} className="h-8 text-blue-600 font-bold hover:bg-blue-50 gap-1.5 border border-dashed border-blue-200 rounded-lg">
                  <Plus className="h-3.5 w-3.5" /> Ajouter une ligne
                </Button>
              </div>

              <div className="space-y-3">
                {lines.map((line, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row gap-4 bg-muted/20 p-4 rounded-2xl border border-border relative group/line">
                    <div className="flex-[3] space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase px-0.5">Produit / Variante</label>
                      <div className="flex gap-2">
                        <select 
                          className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                          value={line.produit_dv ? `dv-${line.produit_dv}` : (line.produit ? `pr-${line.produit}` : "")}
                          onChange={e => {
                            const val = e.target.value;
                            if(!val) return;
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
                          <option value="">Choisir un article...</option>
                          {supplierProducts.map((p: any) => (
                            <option key={`${p.is_deriv ? 'dv' : 'pr'}-${p.id}`} value={`${p.is_deriv ? 'dv' : 'pr'}-${p.id}`}>
                              {p.is_deriv ? `[Variante] ${p.name}` : p.name} — {formatAmount(p.price)}
                            </option>
                          ))}
                        </select>
                        <Button type="button" variant="outline" size="icon" onClick={() => setShowProductForm(true)} className="h-8 w-8 shrink-0 rounded-lg border-dashed border-blue-200 text-blue-500">
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase px-0.5">Qté</label>
                      <Input type="number" className="h-8 text-xs rounded-xl bg-background font-bold" value={line.quantite} onChange={e => handleUpdateLine(idx, { quantite: Number(e.target.value) })} />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase px-0.5">P.U (Ar)</label>
                      <Input type="number" className="h-8 text-xs rounded-xl bg-background font-bold" value={line.prix_unitaire} onChange={e => handleUpdateLine(idx, { prix_unitaire: Number(e.target.value) })} />
                    </div>
                    <div className="w-24 flex items-end justify-end pb-1.5 font-black text-blue-600 tabular-nums">
                        {formatAmount(line.quantite * line.prix_unitaire)}
                    </div>
                    {lines.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveLine(idx)} className="md:absolute md:-right-2 md:-top-2 h-7 w-7 rounded-full bg-white border border-border shadow-sm text-red-500 hover:bg-red-50 hover:text-red-600 scale-0 group-hover/line:scale-100 transition-all">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center p-6 bg-blue-50 rounded-3xl border border-blue-100 mt-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-blue-700 uppercase">Articles totaux</p>
                  <p className="text-xl font-black text-blue-800">{lines.reduce((s, l) => s + l.quantite, 0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-blue-700 uppercase">Montant total estimé</p>
                  <p className="text-3xl font-black text-blue-600">{formatAmount(totalFormAmount)}</p>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-3 sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => { setShowModal(false); resetForm(); }} className="rounded-xl font-bold px-8">Annuler</Button>
              <Button type="submit" disabled={createMut.isPending} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-12 font-black shadow-lg shadow-blue-200 border-none transition-all active:scale-95">
                {createMut.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : "Valider la commande"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedOrder} onOpenChange={s => { if(!s) setSelectedOrder(null) }}>
        <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
            <DialogHeader>
              <DialogTitle className="text-xl font-black flex items-center gap-3 text-white">
                <Badge variant="outline" className="font-mono text-blue-400 border-blue-800 bg-blue-950/50 px-3 py-1">{selectedOrder?.numero_commande}</Badge>
                Détails du bon d'achat
              </DialogTitle>
            </DialogHeader>
            <Button variant="ghost" size="sm" onClick={() => window.print()} className="text-blue-400 hover:text-blue-300 hover:bg-blue-950 font-bold gap-2">
              <ExternalLink className="h-4 w-4" /> Export/Print
            </Button>
          </div>
          
          <div className="p-6 space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: "Fournisseur", value: selectedOrder?.fournisseur_name, icon: <Package className="h-3.5 w-3.5" /> },
                { label: "Status", value: selectedOrder?.status, icon: <ShoppingCart className="h-3.5 w-3.5" /> },
                { label: "Date Commande", value: formatDate(selectedOrder?.date_commande || ""), icon: <Calendar className="h-3.5 w-3.5" /> },
                { label: "Paiement", value: selectedOrder?.statut_paiement, icon: <CreditCard className="h-3.5 w-3.5" /> },
              ].map((info, i) => (
                <div key={i} className="space-y-1.5">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">{info.icon} {info.label}</p>
                  <p className="text-xs font-bold text-slate-700">{info.value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest px-1">Lignes de commande</h3>
              <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-sm bg-white">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-tighter">Produit</th>
                      <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-tighter text-center">Qté</th>
                      <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-tighter text-right">P.U</th>
                      <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-tighter text-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrder?.lignes?.map(l => (
                      <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-700">{l.product_name}</td>
                        <td className="px-6 py-4 text-center font-black text-blue-600 text-sm">x{l.quantite}</td>
                        <td className="px-6 py-4 text-right text-slate-500 font-medium">{formatAmount(l.prix_unitaire)}</td>
                        <td className="px-6 py-4 text-right font-black text-slate-800 text-sm">{formatAmount(l.montant_ligne)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50/80 border-t border-slate-200">
                    <tr>
                      <td colSpan={3} className="px-6 py-5 text-right font-black text-slate-500 uppercase tracking-widest">Total Global</td>
                      <td className="px-6 py-5 text-right font-black text-xl text-blue-600">{formatAmount(selectedOrder?.montant_total || 0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200">
            <Button onClick={() => setSelectedOrder(null)} variant="secondary" className="rounded-xl font-bold px-8">Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmId} onOpenChange={s => !s && setDeleteConfirmId(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
             <DialogTitle className="flex items-center gap-2 text-red-600"><XCircle className="h-5 w-5" /> Confirmation de suppression</DialogTitle>
             <DialogDescription className="font-medium">Voulez-vous vraiment supprimer cet enregistrement ? Cette action est irréversible.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)} className="rounded-xl font-bold">Annuler</Button>
            <Button onClick={() => deleteMut.mutate(deleteConfirmId!)} variant="destructive" className="rounded-xl font-bold px-8">Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showProductForm} onOpenChange={setShowProductForm}>
        <DialogContent className="max-w-4xl p-0 border-none bg-transparent">
          <ProductForm isDialog onClose={() => setShowProductForm(false)} onSubmit={() => { qc.invalidateQueries({ queryKey: ["produits-search-combined"] }); setShowProductForm(false); }} />
        </DialogContent>
      </Dialog>

      <Dialog open={showSupplierForm} onOpenChange={setShowSupplierForm}>
        <DialogContent className="max-w-2xl p-0 border-none">
          <SupplierForm onCancel={() => setShowSupplierForm(false)} onSubmit={() => { qc.invalidateQueries({ queryKey: ["fournisseurs"] }); setShowSupplierForm(false); }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
