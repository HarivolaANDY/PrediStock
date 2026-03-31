import { X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"

interface ModelSettingsModalProps {
  onClose: () => void
  onSave: (settings: ModelSettings) => void
}

interface ModelSettings {
  maxModels: number
  defaultHorizon: number
  trainingInterval: string
  autoRetrain: boolean
}

export function ModelSettingsModal({ onClose, onSave }: ModelSettingsModalProps) {
  const [settings, setSettings] = useState<ModelSettings>({
    maxModels: 5,
    defaultHorizon: 30,
    trainingInterval: 'daily',
    autoRetrain: true
  })

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Paramètres globaux des modèles</CardTitle>
              <CardDescription>Configurer les paramètres généraux des modèles IA</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nombre maximum de modèles</label>
            <Input 
              type="number" 
              value={settings.maxModels}
              onChange={(e) => setSettings({...settings, maxModels: parseInt(e.target.value)})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Horizon de prédiction par défaut (jours)</label>
            <Input 
              type="number"
              value={settings.defaultHorizon}
              onChange={(e) => setSettings({...settings, defaultHorizon: parseInt(e.target.value)})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Intervalle de réentraînement</label>
            <Select 
              value={settings.trainingInterval}
              onValueChange={(val) => setSettings({...settings, trainingInterval: val})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Quotidien</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                <SelectItem value="monthly">Mensuel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoRetrain"
              checked={settings.autoRetrain}
              onChange={(e) => setSettings({...settings, autoRetrain: e.target.checked})}
            />
            <label htmlFor="autoRetrain" className="text-sm font-medium">Réentraînement automatique</label>
          </div>
        </CardContent>
        <div className="flex justify-end p-4 space-x-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => onSave(settings)}>Sauvegarder</Button>
        </div>
      </Card>
    </div>
  )
}