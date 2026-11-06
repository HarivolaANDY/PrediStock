import type { ComponentProps } from "react"
import { Badge } from "@/components/ui/badge"
import { estAnnule, estAnnulation, libelleMouvement, type MouvementAnnulable } from "@/utils/mouvements"

interface MouvementBadgeProps {
  mouvement: MouvementAnnulable
  /** Couleur du badge d'un mouvement ordinaire (celle de la page appelante). */
  variant?: ComponentProps<typeof Badge>["variant"]
}

/**
 * Type d'un mouvement de stock. Un mouvement d'annulation est présenté comme tel (« Annulation ·
 * Sortie ») plutôt que comme une simple sortie ; un mouvement annulé est repéré par une marque.
 */
export function MouvementBadge({ mouvement, variant }: MouvementBadgeProps) {
  if (estAnnulation(mouvement)) {
    return <Badge variant="warning">Annulation · {libelleMouvement(mouvement.movement_type)}</Badge>
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge variant={variant}>{libelleMouvement(mouvement.movement_type)}</Badge>
      {estAnnule(mouvement) && (
        <span className="text-[10px] font-bold uppercase text-slate-500 border border-slate-200 bg-slate-100 rounded-full px-1.5 py-0.5">
          Annulé
        </span>
      )}
    </span>
  )
}
