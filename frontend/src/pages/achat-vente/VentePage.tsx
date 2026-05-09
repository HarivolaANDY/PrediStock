import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getDonneeVentes, createDonneeVente, searchProduits } from "@/services/achatVenteService"
import { DollarSign, TrendingUp, ShoppingBag, RefreshCw, Filter, Plus, Search, Eye, Package, Trash2, X } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent"
import type { DonneeVente, CreateLigneVenteData } from "@/types/achatVente"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

function fmt(n: number | string) {
  return new Intl.NumberFormat("fr-MG", { maximumFractionDigits: 0 }).format(Number(n)) + " Ar"
}

function buildChart(ventes: DonneeVente[]) {
  const map: Record<string, number> = {}
  ventes.forEach(v => {
    if (!v.date_vente) return
    try {
      const k = new Date(v.date_vente).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })
      map[k] = (map[k] || 0) + Number(v.montant_total || 0)
    } catch (e) { console.error("Date error", e) }
  })
  return Object.entries(map).slice(-12).map(([mois, total]) => ({ mois, total }))
}

export default function VentePage() {
  const qc = useQueryClient()
  const [canal, setCanal] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [selectedSale, setSelectedSale] = useState<DonneeVente | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const { data: ventes = [], isLoading, refetch } = useQuery({
    queryKey: ["donnee-ventes", canal],
    queryFn: () => getDonneeVentes(canal ? { canal_vente: canal } : undefined),
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
    canal_vente: "Direct",
    segment_clientele: "Particulier"
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
    setForm({ canal_vente: "Direct", segment_clientele: "Particulier" })
  }

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
    const userStr = localStorage.getItem("user")
    const userId = userStr ? JSON.parse(userStr).id : null
    
    if (!userId) return toast.error("Utilisateur non identifié. Veuillez vous reconnecter.")

    createMut.mutate({
      ...form,
      utilisateur: userId,
      lignes_data: lines
    })
  }

  const totalRevenu = ventes.reduce((s, v) => s + Number(v.montant_total), 0)
  const totalQty = ventes.reduce((s, v) => s + (v.lignes?.reduce((sq, l) => sq + l.quantite, 0) || 0), 0)
  const avgTicket = ventes.length ? totalRevenu / ventes.length : 0
  const canaux = [...new Set(ventes.map(v => v.canal_vente).filter(Boolean))]
  const chart = buildChart(ventes)

  const filteredVentes = ventes.filter(v => 
    (v.numero_vente?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    v.canal_vente.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalFormAmount = lines.reduce((acc, l) => acc + (l.quantite * l.prix_unitaire - (l.remise_applique || 0)), 0)

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header Section */}
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
          <Button onClick={() => setShowModal(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-2 text-white">
            <Plus className="h-4 w-4" /> Nouvelle vente
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Ventes", value: ventes.length, sub: "Transactions", color: "text-emerald-600", icon: <ShoppingBag className="h-4 w-4" /> },
          { label: "Revenu Total", value: fmt(totalRevenu), sub: "Chiffre d'affaires", color: "text-blue-600", icon: <DollarSign className="h-4 w-4" /> },
          { label: "Panier Moyen", value: fmt(avgTicket), sub: `${totalQty} unités vendues`, color: "text-purple-600", icon: <TrendingUp className="h-4 w-4" /> },
        ].map((k, i) => (
          <div key={i} className="bg-card p-5 rounded-2xl border border-border shadow-sm hover:border-emerald-200 transition-all">
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

      {/* Chart */}
      {chart.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-bold mb-6 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" /> Progression des revenus
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} formatter={(v: ValueType | undefined, _name: NameType | undefined) => [fmt(Number(v)), "Revenu"]} contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="total" fill="#059669" radius={[6, 6, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters & Table */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl border border-border overflow-x-auto w-full md:w-auto">
            <Button variant={canal === "" ? "secondary" : "ghost"} size="sm" onClick={() => setCanal("")} className="h-8 text-xs font-bold">Tous les canaux</Button>
            {canaux.map(c => (
              <Button key={c} variant={canal === c ? "secondary" : "ghost"} size="sm" onClick={() => setCanal(c)} className="h-8 text-xs font-bold whitespace-nowrap">{c}</Button>
            ))}
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher par numéro de vente..." className="pl-9 bg-card rounded-xl" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-bold text-muted-foreground">RÉFÉRENCE</th>
                  <th className="px-6 py-4 font-bold text-muted-foreground">CANAL</th>
                  <th className="px-6 py-4 font-bold text-muted-foreground text-right">MONTANT</th>
                  <th className="px-6 py-4 font-bold text-muted-foreground">SEGMENT</th>
                  <th className="px-6 py-4 font-bold text-muted-foreground">DATE</th>
                  <th className="px-6 py-4 font-bold text-muted-foreground">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={6} className="py-20 text-center"><RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />Chargement...</td></tr>
                ) : filteredVentes.length === 0 ? (
                  <tr><td colSpan={6} className="py-20 text-center text-muted-foreground font-medium">Aucune vente enregistrée</td></tr>
                ) : filteredVentes.map(v => (
                  <tr key={v.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-4 font-mono font-bold text-emerald-600">{v.numero_vente || `#${v.id}`}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100">{v.canal_vente}</Badge>
                    </td>
                    <td className="px-6 py-4 font-bold text-right tabular-nums">{fmt(v.montant_total)}</td>
                    <td className="px-6 py-4 text-muted-foreground font-medium">{v.segment_clientele}</td>
                    <td className="px-6 py-4 text-muted-foreground font-medium">{new Date(v.date_vente).toLocaleDateString("fr-FR")}</td>
                    <td className="px-6 py-4">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedSale(v)} className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Sale Modal */}
      <Dialog open={showModal} onOpenChange={s => { if(!s) resetForm(); setShowModal(s); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              Enregistrer une nouvelle vente
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Canal de vente</label>
                <select className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm outline-none" value={form.canal_vente} onChange={e => setForm({...form, canal_vente: e.target.value})}>
                  <option value="Direct">Direct (Magasin)</option>
                  <option value="E-commerce">E-commerce</option>
                  <option value="B2B">B2B</option>
                  <option value="Partenaire">Partenaire</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Segment Client</label>
                <select className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-sm outline-none" value={form.segment_clientele} onChange={e => setForm({...form, segment_clientele: e.target.value})}>
                  <option value="Particulier">Particulier</option>
                  <option value="Professionnel">Professionnel</option>
                  <option value="VIP">VIP / Fidélisé</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-sm font-bold flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" /> Produits vendus</h3>
                <Button type="button" variant="ghost" size="sm" onClick={handleAddLine} className="h-7 text-emerald-600 font-bold hover:bg-emerald-50 gap-1">
                  <Plus className="h-3 w-3" /> Ajouter une ligne
                </Button>
              </div>

              <div className="space-y-3">
                {lines.map((line, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row gap-3 bg-muted/20 p-3 rounded-xl border border-border relative">
                    <div className="flex-[2] space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Produit / Sous-produit</label>
                      <select 
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs outline-none" 
                        value={line.produit_dv ? `dv-${line.produit_dv}` : (line.produit ? `pr-${line.produit}` : "")}
                        onChange={e => {
                          const val = e.target.value;
                          if (!val) {
                            handleUpdateLine(idx, { produit: null, produit_dv: null, prix_unitaire: 0 });
                            return;
                          }
                          const [type, idStr] = val.split('-');
                          const id = Number(idStr);
                          const selected = productsAndSubProducts.find(p => (type === 'dv' ? p.is_deriv && p.id === id : !p.is_deriv && p.id === id));
                          
                          const price = selected?.price || 0;

                          if (type === 'dv') {
                            handleUpdateLine(idx, { 
                              produit_dv: id, 
                              produit: selected?.parent_id || null, 
                              prix_unitaire: Number(price)
                            });
                          } else {
                            handleUpdateLine(idx, { 
                              produit: id, 
                              produit_dv: null, 
                              prix_unitaire: Number(price)
                            });
                          }
                        }}
                      >
                        <option value="" disabled hidden>Choisir un item</option>
                        {Array.isArray(productsAndSubProducts) && productsAndSubProducts.map(p => (
                          <option key={`${p.is_deriv ? 'dv' : 'pr'}-${p.id}`} value={`${p.is_deriv ? 'dv' : 'pr'}-${p.id}`}>
                            {p.is_deriv ? `[Sous-produit] ${p.name} (de ${p.parent_name})` : `[Produit] ${p.name}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full md:w-20 space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Quantité</label>
                      <Input type="number" placeholder="Qté" className="h-8 text-xs bg-background" value={line.quantite} onChange={e => handleUpdateLine(idx, { quantite: Number(e.target.value) })} />
                    </div>
                    <div className="w-full md:w-28 space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Prix Vente</label>
                      <Input type="number" placeholder="Prix Vente" className="h-8 text-xs bg-background" value={line.prix_unitaire} onChange={e => handleUpdateLine(idx, { prix_unitaire: Number(e.target.value) })} />
                    </div>
                    <div className="w-full md:w-20 space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Remise</label>
                      <Input type="number" placeholder="Remise" className="h-8 text-xs bg-background" value={line.remise_applique} onChange={e => handleUpdateLine(idx, { remise_applique: Number(e.target.value) })} />
                    </div>
                    <div className="w-full md:w-32 flex items-center justify-end font-bold text-xs text-emerald-600">
                      {fmt(line.quantite * line.prix_unitaire - (line.remise_applique || 0))}
                    </div>
                    {lines.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveLine(idx)} className="md:absolute md:-right-2 md:-top-2 h-6 w-6 rounded-full bg-white border border-border text-red-500 shadow-sm"><Trash2 className="h-3 w-3" /></Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Total Transaction</p>
                  <p className="text-2xl font-bold text-emerald-700">{fmt(totalFormAmount)}</p>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="rounded-xl">Annuler</Button>
              <Button type="submit" disabled={createMut.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl min-w-[140px]">
                {createMut.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : "Valider la vente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sale Details Modal */}
      <Dialog open={!!selectedSale} onOpenChange={s => { if(!s) setSelectedSale(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Badge variant="outline" className="font-mono text-emerald-600 border-emerald-200 bg-emerald-50">{selectedSale?.numero_vente}</Badge>
              Détails de la vente
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-2xl border border-border text-sm">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Canal</p>
                <p className="font-bold">{selectedSale?.canal_vente}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Date</p>
                <p className="font-bold">{selectedSale && new Date(selectedSale.date_vente).toLocaleString("fr-FR")}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Vendeur</p>
                <p className="font-semibold">{selectedSale?.utilisateur_name || "Système"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Segment Client</p>
                <p className="font-semibold">{selectedSale?.segment_clientele}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Lignes de vente</h3>
              <div className="border border-border rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-2 font-bold">PRODUIT</th>
                      <th className="px-4 py-2 font-bold text-center">QTÉ</th>
                      <th className="px-4 py-2 font-bold text-right">PRIX UNIT.</th>
                      <th className="px-4 py-2 font-bold text-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedSale?.lignes?.map(l => (
                      <tr key={l.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-semibold">{l.produit_name}</td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-600">{l.quantite}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{fmt(l.prix_unitaire)}</td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums">{fmt(l.montant_ligne)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30 border-t border-border">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right font-bold text-muted-foreground uppercase">Net à Payer</td>
                      <td className="px-4 py-3 text-right font-bold text-lg text-emerald-700 tabular-nums">{fmt(selectedSale?.montant_total || 0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setSelectedSale(null)} variant="secondary" className="rounded-xl w-full">Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
