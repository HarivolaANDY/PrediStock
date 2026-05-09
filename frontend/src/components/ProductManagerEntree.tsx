import { useState, useEffect, useCallback } from 'react';
import API from "@/services/axios";
import { PanierItem, CreateProductData, PDV } from '@/types/types';
import { toast } from "@/components/ui/use-toast";

interface ProduitInserer {
  id_produit: number;
  nom_produit: string;
  panier: PanierItem[];
}

const ProductManagerEntree = () => {
  const [liste_produit, setListe_produit] = useState<CreateProductData[]>([]);
  const [products, setProducts] = useState<ProduitInserer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isloading, setIsloading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showProductList, setShowProductList] = useState(false);
  const [selectProduit_dv, setSelectProduit_dv] = useState<PDV[]>([]);

  const [formProductId, setFormProductId] = useState<number | ''>('');
  const [formProductName, setFormProductName] = useState<string>('');
  const [formPanierItem, setFormPanierItem] = useState<PanierItem>({
    id: 0,
    designation: '',
    nombre: 1,
    quantite: 1,
    ref: '',
    is_direct: false,
  });
  const [formPanier, setFormPanier] = useState<PanierItem[]>([]);

  const openModal = () => {
    setFormProductId('');
    setFormProductName('');
    setSearchTerm('');
    setFormPanierItem({ id: 0, designation: '', nombre: 1, quantite: 1, ref: '', is_direct: false });
    setFormPanier([]);
    setSelectProduit_dv([]);
    setShowModal(true);
  };

  const addFormPanierItem = () => {
    if (!formPanierItem.id) {
      toast({ title: "Attention", description: "Sélectionnez une variante.", variant: "destructive" });
      return;
    }
    if (formPanierItem.nombre <= 0) {
      toast({ title: "Attention", description: "Le nombre doit être supérieur à 0.", variant: "destructive" });
      return;
    }
    setFormPanier([...formPanier, formPanierItem]);
    setFormPanierItem({ id: 0, designation: '', nombre: 1, quantite: 1, ref: '', is_direct: false });
  };

  const removeFormPanierItem = (index: number) => {
    setFormPanier(formPanier.filter((_, i) => i !== index));
  };

  const saveProduct = () => {
    if (formProductId === '') {
      toast({ title: "Attention", description: "Sélectionnez un produit.", variant: "destructive" });
      return;
    }
    if (formPanier.length === 0) {
      toast({ title: "Attention", description: "Ajoutez au moins une variante au panier.", variant: "destructive" });
      return;
    }
    setProducts([...products, {
      id_produit: Number(formProductId),
      nom_produit: formProductName,
      panier: formPanier,
    }]);
    setShowModal(false);
  };

  const removeProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const sendSaveProducts = async () => {
    if (products.length === 0) {
      toast({ title: "Attention", description: "Ajoutez au moins un produit avant d'enregistrer." });
      return;
    }

    setIsloading(true);
    try {
      const liste_inserer = {
        liste_inserer: products.map(product => ({
          id_produit: product.id_produit,
          panier: product.panier,
        })),
      };

      const res = await API.post("catalogue/produits-dv/entree/", liste_inserer);
      const { url, filename } = res.data.data;

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setProducts([]);
      toast({ title: "Succès", description: "Entrées enregistrées avec succès." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'enregistrement.";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setIsloading(false);
    }
  };

  const FetchProducts_filtered = useCallback(async () => {
    try {
      const res = await API.post("catalogue/products/", { chercher: searchTerm });
      setListe_produit(res.data.data || []);
    } catch {
      setListe_produit([]);
    }
  }, [searchTerm]);

  // ✅ Charge les dérivées du produit parent et pré-sélectionne si besoin
  const fetch_sousProduits = async (
    productId: number,
    productName: string,
    preSelectedDerivId?: number
  ) => {
    try {
      const response = await API.get(`catalogue/produits-dv/par_produit/?product=${productId}`);
      const derivees: PDV[] = response.data.data;
      setSelectProduit_dv(derivees);

      if (preSelectedDerivId) {
        // L'utilisateur a tapé directement une dérivée → on la pré-sélectionne
        const sel = derivees.find(d => d.id === preSelectedDerivId);
        if (sel) {
          setFormPanierItem(prev => ({
            ...prev,
            id: sel.id,
            designation: sel.designation || '',
            is_direct: false,
          }));
        }
      } else if (derivees.length === 0) {
        // Aucune dérivée → entrée directe sur le produit parent
        setFormPanierItem(prev => ({
          ...prev,
          id: productId,
          designation: productName,
          is_direct: true,
        }));
      } else {
        // Des dérivées existent → reset, l'utilisateur doit choisir
        setFormPanierItem({ id: 0, designation: '', nombre: 1, quantite: 1, ref: '', is_direct: false });
      }
    } catch {
      setSelectProduit_dv([]);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm) FetchProducts_filtered();
      else setListe_produit([]);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, FetchProducts_filtered]);

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

      {isloading && (
        <div className="flex items-center gap-2 text-blue-600 animate-pulse mb-4">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Enregistrement en cours...
        </div>
      )}

      {products.length === 0 ? (
        <p className="text-gray-500 italic">Aucun produit ajouté pour le moment.</p>
      ) : (
        <>
          <ul className="space-y-4">
            {products.map((product, productIndex) => (
              <li key={productIndex} className="bg-gray-50 rounded-lg p-4 shadow-sm border border-gray-100 transition-all hover:shadow-md">
                <div className="flex items-center justify-between">
                  <strong className="text-gray-900 font-medium">{product.nom_produit}</strong>
                  <button
                    onClick={() => removeProduct(productIndex)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
                {product.panier.length > 0 ? (
                  <ul className="ml-4 mt-3 space-y-2">
                    {product.panier.map((item, variantIndex) => (
                      <li key={variantIndex} className="flex items-center gap-2 text-gray-700 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                        <span>{item.designation}</span>
                        <span className="text-gray-400">·</span>
                        <span>Quantité : <strong>{item.nombre}</strong></span>
                        {item.ref && (
                          <>
                            <span className="text-gray-400">·</span>
                            <span className="text-gray-500">Réf : {item.ref}</span>
                          </>
                        )}
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
            disabled={isloading}
            className="mt-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-green-700 transition-all duration-200 font-semibold disabled:opacity-50"
          >
            Enregistrer les entrées
          </button>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg border border-gray-200/50 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl transition-colors"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-6 text-blue-800">Ajouter un produit</h2>

            {/* Recherche produit ou dérivée */}
            <div className="mb-6 relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Produit ou variante à ajouter :
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setShowProductList(true); }}
                onFocus={() => setShowProductList(true)}
                onBlur={() => setTimeout(() => setShowProductList(false), 150)}
                placeholder="Rechercher un produit ou une variante..."
                className="w-full border border-gray-200 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
              />
              {showProductList && liste_produit.length > 0 && (
                <div className="absolute z-20 bg-white rounded-lg shadow-xl border border-gray-100 mt-1 w-full max-h-64 overflow-y-auto">
                  {liste_produit.map((prod: CreateProductData) => (
                    <div
                      key={`${prod.is_deriv ? 'dv' : 'pr'}-${prod.id}`}
                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors text-gray-800"
                      onMouseDown={() => {
                        if (prod.is_deriv) {
                          // ✅ Dérivée sélectionnée → parent auto-rempli + dérivée pré-sélectionnée
                          setFormProductId(prod.parent_id!);
                          setFormProductName(prod.parent_name!);
                          setSearchTerm(prod.parent_name!);
                          setShowProductList(false);
                          fetch_sousProduits(prod.parent_id!, prod.parent_name!, prod.id);
                        } else {
                          // Produit parent sélectionné
                          setFormProductId(prod.id!);
                          setFormProductName(prod.name);
                          setSearchTerm(prod.name);
                          setShowProductList(false);
                          fetch_sousProduits(prod.id!, prod.name);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {prod.is_deriv && (
                          <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium shrink-0">
                            variante
                          </span>
                        )}
                        <span className="font-medium">{prod.name}</span>
                        {prod.current_stock !== undefined && (
                          <span className="ml-auto text-xs text-gray-400 shrink-0">
                            stock : {prod.current_stock}
                          </span>
                        )}
                      </div>
                      {prod.is_deriv && (
                        <p className="text-xs text-gray-400 mt-0.5 ml-0.5">
                          → {prod.parent_name}
                        </p>
                      )}
                      {!prod.is_deriv && prod.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{prod.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {showProductList && searchTerm && liste_produit.length === 0 && (
                <div className="absolute z-20 bg-white rounded-lg shadow-xl border border-gray-100 mt-1 w-full px-4 py-3 text-gray-400 text-sm">
                  Aucun produit ou variante trouvé...
                </div>
              )}
            </div>

            {/* Sélection variante */}
            <div className="flex flex-col gap-3 mb-4">
              {selectProduit_dv.length > 0 ? (
                <>
                  <label className="block text-sm font-medium text-gray-700">Variante :</label>
                  <div className="relative">
                    <select
                      value={formPanierItem.id || ''}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        const sel = selectProduit_dv.find((p: PDV) => p.id === id);
                        if (sel) {
                          setFormPanierItem(prev => ({
                            ...prev,
                            id,
                            designation: sel.designation || '',
                            is_direct: false,
                          }));
                        }
                      }}
                      className="w-full appearance-none px-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      <option value="">-- Sélectionner une variante --</option>
                      {selectProduit_dv.map((prod: PDV) => (
                        <option key={prod.id} value={prod.id}>
                          {prod.designation} (stock : {prod.nombre ?? 0})
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                      <svg className="w-4 h-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </>
              ) : formProductId !== '' ? (
                <p className="text-sm text-gray-500 italic px-1 py-2 bg-gray-50 rounded-lg border border-gray-100">
                  ✓ Aucune variante — entrée directe sur <strong>{formProductName}</strong>
                </p>
              ) : null}

              <div>
                <label className="text-xs text-gray-600 mb-1 block">
                  Quantité ({selectProduit_dv.find(d => d.id === formPanierItem.id)?.infos?.unite_mesure || 'u'}) :
                </label>
                <input
                  type="number"
                  step="any"
                  value={formPanierItem.nombre}
                  min={0}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setFormPanierItem({ ...formPanierItem, nombre: val, quantite: val });
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
                />
              </div>



              <div>
                <label className="text-xs text-gray-600 mb-1 block">Référence :</label>
                <input
                  type="text"
                  value={formPanierItem.ref}
                  onChange={(e) => setFormPanierItem({ ...formPanierItem, ref: e.target.value })}
                  placeholder="Bon de commande, réf fournisseur..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
                />
              </div>

              <button
                onClick={addFormPanierItem}
                type="button"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-lg hover:opacity-90 transition-all font-semibold shadow-sm"
              >
                + Ajouter au panier
              </button>
            </div>

            {/* Panier */}
            {formPanier.length > 0 ? (
              <ul className="mb-4 space-y-2">
                {formPanier.map((item, index) => (
                  <li key={index} className="flex items-center justify-between bg-blue-50/50 rounded-lg px-4 py-2 border border-blue-100">
                    <span className="text-gray-700 text-sm">
                      {item.designation} · Qté : <strong>{item.nombre}</strong>
                      {item.ref && <span className="text-gray-500"> · {item.ref}</span>}
                    </span>
                    <button
                      onClick={() => removeFormPanierItem(index)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Supprimer
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400 italic mb-4 text-sm">Aucune variante ajoutée.</p>
            )}

            {formPanier.length > 0 && (
              <button
                onClick={saveProduct}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-sm"
              >
                Enregistrer le produit
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagerEntree;