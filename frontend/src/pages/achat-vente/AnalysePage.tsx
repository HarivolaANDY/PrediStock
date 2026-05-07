import { useQuery } from "@tanstack/react-query"
import { getAnalytics, getBonCommandes, getDonneeVentes } from "@/services/achatVenteService"
import { BarChart2, ShoppingCart, DollarSign, TrendingUp, RefreshCw, AlertCircle, Calendar } from "lucide-react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts"
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent"
import { Button } from "@/components/ui/button"

function fmt(n: number) {
  return new Intl.NumberFormat("fr-MG", { maximumFractionDigits: 0 }).format(n) + " Ar"
}

function buildComparison(
  commandes: Array<{ creer_le: string; montant_total: number }>,
  ventes: Array<{ date_vente: string; montant_total: string | number }>
) {
  const map: Record<string, { mois: string; achats: number; ventes: number }> = {}

  commandes.forEach(c => {
    if (!c.creer_le) return
    try {
      const k = new Date(c.creer_le).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })
      if (!map[k]) map[k] = { mois: k, achats: 0, ventes: 0 }
      map[k].achats += Number(c.montant_total || 0)
    } catch (e) { console.error("Date error", e) }
  })
  ventes.forEach(v => {
    if (!v.date_vente) return
    try {
      const k = new Date(v.date_vente).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })
      if (!map[k]) map[k] = { mois: k, achats: 0, ventes: 0 }
      map[k].ventes += Number(v.montant_total || 0)
    } catch (e) { console.error("Date error", e) }
  })

  return Object.values(map).slice(-12)
}

export default function AnalysePage() {
  const { data: analytics, isLoading: loadA, error: errA, refetch } = useQuery({
    queryKey: ["analytics"],
    queryFn: getAnalytics,
  })
  const { data: commandes = [] } = useQuery({ queryKey: ["bon-commandes"], queryFn: () => getBonCommandes() })
  const { data: ventes = [] }    = useQuery({ queryKey: ["donnee-ventes"],  queryFn: () => getDonneeVentes() })

  const chartData = buildComparison(commandes, ventes)
  const marginPositive = (analytics?.margin ?? 0) >= 0

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-200">
            <BarChart2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analyse Financière</h1>
            <p className="text-sm text-muted-foreground font-medium">Comparatif des flux et rentabilité</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loadA ? 'animate-spin' : ''}`} /> Actualiser
        </Button>
      </div>

      {/* Error */}
      {errA && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Impossible de charger les données analytiques. Veuillez vérifier votre connexion.
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Achats", value: loadA ? "…" : fmt(analytics?.total_purchases ?? 0), sub: `${analytics?.purchase_count ?? 0} commandes`, color: "text-blue-600", icon: <ShoppingCart className="h-4 w-4" /> },
          { label: "Total Ventes", value: loadA ? "…" : fmt(analytics?.total_sales ?? 0), sub: `${analytics?.sale_count ?? 0} ventes`, color: "text-emerald-600", icon: <DollarSign className="h-4 w-4" /> },
          { label: "Marge Brute", value: loadA ? "…" : fmt(analytics?.margin ?? 0), sub: marginPositive ? "Rentabilité positive ↑" : "Déficit estimé ↓", color: marginPositive ? "text-violet-600" : "text-red-600", icon: <TrendingUp className="h-4 w-4" /> },
        ].map((k, i) => (
          <div key={i} className="bg-card p-5 rounded-2xl border border-border shadow-sm hover:border-violet-200 transition-all">
            <div className="flex items-center justify-between mb-2">
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

      {/* Area Chart */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-violet-600" /> Flux de trésorerie
            </h2>
            <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1 tracking-tighter">Comparaison Achats vs Ventes (12 mois)</p>
          </div>
          <div className="flex items-center gap-3 bg-muted/50 p-1 rounded-lg border border-border">
            <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold">
              <div className="h-2 w-2 rounded-full bg-blue-500" /> ACHATS
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold">
              <div className="h-2 w-2 rounded-full bg-emerald-500" /> VENTES
            </div>
          </div>
        </div>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gAchats" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gVentes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                formatter={(v: ValueType | undefined, name: NameType | undefined) => [fmt(Number(v)), name === "achats" ? "Achats" : "Ventes"]}
                contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Area type="monotone" dataKey="achats" stroke="#2563eb" strokeWidth={3} fill="url(#gAchats)" animationDuration={1500} />
              <Area type="monotone" dataKey="ventes" stroke="#059669" strokeWidth={3} fill="url(#gVentes)" animationDuration={1500} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
            <Calendar className="h-10 w-10 mb-2 opacity-20" />
            <p className="font-medium text-sm">Données insuffisantes pour le graphique</p>
          </div>
        )}
      </div>
    </div>
  )
}
