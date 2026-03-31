import { useState } from "react"
import { Bell, AlertTriangle, Clock, Settings, Mail, Smartphone, Monitor } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

interface AlertConfigModalProps {
  children: React.ReactNode
}

export function AlertConfigModal({ children }: AlertConfigModalProps) {
  const [alertTypes, setAlertTypes] = useState({
    stockout: { enabled: true, threshold: 0, email: true, push: true, dashboard: true },
    low_stock: { enabled: true, threshold: 10, email: true, push: false, dashboard: true },
    overstock: { enabled: false, threshold: 100, email: false, push: false, dashboard: true },
    prediction: { enabled: true, threshold: 7, email: true, push: true, dashboard: true }
  })

  const [notifications, setNotifications] = useState({
    email: "admin@company.com",
    emailEnabled: true,
    pushEnabled: true,
    dashboardEnabled: true,
    frequency: "immediate"
  })

  const updateAlertType = (type: keyof typeof alertTypes, field: string, value: any) => {
    setAlertTypes(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }))
  }

  const alertTypeLabels = {
    stockout: "Rupture de stock",
    low_stock: "Stock faible", 
    overstock: "Surplus de stock",
    prediction: "Prédictions IA"
  }

  const alertTypeIcons = {
    stockout: <AlertTriangle className="h-4 w-4 text-destructive" />,
    low_stock: <Clock className="h-4 w-4 text-warning" />,
    overstock: <Bell className="h-4 w-4 text-muted-foreground" />,
    prediction: <Bell className="h-4 w-4 text-prediction" />
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration des alertes
          </DialogTitle>
          <DialogDescription>
            Personnalisez les types d'alertes, les seuils et les méthodes de notification pour votre inventaire
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="alerts" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="alerts">Types d'alertes</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="space-y-4">
            <div className="grid gap-4">
              {Object.entries(alertTypes).map(([type, config]) => (
                <Card key={type}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {alertTypeIcons[type as keyof typeof alertTypeIcons]}
                        <div>
                          <CardTitle className="text-base">
                            {alertTypeLabels[type as keyof typeof alertTypeLabels]}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {type === 'stockout' && "Alertes critiques pour les produits en rupture"}
                            {type === 'low_stock' && "Notifications préventives pour les stocks bas"}
                            {type === 'overstock' && "Détection des surplus d'inventaire"}
                            {type === 'prediction' && "Prédictions basées sur l'intelligence artificielle"}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={config.enabled}
                        onCheckedChange={(value) => updateAlertType(type as keyof typeof alertTypes, 'enabled', value)}
                      />
                    </div>
                  </CardHeader>
                  {config.enabled && (
                    <CardContent className="pt-0">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`${type}-threshold`}>
                            Seuil {type === 'prediction' ? '(jours)' : '(unités)'}
                          </Label>
                          <Input
                            id={`${type}-threshold`}
                            type="number"
                            value={config.threshold}
                            onChange={(e) => updateAlertType(type as keyof typeof alertTypes, 'threshold', parseInt(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                        
                        <div className="space-y-3">
                          <Label>Canaux de notification</Label>
                          <div className="flex gap-4">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`${type}-email`}
                                checked={config.email}
                                onCheckedChange={(value) => updateAlertType(type as keyof typeof alertTypes, 'email', value)}
                              />
                              <Label htmlFor={`${type}-email`} className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                Email
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`${type}-push`}
                                checked={config.push}
                                onCheckedChange={(value) => updateAlertType(type as keyof typeof alertTypes, 'push', value)}
                              />
                              <Label htmlFor={`${type}-push`} className="flex items-center gap-1">
                                <Smartphone className="h-3 w-3" />
                                Push
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`${type}-dashboard`}
                                checked={config.dashboard}
                                onCheckedChange={(value) => updateAlertType(type as keyof typeof alertTypes, 'dashboard', value)}
                              />
                              <Label htmlFor={`${type}-dashboard`} className="flex items-center gap-1">
                                <Monitor className="h-3 w-3" />
                                Dashboard
                              </Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres généraux</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email-address">Adresse email</Label>
                    <Input
                      id="email-address"
                      type="email"
                      value={notifications.email}
                      onChange={(e) => setNotifications(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="admin@company.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Fréquence des notifications</Label>
                    <select 
                      className="w-full p-2 border border-input rounded-md bg-background"
                      value={notifications.frequency}
                      onChange={(e) => setNotifications(prev => ({ ...prev, frequency: e.target.value }))}
                    >
                      <option value="immediate">Immédiate</option>
                      <option value="hourly">Toutes les heures</option>
                      <option value="daily">Quotidienne</option>
                    </select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">État des canaux de notification</h4>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>Notifications email</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={notifications.emailEnabled}
                          onCheckedChange={(value) => setNotifications(prev => ({ ...prev, emailEnabled: value }))}
                        />
                        <Badge variant={notifications.emailEnabled ? "default" : "secondary"}>
                          {notifications.emailEnabled ? "Activé" : "Désactivé"}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        <span>Notifications push</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={notifications.pushEnabled}
                          onCheckedChange={(value) => setNotifications(prev => ({ ...prev, pushEnabled: value }))}
                        />
                        <Badge variant={notifications.pushEnabled ? "default" : "secondary"}>
                          {notifications.pushEnabled ? "Activé" : "Désactivé"}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        <span>Notifications dashboard</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={notifications.dashboardEnabled}
                          onCheckedChange={(value) => setNotifications(prev => ({ ...prev, dashboardEnabled: value }))}
                        />
                        <Badge variant={notifications.dashboardEnabled ? "default" : "secondary"}>
                          {notifications.dashboardEnabled ? "Activé" : "Désactivé"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <DialogTrigger asChild>
            <Button variant="outline">Annuler</Button>
          </DialogTrigger>
          <Button>Enregistrer les modifications</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}