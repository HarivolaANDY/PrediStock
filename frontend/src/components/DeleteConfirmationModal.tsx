import { X } from "lucide-react"

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, productName }: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  productName: string
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Supprimer le produit</h2>
        <p className="text-gray-600 mb-6">
          Êtes-vous sûr de vouloir supprimer <strong>{productName}</strong> ? Cette action est irréversible.
        </p>
        <div className="flex justify-end gap-3">
          <button className="px-4 py-2 border rounded-md hover:bg-gray-100" onClick={onClose}>
            Annuler
          </button>
          <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700" onClick={onConfirm}>
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}
