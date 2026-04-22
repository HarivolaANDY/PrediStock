import { useState } from "react"
import { X, FileText, Calendar, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface GenerateReportModalProps {
  onClose: () => void
  onGenerate: (data: {
    type: string;
    format: string;
    dateRange: string;
    includeCharts: boolean;
    priority: string;
    emailNotification: boolean;
    template?: {
      id: string;
      name: string;
      description: string;
      category: string;
      estimatedSize: string;
      estimatedTime: string;
    };
    estimatedTime?: string;
    estimatedSize?: string;
  }) => void
  initialData?: {
    type?: string;
    name?: string;
    category?: string;
  }
}

// Données des modèles de rapports similaires à celles de Reports.tsx
const reportTemplates = [
  {
    id: "inventory",
    name: "Synthèse des stocks",
    description: "Vue d'ensemble complète des niveaux et valeurs actuels du stock",
    category: "Stock",
    estimatedSize: "2.1 MB",
    estimatedTime: "2-3 min"
  },
  {
    id: "forecast",
    name: "Analyse des prévisions",
    description: "Précision des prédictions IA et informations de prévision",
    category: "Prévisions",
    estimatedSize: "1.8 MB",
    estimatedTime: "3-5 min"
  },
  {
    id: "movements",
    name: "Mouvements de stock",
    description: "Suivi détaillé de toutes les transactions d'inventaire",
    category: "Opérations",
    estimatedSize: "950 KB",
    estimatedTime: "1-2 min"
  },
  {
    id: "alerts",
    name: "Synthèse des alertes",
    description: "Résumé de toutes les alertes et problèmes résolus",
    category: "Alertes",
    estimatedSize: "650 KB",
    estimatedTime: "1 min"
  }
]

const formatOptions = [
  { value: "pdf", label: "PDF", description: "Document portable, idéal pour partage" },
  { value: "excel", label: "Excel", description: "Feuille de calcul, éditable et analysable" },
  { value: "csv", label: "CSV", description: "Données brutes, importable facilement" }
]

const priorityOptions = [
  { value: "high", label: "Haute", description: "Traité en priorité (~5 min)", color: "bg-red-100 text-red-800" },
  { value: "normal", label: "Normale", description: "Traitement standard (~15 min)", color: "bg-blue-100 text-blue-800" },
  { value: "low", label: "Basse", description: "Traité quand possible (~30 min)", color: "bg-gray-100 text-gray-800" }
]

export function GenerateReportModal({ onClose, onGenerate, initialData }: GenerateReportModalProps) {
  const [reportType, setReportType] = useState(initialData?.type || "")
  const [format, setFormat] = useState("")
  const [dateRange, setDateRange] = useState("")
  const [includeCharts, setIncludeCharts] = useState(true)
  const [priority, setPriority] = useState("normal")
  const [emailNotification, setEmailNotification] = useState(false)

  const selectedTemplate = reportTemplates.find(t => t.id === reportType)
  const selectedFormat = formatOptions.find(f => f.value === format)
  const selectedPriority = priorityOptions.find(p => p.value === priority)

  const handleGenerate = () => {
    const reportData = {
      type: reportType,
      format: format,
      dateRange: dateRange,
      includeCharts: includeCharts,
      priority: priority,
      emailNotification: emailNotification,
      template: selectedTemplate,
      estimatedTime: selectedTemplate?.estimatedTime,
      estimatedSize: selectedTemplate?.estimatedSize
    }
    
    onGenerate(reportData)
  }

  const isFormValid = reportType && format && dateRange

  return (
    <div className="fixed inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-bouton/10 rounded-lg">
                <FileText className="h-5 w-5 text-bouton" />
              </div>
              <div>
                <CardTitle className="text-xl">Générer un nouveau rapport</CardTitle>
                <CardDescription>
                  Configurez et générez un rapport personnalisé pour vos besoins métiers
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Sélection du type de rapport avec aperçu */}
          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-2">
              Type de rapport
              <Badge variant="outline" className="text-xs">Obligatoire</Badge>
            </label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le type de rapport" />
              </SelectTrigger>
              <SelectContent>
                {reportTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-muted-foreground">{template.category}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Aperçu du rapport sélectionné */}
            {selectedTemplate && (
              <div className="p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm">{selectedTemplate.name}</h4>
                    <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
                    <div className="flex gap-4 mt-2">
                      <span className="text-xs text-muted-foreground">
                        📊 Taille estimée: {selectedTemplate.estimatedSize}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ⏱️ Temps estimé: {selectedTemplate.estimatedTime}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline">{selectedTemplate.category}</Badge>
                </div>
              </div>
            )}
          </div>

          {/* Format avec descriptions */}
          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-2">
              Format d'export
              <Badge variant="outline" className="text-xs">Obligatoire</Badge>
            </label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le format d'export" />
              </SelectTrigger>
              <SelectContent>
                {formatOptions.map((formatOption) => (
                  <SelectItem key={formatOption.value} value={formatOption.value}>
                    <div>
                      <div className="font-medium">{formatOption.label}</div>
                      <div className="text-xs text-muted-foreground">{formatOption.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Période */}
          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-2">
              Période d'analyse
              <Badge variant="outline" className="text-xs">Obligatoire</Badge>
            </label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner la période à analyser" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Aujourd'hui</SelectItem>
                <SelectItem value="yesterday">Hier</SelectItem>
                <SelectItem value="week">Cette semaine</SelectItem>
                <SelectItem value="lastweek">Semaine dernière</SelectItem>
                <SelectItem value="month">Ce mois</SelectItem>
                <SelectItem value="lastmonth">Mois dernier</SelectItem>
                <SelectItem value="quarter">Ce trimestre</SelectItem>
                <SelectItem value="year">Cette année</SelectItem>
                <SelectItem value="custom">Période personnalisée</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options avancées */}
          {/*<div className="space-y-4">
            <h3 className="text-sm font-medium">Options avancées</h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="charts"
                  checked={includeCharts}
                  onCheckedChange={setIncludeCharts}
                />
                <div className="space-y-1">
                  <label htmlFor="charts" className="text-sm font-medium cursor-pointer">
                    Inclure les graphiques et visualisations
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Ajoute des graphiques interactifs et des tableaux de bord visuels
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="email"
                  checked={emailNotification}
                  onCheckedChange={setEmailNotification}
                />
                <div className="space-y-1">
                  <label htmlFor="email" className="text-sm font-medium cursor-pointer">
                    Notification par email à la fin
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Recevez un email avec le lien de téléchargement une fois généré
                  </p>
                </div>
              </div>
            </div>
          </div>*/}

          {/* Priorité */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Priorité de traitement</label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((priorityOption) => (
                  <SelectItem key={priorityOption.value} value={priorityOption.value}>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={priorityOption.color}>
                        {priorityOption.label}
                      </Badge>
                      <span className="text-sm">{priorityOption.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Alert d'information */}
          {isFormValid && selectedTemplate && selectedPriority && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Résumé :</strong> Génération d'un rapport "{selectedTemplate.name}" au format {selectedFormat?.label?.toUpperCase()} 
                avec priorité {selectedPriority.label.toLowerCase()}. 
                Temps estimé : {selectedTemplate.estimatedTime}.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
            <Button 
              onClick={handleGenerate}
              disabled={!isFormValid}
              className="text-white bg-bouton hover:bg-bouton-hover"
            >
              <FileText className="h-4 w-4 mr-2" />
              Générer le rapport
              {selectedPriority?.value === 'high' && (
                <Badge className="ml-2 bg-red-500 text-white text-xs">Haute priorité</Badge>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}