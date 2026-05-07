import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getBonCommandes, createBonCommande, updateBonCommande, getFournisseurs, getProduits } from "@/services/achatVenteService"
import type { BonCommande, BonCommandeStatus, CreateBonCommandeData, CreateLigneData } from "@/types/achatVente"
import { toast } from "sonner"
import {
  ShoppingCart, Plus, Filter, RefreshCw, X, CheckCircle2,
  Clock, Truck, XCircle, ChevronDown, Eye, Trash2, Package, Search
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

const STATUS_CONFIG: Record<BonCommandeStatus, { label: string; color: string; icon: React.ReactNode }> = {
  "En attente": { label: "En attente", color: "bg-amber-100 text-amber-700 border-amber-200", icon: <Clock className="h-3 w-3" /> },
  "Confirmé":   { label: "Confirmé",   color: "bg-blue-100 text-blue-700 border-blue-200",   icon: <CheckCircle2 className="h-3 w-3" /> },
  "Livré":      { label: "Livré",      color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <Truck className="h-3 w-3" /> },
  "Annulé":     { label: "Annulé",     color: "bg-red-100 text-red-700 border-red-200",       icon: <XCircle className="h-3 w-3" /> },
}

const ALL_STATUSES: BonCommandeStatus[] = ["En attente", "Confirmé", "Livré", "Annulé"]

function StatusBadge({ status }: { status: BonCommandeStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["En attente"]
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
      {cfg.icon} {cfg.label}
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

  // Form state for lines
  const [lines, setLines] = useState<CreateLigneData[]>([
    { produit: null, quantite: 1, prix_unitaire: 0 }
  ])

  const [form, setForm] = useState({
    fournisseur: null as number | null,
    livraison_prevue: "" as string,
  })

  // Queries
  const { data: commandes = [], isLoading, refetch } = useQuery({
    queryKey: ["bon-commandes", statusFilter],
    queryFn: () => getBonCommandes(statusFilter ? { status: statusFilter } : undefined),
  })

  const { data: fournisseurs = [] } = useQuery({ queryKey: ["fournisseurs"], queryFn: getFournisseurs })
  const { data: produits = [] } = useQuery({ queryKey: ["produits"], queryFn: getProduits })

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

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: BonCommandeStatus }) =>
      updateBonCommande(id, { status }),
    onSuccess: () => {
      toast.success("Statut mis à jour")
      qc.invalidateQueries({ queryKey: ["bon-commandes"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const resetForm = () => {
    setForm({ fournisseur: null, livraison_prevue: "" })
    setLines([{ produit: null, quantite: 1, prix_unitaire: 0 }])
  }

  const handleAddLine = () => setLines([...lines, { produit: null, quantite: 1, prix_unitaire: 0 }])
  const handleRemoveLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx))
  const handleUpdateLine = (idx: number, data: Partial<CreateLigneData>) => {
    const newLines = [...lines]
    newLines[idx] = { ...newLines[idx], ...data }
    setLines(newLines)
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fournisseur) return toast.error("Veuillez choisir un fournisseur")
    if (lines.some(l => !l.produit)) return toast.error("Veuillez choisir un produit pour chaque ligne")

    const userStr = localStorage.getItem("user")
    const userId = userStr ? JSON.parse(userStr).id : null
    
    if (!userId) return toast.error("Utilisateur non identifié. Veuillez vous reconnecter.")

    createMut.mutate({
      fournisseur: form.fournisseur,
      utilisateur: userId,
      livraison_prevue: form.livraison_prevue || null,
      lignes_data: lines
    })
  }

  const filteredCommandes = commandes.filter(c => 
    c.numero_commande.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.fournisseur_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalFormAmount = lines.reduce((acc, l) => acc + (l.quantite * l.prix_unitaire), 0)

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header Section */}
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

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Commandes", value: commandes.length, sub: "Toutes périodes", color: "text-blue-600", bg: "bg-blue-50" },
          { label: "En Attente", value: commandes.filter(c => c.status === "En attente").length, sub: "Nécessite action", color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Livrées", value: commandes.filter(c => c.status === "Livré").length, sub: "Stock mis à jour", color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Montant Total", value: formatAmount(commandes.reduce((s, c) => s + c.montant_total, 0)), sub: "Valeur stock entrant", color: "text-violet-600", bg: "bg-violet-50" },
        ].map((k, i) => (
          <div key={i} className="bg-card p-5 rounded-2xl border border-border shadow-sm group hover:border-blue-200 transition-all">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{k.label}</p>
            <div className="flex items-end gap-2">
              <span className={`text-2xl font-bold ${k.color}`}>{k.value}</span>
              <span className="text-[10px] text-muted-foreground mb-1">{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl border border-border w-full md:w-auto overflow-x-auto">
          <Button 
            variant={statusFilter === "" ? "secondary" : "ghost"} 
            size="sm" 
            onClick={() => setStatusFilter("")}
            className="rounded-lg h-8 text-xs font-semibold"
          >Tous</Button>
          {ALL_STATUSES.map(s => (
            <Button 
              key={s}
              variant={statusFilter === s ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setStatusFilter(s)}
              className="rounded-lg h-8 text-xs font-semibold whitespace-nowrap"
            >{s}</Button>
          ))}
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher une commande..." 
            className="pl-9 bg-card rounded-xl"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-bold text-muted-foreground">NUMÉRO</th>
                <th className="px-6 py-4 font-bold text-muted-foreground">FOURNISSEUR</th>
                <th className="px-6 py-4 font-bold text-muted-foreground">STATUT</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-right">MONTANT</th>
                <th className="px-6 py-4 font-bold text-muted-foreground">DATE</th>
                <th className="px-6 py-4 font-bold text-muted-foreground">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={6} className="py-20 text-center text-muted-foreground"><RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />Chargement...</td></tr>
              ) : filteredCommandes.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center text-muted-foreground font-medium">Aucun bon de commande trouvé</td></tr>
              ) : filteredCommandes.map(c => (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors group">
                  <td className="px-6 py-4 font-mono font-bold text-blue-600">{c.numero_commande}</td>
                  <td className="px-6 py-4 font-semibold text-foreground">{c.fournisseur_name || "—"}</td>
                  <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                  <td className="px-6 py-4 font-bold text-right tabular-nums text-foreground">{formatAmount(c.montant_total)}</td>
                  <td className="px-6 py-4 text-muted-foreground font-medium">{formatDate(c.date_commande)}</td>
                  <td className="px-6 py-4 flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(c)} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 p-1">
                        {ALL_STATUSES.filter(s => s !== c.status).map(s => (
                          <DropdownMenuItem key={s} onClick={() => updateStatusMut.mutate({ id: c.id, status: s })} className="gap-2 text-xs font-semibold py-2">
                            {STATUS_CONFIG[s].icon} {s}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creation Modal */}
      <Dialog open={showModal} onOpenChange={s => { if(!s) resetForm(); setShowModal(s); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              Créer un nouveau bon de commande
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Fournisseur</label>
                <select 
                  className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                  value={form.fournisseur || ""}
                  onChange={e => setForm({...form, fournisseur: Number(e.target.value)})}
                  required
                >
                  <option value="">Sélectionner un fournisseur</option>
                  {Array.isArray(fournisseurs) && fournisseurs.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Livraison Prévue</label>
                <Input 
                  type="date" 
                  className="rounded-xl border-border bg-muted/30"
                  value={form.livraison_prevue}
                  onChange={e => setForm({...form, livraison_prevue: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-sm font-bold flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" /> Lignes de commande</h3>
                <Button type="button" variant="ghost" size="sm" onClick={handleAddLine} className="h-7 text-blue-600 font-bold hover:bg-blue-50 gap-1">
                  <Plus className="h-3 w-3" /> Ajouter un produit
                </Button>
              </div>

              <div className="space-y-3">
                {lines.map((line, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row gap-3 bg-muted/20 p-3 rounded-xl border border-border group relative">
                    <div className="flex-1 space-y-1">
                      <select 
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        value={line.produit || ""}
                        onChange={e => handleUpdateLine(idx, { produit: Number(e.target.value) })}
                      >
                        <option value="">Choisir un produit</option>
                        {Array.isArray(produits) && produits.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="w-full md:w-24 space-y-1">
                      <Input 
                        type="number" 
                        placeholder="Qté" 
                        className="h-8 text-xs rounded-lg bg-background"
                        value={line.quantite}
                        onChange={e => handleUpdateLine(idx, { quantite: Number(e.target.value) })}
                      />
                    </div>
                    <div className="w-full md:w-32 space-y-1">
                      <Input 
                        type="number" 
                        placeholder="Prix Unit." 
                        className="h-8 text-xs rounded-lg bg-background"
                        value={line.prix_unitaire}
                        onChange={e => handleUpdateLine(idx, { prix_unitaire: Number(e.target.value) })}
                      />
                    </div>
                    <div className="w-full md:w-32 flex items-center justify-end font-bold text-xs text-blue-600">
                      {formatAmount(line.quantite * line.prix_unitaire)}
                    </div>
                    {lines.length > 1 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveLine(idx)}
                        className="md:absolute md:-right-2 md:-top-2 h-6 w-6 rounded-full bg-white border border-border shadow-sm text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end p-4 bg-muted/30 rounded-2xl border border-border">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Commande</p>
                  <p className="text-2xl font-bold text-blue-600">{formatAmount(totalFormAmount)}</p>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="rounded-xl">Annuler</Button>
              <Button type="submit" disabled={createMut.isPending} className="bg-blue-600 hover:bg-blue-700 rounded-xl min-w-[140px]">
                {createMut.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                Valider la commande
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details View */}
      <Dialog open={!!selectedOrder} onOpenChange={s => { if(!s) setSelectedOrder(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Badge variant="outline" className="font-mono text-blue-600 border-blue-200 bg-blue-50">{selectedOrder?.numero_commande}</Badge>
              Détails de la commande
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm bg-muted/30 p-4 rounded-2xl border border-border">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Fournisseur</p>
                <p className="font-bold">{selectedOrder?.fournisseur_name}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Statut</p>
                <div className="mt-1"><StatusBadge status={selectedOrder?.status || 'En attente'} /></div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Date Commande</p>
                <p className="font-semibold">{formatDate(selectedOrder?.date_commande || '')}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Responsable</p>
                <p className="font-semibold">{selectedOrder?.utilisateur_name}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Produits commandés</h3>
              <div className="border border-border rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-2 font-bold">PRODUIT</th>
                      <th className="px-4 py-2 font-bold text-center">QTÉ</th>
                      <th className="px-4 py-2 font-bold text-right">UNITÉ</th>
                      <th className="px-4 py-2 font-bold text-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedOrder?.lignes?.map(l => (
                      <tr key={l.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-semibold">{l.product_name}</td>
                        <td className="px-4 py-3 text-center font-bold text-blue-600">{l.quantite}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{formatAmount(l.prix_unitaire)}</td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums">{formatAmount(l.montant_ligne)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30 border-t border-border">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right font-bold text-muted-foreground uppercase">Total Global</td>
                      <td className="px-4 py-3 text-right font-bold text-lg text-blue-600 tabular-nums">{formatAmount(selectedOrder?.montant_total || 0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setSelectedOrder(null)} variant="secondary" className="rounded-xl w-full md:w-auto">Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
