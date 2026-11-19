/**
 * Mouvements de stock et annulations.
 *
 * Un achat ou une vente annulé(e) laisse DEUX mouvements : l'original (marqué « annulé ») et un
 * mouvement inverse, dit « d'annulation », qui pointe vers lui. Le backend expose le lien :
 *   - `annule`     : renseigné sur le mouvement d'annulation (id de l'original) ;
 *   - `annule_par` : renseigné sur l'original annulé (id du mouvement d'annulation).
 * Les deux restent affichés dans l'historique, mais ne comptent pas dans les flux réels.
 */

export interface MouvementAnnulable {
  movement_type?: string | null
  annule?: number | null
  annule_par?: number | null
}

const LIBELLES: Record<string, string> = {
  IN: "Entrée",
  OUT: "Sortie",
  ADJUSTMENT: "Ajustement",
  RETURN: "Retour",
  SCRAP: "Rebut",
}

/** Libellé français d'un type de mouvement (un type inconnu est conservé tel quel). */
export const libelleMouvement = (type?: string | null): string => (type ? LIBELLES[type] ?? type : "—")

/** Mouvement d'annulation (inverse) : il pointe vers le mouvement qu'il annule. */
export const estAnnulation = (m: MouvementAnnulable): boolean => m.annule != null

/** Mouvement d'origine qui a été annulé par un mouvement inverse. */
export const estAnnule = (m: MouvementAnnulable): boolean => m.annule_par != null

/** Mouvement qui compte réellement : ni annulé, ni mouvement d'annulation. */
export const estEffectif = (m: MouvementAnnulable): boolean => !estAnnulation(m) && !estAnnule(m)

/**
 * Nature de la transaction concernée. L'inverse d'un achat est une SORTIE de stock et l'inverse
 * d'une vente une ENTRÉE : on se fie donc au lien d'annulation, pas seulement au sens du mouvement.
 */
export function natureMouvement(m: MouvementAnnulable): "achat" | "vente" | null {
  if (m.movement_type === "IN") return estAnnulation(m) ? "vente" : "achat"
  if (m.movement_type === "OUT") return estAnnulation(m) ? "achat" : "vente"
  return null
}

export interface StatsMouvementsProduit {
  nbEntree: number
  nbSortie: number
  dernierMvt: string | null
  dateDernierMvt: string | null
}

interface MouvementPourStats extends MouvementAnnulable {
  produit?: number | null
  product?: number | null
  product_details?: { id?: number | null } | null
  quantity: number | string
  timestamp: string
}

/**
 * Statistiques par produit : quantités entrées / sorties et dernier mouvement.
 *  - les quantités ne comptent que les flux RÉELS (un achat annulé ne gonfle ni les entrées ni les
 *    sorties) ;
 *  - le « dernier mouvement » tient compte de TOUS les mouvements, annulations comprises : c'est
 *    bien le dernier événement physique sur le produit.
 */
export function statsMouvementsParProduit(
  mouvements: MouvementPourStats[],
): Record<number, StatsMouvementsProduit> {
  const stats: Record<number, StatsMouvementsProduit> = {}
  for (const mvt of mouvements) {
    const pid = mvt.produit ?? mvt.product ?? mvt.product_details?.id ?? null
    if (pid === null || pid === undefined) continue
    if (!stats[pid]) stats[pid] = { nbEntree: 0, nbSortie: 0, dernierMvt: null, dateDernierMvt: null }
    const s = stats[pid]
    if (estEffectif(mvt)) {
      if (mvt.movement_type === "IN" || mvt.movement_type === "RETURN") {
        s.nbEntree += Number(mvt.quantity) || 0
      } else if (mvt.movement_type === "OUT" || mvt.movement_type === "SCRAP") {
        s.nbSortie += Number(mvt.quantity) || 0
      }
    }
    if (!s.dateDernierMvt || mvt.timestamp > s.dateDernierMvt) {
      s.dernierMvt = mvt.movement_type ?? null
      s.dateDernierMvt = mvt.timestamp
    }
  }
  return stats
}
