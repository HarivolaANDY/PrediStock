import { useQuery } from "@tanstack/react-query"
import { getRetours } from "@/services/achatVenteService"
import { RotateCcw, RefreshCw, CheckCircle2, XCircle } from "lucide-react"

export default function RetoursPage() {
  const { data: retours = [], isLoading, refetch } = useQuery({
    queryKey: ["retours"],
    queryFn: getRetours,
  })

  const total       = retours.length
  const restockable = retours.filter(r => r.est_reapprovisionnnable).length

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500">
            <RotateCcw className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Retours</h1>
            <p className="text-sm text-muted-foreground">Produits retournés et leur statut</p>
          </div>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent transition-colors">
          <RefreshCw className="h-4 w-4" /> Actualiser
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total retours", value: total, color: "text-foreground" },
          { label: "Restockables",  value: restockable,         color: "text-emerald-600" },
          { label: "Non restockables", value: total - restockable, color: "text-red-600" },
          { label: "Taux restockage", value: total ? `${Math.round((restockable / total) * 100)} %` : "—", color: "text-blue-600" },
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className={`mt-1 text-xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground"><RefreshCw className="h-5 w-5 animate-spin mr-2" />Chargement…</div>
        ) : retours.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <RotateCcw className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Aucun retour enregistré</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  {["Produit", "Quantité", "Raison", "Condition", "Remise", "Restockable", "Date"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {retours.map(r => (
                  <tr
                    key={r.id}
                    className={`transition-colors ${r.est_reapprovisionnnable ? "hover:bg-emerald-50/40" : "hover:bg-red-50/40"}`}
                  >
                    <td className="px-4 py-3 font-medium">{r.produit_name ?? `Produit #${r.produit}`}</td>
                    <td className="px-4 py-3">{r.quantite_retourner}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{r.raison_retour || "—"}</td>
                    <td className="px-4 py-3">
                      {r.condition_retour ? (
                        <span className="rounded-full border px-2 py-0.5 text-xs font-medium bg-muted">{r.condition_retour}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.montant_remise != null ? `${r.montant_remise} Ar` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {r.est_reapprovisionnnable ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-xs font-medium">
                          <CheckCircle2 className="h-3 w-3" /> Oui
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 text-xs font-medium">
                          <XCircle className="h-3 w-3" /> Non
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(r.date_retour).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
