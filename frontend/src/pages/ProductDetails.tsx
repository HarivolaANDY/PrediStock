import { useEffect, useState, useCallback } from "react"
import { useParams } from "react-router-dom"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Package, Edit, Trash2, ChevronDown, Share, Heart, Package2, BarChart3, Eye, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { ProductForm } from "@/components/ProductForm"
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal"
import { useSettings } from "@/hooks/useSettings"
import { useProducts } from "@/hooks/useProducts"
import API  from "@/services/axios"
import { PDVData } from '@/types/types';

const productImages = [
  "/images/img.jpg",
  "/images/img2.jpg",
  "/images/img.jpg",
  "/images/img2.jpg",
]

type Product = {
  id: number
  name: string
  category: number | null
  price: string | number
  current_stock: number
  status: string
  product_img: string
  sold: number
  revenue: number
  description: string
}

interface PDV {
  id: number;
  designation: string;
  quantite: number;
  nombre: number;
}

const salesDataDay = [
  { hour: "08h", sales: 5 },
  { hour: "10h", sales: 8 },
  { hour: "12h", sales: 12 },
  { hour: "14h", sales: 7 },
  { hour: "16h", sales: 10 },
  { hour: "18h", sales: 6 },
]
const salesDataWeek = [
  { day: "Lun", sales: 30 },
  { day: "Mar", sales: 45 },
  { day: "Mer", sales: 50 },
  { day: "Jeu", sales: 40 },
  { day: "Ven", sales: 60 },
  { day: "Sam", sales: 70 },
  { day: "Dim", sales: 20 },
]
const salesDataMonth = [
  { week: "S1", sales: 120 },
  { week: "S2", sales: 98 },
  { week: "S3", sales: 150 },
  { week: "S4", sales: 80 },
]
const salesData3Months = [
  { month: "Mai", sales: 170 },
  { month: "Juin", sales: 140 },
  { month: "Juil", sales: 180 },
]
const salesDataYear = [
  { month: "Jan", sales: 120 },
  { month: "Fév", sales: 98 },
  { month: "Mar", sales: 150 },
  { month: "Avr", sales: 80 },
  { month: "Mai", sales: 170 },
  { month: "Juin", sales: 140 },
  { month: "Juil", sales: 180 },
  { month: "Août", sales: 110 },
  { month: "Sep", sales: 90 },
  { month: "Oct", sales: 130 },
  { month: "Nov", sales: 160 },
  { month: "Déc", sales: 200 },
]
const salesDataAll = [
  ...salesDataYear,
  { month: "2023", sales: 1200 },
  { month: "2022", sales: 900 },
  { month: "2021", sales: 800 },
]
const mockProducts: Product[] = [
  {
    id: 23,
    name: "BKLGO Full Zip Hoodie", 
    category: 1,
    price: 1321,
    current_stock: 15,
    status: "out_of_stock",
    product_img: "/api/placeholder/40/40", 
    sold: 45,
    revenue: 59445,
    description:"Découvrez notre produit phare, conçu pour allier confort et style. Fabriqué avec des matériaux de haute qualité, il est parfait pour toutes les occasions et s'adapte à votre style de vie moderne."
  },
]

export default function ProductDetails() {
  const { settings } = useSettings()
  const { products, loading, error, refetch } = useProducts()
  
  const [mainImage, setMainImage] = useState(productImages[0])
  const [period, setPeriod] = useState<"day"|"week"|"month"|"3months"|"year"|"all">("month")
  const [isLiked, setIsLiked] = useState(false)
  const [showOtherProducts, setShowOtherProducts] = useState(false)
  const [showPDVList, setShowPDVList] = useState(true)
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [listePDV, setListePDV] = useState<PDV[]>([])
  const [designation, setDesignation] = useState<string>("")
  const [capacite, setCapacite] = useState<number | undefined>(undefined)

  const { id } = useParams<{ id: string }>()
  const product = products.find((p) => String(p.id) === id)
  const otherProducts = products.filter((p) => String(p.id) !== id)

  function handleViewDetails(id: string): void {
    window.location.href = `/product/${id}`
  }

  const setPDV = async () => {
    if (!designation || !capacite || !id) {
      alert("Veuillez remplir tous les champs avant d'enregistrer.")
      return;
    }

    const pdvData: PDVData = {
      designation: designation,
      quantite: Number(capacite),
      product: parseInt(id),
    };

    try {
      const response = await API.post('catalogue/produits-dv/', pdvData);
      alert(`Enregistrement réussi : ${response.status}`);
      setDesignation("");
      setCapacite(undefined);
      fetch_liste_PDV();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du produit dérivé :", error);
      alert("Une erreur s'est produite lors de l'enregistrement.");
    }
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setShowProductForm(true)
  }

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product)
    setShowDeleteModal(true)
  }

  const fetch_liste_PDV = useCallback(async () => {
    if (!id) return;
    try {
      const response = await API.get(`catalogue/produits-dv/par_produit/?product=${id}`);
      setListePDV(response.data.data);
    } catch (error) {
      console.error("Erreur lors de la récupération de la liste des PDV :", error)
    }
  }, [id]);

  useEffect(() => {
    fetch_liste_PDV()
  }, [fetch_liste_PDV])

  const handleConfirmDelete = () => {
    console.log("Produit supprimé :", productToDelete?.name)
    setShowDeleteModal(false)
    setProductToDelete(null)
  }

  const handleCloseForm = () => {
    setShowProductForm(false)
    setEditingProduct(null)
  }

  function getStatusBadge(status: string): React.ReactNode {
    switch (status) {
      case "in_stock":
      case "active":
        return (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="bg-gradient-to-r from-green-50 to-green-100 text-green-700 text-sm font-medium px-3 py-1.5 rounded-full border border-green-200">
              En stock
            </span>
          </div>
        )
      case "out_of_stock":
      case "inactive":
        return (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
            <span className="bg-gradient-to-r from-red-50 to-red-100 text-red-700 text-sm font-medium px-3 py-1.5 rounded-full border border-red-200">
              Rupture de stock
            </span>
          </div>
        )
      default:
        return (
          <span className="bg-gray-100 text-gray-700 text-sm px-3 py-1.5 rounded-full">
            {status || "Statut inconnu"}
          </span>
        )
    }
  }

  if (loading) return <div className="p-8 text-center">Chargement...</div>
  if (!product) return <div className="p-8 text-center text-red-500">Produit non trouvé.</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30">
      {/* Header avec breadcrumb */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="hover:text-blue-600 transition-colors">Produits</span>
              <span>/</span>
              <span className="text-gray-900 font-medium">{product.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost"
                size="sm" 
                onClick={() => setIsLiked(!isLiked)}
                className="hover:bg-red-50 rounded-full"
              >
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-600'} transition-all duration-200`} />
              </Button>
              <Button variant="ghost" size="sm" className="hover:bg-blue-50 rounded-full">
                <Share className="h-4 w-4 text-gray-600" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Section principale du produit */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-12">
          {/* Images du produit */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden group">
              <div className="aspect-square relative overflow-hidden bg-gray-50">
                <img
                  src={product.product_img || mainImage}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-black/20 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                    #{product.id}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-4 gap-2">
                  {productImages.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setMainImage(img)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                        mainImage === img 
                          ? "border-blue-500 ring-2 ring-blue-200 scale-105" 
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Aperçu ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Informations produit */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 text-sm font-medium px-3 py-1 rounded-full border border-blue-200">
                    {product.category}
                  </span>
                </div>
                <h1 className={`text-4xl font-bold mb-4 leading-tight ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {product.name}
                </h1>
                <p className="text-gray-600 text-lg leading-relaxed mb-6">
                  {product.description || "Aucune description disponible."}
                </p>
              </div>

              {/* Prix et statut */}
              <div className="flex items-center justify-between mb-8 p-6 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl border">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Prix unitaire</p>
                  <p className={`text-3xl font-bold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {product.price} 
                    <span className="text-lg font-normal text-gray-600 ml-1">Ariary</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-2">Statut</p>
                  {getStatusBadge(product.status)}
                </div>
              </div>

              {/* Informations détaillées */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                      <Package2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Quantité en stock</p>
                      <p className={`text-xl font-bold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>{product.current_stock} unités</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-orange-50/50 rounded-xl border border-orange-100">
                    <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Valeur totale stock</p>
                      <p className={`text-xl font-bold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {(product.current_stock * Number(product.price)).toFixed(2)} Ar
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-4">
                <Button 
                  onClick={() => handleEditProduct(product as unknown as Product)} 
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Edit className="h-5 w-5 mr-2" />
                  Modifier le produit
                </Button>
                <Button 
                  onClick={() => handleDeleteClick(product as unknown as Product)} 
                  variant="destructive" 
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 font-medium py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Trash2 className="h-5 w-5 mr-2" />
                  Supprimer
                </Button>
              </div>
            </div>

            {/* Formulaire d'insertion des sous-produits */}
            <div className="xl:col-span-1 mt-8">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className={`text-xl font-bold mb-4 ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Ajouter un sous-produit
                </h3>
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="designation" className="text-sm font-medium text-gray-700">
                      Désignation
                    </label>
                    <input
                      id="designation"
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="Nom du produit dérivé"
                      className="w-full border border-gray-200 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-gray-50 hover:bg-gray-100"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="capacite" className="text-sm font-medium text-gray-700">
                      Capacité (par unité)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="capacite"
                        type="number"
                        value={capacite !== undefined ? capacite : ""}
                        onChange={(e) => setCapacite(parseFloat(e.target.value) || undefined)}
                        placeholder="Capacité par unité du produit dérivé"
                        className="w-full border border-gray-200 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-gray-50 hover:bg-gray-100"
                      />
                      <span className="text-gray-600 font-medium">/Kg</span>
                    </div>
                  </div>
                  <Button
                    onClick={setPDV}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <Package2 className="h-5 w-5 mr-2" />
                    Enregistrer le sous-produit
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>           

        {/* Liste des sous-produits */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          <div 
            className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
            onClick={() => setShowPDVList(!showPDVList)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                <Package2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className={`text-xl font-bold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>Liste des sous-produits</h3>
                <p className="text-sm text-gray-600">{listePDV.length} éléments disponibles</p>
              </div>
            </div>
            <ChevronDown
              className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${showPDVList ? "rotate-180" : ""}`}
            />
          </div>
          {showPDVList && (
            <div className="border-t border-gray-100">
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="bg-gray-50/50 border-b border-gray-100">
                      <TableHead className="text-left font-semibold text-gray-700 py-4 px-6">Désignation</TableHead>
                      <TableHead className="text-left font-semibold text-gray-700 py-4 px-6">Quantité (Capacités)</TableHead>
                      <TableHead className="text-left font-semibold text-gray-700 py-4 px-6">Nombre</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listePDV.map((pdv: PDV) => (
                      <TableRow 
                        key={pdv.id} 
                        className="hover:bg-blue-50/30 transition-colors duration-200 cursor-pointer group border-b border-gray-50"
                      >
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Package className="h-6 w-6 text-blue-600" />
                            </div>
                            <p className={`font-medium group-hover:text-blue-600 transition-colors ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {pdv.designation}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className={`py-4 px-6 font-medium ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {pdv.quantite}
                        </TableCell>
                        <TableCell className={`py-4 px-6 font-medium ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {pdv.nombre}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div 
            className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
            onClick={() => setShowOtherProducts(!showOtherProducts)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className={`text-xl font-bold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>Autres produits</h3>
                <p className="text-sm text-gray-600">{otherProducts.length} produits disponibles</p>
              </div>
            </div>
            <ChevronDown
              className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${showOtherProducts ? "rotate-180" : ""}`}
            />
          </div>
          {showOtherProducts && (
            <div className="border-t border-gray-100">
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="bg-gray-50/50 border-b border-gray-100">
                      <TableHead className="text-left font-semibold text-gray-700 py-4 px-6">Produit</TableHead>
                      <TableHead className="text-left font-semibold text-gray-700 py-4 px-6">Catégorie</TableHead>
                      <TableHead className="text-left font-semibold text-gray-700 py-4 px-6">Prix</TableHead>
                      <TableHead className="text-left font-semibold text-gray-700 py-4 px-6">Stock</TableHead>
                      <TableHead className="text-left font-semibold text-gray-700 py-4 px-6">Statut</TableHead>
                      <TableHead className="text-left font-semibold text-gray-700 py-4 px-6">Valeur totale stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {otherProducts.map((p) => (
                      <TableRow 
                        key={p.id} 
                        onClick={() => handleViewDetails(String(p.id))} 
                        className="hover:bg-blue-50/30 transition-colors duration-200 cursor-pointer group border-b border-gray-50"
                      >
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <img 
                              src={p.product_img || "/api/placeholder/40/40"} 
                              alt={p.name}
                              className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                            />
                            <div>
                              <p className={`font-medium group-hover:text-blue-600 transition-colors ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {p.name}
                              </p>
                              <p className="text-sm text-gray-500">#{p.id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                            {p.category}
                          </span>
                        </TableCell>
                        <TableCell className={`py-4 px-6 font-medium ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {p.price.toLocaleString()} Ar
                        </TableCell>
                        <TableCell className={`py-4 px-6 font-medium ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {p.current_stock}
                        </TableCell>
                        <TableCell className="py-4 px-6">{getStatusBadge(p.status)}</TableCell>
                        <TableCell className={`py-4 px-6 font-medium ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {(p.current_stock * Number(p.price)).toFixed(2)} Ar
                        </TableCell>
                        <TableCell className="py-4 px-6 text-right">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-blue-50"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Voir
                            <ArrowUpRight className="h-3 w-3 ml-1" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showProductForm && editingProduct && (
        <ProductForm
          onClose={handleCloseForm}
          onSubmit={() => {}}
          initialData={editingProduct}
        />
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