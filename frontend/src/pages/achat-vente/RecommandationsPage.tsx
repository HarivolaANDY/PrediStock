import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getRecommandations, applyRecommandation } from "@/services/achatVenteService"
import type { RecommandationPriority } from "@/types/achatVente"
import { Sparkles, RefreshCw, CheckCircle2, Filter, Package, TrendingUp } from "lucide-react"
import { toast } from "sonner"

const PRIORITY_CONFIG: Record<RecommandationPriority, { label: string; color: string; dot: string }> = {
  HAUTE:   { label: "Haute",   color: "bg-red-100 text-red-700 border-red-200",      dot: "bg-red-500" },
  MOYENNE: { label: "Moyenne", color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  BASSE:   { label: "Basse",   color: "bg-blue-100 text-blue-700 border-blue-200",   dot: "bg-blue-500" },
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-MG", { maximumFractionDigits: 0 }).format(n) + " Ar"
}

export default function RecommandationsPage() {
  const qc = useQueryClient()
  const [priorityFilter, setPriorityFilter] = useState<RecommandationPriority | "">("")

  const { data: recs = [], isLoading, refetch } = useQuery({
    queryKey: ["recommandations", priorityFilter],
    queryFn: () => getRecommandations(priorityFilter ? { priority: priorityFilter } : undefined),
  })

  const applyMut = useMutation({
    mutationFn: applyRecommandation,
    onSuccess: () => {
      toast.success("Recommandation appliquée !")
      qc.invalidateQueries({ queryKey: ["recommandations"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const applied   = recs.filter(r => r.est_applique).length
  const pending   = recs.filter(r => !r.est_applique).length
  const highPrio  = recs.filter(r => r.priority === "HAUTE" && !r.est_applique).length

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Recommandations IA</h1>
            <p className="text-sm text-muted-foreground">Suggestions d'approvisionnement générées par l'IA</p>
          </div>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent transition-colors">
          <RefreshCw className="h-4 w-4" /> Actualiser
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "En attente", value: pending,  color: "text-amber-600" },
          { label: "Appliquées", value: applied,  color: "text-emerald-600" },
          { label: "Urgentes",   value: highPrio, color: "text-red-600" },
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className={`mt-1 text-xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Priority filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <button
          onClick={() => setPriorityFilter("")}
          className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${!priorityFilter ? "bg-purple-600 text-white border-purple-600" : "border-border hover:bg-accent"}`}
        >
          Toutes
        </button>
        {(["HAUTE", "MOYENNE", "BASSE"] as RecommandationPriority[]).map(p => (
          <button
            key={p}
            onClick={() => setPriorityFilter(priorityFilter === p ? "" : p)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${priorityFilter === p ? "bg-purple-600 text-white border-purple-600" : "border-border hover:bg-accent"}`}
          >
            {PRIORITY_CONFIG[p].label}
          </button>
        ))}
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground"><RefreshCw className="h-5 w-5 animate-spin mr-2" />Chargement…</div>
      ) : recs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Sparkles className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">Aucune recommandation disponible</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {recs.map(r => {
            const p = PRIORITY_CONFIG[r.priority] ?? PRIORITY_CONFIG.MOYENNE
            return (
              <div
                key={r.id}
                className={`rounded-xl border bg-card p-5 shadow-sm flex flex-col gap-3 transition-all ${r.est_applique ? "opacity-60" : "hover:shadow-md"}`}
              >
                {/* Priority + product */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${p.dot}`} />
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${p.color}`}>{p.label}</span>
                  </div>
                  {r.est_applique && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-xs font-medium">
                      <CheckCircle2 className="h-3 w-3" /> Appliquée
                    </span>
                  )}
                </div>

                {/* Product name */}
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-semibold text-sm">{r.product_details?.name ?? `Produit #${r.product}`}</span>
                </div>

                {/* Stock actuel */}
                {r.product_details && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Stock actuel : <span className="font-medium text-foreground">{r.product_details.current_stock}</span>
                  </div>
                )}

                {/* Raisonnement */}
                {r.raisonnement && (
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{r.raisonnement}</p>
                )}

                {/* Details row */}
                <div className="flex gap-3 text-xs">
                  <div className="flex-1 rounded-lg bg-muted px-3 py-2">
                    <p className="text-muted-foreground">Qté suggérée</p>
                    <p className="font-semibold mt-0.5">{r.quantite_suggeree}</p>
                  </div>
                  <div className="flex-1 rounded-lg bg-muted px-3 py-2">
                    <p className="text-muted-foreground">Prix estimé</p>
                    <p className="font-semibold mt-0.5">{fmt(r.prix_estime)}</p>
                  </div>
                </div>

                {/* Apply button */}
                {!r.est_applique && (
                  <button
                    onClick={() => applyMut.mutate(r.id)}
                    disabled={applyMut.isPending}
                    className="mt-auto w-full rounded-lg bg-purple-600 px-4 py-2 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
                  >
                    {applyMut.isPending ? "Traitement…" : "✓ Appliquer"}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
