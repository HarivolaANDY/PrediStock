import React, { useState, useEffect } from 'react';
import API from "@/services/axios";
import { PanierItem, ProduitInserer, CreateProductData } from '@/types/types';
import { Select, SelectContent, SelectItem } from '@radix-ui/react-select';
import { SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { parseAxiosBlobResponse, downloadAll } from "@/utils/blobUtils";

interface StockExitItem {
  id_produit: number;
  quantite: number;
  designation: string;
  id_deriv?: number; // <- ajout : id de la dérivée (produit dérivé)
  ref? : string;
}

const ProductManagerSortie = () => {
  const [liste_produit, setListe_produit] = useState<CreateProductData[]>([]);
  const [stockExits, setStockExits] = useState<StockExitItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isloading, setIsloading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showProductList, setShowProductList] = useState(false);
  const [liste_deriv, setListe_deriv] = useState<any[]>([]);
  const [selectedDerivId, setSelectedDerivId] = useState<number | ''>('');
  const [downloadedFiles, setDownloadedFiles] = useState<{ blob: Blob; filename: string }[]>([]); // Nouvelle liste pour accumuler les fichiers

  // Formulaire modal states
  const [formProductId, setFormProductId] = useState<number | ''>('');
  const [raison, setRaison] = useState<string>('');
  const [formExitItem, setFormExitItem] = useState<StockExitItem>({
    id_produit: 0,
    quantite: 1,
    designation: '',
    ref : "Ref-sortie"
  });

  // Ouvre le modal et réinitialise le formulaire
  const openModal = () => {
    setFormProductId('');
    setFormExitItem({ id_produit: 0, quantite: 1, designation: '' , ref : ''});
    setShowModal(true);
  };

  // Ajoute un article de sortie dans la liste
  const addExitItem = () => {
    // Utiliser la dérivée sélectionnée si présente pour remplir la designation
    if (formProductId !== '' && formExitItem.quantite > 0) {
      let designation = formExitItem.designation?.trim() || '';
      if (!designation && selectedDerivId !== '') {
        const deriv = liste_deriv.find(d => d.id === Number(selectedDerivId));
        if (deriv) designation = deriv.designation || deriv.name || '';
      }

      if (!designation) return; // ne rien faire si pas de désignation

      setStockExits(prev => [
        ...prev,
        {
          id_produit: Number(formProductId),
          quantite: formExitItem.quantite,
          designation,
          id_deriv: selectedDerivId === '' ? undefined : Number(selectedDerivId),
          ref: formExitItem.ref || '' // utiliser la référence saisie dans le formulaire
        }
      ]);

      // reset form (NE PAS FERMER le modal pour permettre d'ajouter plusieurs items)
      setFormExitItem({ id_produit: 0, quantite: 1, designation: '' , ref:''});
      setFormProductId('');
      setSearchTerm('');
      setSelectedDerivId(''); // reset selection
      // ne pas fermer le modal : setShowModal(false);
    }
  };
  
  // Supprime un article de sortie
  const removeExitItem = (index: number) => {
    setStockExits(stockExits.filter((_, i) => i !== index));
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

  // Envoie les sorties de stock au backend
  const sendStockExits = async () => {
    if (stockExits.length === 0) return;
    setIsloading(true);
    const newFiles: { blob: Blob; filename: string }[] = [];

    // Grouper par produit parent pour correspondre au backend
    const grouped: Record<number, any[]> = {};
    stockExits.forEach(item => {
      const pid = Number(item.id_produit);
      if (!grouped[pid]) grouped[pid] = [];
      grouped[pid].push({
        id: item.id_deriv ?? null, // id de la dérivée attendu par le backend
        quantite: item.quantite,
        designation: item.designation,
        ref:item.ref
      });
    });

    const liste_sortie_payload = {
      liste_sortie: Object.keys(grouped).map(key => ({
        id_produit: Number(key),
        panier: grouped[Number(key)]
      })),
      raison: raison, // raison globale (à améliorer plus tard)

    };

    try {
      const res = await API.post("/produits_dv/sortie/", liste_sortie_payload, { responseType: 'blob' });
      const parsed = await parseAxiosBlobResponse(res, "Ordre_de_sorite.pdf");

      if (parsed.files && parsed.files.length) {
        // accumuler fichiers et (optionnel) déclencher le téléchargement immédiat
        setDownloadedFiles(prev => [...prev, ...parsed.files]);
        // downloadAll(parsed.files) // décommenter si téléchargement immédiat désiré
      }

      if (parsed.json) {
        console.log("JSON response:", parsed.json);
      }

      // Vider les stockExits après succès
      stockExits.splice(0, stockExits.length);
      setStockExits([...stockExits]); // Forcer le re-render
      setRaison('');
      setShowModal(false); // fermer le modal après envoi réussi
    } catch (err) {
      console.log(err);
    } finally {
      setIsloading(false);
    }
  };

  // Recherche de produits
  const FetchProducts_filtered = async () => {
    try {
      const data = { chercher: searchTerm };
      const res = await API.post("/product/", data);
      setListe_produit(res.data.data || []);
    } catch (err) {
      console.log(err);
      setListe_produit([]);
    }
  };

  const FetchDerivproduit = async(id?:number) =>{
    if (id){
      try{
        const res = await API.get(`produits_dv/par_produit/?product=${id}`).then((reponse)=>{
          setListe_deriv(reponse.data.data);
          setSelectedDerivId(''); // reset selection when changing product
        })
      }
      catch(err){
        console.log(err);
      }
    }
  }

  // Debounce pour éviter trop d'appels API
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm) {
        FetchProducts_filtered();
      } else {
        setListe_produit([]);
      }

    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

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
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Sorties de Stock</h3>
      {isloading && <p className="text-gray-600 animate-pulse">Enregistrement en cours...</p>}
      {stockExits.length === 0 ? (
        <p className="text-gray-500 italic">Aucune sortie de stock pour le moment.</p>
      ) : (
        <>
          <ul className="space-y-4">
            {stockExits.map((item, index) => (
              <li key={index} className="bg-gray-50 rounded-lg p-4 shadow-sm border border-gray-100 transition-all hover:shadow-md">
                <div className="flex items-center justify-between">
                  <strong className="text-gray-900 font-medium">ID: {item.id_produit}</strong>
                  <button
                    onClick={() => removeExitItem(index)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
                  >
                    Supprimer Sortie
                  </button>
                </div>
                <div className="ml-4 mt-3 text-gray-700 text-sm">
                  <span>- {item.designation} | Quantité: {item.quantite}</span>
                </div>
              </li>
            ))}
          </ul>
          <div>
            <Input 
              type="text" 
              required
              placeholder="Ajouter une raison globale pour cette sortie" className="mt-4 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors bg-gray-50"
              onChange={(e)=>{
                setRaison(e.target.value);
              }}
            />
          </div>
          <button
            onClick={sendStockExits}
            className="mt-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-green-700 transition-all duration-200 font-semibold"
          >
            Enregistrer les sorties
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

      {/* Modal pour ajouter une sortie de stock */}
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
            <h2 className="text-2xl font-bold mb-6 text-blue-800">Faire une sortie de stock</h2>
            <div className="mb-6 relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Produit à sortir :</label>
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
                          setSearchTerm(prod.name + ' (' + prod.unite_mesure + ')');
                          setFormExitItem({ ...formExitItem, designation: prod.name + ' (' + prod.unite_mesure + ')' });
                          setShowProductList(false);
                          FetchDerivproduit(prod.id);
                        }}
                      >
                        {prod.name} {prod.description ? <span className="text-gray-500 text-sm">– {prod.description}</span> : ''} 
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-gray-400 text-sm">Aucun produit trouvé ou en cours de recherche...</div>
                  )}
                </div>
              )}
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Designation de la sortie :</label>
            <div className="flex flex-col gap-3 mb-4">
              {/* select pour choisir la dérivée (remplit la designation) */}
              <select
                value={selectedDerivId === '' ? '' : String(selectedDerivId)}
                onChange={(e) => {
                  const v = e.target.value;
                  const id = v === '' ? '' : Number(v);
                  setSelectedDerivId(id);
                  const deriv = liste_deriv.find(d => d.id === Number(id));
                  if (deriv) {
                    // pré-remplit la désignation pour l'utilisateur
                    setFormExitItem(prev => ({ ...prev, designation: deriv.designation || deriv.name || '' }));
                  }
                }}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">-- Choisir une dérivée --</option>
                {liste_deriv.map((deriv)=>(
                  <option key={deriv.id} value={deriv.id}>
                    {deriv.designation || deriv.name} (en stock: {deriv.nombre})
                  </option>
                ))}
              </select>

              <div className="flex-1">
                <label className="text-xs text-gray-600 mb-1 block">Nombre à sortir :</label>
                <input
                  type="number"
                  value={formExitItem.quantite}
                  min={1}
                  onChange={(e) => setFormExitItem({ ...formExitItem, quantite: Number(e.target.value) })}
                  placeholder="Quantité"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors bg-gray-50"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-600 mb-1 block">Réferrence :</label>
                <input
                  type="text"
                  value={formExitItem.ref}
                  onChange={(e) => setFormExitItem({ ...formExitItem, ref: e.target.value} )}
                  placeholder="Bon de Commande / Facture / Reçu ..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors bg-gray-50"
                />
              </div>
              <button
                onClick={addExitItem}
                type="button"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 font-semibold shadow-sm hover:shadow-md"
              >
                + Ajouter la sortie
              </button>
            </div>
            {/* <button
              onClick={sendStockExits}
              className="w-full mt-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Enregistrer la sortie
            </button> */}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagerSortie;