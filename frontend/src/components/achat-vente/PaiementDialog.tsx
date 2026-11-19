import { useId, useState } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { MODES_PAIEMENT } from "@/utils/paiements"

const fmt = (n: number) => new Intl.NumberFormat("fr-MG", { maximumFractionDigits: 0 }).format(n) + " Ar"

export interface PaiementSaisi {
  montant: number
  mode_paiement: string
  notes?: string
}

interface PaiementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Ex. « Enregistrer un paiement » */
  titre: string
  /** Référence du document concerné (n° de commande ou de vente). */
  reference: string
  total: number
  dejaPaye: number
  modeParDefaut: string
  enCours?: boolean
  onSubmit: (paiement: PaiementSaisi) => void
}

/**
 * Saisie d'UN versement sur un achat ou une vente (paiement partiel possible). Le montant ne peut
 * pas dépasser le reste à payer ; le serveur applique la même règle.
 */
export function PaiementDialog({
  open, onOpenChange, titre, reference, total, dejaPaye, modeParDefaut, enCours = false, onSubmit,
}: PaiementDialogProps) {
  const reste = Math.max(0, total - dejaPaye)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-black">{titre}</DialogTitle>
          <DialogDescription className="font-medium">
            {reference} — total {fmt(total)}, déjà payé {fmt(dejaPaye)}
          </DialogDescription>
        </DialogHeader>
        {/* Monté à chaque ouverture : le formulaire repart toujours propre, pré-rempli avec le solde */}
        <FormulairePaiement
          reste={reste} modeParDefaut={modeParDefaut} enCours={enCours}
          onSubmit={onSubmit} onAnnuler={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

interface FormulairePaiementProps {
  reste: number
  modeParDefaut: string
  enCours: boolean
  onSubmit: (paiement: PaiementSaisi) => void
  onAnnuler: () => void
}

function FormulairePaiement({ reste, modeParDefaut, enCours, onSubmit, onAnnuler }: FormulairePaiementProps) {
  const [montant, setMontant] = useState(() => (reste > 0 ? String(reste) : ""))
  const [mode, setMode] = useState(() => (MODES_PAIEMENT.includes(modeParDefaut) ? modeParDefaut : "Espèces"))
  const [notes, setNotes] = useState("")
  const ids = { montant: useId(), mode: useId(), notes: useId() }

  const valeur = Number(montant)
  let erreur: string | null = null
  if (montant !== "" && (!Number.isFinite(valeur) || valeur <= 0)) erreur = "Le montant doit être supérieur à 0."
  else if (valeur > reste) erreur = `Le montant dépasse le reste à payer (${fmt(reste)}).`
  const peutValider = montant !== "" && erreur === null && !enCours

  const valider = (e: React.FormEvent) => {
    e.preventDefault()
    if (!peutValider) return
    onSubmit({ montant: valeur, mode_paiement: mode, notes: notes.trim() || undefined })
  }

  return (
    <form onSubmit={valider} className="space-y-4 pt-2">
      <div className="rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3 flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">Reste à payer</span>
        <span className="text-lg font-black text-blue-700">{fmt(reste)}</span>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={ids.montant} className="text-[10px] font-black uppercase text-muted-foreground px-1">Montant versé (Ar)</label>
        <div className="flex gap-2">
          <Input
            id={ids.montant} type="number" step="any" min="0" value={montant}
            onChange={(e) => setMontant(e.target.value)} className="rounded-xl font-bold"
            aria-invalid={erreur !== null}
          />
          <Button type="button" variant="outline" className="rounded-xl font-bold" onClick={() => setMontant(String(reste))} disabled={reste <= 0}>
            Solder
          </Button>
        </div>
        {erreur && <p role="alert" className="text-xs font-bold text-red-600 px-1">{erreur}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor={ids.mode} className="text-[10px] font-black uppercase text-muted-foreground px-1">Mode de paiement</label>
        <select
          id={ids.mode} value={mode} onChange={(e) => setMode(e.target.value)}
          className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm font-bold outline-none"
        >
          {MODES_PAIEMENT.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={ids.notes} className="text-[10px] font-black uppercase text-muted-foreground px-1">Note (facultatif)</label>
        <Input id={ids.notes} value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl" placeholder="Ex. acompte, référence du virement…" />
      </div>

      <DialogFooter className="gap-2 sm:justify-end">
        <Button type="button" variant="ghost" className="rounded-xl font-bold" onClick={onAnnuler}>Annuler</Button>
        <Button type="submit" disabled={!peutValider} className="rounded-xl font-black px-8">
          {enCours ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Enregistrer le paiement"}
        </Button>
      </DialogFooter>
    </form>
  )
}
