import React, { useState } from 'react'
import { Upload, X } from 'lucide-react'

interface ProcessedProduct {
  id: string
  name: string
  category: string
  price: number
  stock: number
  status: string
  image: string
  sold: number
  revenue: number
}

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (data: ProcessedProduct[]) => void
}

const ImportModalGenerer: React.FC<ImportModalProps> = ({ isOpen, onClose }) => {
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const handleImport = async () => {
    if (!file) return
    
    setIsLoading(true)
    
    try {
      const formData = new FormData()
      formData.append('file_uploaded', file)
      formData.append('name', file.name)
      formData.append('target_table', 'generer')
      formData.append('update_table', 'false')

      const token = localStorage.getItem('token')
      
      const response = await fetch('http://localhost:8000/api/data-import/', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Token ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Erreur lors de l\'import')
      }

      const result = await response.json()
      console.log('Import réussi:', result)
      alert('Import réussi ! Le fichier a été envoyé pour traitement.')
      handleClose()
    } catch (error) {
      console.error('Erreur lors de l\'import:', error)
      alert(error instanceof Error ? error.message : 'Erreur lors de l\'import')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setIsLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Importer des produits</h2>
          <button 
            onClick={handleClose} 
            className="text-gray-500 hover:text-gray-700 transition-colors"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3">Sélectionner un fichier</h3>
          <input
            type="file"
            accept=".csv,.xlsx,.xls,.json,.parquet"
            onChange={handleFileChange}
            disabled={isLoading}
            className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
          />
          {file && (
            <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-200">
              <p className="text-sm text-gray-600">
                Fichier sélectionné: <span className="font-medium">{file.name}</span>
              </p>
              <p className="text-sm text-gray-600">
                Taille: <span className="font-medium">{(file.size / 1024).toFixed(2)} KB</span>
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleImport}
            disabled={isLoading || !file}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Import en cours...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Importer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ImportModalGenerer