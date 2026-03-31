import React, { useState, useEffect } from 'react';
import API from "@/services/axios";
import { PanierItem, ProduitInserer, CreateProductData, DetailsResponseproduit } from '@/types/types';
import { Select, SelectContent, SelectItem } from '@radix-ui/react-select';
import { SelectTrigger, SelectValue } from './ui/select';
import { log } from 'console';
import { parseAxiosBlobResponse, downloadAll } from "@/utils/blobUtils";

const ProductManager = () => {
  const [produitData, setProduitData] = useState<CreateProductData>();
  const [liste_resultat, setListe_resultat] = useState<[]>([]);
  const [liste_produit, setListe_produit] = useState<CreateProductData[]>([]);
  const [products, setProducts] = useState<ProduitInserer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isloading, setIsloading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showProductList, setShowProductList] = useState(false);
  const [selectProduit_dv, setSelectProduit_dv] = useState<[]>([]);
  const [downloadedFiles, setDownloadedFiles] = useState<{ blob: Blob; filename: string }[]>([]); // Nouvelle liste pour accumuler les fichiers

  // Formulaire modal states
  const [formProductId, setFormProductId] = useState<number | ''>('');
  const [formPanierItem, setFormPanierItem] = useState<PanierItem>({
    id: 0,
    designation: 'Kg',
    nombre: 1,
    quantite: 1,
    ref: 'ref-default'
  });
  const [formPanier, setFormPanier] = useState<PanierItem[]>([]);

  // Ouvre le modal et réinitialise le formulaire
  const openModal = () => {
    setFormProductId('');
    setFormPanierItem({ id: 0, designation: '', nombre: 1, quantite: 1, ref: '' });
    setFormPanier([]);
    setShowModal(true);
  };

  // Ajoute une variante (panier item) dans le formulaire
  const addFormPanierItem = () => {
    if (formPanierItem.designation.trim()) {
      setFormPanier([...formPanier, formPanierItem]);
      setFormPanierItem({ id: 0, designation: '', nombre: 1, quantite: 1, ref: '' });
    }
  };

  // Supprime une variante du formulaire
  const removeFormPanierItem = (index: number) => {
    setFormPanier(formPanier.filter((_, i) => i !== index));
  };

  // Enregistre le produit depuis le formulaire modal
  const saveProduct = () => {
    if (formProductId !== '' && formPanier.length > 0) {
      setProducts([
        ...products,
        { id_produit: Number(formProductId), panier: formPanier }
      ]);
      setShowModal(false);
    }
  };

  // Supprime un produit
  const removeProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  // Fonction pour télécharger un seul fichier
  const downloadFile = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  // Fonction pour télécharger tous les fichiers accumulés
  const downloadAllFiles = () => {
    downloadedFiles.forEach(({ blob, filename }) => {
      downloadFile(blob, filename);
    });
    setDownloadedFiles([]); // Vider la liste après téléchargement
  };

  const sendSaveProducts = async () => {
    setIsloading(true);
    const newFiles: { blob: Blob; filename: string }[] = [];
    const liste_inserer = {
      "liste_inserer": [
        ...products.map(product => ({
          id_produit: product.id_produit,
          panier: product.panier
        }))
      ]
    };
    try {
      const res = await API.post("produits_dv/entree/", liste_inserer, { responseType: 'blob' });
      const parsed = await parseAxiosBlobResponse(res, "Rapport_entrée.pdf");

      if (parsed.files && parsed.files.length) {
        setDownloadedFiles(prev => [...prev, ...parsed.files]);
        // downloadAll(parsed.files) // décommenter si téléchargement immédiat désiré
      }
      if (parsed.json) console.log(parsed.json);

      products.splice(0, products.length);
      setProducts([...products]); // Forcer le re-render
    } catch (err) {
      console.log(err);
    } finally {
      setIsloading(false);
    }
  };

  const FetchProducts_filtered = async () => {
    try {
      const data = { "chercher": searchTerm };
      const res = await API.post("/product/", data);
      setListe_produit(res.data.data || []);
    } catch (err) {
      console.log(err);
      setListe_produit([]);
    }
  };

  const fetch_sousProduits = async (productId: number) => {
    try {
      const res = await API.get(`/produits_dv/par_produit/?product=${productId}`).then((response)=>{
        setSelectProduit_dv(response.data.data);        
      })
    } catch (err) {
      console.log(err);
    }
  };

  // Debounce pour éviter trop d'appels API
  useEffect(() => {
    fetch_sousProduits(0);
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm) {
        FetchProducts_filtered();
      } else {
        setListe_produit([]); // Efface la liste si searchTerm vide
      }
    }, 300); // Délai de 300ms

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  return (
    <div className="bg-white shadow-lg rounded-xl p-8 max-w-5xl mx-auto my-10 border border-gray-100 transition-all duration-300">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Entrées de Produits</h2>
        <button
          onClick={openModal}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-700 transition-all duration-200 font-semibold"
        >
          + Ajouter un produit
        </button>
      </div>
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Produits Ajoutés</h3>
      {isloading && <p className="text-gray-600 animate-pulse">Enregistrement en cours...</p>}
      {products.length === 0 ? (
        <p className="text-gray-500 italic">Aucun produit ajouté pour le moment.</p>
      ) : (
        <>
          <ul className="space-y-4">
            {products.map((product, productIndex) => (
              <li key={productIndex} className="bg-gray-50 rounded-lg p-4 shadow-sm border border-gray-100 transition-all hover:shadow-md">
                <div className="flex items-center justify-between">
                  <strong className="text-gray-900 font-medium">ID: {product.id_produit}</strong>
                  <button
                    onClick={() => removeProduct(productIndex)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
                  >
                    Supprimer Produit
                  </button>
                </div>
                {product.panier.length > 0 ? (
                  <ul className="ml-4 mt-3 space-y-2">
                    {product.panier.map((item, variantIndex) => (
                      <li key={variantIndex} className="flex items-center justify-between text-gray-700 text-sm">
                        <span>
                          - {item.designation} | Nombre: {item.nombre} 
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="ml-4 text-gray-400 text-sm">Aucune variante.</p>
                )}
              </li>
            ))}
          </ul>
          <button
            onClick={sendSaveProducts}
            className="mt-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-green-700 transition-all duration-200 font-semibold"
          >
            Enregistrer les produits
          </button>
        </>
      )}

      {/* Section pour les fichiers accumulés */}
      {downloadedFiles.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Fichiers à télécharger</h3>
          <ul className="space-y-2">
            {downloadedFiles.map((file, index) => (
              <li key={index} className="text-gray-700">
                {file.filename}
              </li>
            ))}
          </ul>
          <button
            onClick={downloadAllFiles}
            className="mt-4 bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-indigo-700 transition-all duration-200 font-semibold"
          >
            Télécharger tous les fichiers
          </button>
        </div>
      )}

      {/* Modal pour ajouter un produit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg border border-gray-200/50 transform transition-all duration-300 scale-100">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl transition-colors"
              aria-label="Fermer"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-6 text-blue-800">Ajouter un produit</h2>
            <div className="mb-6 relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Produit à ajouter :</label>
              <input
                type="text"
                value={searchTerm}
                onChange={e => {
                  const value = e.target.value;
                  setSearchTerm(value);
                  setShowProductList(true);
                }}
                onFocus={() => setShowProductList(true)}
                onBlur={() => setTimeout(() => setShowProductList(false), 150)}
                placeholder="Rechercher un produit..."
                className="w-full border border-gray-200 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors bg-gray-50"
              />
              {showProductList && (
                <div className="absolute z-20 bg-white rounded-lg shadow-xl border border-gray-100 mt-1 w-full max-h-64 overflow-y-auto">
                  {liste_produit.length > 0 ? (
                    liste_produit.map((prod: any) => (
                      <div
                        key={prod.id}
                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors text-gray-800"
                        onMouseDown={() => {
                          setFormProductId(prod.id);
                          setSearchTerm(prod.name);
                          setShowProductList(false);
                          fetch_sousProduits(prod.id);
                        }}
                      >
                        {prod.name} {prod.current_stock !== undefined ? ` (stock: ${prod.current_stock})` : ''} {prod.description ? <span className="text-gray-500 text-sm">– {prod.description}</span> : ''}

                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-gray-400 text-sm">Aucun produit trouvé ou en cours de recherche...</div>
                  )}
                </div>
              )}
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Variante (panier) :</label>
            <div className="flex flex-col gap-3 mb-4">
              <div className="relative">
                <select
                  name="id_produit_dv"
                  id="id_produit_dv"
                  value={formPanierItem.id || ''}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    const sel = selectProduit_dv.find((p: any) => p.id === id) as any;
                    setFormPanierItem(prev => ({
                      ...prev,
                      id: id,
                      designation: sel ? (sel.designation || sel.name || '') : prev.designation,
                    }));
                  }}
                  className="w-full appearance-none px-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors"
                >
                  <option value="">-- Sélectionner une variante --</option>
                  {selectProduit_dv.map((prod: any) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.designation || prod.name} {prod.nombre !== undefined ? ` (stock: ${prod.nombre})` : ''}
                    </option>
                  ))}
                </select>
                {/* Custom chevron */}
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <svg className="w-4 h-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-600 mb-1 block">Nombre :</label>
                  <input
                    type="number"
                    value={formPanierItem.nombre}
                    min={1}
                    onChange={(e) => setFormPanierItem({ ...formPanierItem, nombre: Number(e.target.value) })}
                    placeholder="Nombre"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors bg-gray-50"
                  />
                </div>
              </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-600 mb-1 block">Réferrence :</label>
                  <input
                    type="text"
                    value={formPanierItem.ref}
                    min={1}
                    onChange={(e) => setFormPanierItem({ ...formPanierItem, ref: e.target.value })}
                    placeholder="Bon de commande, réf fournisseur, etc..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors bg-gray-50"
                  />
                </div>
              <button
                onClick={addFormPanierItem}
                type="button"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 font-semibold shadow-sm hover:shadow-md"
              >
                + Ajouter au panier
              </button>
            </div>
            {formPanier.length > 0 && (
              <ul className="mb-4 space-y-2">
                {formPanier.map((item, index) => (
                  <li key={index} className="flex items-center justify-between bg-blue-50/50 rounded-lg px-4 py-2 border border-blue-100">
                    <span className="text-gray-700 text-sm">
                      {item.designation} || Nombre: {item.nombre}  
                    </span>
                    <button
                      onClick={() => removeFormPanierItem(index)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
                    >
                      Supprimer
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {formPanier.length === 0 ? (<p className="text-gray-500 italic mb-4">Aucune variante ajoutée pour le moment.</p>) : 
            <button
              onClick={saveProduct}
              className="w-full mt-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Enregistrer le produit
            </button> 
            }
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManager;