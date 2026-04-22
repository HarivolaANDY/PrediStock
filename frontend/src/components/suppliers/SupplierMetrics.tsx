import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search } from "lucide-react"
import type { SupplierLike } from "@/types/suppliers"
import { useToast } from "@/hooks/use-toast"

interface SupplierMetricsProps {
  suppliers: SupplierLike[]
  search: string
  onSearch: (v: string) => void
}

interface Interaction {
  id: string
  supplierId: string
  type: "call" | "email" | "meeting"
  date: string
  note: string
}

const STORAGE_KEY = 'supplier-interactions'

export function SupplierMetrics({ suppliers, search, onSearch }: SupplierMetricsProps) {
  const { toast } = useToast()
  const [interactions, setInteractions] = useState<Interaction[]>(() => {
    // Charger les interactions depuis le localStorage
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Erreur lors du chargement des interactions:', e)
      }
    }
    // Si pas de données sauvegardées, créer des interactions initiales
    return suppliers.map((s, idx) => ({
      id: `${Date.now()}-${idx}`,
      supplierId: s.id,
      type: "email",
      date: s.createdAt,
      note: `Initial onboarding email with ${s.name}`,
    }))
  })

  // Sauvegarder les interactions dans localStorage quand elles changent
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(interactions))
  }, [interactions])

  const [newInteraction, setNewInteraction] = useState<Pick<Interaction, "supplierId" | "type" | "note">>({
    supplierId: suppliers[0]?.id ?? "",
    type: "call",
    note: "",
  })

  const safeString = (value?: string | null) => value ?? ""

const filtered = useMemo(() => {
  const term = safeString(search).toLowerCase()

  return suppliers.filter((s) => {
    return (
      safeString(s.name).toLowerCase().includes(term) ||
      safeString(s.email).toLowerCase().includes(term) ||
      safeString(s.phone).includes(search)
    )
  })
}, [suppliers, search])

  const filteredInteractions = useMemo(() => {
    const ids = new Set(filtered.map((s) => s.id))
    return interactions
      .filter((i) => ids.has(i.supplierId))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [interactions, filtered])

  useEffect(() => {
    if (!newInteraction.supplierId || !suppliers.some((s) => s.id === newInteraction.supplierId)) {
      setNewInteraction((ni) => ({ ...ni, supplierId: suppliers[0]?.id ?? "" }))
    }
  }, [suppliers, newInteraction.supplierId])

  const addInteraction = () => {
    if (!newInteraction.supplierId || !newInteraction.note.trim()) {
      toast({
        variant: "destructive",
        title: "Informations manquantes",
        description: "Sélectionnez un fournisseur et ajoutez une note.",
      })
      return
    }

    const newInteractionItem = {
      id: `${Date.now()}`,
      supplierId: newInteraction.supplierId,
      type: newInteraction.type,
      date: new Date().toISOString().split("T")[0],
      note: newInteraction.note.trim(),
    }

    setInteractions(prev => {
      const updated = [newInteractionItem, ...prev]
      return updated
    })

    setNewInteraction(prev => ({ ...prev, note: "" }))
    toast({
      title: "Interaction ajoutée",
      description: "Votre note a été enregistrée.",
    })
  }

  // Fonction pour supprimer une interaction
  const deleteInteraction = (id: string) => {
    setInteractions(prev => prev.filter(i => i.id !== id))
    toast({
      title: "Interaction supprimée",
      description: "L'interaction a été supprimée avec succès.",
    })
  }

  return (
    <div className="space-y-6">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher des fournisseurs pour les métriques..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Résumé des performances des fournisseurs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Délai de mise en oeuvre</TableHead>
                  <TableHead>Commande minimal</TableHead>
                  <TableHead>Commande maximal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Crée le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No suppliers match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.leadTime} days</TableCell>
                      <TableCell>
                        {s.minOrderQuantity != null ? s.minOrderQuantity.toLocaleString() : "-"}
                      </TableCell>
                      <TableCell>
                        {s.maxOrderQuantity != null ? s.maxOrderQuantity.toLocaleString() : "-"}
                      </TableCell>
                      <TableCell>{s.isActive ? "Active" : "Inactive"}</TableCell>
                      <TableCell>{s.createdAt}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supplier Interactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select
                value={newInteraction.supplierId}
                onValueChange={(v) => setNewInteraction((ni) => ({ ...ni, supplierId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={newInteraction.type}
                onValueChange={(v: Interaction["type"]) => setNewInteraction((ni) => ({ ...ni, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Note</Label>
              <Textarea
                placeholder="Add a brief note..."
                value={newInteraction.note}
                onChange={(e) => setNewInteraction((ni) => ({ ...ni, note: e.target.value }))}
              />
            </div>
          </div>
          <Button onClick={addInteraction} className="">Add Interaction</Button>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInteractions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No interactions yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInteractions.map((i) => {
                    const supplier = suppliers.find((s) => s.id === i.supplierId)
                    return (
                      <TableRow key={i.id}>
                        <TableCell>{i.date}</TableCell>
                        <TableCell>{supplier?.name ?? "Unknown"}</TableCell>
                        <TableCell className="capitalize">{i.type}</TableCell>
                        <TableCell className="max-w-[400px] whitespace-pre-wrap">{i.note}</TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
