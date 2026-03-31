import React, { useState } from 'react';
import API from "@/services/axios";
import { PanierItem, ProduitInserer } from '@/types/types';


const ProductManager = () => {
  const [products, setProducts] = useState<ProduitInserer[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Formulaire modal states
  const [formProductId, setFormProductId] = useState<number | ''>('');
  const [formPanierItem, setFormPanierItem] = useState<PanierItem>({
    designation: '',
    nombre: 1,
    quantite: 0,
  });
  const [formPanier, setFormPanier] = useState<PanierItem[]>([]);

  // Ouvre le modal et réinitialise le formulaire
  const openModal = () => {
    setFormProductId('');
    setFormPanierItem({ designation: '', nombre: 1, quantite: 0 });
    setFormPanier([]);
    setShowModal(true);
  };

  // Ajoute une variante (panier item) dans le formulaire
  const addFormPanierItem = () => {
    if (formPanierItem.designation.trim()) {
      setFormPanier([...formPanier, formPanierItem]);
      setFormPanierItem({ designation: '', nombre: 1, quantite: 0 });
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

  // Prépare la structure à envoyer au backend
  const liste_inserer = products;

  const SaveProducts = () =>{
    const reponse = API.get("/product/derive/")
  }
  // Exemple d'envoi au backend (à adapter selon ton API)
  // fetch('/api/produits', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ liste_inserer }),
  // })

  return (
    <div className="bg-white shadow-lg rounded-xl p-8 border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-blue-700">Gestion des Produits</h2>
        <button
          onClick={openModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Ajouter un produit
        </button>
      </div>
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Produits Ajoutés</h3>
      {products.length === 0 ? (
        <p className="text-gray-500">Aucun produit ajouté pour le moment.</p>
      ) : (
        <ul>
          {products.map((product, productIndex) => (
            <li key={productIndex} className="mb-6 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <strong className="text-blue-700">ID: {product.id_produit}</strong>
                <button
                  onClick={() => removeProduct(productIndex)}
                  className="text-red-500 hover:underline text-xs"
                >
                  Supprimer Produit
                </button>
              </div>
              {product.panier.length > 0 ? (
                <ul className="ml-4 mt-2">
                  {product.panier.map((item, variantIndex) => (
                    <li key={variantIndex} className="flex items-center justify-between text-gray-700">
                      <span>
                        - {item.designation} | Nombre: {item.nombre} | Quantité: {item.quantite}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ml-4 text-gray-400">Aucune variante.</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Modal pour ajouter un produit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl"
              aria-label="Fermer"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-4 text-blue-700">Ajouter un produit</h2>
            <label className="block text-sm font-medium text-gray-700 mb-1">ID du produit :</label>
            <input
              type="number"
              value={formProductId}
              onChange={(e) => setFormProductId(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Ex: 1"
              className="w-full mb-3 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <label className="block text-sm font-medium text-gray-700 mb-1">Variante (panier) :</label>
            <div className="flex flex-col gap-2 mb-2">
              <input
                type="text"
                value={formPanierItem.designation}
                onChange={(e) => setFormPanierItem({ ...formPanierItem, designation: e.target.value })}
                placeholder="Désignation (ex: Cuvette)"
                className="mb-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <label htmlFor="">Quantite par unité :</label>
              <input
                type="number"
                value={formPanierItem.quantite}
                min={1}
                onChange={(e) => setFormPanierItem({ ...formPanierItem, quantite: Number(e.target.value) })}
                placeholder="Nombre"
                className="mb-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <label htmlFor="">Nombre :</label>
              <input
                type="number"
                value={formPanierItem.nombre}
                min={0}
                onChange={(e) => setFormPanierItem({ ...formPanierItem, nombre: Number(e.target.value) })}
                placeholder="Quantité"
                className="mb-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button
                onClick={addFormPanierItem}
                type="button"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Ajouter au panier
              </button>
            </div>
            {formPanier.length > 0 && (
              <ul className="mb-2">
                {formPanier.map((item, index) => (
                  <li key={index} className="flex items-center justify-between bg-blue-50 rounded px-3 py-1 mb-1">
                    <span>
                      {item.designation} | Nombre: {item.nombre} | Quantité: {item.quantite}
                    </span>
                    <button
                      onClick={() => removeFormPanierItem(index)}
                      className="text-red-500 hover:underline text-xs"
                    >
                      Supprimer
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={saveProduct}
              className="w-full mt-2 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
            >
              Enregistrer le produit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManager;