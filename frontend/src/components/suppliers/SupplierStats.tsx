import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Eye, Edit } from "lucide-react"
import { FaTruck, FaCircle } from "react-icons/fa"
import { CalendarDays } from "lucide-react"
import { MetricCard } from "@/components/MetricCard"
import { Supplier } from "@/types/types"
import { SupplierLike } from "@/types/suppliers"

export const transformSupplier = (supplier: Supplier): SupplierLike => ({
  id: supplier.id,
  name: supplier.name,
  email: supplier.email,
  phone: supplier.phone ?? '',
  leadTime: supplier.lead_time ?? 0,
  minOrderQuantity: supplier.min_order_quantity ?? 0,
  maxOrderQuantity: supplier.max_order_quantity ?? 0,
  isActive: Boolean(supplier.is_active),
  createdAt: supplier.created_at
})

const isActive = (supplier: Supplier): boolean => supplier.is_active === true

const formatDateSafe = (date?: string) => {
  if (!date) return "—"
  const d = new Date(date)
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR")
}

interface SupplierStatsProps {
  suppliers: Supplier[]
  searchTerm: string
  selectedSupplier: string
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onViewSupplier: (supplier: Supplier) => void
  onEditSupplier: (supplier: Supplier) => void
}

export function SupplierStats({
  suppliers,
  searchTerm,
  selectedSupplier,
  onSearchChange,
  onStatusChange,
  onViewSupplier,
  onEditSupplier,
}: SupplierStatsProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [productFilter, setProductFilter] = useState("")
  const pageSize = 30

  const activeCount = suppliers.filter(isActive).length
  const avgLeadTime = suppliers.length > 0
    ? suppliers.reduce((sum, s) => sum + (s.lead_time ?? 0), 0) / suppliers.length
    : 0

  // ── Liste de tous les produits uniques pour le filtre ──────────────────────
  const allProducts = Array.from(
    new Map(
      suppliers
        .flatMap(s => s.products ?? [])
        .map(p => [p.id, p])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name))

  const filteredSuppliers = suppliers
    .filter(supplier => {
      if (selectedSupplier === 'active') return isActive(supplier)
      if (selectedSupplier === 'inactive') return !isActive(supplier)
      return true
    })
    .filter(supplier =>
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supplier.phone ?? '').includes(searchTerm)
    )
    // ── Filtre par produit ─────────────────────────────────────────────────
    .filter(supplier => {
      if (!productFilter || productFilter === 'all') return true
      return (supplier.products ?? []).some(p => String(p.id) === productFilter)
    })

  const totalPages = Math.ceil(filteredSuppliers.length / pageSize)
  const paginatedSuppliers = filteredSuppliers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-4">
        <MetricCard title="Fournisseurs totaux" value={suppliers.length} icon={<FaTruck />} />
        <MetricCard title="Fournisseurs actifs" value={activeCount} icon={<FaCircle />} variant="blue" />
        <MetricCard title="Délai moyen de livraison" value={`${avgLeadTime.toFixed(1)} jours`} icon={<CalendarDays />} variant="success" />
        <MetricCard title="Inactifs" value={suppliers.length - activeCount} icon={<FaCircle />} variant="destructive" />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Recherche de Fournisseur..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filtre statut */}
        <Select value={selectedSupplier} onValueChange={onStatusChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les fournisseurs</SelectItem>
            <SelectItem value="active">Fournisseurs actifs</SelectItem>
            <SelectItem value="inactive">Fournisseurs inactifs</SelectItem>
          </SelectContent>
        </Select>

        {/* Filtre produit */}
        <Select value={productFilter} onValueChange={(v) => { setProductFilter(v); setCurrentPage(1) }}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filtrer par produit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les produits</SelectItem>
            {allProducts.map(p => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name} {p.unite_mesure ? `(${p.unite_mesure})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Délai de livraison</TableHead>
                <TableHead>Plage de commandes</TableHead>
                <TableHead>Produits fournis</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Créé</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Aucun fournisseur trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{supplier.email}</div>
                        <div className="text-xs text-muted-foreground">{supplier.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>{supplier.lead_time ?? 0} jours</TableCell>
                    <TableCell>
                      {(supplier.min_order_quantity ?? 0).toLocaleString()} – {(supplier.max_order_quantity ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {(supplier.products ?? []).length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(supplier.products ?? []).slice(0, 3).map(p => (
                            <Badge key={p.id} variant="outline" className="text-xs">
                              {p.name}
                            </Badge>
                          ))}
                          {(supplier.products ?? []).length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{(supplier.products ?? []).length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isActive(supplier) ? "default" : "destructive"}>
                        {isActive(supplier) ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {supplier.created_at
                        ? new Date(supplier.created_at).toLocaleDateString("fr-FR")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => onViewSupplier(supplier)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onEditSupplier(supplier)}>
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2 py-4">
        <div className="text-sm text-muted-foreground">
          {filteredSuppliers.length === 0
            ? "Aucun fournisseur"
            : `Affichage de ${Math.min((currentPage - 1) * pageSize + 1, filteredSuppliers.length)} à ${Math.min(currentPage * pageSize, filteredSuppliers.length)} sur ${filteredSuppliers.length} fournisseurs`}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
            Précédent
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
            Suivant
          </Button>
        </div>
      </div>
    </div>
  )
}