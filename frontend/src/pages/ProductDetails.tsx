import { useEffect, useState, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Package, Edit, Trash2, ChevronDown, Share, Heart, Package2, BarChart3, Eye, ArrowUpRight, ImageOff, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProductForm } from "@/components/ProductForm"
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal"
import { useSettings } from "@/hooks/useSettings"
import { useProducts } from "@/hooks/useProducts"
import API from "@/services/axios"
import { PDVData } from '@/types/types'
import { saveProduct } from "@/components/productApi"
import { toast } from '@/components/ui/use-toast'

// ── Types ─────────────────────────────────────────────────────────────────────
type Product = {
  id: number
  name: string
  category: number | null
  price: string | number
  current_stock: number
  stock_threshold: number
  product_img: string
  description: string
  sku?: string
  supplier?: number | null
  est_perissable?: boolean
  unite_mesure?: string
  extra_images?: string[]
  unassigned_stock?: number
  theorical_capacity?: number
  theorical_unit?: string
}

interface PDV {
  id: number
  designation: string
  quantite: number
  nombre: number
}

// ── Statut stock ──────────────────────────────────────────────────────────────
export function getStockStatus(
  current_stock: number,
  stock_threshold: number
): "rupture" | "critique" | "stock_faible" | "en_stock" {
  if (current_stock === 0) return "rupture"
  if (stock_threshold <= 0) return "en_stock"
  const ratio = current_stock / stock_threshold
  if (ratio <= 0.25) return "critique"
  if (ratio <= 0.50) return "stock_faible"
  return "en_stock"
}

function getStatusBadge(status: "en_stock" | "rupture" | "critique" | "stock_faible") {
  switch (status) {
    case "en_stock":
      return (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="bg-green-50 text-green-700 text-sm font-medium px-3 py-1.5 rounded-full border border-green-200">En stock</span>
        </div>
      )
    case "rupture":
      return (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-400 rounded-full" />
          <span className="bg-red-50 text-red-700 text-sm font-medium px-3 py-1.5 rounded-full border border-red-200">Rupture de stock</span>
        </div>
      )
    case "critique":
      return (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-orange-400 rounded-full" />
          <span className="bg-orange-50 text-orange-700 text-sm font-medium px-3 py-1.5 rounded-full border border-orange-200">Critique</span>
        </div>
      )
    case "stock_faible":
      return (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-400 rounded-full" />
          <span className="bg-yellow-50 text-yellow-700 text-sm font-medium px-3 py-1.5 rounded-full border border-yellow-200">Stock faible</span>
        </div>
      )
  }
}

// ── Galerie ───────────────────────────────────────────────────────────────────
function ImageGallery({ images, productName }: { images: string[]; productName: string }) {
  const [current, setCurrent] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const [direction, setDirection] = useState<"left" | "right" | null>(null)
  const [animating, setAnimating] = useState(false)

  const goTo = (index: number, dir: "left" | "right") => {
    if (animating) return
    setDirection(dir)
    setAnimating(true)
    setTimeout(() => {
      setCurrent(index)
      setAnimating(false)
      setDirection(null)
    }, 250)
  }

  const prev = () => goTo((current - 1 + images.length) % images.length, "right")
  const next = () => goTo((current + 1) % images.length, "left")

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-gray-50 rounded-2xl flex flex-col items-center justify-center gap-3 text-gray-300 border border-gray-100">
        <ImageOff className="w-16 h-16" />
        <span className="text-sm">Aucune image disponible</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <style>{`
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(-40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Image principale */}
      <div className="relative aspect-square bg-gray-50 rounded-2xl overflow-hidden group shadow-lg">
        <img
          key={current}
          src={images[current]}
          alt={`${productName} ${current + 1}`}
          style={{
            animation: animating
              ? `${direction === "left" ? "slideInLeft" : "slideInRight"} 0.25s ease-out`
              : "none"
          }}
          className="w-full h-full object-cover cursor-zoom-in group-hover:scale-105 transition-transform duration-700"
          onClick={() => setZoomed(true)}
        />

        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev() }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white hover:scale-110 active:scale-95"
            >
              <ChevronLeft className="h-5 w-5 text-gray-700" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white hover:scale-110 active:scale-95"
            >
              <ChevronRight className="h-5 w-5 text-gray-700" />
            </button>
          </>
        )}

        {images.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i, i > current ? "left" : "right")}
                className={`rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-6 h-2 bg-white shadow"
                    : "w-2 h-2 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        )}

        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
            🔍 Zoom
          </span>
        </div>
      </div>

      {/* Miniatures */}
      {images.length > 1 && (
        <div className={`grid gap-2 ${images.length === 2 ? 'grid-cols-2' : images.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
          {images.map((img, index) => (
            <button
              key={index}
              onClick={() => goTo(index, index > current ? "left" : "right")}
              className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                current === index
                  ? "border-blue-500 ring-2 ring-blue-200 scale-105 shadow-md"
                  : "border-gray-200 hover:border-blue-300 opacity-60 hover:opacity-100"
              }`}
            >
              <img src={img} alt={`Miniature ${index + 1}`} className="w-full h-full object-cover" />
              {current === index && (
                <div className="absolute inset-0 bg-blue-500/10" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Modal zoom plein écran */}
      {zoomed && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setZoomed(false)}
        >
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev() }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-all z-10"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next() }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-all z-10"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <img
            src={images[current]}
            alt={productName}
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/20 text-white text-sm px-4 py-2 rounded-full backdrop-blur-sm">
            {current + 1} / {images.length}
          </div>

          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-all"
            onClick={() => setZoomed(false)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function ProductDetails() {
  const navigate = useNavigate()  // ← AJOUTÉ : hook useNavigate
  const { settings } = useSettings()
  const { products, loading, refetch } = useProducts()

  // ✅ State local pour le produit chargé directement par ID (évite le pb de pagination)
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null)

  const [allImages, setAllImages] = useState<string[]>([])
  const [isLiked, setIsLiked] = useState(false)
  const [showOtherProducts, setShowOtherProducts] = useState(false)
  const [showPDVList, setShowPDVList] = useState(true)
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [listePDV, setListePDV] = useState<PDV[]>([])
  const [designation, setDesignation] = useState("")
  const [capacite, setCapacite] = useState<number | undefined>(undefined)
  const [stockInitial, setStockInitial] = useState<number>(0)

  const { id } = useParams<{ id: string }>()

  // ✅ Priorité au produit chargé directement, fallback sur la liste paginée
  const productRaw = currentProduct ?? (products.find((p) => String(p.id) === id) as Product | undefined)
  const otherProducts = products.filter((p) => String(p.id) !== id) as Product[]

  // ── Charger le produit + ses images directement par ID ────────────────────
  const fetchProductImages = useCallback(async () => {
    if (!id) return
    try {
      const response = await API.get(`catalogue/products/${id}/`)
      const data: Product = response.data?.data || response.data

      // ✅ Stocker le produit complet (résout le pb de pagination)
      setCurrentProduct(data)

      const imgs: string[] = []
      if (data.product_img) imgs.push(data.product_img)
      if (Array.isArray(data.extra_images)) {
        data.extra_images.forEach((url: string) => {
          if (url && !imgs.includes(url)) imgs.push(url)
        })
      }
      setAllImages(imgs)
    } catch (e) {
      console.error("Erreur chargement images:", e)
    }
  }, [id])

  useEffect(() => { fetchProductImages() }, [fetchProductImages])

  // ── PDV ───────────────────────────────────────────────────────────────────
  const fetch_liste_PDV = useCallback(async () => {
    if (!id) return
    try {
      const response = await API.get(`catalogue/produits-dv/par_produit/?product=${id}`)
      setListePDV(response.data.data)
    } catch (error) {
      console.error("Erreur PDV:", error)
    }
  }, [id])

  useEffect(() => { fetch_liste_PDV() }, [fetch_liste_PDV])

  const setPDV = async () => {
    const pdvData: PDVData & { stock_initial?: number } = { 
      designation, 
      quantite: Number(capacite), 
      product: parseInt(id || "0"),
      stock_initial: stockInitial
    }
    try {
      const response = await API.post('catalogue/produits-dv/', pdvData)
      toast({ title: "Succès", description: (response.data.message || "Sous-produit créé.") as string })
      setDesignation(""); setCapacite(undefined); setStockInitial(0); fetch_liste_PDV(); fetchProductImages()
    } catch (error: any) {
      const msg = error.response?.data?.message || "Une erreur s'est produite lors de l'enregistrement."
      toast({ title: "Erreur", description: msg, variant: "destructive" })
    }
  }

  const handleEditProduct   = (p: Product) => { setEditingProduct(p); setShowProductForm(true) }
  const handleDeleteClick   = (p: Product) => { setProductToDelete(p); setShowDeleteModal(true) }
  
  // ✅ SUPPRESSION CORRIGÉE — appel API DELETE + redirection
  const handleConfirmDelete = async () => {
    if (!productToDelete) return
    try {
      await API.delete(`catalogue/products/${productToDelete.id}/`)
      toast({ title: "Succès", description: "Produit supprimé." })
      setShowDeleteModal(false)
      setProductToDelete(null)
      navigate('/products') // ← utilise navigate (déclaré ligne 312)
    } catch (error) {
      console.error("Erreur suppression:", error)
      toast({ 
        title: "Erreur", 
        description: "Impossible de supprimer le produit.", 
        variant: "destructive" 
      })
    }
  }

  const handleCloseForm = () => {
    setShowProductForm(false); setEditingProduct(null); refetch()
  }

  const handleSubmitProduct = async (data: FormData) => {
    try {
      await saveProduct(data)
      setShowProductForm(false); setEditingProduct(null)
    } catch (error) {
      console.error("Erreur sauvegarde:", error)
      alert("Une erreur s'est produite lors de la sauvegarde.")
    } finally {
      refetch(); fetchProductImages()
    }
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────
  // Pendant le chargement initial (pas encore de produit local ni dans la liste)
  if (!productRaw && loading) return <div className="p-8 text-center">Chargement...</div>
  if (!productRaw) return <div className="p-8 text-center text-red-500">Produit non trouvé.</div>

  // ✅ Cast explicite — TypeScript sait qu'on est passé après les guards
  const product: Product = productRaw

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30">
      {/* Breadcrumb */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="hover:text-blue-600 cursor-pointer" onClick={() => window.history.back()}>Produits</span>
            <span>/</span>
            <span className="text-gray-900 font-medium">{product.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setIsLiked(!isLiked)} className="hover:bg-red-50 rounded-full">
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-600'} transition-all`} />
            </Button>
            <Button variant="ghost" size="sm" className="hover:bg-blue-50 rounded-full">
              <Share className="h-4 w-4 text-gray-600" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-12">

          {/* ── Galerie ── */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-4">
              <ImageGallery images={allImages} productName={product.name} />
              <div className="mt-3 text-center">
                <span className="bg-black/10 text-gray-600 text-xs px-2 py-1 rounded-full">#{product.id}</span>
              </div>
            </div>
          </div>

          {/* ── Infos ── */}
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="mb-6">
                <span className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 text-sm font-medium px-3 py-1 rounded-full border border-blue-200">
                  {product.category ?? "Sans catégorie"}
                </span>
                <h1 className={`text-4xl font-bold mt-3 mb-4 leading-tight ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {product.name}
                </h1>
                <p className="text-gray-600 text-lg leading-relaxed">
                  {product.description || "Aucune description disponible."}
                </p>
              </div>

              {/* Prix / statut */}
              <div className="flex items-center justify-between mb-8 p-6 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl border">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Prix unitaire</p>
                  <p className={`text-3xl font-bold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {product.price}<span className="text-lg font-normal text-gray-600 ml-1">Ariary</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-2">Statut</p>
                  {getStatusBadge(getStockStatus(product.current_stock, product.stock_threshold))}
                </div>
              </div>

              {/* Cards */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="flex items-center gap-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                    <Package2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Quantité en stock</p>
                    <p className={`text-xl font-bold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>{product.current_stock} unités</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-orange-50/50 rounded-xl border border-orange-100">
                  <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Stock non-alloué</p>
                    <p className={`text-xl font-bold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {product.unassigned_stock} {product.unite_mesure}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <Button onClick={() => handleEditProduct(product)} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 px-6 rounded-xl shadow-lg">
                  <Edit className="h-5 w-5 mr-2" />Modifier le produit
                </Button>
                <Button onClick={() => handleDeleteClick(product)} variant="destructive" className="font-medium py-3 px-6 rounded-xl shadow-lg">
                  <Trash2 className="h-5 w-5 mr-2" />Supprimer
                </Button>
              </div>
            </div>

            {/* Sous-produit */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className={`text-xl font-bold mb-4 ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>Ajouter un sous-produit</h3>
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">Désignation</label>
                  <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)}
                    placeholder="Nom du produit dérivé"
                    className="w-full border border-gray-200 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">Capacité (Unités / {product.unite_mesure || 'unité'})</label>
                  <div className="flex items-center gap-2">
                    <input type="number" value={capacite ?? ""} onChange={(e) => setCapacite(parseFloat(e.target.value) || undefined)}
                      placeholder="Ex: 12"
                      className="w-full border border-gray-200 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
                    <span className="text-gray-600 font-medium">/{product.unite_mesure || 'unité'}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">Stock initial à allouer (en {product.unite_mesure})</label>
                  <div className="flex flex-col gap-1">
                    <input type="number" value={stockInitial} onChange={(e) => setStockInitial(parseFloat(e.target.value) || 0)}
                      placeholder="Quantité à allouer"
                      min={0}
                      className="w-full border border-gray-200 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
                    <p className="text-xs text-gray-500 italic">
                      Disponible : {product.unassigned_stock} {product.unite_mesure} 
                      {capacite && ` (${(stockInitial * capacite).toFixed(0)} unités théoriques)`}
                    </p>
                  </div>
                </div>
                <Button onClick={setPDV} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 rounded-xl shadow-lg">
                  <Package2 className="h-5 w-5 mr-2" />Enregistrer le sous-produit
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Liste sous-produits */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          <div className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50" onClick={() => setShowPDVList(!showPDVList)}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                <Package2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className={`text-xl font-bold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>Liste des sous-produits</h3>
                <p className="text-sm text-gray-600">{listePDV.length} éléments disponibles</p>
              </div>
            </div>
            <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${showPDVList ? "rotate-180" : ""}`} />
          </div>
          {showPDVList && (
            <div className="border-t border-gray-100 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="py-4 px-6">Désignation</TableHead>
                    <TableHead className="py-4 px-6">Capacité (/{product.unite_mesure})</TableHead>
                    <TableHead className="py-4 px-6 text-blue-600">Stock (théorique)</TableHead>
                    <TableHead className="py-4 px-6">Stock ({product.unite_mesure})</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listePDV.map((pdv) => (
                    <TableRow key={pdv.id} className="hover:bg-blue-50/30 border-b border-gray-50">
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Package className="h-5 w-5 text-blue-600" />
                          </div>
                          <p className={`font-medium ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>{pdv.designation}</p>
                        </div>
                      </TableCell>
                      <TableCell className={`py-4 px-6 font-medium ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>{pdv.quantite} / {product.unite_mesure}</TableCell>
                      <TableCell className={`py-4 px-6 font-bold text-blue-600 bg-blue-50/20`}>{pdv.nombre}</TableCell>
                      <TableCell className={`py-4 px-6 font-medium ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {(pdv.nombre / (parseFloat(pdv.quantite as any) || 1)).toFixed(2)} {product.unite_mesure}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Autres produits */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50" onClick={() => setShowOtherProducts(!showOtherProducts)}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className={`text-xl font-bold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>Autres produits</h3>
                <p className="text-sm text-gray-600">{otherProducts.length} produits disponibles</p>
              </div>
            </div>
            <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${showOtherProducts ? "rotate-180" : ""}`} />
          </div>
          {showOtherProducts && (
            <div className="border-t border-gray-100 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="py-4 px-6">Produit</TableHead>
                    <TableHead className="py-4 px-6">Catégorie</TableHead>
                    <TableHead className="py-4 px-6">Prix</TableHead>
                    <TableHead className="py-4 px-6">Stock</TableHead>
                    <TableHead className="py-4 px-6">Statut</TableHead>
                    <TableHead className="py-4 px-6">Valeur stock</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otherProducts.map((p) => (
                    <TableRow key={p.id} onClick={() => { window.location.href = `/product/${p.id}` }} className="hover:bg-blue-50/30 cursor-pointer group border-b border-gray-50">
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {p.product_img
                            ? <img src={p.product_img} alt={p.name} className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
                            : <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center"><Package className="h-5 w-5 text-gray-400" /></div>
                          }
                          <div>
                            <p className={`font-medium group-hover:text-blue-600 transition-colors ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>{p.name}</p>
                            <p className="text-sm text-gray-500">#{p.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6"><span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">{p.category ?? "—"}</span></TableCell>
                      <TableCell className={`py-4 px-6 font-medium ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>{Number(p.price).toLocaleString()} Ar</TableCell>
                      <TableCell className={`py-4 px-6 font-medium ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>{p.current_stock}</TableCell>
                      <TableCell className="py-4 px-6">{getStatusBadge(getStockStatus(p.current_stock, p.stock_threshold))}</TableCell>
                      <TableCell className={`py-4 px-6 font-medium ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>{(p.current_stock * Number(p.price)).toFixed(2)} Ar</TableCell>
                      <TableCell className="py-4 px-6 text-right">
                        <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-50">
                          <Eye className="h-4 w-4 mr-2" />Voir<ArrowUpRight className="h-3 w-3 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showProductForm && editingProduct && (
        <ProductForm onClose={handleCloseForm} onSubmit={handleSubmitProduct} initialData={editingProduct} />
      )}
      {showDeleteModal && productToDelete && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleConfirmDelete}
          productName={productToDelete.name}
        />
      )}
    </div>
  )
}