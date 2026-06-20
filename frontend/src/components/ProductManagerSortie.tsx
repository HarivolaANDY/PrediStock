import { useState, useEffect, useCallback } from 'react';
import API from "@/services/axios";
import { CreateProductData, PDV } from '@/types/types';
import { toast } from "@/components/ui/use-toast";

interface StockExitItem {
  id_produit: number;
  nom_produit: string;
  quantite: number;   // Poids (kg) ou quantité standard
  count?: number;     // Optionnel : nombre d'unités (override manuel)
  designation: string;
  id_deriv?: number;
  ref?: string;
  is_direct?: boolean;
}

const ProductManagerSortie = () => {
  const [liste_produit, setListe_produit] = useState<CreateProductData[]>([]);
  const [stockExits, setStockExits] = useState<StockExitItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isloading, setIsloading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showProductList, setShowProductList] = useState(false);
  const [liste_deriv, setListe_deriv] = useState<PDV[]>([]);
  const [selectedDerivId, setSelectedDerivId] = useState<number | ''>('');
  const [raison, setRaison] = useState<string>('');
  const [isDirect, setIsDirect] = useState(false); // ✅ produit sans dérivée

  const [formProductId, setFormProductId] = useState<number | ''>('');
  const [formProductName, setFormProductName] = useState<string>('');
  const [formExitItem, setFormExitItem] = useState<StockExitItem>({
    id_produit: 0,
    nom_produit: '',
    quantite: 1,
    count: undefined,
    designation: '',
    ref: '',
  });

  const openModal = () => {
    setFormProductId('');
    setFormProductName('');
    setSearchTerm('');
    setFormExitItem({ id_produit: 0, nom_produit: '', quantite: 1, count: undefined, designation: '', ref: '' });
    setSelectedDerivId('');
    setListe_deriv([]);
    setIsDirect(false);
    setShowModal(true);
  };

  const addExitItem = () => {
    if (formProductId === '') {
      toast({ title: "Attention", description: "Sélectionnez un produit.", variant: "destructive" });
      return;
    }
    if (formExitItem.quantite <= 0) {
      toast({ title: "Attention", description: "La quantité doit être supérieure à 0.", variant: "destructive" });
      return;
    }

    // Résoudre la désignation
    let designation = formExitItem.designation?.trim() || '';
    if (!designation && selectedDerivId !== '') {
      const deriv = liste_deriv.find(d => d.id === Number(selectedDerivId));
      if (deriv) designation = deriv.designation || '';
    }

    if (!designation) {
      toast({ title: "Attention", description: "Sélectionnez une variante.", variant: "destructive" });
      return;
    }

    // ✅ Vérification stock côté frontend pour les dérivées
    if (!isDirect && selectedDerivId !== '') {
      const deriv = liste_deriv.find(d => d.id === Number(selectedDerivId));
      if (deriv && deriv.nombre !== undefined && formExitItem.quantite > deriv.nombre) {
        toast({
          title: "Stock insuffisant",
          description: `Stock disponible : ${deriv.nombre}, demandé : ${formExitItem.quantite}`,
          variant: "destructive",
        });
        return;
      }
    }

    setStockExits(prev => [...prev, {
      id_produit: Number(formProductId),
      nom_produit: formProductName,
      quantite: formExitItem.quantite,
      count: formExitItem.count,
      designation,
      id_deriv: isDirect ? undefined : (selectedDerivId === '' ? undefined : Number(selectedDerivId)),
      ref: formExitItem.ref || '',
      is_direct: isDirect,
    }]);

    // Reset du formulaire dans la modale (on garde la modale ouverte pour ajouter d'autres sorties)
    setFormExitItem({ id_produit: 0, nom_produit: '', quantite: 1, count: undefined, designation: '', ref: '' });
    setFormProductId('');
    setFormProductName('');
    setSearchTerm('');
    setSelectedDerivId('');
    setListe_deriv([]);
    setIsDirect(false);
  };

  const removeExitItem = (index: number) => {
    setStockExits(stockExits.filter((_, i) => i !== index));
  };

  const sendStockExits = async () => {
    if (stockExits.length === 0) {
      toast({ title: "Attention", description: "Ajoutez au moins une sortie." });
      return;
    }
    if (!raison.trim()) {
      toast({ title: "Attention", description: "La raison est obligatoire.", variant: "destructive" });
      return;
    }

    setIsloading(true);

    // Grouper par produit parent
    const grouped: Record<number, {
      id: number | null;
      quantite: number;
      count?: number;
      designation: string;
      ref?: string;
      is_direct?: boolean;
    }[]> = {};

    stockExits.forEach(item => {
      const pid = Number(item.id_produit);
      if (!grouped[pid]) grouped[pid] = [];
      grouped[pid].push({
        id: item.id_deriv ?? null,
        quantite: item.quantite,
        count: item.count,
        designation: item.designation,
        ref: item.ref,
        is_direct: item.is_direct ?? false,
      });
    });

    const payload = {
      liste_sortie: Object.keys(grouped).map(key => ({
        id_produit: Number(key),
        panier: grouped[Number(key)],
      })),
      raison: raison.trim(),
    };

    try {
      const res = await API.post("catalogue/produits-dv/sortie/", payload);
      const { url, filename } = res.data.data;

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setStockExits([]);
      setRaison('');
      setShowModal(false);
      toast({ title: "Succès", description: "Sorties enregistrées avec succès." });
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

  // ✅ Charge les dérivées et pré-sélectionne si besoin
  const FetchDerivproduit = async (
    id: number,
    name: string,
    preSelectedDerivId?: number
  ) => {
    try {
      const response = await API.get(`catalogue/produits-dv/par_produit/?product=${id}`);
      const derivees: PDV[] = response.data.data;
      setListe_deriv(derivees);

      if (preSelectedDerivId) {
        // L'utilisateur a tapé directement une dérivée → pré-sélectionner
        const sel = derivees.find(d => d.id === preSelectedDerivId);
        setSelectedDerivId(preSelectedDerivId);
        setIsDirect(false);
        if (sel) {
          setFormExitItem(prev => ({ ...prev, designation: sel.designation || '' }));
        }
      } else if (derivees.length === 0) {
        // Aucune dérivée → sortie directe
        setSelectedDerivId('');
        setIsDirect(true);
        setFormExitItem(prev => ({ ...prev, designation: name }));
      } else {
        // Des dérivées existent → l'utilisateur choisit
        setSelectedDerivId('');
        setIsDirect(false);
        setFormExitItem(prev => ({ ...prev, designation: '' }));
      }
    } catch {
      setListe_deriv([]);
      setIsDirect(false);
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
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Sorties de Stock</h2>
        <button
          onClick={openModal}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-700 transition-all duration-200 font-semibold"
        >
          + Faire une sortie
        </button>
      </div>

      <h3 className="text-xl font-semibold mb-4 text-gray-800">Sorties en attente</h3>

      {isloading && (
        <div className="flex items-center gap-2 text-blue-600 animate-pulse mb-4">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Enregistrement en cours...
        </div>
      )}

      {stockExits.length === 0 ? (
        <p className="text-gray-500 italic">Aucune sortie de stock pour le moment.</p>
      ) : (
        <>
          <ul className="space-y-4">
            {stockExits.map((item, index) => (
              <li key={index} className="bg-gray-50 rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <strong className="text-gray-900 font-medium">{item.nom_produit}</strong>
                  <button
                    onClick={() => removeExitItem(index)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
                <div className="ml-4 mt-2 flex items-center gap-2 text-gray-700 text-sm flex-wrap">
                  <span>Quantité : <strong>{item.quantite}</strong></span>
                  {item.ref && (
                    <>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-500">Réf : {item.ref}</span>
                    </>
                  )}
                  {item.is_direct && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">direct</span>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Raison <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={raison}
              required
              placeholder="Ex : Vente client, livraison commande #123..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
              onChange={(e) => setRaison(e.target.value)}
            />
          </div>

          <button
            onClick={sendStockExits}
            disabled={isloading}
            className="mt-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-green-700 transition-all duration-200 font-semibold disabled:opacity-50"
          >
            Enregistrer les sorties
          </button>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg border border-gray-200/50 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-6 text-blue-800">Faire une sortie de stock</h2>

            {/* Recherche produit ou dérivée */}
            <div className="mb-6 relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Produit ou variante à sortir :
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
                          FetchDerivproduit(prod.parent_id!, prod.parent_name!, prod.id);
                        } else {
                          // Produit parent sélectionné
                          setFormProductId(prod.id!);
                          setFormProductName(prod.name);
                          setSearchTerm(prod.name);
                          setShowProductList(false);
                          FetchDerivproduit(prod.id!, prod.name);
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
                        <p className="text-xs text-gray-400 mt-0.5 ml-0.5">→ {prod.parent_name}</p>
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

            {/* Sélection variante ou message direct */}
            <div className="flex flex-col gap-3 mb-4">
              {liste_deriv.length > 0 ? (
                <>
                  <label className="block text-sm font-medium text-gray-700">Variante :</label>
                  <select
                    value={selectedDerivId === '' ? '' : String(selectedDerivId)}
                    onChange={(e) => {
                      const v = e.target.value;
                      const id = v === '' ? '' : Number(v);
                      setSelectedDerivId(id);
                      const deriv = liste_deriv.find(d => d.id === Number(id));
                      if (deriv) {
                        setFormExitItem(prev => ({ ...prev, designation: deriv.designation || '' }));
                      }
                    }}
                    className="w-full px-3 py-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="">-- Choisir une variante --</option>
                    {liste_deriv.map((deriv: PDV) => (
                      <option key={deriv.id} value={deriv.id}>
                        {deriv.designation} (en stock : {deriv.nombre ?? 0} unités)
                      </option>
                    ))}
                  </select>
                </>
              ) : formProductId !== '' ? (
                <p className="text-sm text-gray-500 italic px-1 py-2 bg-gray-50 rounded-lg border border-gray-100">
                  ✓ Aucune variante — sortie directe sur <strong>{formProductName}</strong>
                </p>
              ) : null}

              <div>
                <label className="text-xs text-gray-600 mb-1 block">
                  Quantité ({liste_deriv.find(d => d.id === Number(selectedDerivId))?.infos?.unite_mesure || 'u'}) :
                </label>
                <input
                  type="number"
                  step="any"
                  value={formExitItem.quantite}
                  min={0}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setFormExitItem({ ...formExitItem, quantite: val });
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
                />
              </div>



              <div>
                <label className="text-xs text-gray-600 mb-1 block">Référence :</label>
                <input
                  type="text"
                  value={formExitItem.ref}
                  onChange={(e) => setFormExitItem({ ...formExitItem, ref: e.target.value })}
                  placeholder="Bon de commande / Facture / Reçu..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
                />
              </div>

              <button
                onClick={addExitItem}
                type="button"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-lg hover:opacity-90 transition-all font-semibold shadow-sm"
              >
                + Ajouter la sortie
              </button>
            </div>

            {/* Liste des sorties ajoutées dans la modale */}
            {stockExits.length > 0 && (
              <div className="mt-2 border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
                  Sorties en attente ({stockExits.length})
                </p>
                <ul className="space-y-1 max-h-36 overflow-y-auto">
                  {stockExits.map((item, index) => (
                    <li key={index} className="flex items-center justify-between text-sm text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg">
                      <span>
                        {item.nom_produit} · {item.designation} · Qté: <strong>{item.quantite}</strong>
                      </span>
                      <button
                        onClick={() => removeExitItem(index)}
                        className="text-red-400 hover:text-red-600 ml-2 text-xs"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagerSortie;