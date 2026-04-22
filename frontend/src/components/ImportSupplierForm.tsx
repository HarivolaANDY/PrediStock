import { useState } from "react"
import { X, Upload, FileText, AlertCircle, CheckCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import * as XLSX from 'xlsx'

interface ImportSupplierFormProps {
  onClose: () => void
  onImport: (data: ImportedSupplier[]) => Promise<void>
  onSuccess?: () => void
}

interface ImportedSupplier {
  name: string
  email: string
  phone?: string
  address?: string
  lead_time?: number
  min_order_quantity?: number
  max_order_quantity?: number
  products?: string  // ex: "Riz;Maïs;Farine"
}

interface ImportError {
  row: number
  field: string
  message: string
}

export function ImportSupplierForm({ onClose, onImport, onSuccess }: ImportSupplierFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileFormat, setFileFormat] = useState("")
  const [previewData, setPreviewData] = useState<ImportedSupplier[]>([])
  const [errors, setErrors] = useState<ImportError[]>([])
  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload')
  const [includeHeaders, setIncludeHeaders] = useState(true)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setSelectedFile(file)
    if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase()
      setFileFormat(extension || '')
    }
  }

  const validateSupplierData = (data: Record<string, unknown>[]): { valid: ImportedSupplier[], errors: ImportError[] } => {
    const valid: ImportedSupplier[] = []
    const errors: ImportError[] = []

    const fieldAliases = {
      name: ['nom', 'names', 'noms', 'name'],
      email: ['email', 'supplier email', 'courriel'],
      phone: ['phone number', 'phone', 'telephone', 'tel'],
      address: ['address', 'adresse'],
      lead_time: ['delai', 'lead time', 'lead_time'],
      min_order_quantity: ['quantité minimale de commande', 'minimum order quantity', 'min_order_quantity'],
      max_order_quantity: ['quantité maximale de commande', 'maximum order quantity', 'max_order_quantity'],
      products: ['products', 'produits', 'articles'],
    }

    const findValueByAliases = (row: Record<string, unknown>, aliases: string[]): string | undefined => {
      return aliases.reduce((found: string | undefined, alias: string) => {
        return found || row[alias]?.toString().trim()
      }, undefined)
    }

    data.forEach((row, index) => {
      const supplier: Partial<ImportedSupplier> = {}
      const rowNum = index + 1

      const name = findValueByAliases(row, fieldAliases.name)
      if (!name) {
        errors.push({ row: rowNum, field: 'name', message: 'Le nom est obligatoire' })
        return
      }
      supplier.name = name

      const email = findValueByAliases(row, fieldAliases.email)
      if (!email) {
        errors.push({ row: rowNum, field: 'email', message: "L'email est obligatoire" })
        return
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        errors.push({ row: rowNum, field: 'email', message: "Format d'email invalide" })
        return
      }
      supplier.email = email

      const phone = findValueByAliases(row, fieldAliases.phone)
      if (phone) supplier.phone = phone

      const address = findValueByAliases(row, fieldAliases.address)
      if (address) supplier.address = address

      const leadTime = findValueByAliases(row, fieldAliases.lead_time)
      if (leadTime) {
        const leadTimeNum = parseInt(leadTime)
        if (isNaN(leadTimeNum) || leadTimeNum < 0) {
          errors.push({ row: rowNum, field: 'lead_time', message: 'Le délai doit être un nombre positif' })
          return
        }
        supplier.lead_time = leadTimeNum
      }

      const minOrder = findValueByAliases(row, fieldAliases.min_order_quantity)
      if (minOrder) {
        const minOrderNum = parseInt(minOrder)
        if (isNaN(minOrderNum) || minOrderNum < 0) {
          errors.push({ row: rowNum, field: 'min_order_quantity', message: 'La quantité minimale doit être un nombre positif' })
          return
        }
        supplier.min_order_quantity = minOrderNum
      }

      const maxOrder = findValueByAliases(row, fieldAliases.max_order_quantity)
      if (maxOrder) {
        const maxOrderNum = parseInt(maxOrder)
        if (isNaN(maxOrderNum) || maxOrderNum < 0) {
          errors.push({ row: rowNum, field: 'max_order_quantity', message: 'La quantité maximale doit être un nombre positif' })
          return
        }
        supplier.max_order_quantity = maxOrderNum
      }

      const products = findValueByAliases(row, fieldAliases.products)
      if (products) supplier.products = products

      valid.push(supplier as ImportedSupplier)
    })

    return { valid, errors }
  }

  const parseCSV = (text: string): Record<string, unknown>[] => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length === 0) return []
    const headers = includeHeaders
      ? lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      : ['name', 'email', 'phone', 'address', 'lead_time', 'min_order_quantity', 'max_order_quantity', 'products']
    const dataLines = includeHeaders ? lines.slice(1) : lines
    return dataLines.map(line => {
      // Gère les valeurs entre guillemets contenant des virgules (ex: "Riz;Maïs")
      const values: string[] = []
      let current = ''
      let inQuotes = false
      for (const char of line) {
        if (char === '"') { inQuotes = !inQuotes }
        else if (char === ',' && !inQuotes) { values.push(current.trim()); current = '' }
        else { current += char }
      }
      values.push(current.trim())
      const row: any = {}
      headers.forEach((header, index) => { row[header] = values[index]?.replace(/"/g, '') || '' })
      return row
    })
  }

  const parseJSON = (text: string): Record<string, unknown>[] => {
    try {
      const data = JSON.parse(text)
      return Array.isArray(data) ? data : [data]
    } catch {
      throw new Error('Format JSON invalide')
    }
  }

  const parseXLSX = async (file: File): Promise<Record<string, unknown>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: 'binary' })
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: includeHeaders ? undefined : ['name', 'email', 'phone', 'address', 'lead_time', 'min_order_quantity', 'max_order_quantity', 'products'],
            blankrows: false
          }) as Record<string, unknown>[]
          resolve(jsonData)
        } catch (error) {
          reject(new Error('Erreur lors de la lecture du fichier Excel'))
        }
      }
      reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'))
      reader.readAsBinaryString(file)
    })
  }

  const handlePreview = async () => {
    if (!selectedFile) return
    setIsLoading(true)
    try {
      let parsedData: Record<string, unknown>[] = []
      switch (fileFormat) {
        case 'csv':
          parsedData = parseCSV(await selectedFile.text())
          break
        case 'json':
          parsedData = parseJSON(await selectedFile.text())
          break
        case 'xlsx':
          parsedData = await parseXLSX(selectedFile)
          break
        default:
          throw new Error('Format de fichier non supporté')
      }
      const { valid, errors } = validateSupplierData(parsedData)
      setPreviewData(valid)
      setErrors(errors)
      setStep('preview')
    } catch (error) {
      console.error("Erreur lors de l'analyse du fichier:", error)
      setErrors([{ row: 0, field: 'file', message: "Erreur lors de l'analyse du fichier" }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleImport = async () => {
    if (!selectedFile || previewData.length === 0) {
      alert('Aucun fichier sélectionné ou aucune donnée valide')
      return
    }
    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const results = { success: 0, errors: 0 }

      for (const supplier of previewData) {
        try {
          const response = await fetch('http://localhost:8000/api/catalogue/suppliers/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Token ${token}`
            },
            body: JSON.stringify({
              name: supplier.name,
              email: supplier.email,
              phone: supplier.phone || '',
              address: supplier.address || '',
              lead_time: supplier.lead_time ?? 0,
              min_order_quantity: supplier.min_order_quantity ?? 0,
              max_order_quantity: supplier.max_order_quantity ?? 0,
              is_active: true,
              products: supplier.products || '',
            })
          })

          if (response.ok) {
            results.success++
          } else {
            const err = await response.text()
            console.error(`Erreur fournisseur ${supplier.name}:`, err)
            results.errors++
          }
        } catch (err) {
          console.error(`Erreur réseau pour ${supplier.name}:`, err)
          results.errors++
        }
      }

      console.log(`Import terminé: ${results.success} succès, ${results.errors} erreurs`)

      if (results.success > 0) {
        setStep('success')
        if (onSuccess) onSuccess()
      }

      if (results.errors > 0) {
        alert(`${results.success} fournisseur(s) importé(s), ${results.errors} échec(s).`)
      }

    } catch (error) {
      console.error("Erreur lors de l'import:", error)
      alert(error instanceof Error ? error.message : "Erreur lors de l'import")
    } finally {
      setIsLoading(false)
    }
  }

  const renderUploadStep = () => (
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Fichier de données</label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <div className="space-y-2">
            <Input
              type="file"
              accept=".csv,.json,.xlsx"
              onChange={handleFileChange}
              className="w-full"
            />
            <p className="text-sm text-gray-500">Formats supportés: CSV, JSON, Excel</p>
          </div>
        </div>
        {selectedFile && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-md">
            <FileText className="h-4 w-4 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Format du fichier</label>
        <Select value={fileFormat} onValueChange={setFileFormat}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner le format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="csv">CSV</SelectItem>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="xlsx">XLSX</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Options</label>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={includeHeaders}
            onChange={(e) => setIncludeHeaders(e.target.checked)}
          />
          <span className="text-sm">Le fichier contient des en-têtes</span>
        </label>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Format attendu (CSV):</strong><br />
          <code className="text-xs">name,email,phone,address,lead_time,min_order_quantity,max_order_quantity,products</code><br /><br />
          <strong>Exemple:</strong><br />
          <code className="text-xs">Fournisseur A,a@mail.com,032...,Antananarivo,7,10,500,Riz;Maïs;Farine</code><br /><br />
          <strong>Champs obligatoires:</strong> name, email<br />
          <strong>Produits:</strong> séparés par <code>;</code> dans la colonne <code>products</code>
        </AlertDescription>
      </Alert>

      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button
          onClick={handlePreview}
          disabled={!selectedFile || !fileFormat || isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading ? 'Analyse...' : 'Prévisualiser'}
        </Button>
      </div>
    </CardContent>
  )

  const renderPreviewStep = () => (
    <CardContent className="space-y-4">
      {errors.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{errors.length} erreur(s) détectée(s):</strong>
            <ul className="mt-2 space-y-1">
              {errors.slice(0, 5).map((error, index) => (
                <li key={index} className="text-sm">
                  Ligne {error.row}: {error.message} ({error.field})
                </li>
              ))}
              {errors.length > 5 && <li className="text-sm">... et {errors.length - 5} autres</li>}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{previewData.length}</div>
          <div className="text-sm text-green-800">Valides</div>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{errors.length}</div>
          <div className="text-sm text-red-800">Erreurs</div>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{previewData.length + errors.length}</div>
          <div className="text-sm text-blue-800">Total</div>
        </div>
      </div>

      {previewData.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Aperçu des données valides (5 premiers)</h4>
          <div className="border rounded-md max-h-64 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Adresse</TableHead>
                  <TableHead>Délai</TableHead>
                  <TableHead>Qté min/max</TableHead>
                  <TableHead>Produits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.slice(0, 5).map((supplier, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.email}</TableCell>
                    <TableCell>{supplier.phone || '-'}</TableCell>
                    <TableCell>{supplier.address || '-'}</TableCell>
                    <TableCell>{supplier.lead_time ? `${supplier.lead_time} jours` : '-'}</TableCell>
                    <TableCell>{supplier.min_order_quantity || '-'} / {supplier.max_order_quantity || '-'}</TableCell>
                    <TableCell>{supplier.products?.replace(/;/g, ', ') || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={() => setStep('upload')}>Retour</Button>
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button
          onClick={handleImport}
          disabled={previewData.length === 0 || isLoading}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {isLoading ? 'Importation...' : `Importer ${previewData.length} fournisseur(s)`}
        </Button>
      </div>
    </CardContent>
  )

  const renderSuccessStep = () => (
    <CardContent className="text-center space-y-4">
      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-green-800">Importation réussie !</h3>
        <p className="text-green-600">{previewData.length} fournisseur(s) ont été importé(s) avec succès.</p>
      </div>
      <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">
        Fermer
      </Button>
    </CardContent>
  )

  return (
    <div className="fixed inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Importer des Fournisseurs</CardTitle>
              <CardDescription>
                Importer des données fournisseur depuis un fichier CSV, JSON ou Excel
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {step === 'upload' && renderUploadStep()}
        {step === 'preview' && renderPreviewStep()}
        {step === 'success' && renderSuccessStep()}
      </Card>
    </div>
  )
}