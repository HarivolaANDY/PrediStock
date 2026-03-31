import { useState } from "react"
import { X, Loader2, Upload } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
interface ImportDataModalProps {
  onClose: () => void
  onImport: (data: ImportConfig) => Promise<void>
}

interface ImportConfig {
  source: File | null
  format: string
  destination: string
  compression?: boolean
  includeHeaders?: boolean
}

export function ImportDataModal({ onClose, onImport }: ImportDataModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [exportFormat, setExportFormat] = useState("")
  const [destination, setDestination] = useState("")
  const [compression, setCompression] = useState(false)
  const [includeHeaders, setIncludeHeaders] = useState(true)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setSelectedFile(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!selectedFile) {
      alert("Veuillez sélectionner un fichier")
      return
    }
    if (!exportFormat) {
      alert("Veuillez sélectionner un format d'export")
      return
    }
    if (!destination) {
      alert("Veuillez spécifier une destination")
      return
    }

    try {
      setIsLoading(true)
      await onImport({
        source: selectedFile,
        format: exportFormat,
        destination,
        compression,
        includeHeaders,
      })
      onClose()
    } catch (error) {
      alert("Une erreur s'est produite lors de l'import: " + (error instanceof Error ? error.message : "Erreur inconnue"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Importer Données</CardTitle>
              <CardDescription>
                Importer des données au format (CSV, Parquet, JSON, Excel)
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Source de données */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Source de données</label>
            <Input
              type="file"
              accept=".csv,.xlsx,.json,.parquet"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Fichier sélectionné: {selectedFile.name}
              </p>
            )}
          </div>

          {/* Format d'export */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Format d'export</label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="parquet">Parquet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Destination */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Destination</label>
            <Input
              type="text"
              placeholder="Nom du fichier de sortie"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Options</label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={compression}
                  onChange={(e) => setCompression(e.target.checked)}
                  className="form-checkbox h-4 w-4"
                />
                <span>Compression</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includeHeaders}
                  onChange={(e) => setIncludeHeaders(e.target.checked)}
                  className="form-checkbox h-4 w-4"
                />
                <span>Inclure les en-têtes</span>
              </label>
            </div>
          </div>

          {selectedFile && (
            <div className="border rounded-md p-4">
              <h4 className="font-medium mb-2">Aperçu de la configuration</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Fichier source: {selectedFile.name}</p>
                <p>Taille: {(selectedFile.size / 1024).toFixed(2)} KB</p>
                <p>Format d'export: {exportFormat || '-'}</p>
                <p>Destination: {destination || '-'}</p>
                <p>Options: {[
                  compression && 'Compression',
                  includeHeaders && 'En-têtes'
                ].filter(Boolean).join(', ') || 'Aucune'}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button 
              className="text-white bg-bouton hover:bg-bouton-hover"
            >
              Importer
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}