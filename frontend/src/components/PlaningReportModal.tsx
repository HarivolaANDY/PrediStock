import { useState } from "react"
import { X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface GenerateReportModalProps {
  onClose: () => void
}

export function PlaningReportModal({ onClose }: GenerateReportModalProps) {
  const [reportType, setReportType] = useState("")
  const [date, setDate] = useState("")
  const [freq, setFreq] = useState("Daily")
  const [time, setTime] = useState('06:00')

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    alert('Planning créé')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <form onSubmit={handleCreate}>
        <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Planifier un rapport</CardTitle>
              <CardDescription>
                Planifier la date souhaitée pour générer le rapport
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Type de rapport</label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inventory">Synthèse des stocks</SelectItem>
                <SelectItem value="forecast">Analyse des prévisions</SelectItem>
                <SelectItem value="movements">Mouvements de stock</SelectItem>
                <SelectItem value="alerts">Synthèse des alertes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/*<div className="space-y-2">
            <label className="text-sm font-medium">Fréquence</label>
            <Select value={freq} onValueChange={setFreq}>
              <SelectTrigger>
                <SelectValue placeholder="Quotidien" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Quotidien</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                <SelectItem value="monthly">Mensuel</SelectItem>
              </SelectContent>
            </Select>
          </div>*/}

          <div className="space-y-2">
            <label className="text-sm font-medium gap-2 flex items-center">
              Date d'exécution
              <Badge variant="outline" className="text-xs">Obligatoire</Badge>
            </label>
            <Input 
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Heure d'exécution</label>
            <Input 
                type="time" 
                value={time}
                onChange={e => setTime(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button 
              className="text-white bg-bouton hover:bg-bouton-hover"
            >
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>
        </form>
      </div>
    </div>
  )
}