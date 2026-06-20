import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { getAnalytics, getBonCommandes, getDonneeVentes, getRemboursements } from "@/services/achatVenteService"
import { BarChart2, ShoppingCart, DollarSign, TrendingUp, RefreshCw, AlertCircle, Calendar, Search, RotateCcw } from "lucide-react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import type { BonCommande, DonneeVente, Remboursement } from "@/types/achatVente"

function fmt(n: number) {
  return new Intl.NumberFormat("fr-MG", { maximumFractionDigits: 0 }).format(n) + " Ar"
}

function buildComparison(
  commandes: BonCommande[],
  ventes: DonneeVente[],
  rembs: Remboursement[],
  groupBy: 'day' | 'month'
) {
  const map: Record<string, { date: string; fullDate: string; achats: number; ventes: number; remboursements: number; products: string[] }> = {}

  commandes.forEach(c => {
    if (!c.creer_le) return
    try {
      const d = new Date(c.creer_le)
      const k = groupBy === 'day' 
        ? d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
        : d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })
      
      const sortKey = groupBy === 'day'
        ? d.toISOString().split('T')[0]
        : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`

      if (!map[sortKey]) map[sortKey] = { date: k, fullDate: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }), achats: 0, ventes: 0, remboursements: 0, products: [] }
      map[sortKey].achats += Number(c.montant_total || 0)
      
      c.lignes?.forEach(l => {
        if (l.product_name && !map[sortKey].products.includes(l.product_name)) {
          map[sortKey].products.push(l.product_name)
        }
      })
    } catch (e) { console.error("Date error", e) }
  })

  ventes.forEach(v => {
    if (!v.date_vente) return
    try {
      const d = new Date(v.date_vente)
      const k = groupBy === 'day' 
        ? d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
        : d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })

      const sortKey = groupBy === 'day'
        ? d.toISOString().split('T')[0]
        : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`

      if (!map[sortKey]) map[sortKey] = { date: k, fullDate: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }), achats: 0, ventes: 0, remboursements: 0, products: [] }
      map[sortKey].ventes += Number(v.montant_total || 0)

      v.lignes?.forEach(l => {
        if (l.produit_name && !map[sortKey].products.includes(l.produit_name)) {
          map[sortKey].products.push(l.produit_name)
        }
      })
    } catch (e) { console.error("Date error", e) }
  })

  rembs.forEach(r => {
     if (!r.date_remboursement) return
     try {
       const d = new Date(r.date_remboursement)
       const k = groupBy === 'day' 
         ? d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
         : d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })

       const sortKey = groupBy === 'day'
         ? d.toISOString().split('T')[0]
         : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`

       if (!map[sortKey]) map[sortKey] = { date: k, fullDate: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }), achats: 0, ventes: 0, remboursements: 0, products: [] }
       map[sortKey].remboursements += Number(r.montant || 0)
     } catch (e) { console.error("Date error", e) }
  })

  return Object.entries(map)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(entry => entry[1])
}

export default function AnalysePage() {
  const { isLoading: loadA, error: errA, refetch } = useQuery({
    queryKey: ["analytics"],
    queryFn: getAnalytics,
  })
  const { data: commandes = [] } = useQuery({ queryKey: ["bon-commandes"], queryFn: () => getBonCommandes() })
  const { data: ventes = [] }    = useQuery({ queryKey: ["donnee-ventes"],  queryFn: () => getDonneeVentes() })
  const { data: remboursements = [] } = useQuery({ queryKey: ["remboursements"], queryFn: () => getRemboursements() })

  const [dateDebut, setDateDebut] = useState<string>("")
  const [dateFin, setDateFin] = useState<string>("")
  const [typeFlux, setTypeFlux] = useState<"tous" | "achats" | "ventes" | "remboursements">("tous")
  const [rechercheProduit, setRechercheProduit] = useState<string>("")

  const commandsFiltrees = useMemo(() => {
    return commandes.filter(c => {
      if (c.status !== "Livré") return false;
      if (typeFlux === "ventes") return false;
      if (dateDebut && new Date(c.creer_le) < new Date(dateDebut)) return false;
      if (dateFin && new Date(c.creer_le) > new Date(dateFin + "T23:59:59")) return false;
      if (rechercheProduit) {
        return c.lignes?.some(l => l.product_name?.toLowerCase().includes(rechercheProduit.toLowerCase()));
      }
      return true;
    });
  }, [commandes, typeFlux, dateDebut, dateFin, rechercheProduit]);

  const salesFiltrees = useMemo(() => {
    return ventes.filter(v => {
      if (v.status !== "Livré") return false;
      if (typeFlux === "achats") return false;
      if (dateDebut && new Date(v.date_vente) < new Date(dateDebut)) return false;
      if (dateFin && new Date(v.date_vente) > new Date(dateFin + "T23:59:59")) return false;
      if (rechercheProduit) {
        return v.lignes?.some(l => l.produit_name?.toLowerCase().includes(rechercheProduit.toLowerCase()));
      }
      return true;
    });
  }, [ventes, typeFlux, dateDebut, dateFin, rechercheProduit]);

  const rembsFiltrees = useMemo(() => {
    return remboursements.filter(r => {
      // Pour les calculs de metrics, "réglé" est exclu, mais pour le flux temporel (graph), on garde tout ou on filtre ?
      // L'utilisateur dit : "si le remboursement est réglé... alors il n'est plus pris en compte dans les calculs"
      // Ça s'applique surtout aux metric cards. Pour le graph d'analyse, c'est mieux de montrer l'historique.
      if (typeFlux !== "tous" && typeFlux !== "remboursements") return false;
      if (dateDebut && new Date(r.date_remboursement) < new Date(dateDebut)) return false;
      if (dateFin && new Date(r.date_remboursement) > new Date(dateFin + "T23:59:59")) return false;
      return true;
    })
  }, [remboursements, typeFlux, dateDebut, dateFin])

  const groupBy = useMemo(() => {
    if (dateDebut && dateFin) {
      const diffTime = Math.abs(new Date(dateFin).getTime() - new Date(dateDebut).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      if (diffDays <= 31) return 'day';
    }
    return 'month';
  }, [dateDebut, dateFin]);

  const chartData = useMemo(() => buildComparison(commandsFiltrees, salesFiltrees, rembsFiltrees, groupBy), [commandsFiltrees, salesFiltrees, rembsFiltrees, groupBy]);

  const analytics = useMemo(() => {
    const totalAchats = commandsFiltrees.reduce((acc, c) => acc + Number(c.montant_total || 0), 0);
    const totalVentes = salesFiltrees.reduce((acc, v) => acc + Number(v.montant_total || 0), 0);
    
    // Pour les metrics cards de remboursement, on ne prend que ceux NON RÉGLÉS
    const pendingRembs = rembsFiltrees.filter(r => r.statut_reglement !== "Réglé");
    const aEncaisser = pendingRembs.filter(r => r.source_type === "Achat").reduce((s, r) => s + Number(r.montant), 0);
    const aRembourser = pendingRembs.filter(r => r.source_type === "Vente").reduce((s, r) => s + Number(r.montant), 0);
    const totalRembsPending = aEncaisser + aRembourser;

    const margin = totalVentes - totalAchats - aRembourser;
    
    return {
      total_purchases: totalAchats,
      total_sales: totalVentes,
      total_rembs: totalRembsPending,
      a_encaisser: aEncaisser,
      a_rembourser: aRembourser,
      margin: margin,
      purchase_count: commandsFiltrees.length,
      sale_count: salesFiltrees.length,
      remb_count: pendingRembs.length
    }
  }, [commandsFiltrees, salesFiltrees, rembsFiltrees]);

  const marginPositive = analytics.margin >= 0

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-200">
            <BarChart2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analyse Financière</h1>
            <p className="text-sm text-muted-foreground font-medium">Flux, profitabilité et retours</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loadA ? 'animate-spin' : ''}`} /> Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm hover:border-violet-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Achats</p>
            <div className="p-1.5 rounded-lg bg-muted text-blue-600"><ShoppingCart className="h-4 w-4" /></div>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-xl font-bold text-blue-600">{fmt(analytics.total_purchases)}</span>
            <span className="text-[10px] text-muted-foreground mb-1 font-medium italic">{analytics.purchase_count} cmd</span>
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm hover:border-violet-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Ventes</p>
            <div className="p-1.5 rounded-lg bg-muted text-emerald-600"><DollarSign className="h-4 w-4" /></div>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-xl font-bold text-emerald-600">{fmt(analytics.total_sales)}</span>
            <span className="text-[10px] text-muted-foreground mb-1 font-medium italic">{analytics.sale_count} vnt</span>
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm hover:border-violet-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Remboursements</p>
            <div className="p-1.5 rounded-lg bg-muted text-orange-600"><RotateCcw className="h-4 w-4" /></div>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-xl font-bold text-orange-600">{fmt(analytics.total_rembs)}</span>
            <span className="text-[10px] text-muted-foreground mb-1 font-medium italic">En cours</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
            <div>
              <p className="text-[8px] font-bold text-muted-foreground uppercase">À encaisser</p>
              <p className="text-[10px] font-black text-emerald-600">{fmt(analytics.a_encaisser)}</p>
            </div>
            <div>
              <p className="text-[8px] font-bold text-muted-foreground uppercase">À rembourser</p>
              <p className="text-[10px] font-black text-red-600">{fmt(analytics.a_rembourser)}</p>
            </div>
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm hover:border-violet-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Marges (est.)</p>
            <div className={`p-1.5 rounded-lg bg-muted ${marginPositive ? 'text-violet-600' : 'text-red-600'}`}><TrendingUp className="h-4 w-4" /></div>
          </div>
          <div className="flex items-end gap-2">
            <span className={`text-xl font-bold ${marginPositive ? 'text-violet-600' : 'text-red-600'}`}>{fmt(analytics.margin)}</span>
            <span className="text-[10px] text-muted-foreground mb-1 font-medium italic">{marginPositive ? "Profit ↑" : "Déficit ↓"}</span>
          </div>
        </div>
      </div>

      <div className="bg-card p-4 rounded-2xl border border-border shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <label className="text-xs font-semibold text-muted-foreground uppercase">Rechercher un produit</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Nom du produit..." className="pl-9" value={rechercheProduit} onChange={(e) => setRechercheProduit(e.target.value)} />
          </div>
        </div>
        
        <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
          <label className="text-xs font-semibold text-muted-foreground uppercase">Type de flux</label>
          <Select value={typeFlux} onValueChange={(val: any) => setTypeFlux(val)}>
            <SelectTrigger><SelectValue placeholder="Tous les flux" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les flux</SelectItem>
              <SelectItem value="achats">Achats</SelectItem>
              <SelectItem value="ventes">Ventes</SelectItem>
              <SelectItem value="remboursements">Retours</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
          <label className="text-xs font-semibold text-muted-foreground uppercase">Date de début</label>
          <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
          <label className="text-xs font-semibold text-muted-foreground uppercase">Date de fin</label>
          <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
        </div>
        
        <Button variant="ghost" onClick={() => { setDateDebut(""); setDateFin(""); setTypeFlux("tous"); setRechercheProduit(""); }} className="text-muted-foreground hover:text-foreground">Réinitialiser</Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-violet-600" /> Flux de trésorerie consolidé</h2>
            <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1 tracking-tighter">Comparatif temporel ({groupBy === 'day' ? 'par jour' : 'par mois'})</p>
          </div>
          <div className="flex items-center gap-3 bg-muted/50 p-1.5 rounded-xl border border-border">
            {typeFlux !== "ventes" && typeFlux !== "remboursements" && (
              <div className="flex items-center gap-1.5 px-2 py-1 text-[9px] font-black"><div className="h-2 w-2 rounded-full bg-blue-500" /> ACHATS</div>
            )}
            {typeFlux !== "achats" && typeFlux !== "remboursements" && (
              <div className="flex items-center gap-1.5 px-2 py-1 text-[9px] font-black"><div className="h-2 w-2 rounded-full bg-emerald-500" /> VENTES</div>
            )}
            {(typeFlux === "tous" || typeFlux === "remboursements") && (
              <div className="flex items-center gap-1.5 px-2 py-1 text-[9px] font-black"><div className="h-2 w-2 rounded-full bg-orange-500" /> RETOURS</div>
            )}
          </div>
        </div>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gAchats" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} /><stop offset="95%" stopColor="#2563eb" stopOpacity={0} /></linearGradient>
                <linearGradient id="gVentes" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#059669" stopOpacity={0.3} /><stop offset="95%" stopColor="#059669" stopOpacity={0} /></linearGradient>
                <linearGradient id="gRembs" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.3} /><stop offset="95%" stopColor="#f97316" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white border border-border p-4 rounded-3xl shadow-2xl space-y-3 min-w-[220px]">
                        <p className="text-[10px] font-black text-muted-foreground uppercase">{data.fullDate}</p>
                        <div className="space-y-2">
                          {payload.map((p: any) => (
                            <div key={p.name} className="flex items-center justify-between gap-4">
                              <span className="text-xs font-bold flex items-center gap-1.5 uppercase">
                                <div className={`h-1.5 w-1.5 rounded-full ${p.name === 'achats' ? 'bg-blue-500' : p.name === 'ventes' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                                {p.name}
                              </span>
                              <span className={`text-xs font-black ${p.name === 'achats' ? 'text-blue-600' : p.name === 'ventes' ? 'text-emerald-600' : 'text-orange-600'}`}>{fmt(Number(p.value))}</span>
                            </div>
                          ))}
                        </div>
                        {data.products && data.products.length > 0 && (
                          <div className="pt-2 border-t border-border">
                            <p className="text-[8px] font-bold text-muted-foreground uppercase mb-1">Produits impliqués</p>
                            <div className="flex flex-wrap gap-1">
                              {data.products.slice(0, 5).map((pn: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-[8px] py-0 px-1 font-medium">{pn}</Badge>
                              ))}
                              {data.products.length > 5 && <span className="text-[8px] text-muted-foreground">+{data.products.length - 5} de plus</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {(typeFlux === "tous" || typeFlux === "achats") && <Area type="monotone" dataKey="achats" stroke="#2563eb" strokeWidth={3} fill="url(#gAchats)" />}
              {(typeFlux === "tous" || typeFlux === "ventes") && <Area type="monotone" dataKey="ventes" stroke="#059669" strokeWidth={3} fill="url(#gVentes)" />}
              {(typeFlux === "tous" || typeFlux === "remboursements") && <Area type="monotone" dataKey="remboursements" stroke="#f97316" strokeWidth={3} fill="url(#gRembs)" />}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[350px] flex flex-col items-center justify-center text-muted-foreground bg-muted/10 rounded-3xl border-2 border-dashed border-border opacity-50">
            <p className="font-bold uppercase text-[10px] tracking-widest">Aucune donnée graphable</p>
          </div>
        )}
      </div>
    </div>
  )
}
