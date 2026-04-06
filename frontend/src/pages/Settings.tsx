import { useState, useEffect } from "react"
import { useSettings } from "@/hooks/useSettings"
import { Settings as SettingsIcon, Database, Shield, Bell, Palette, Globe, Download } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { MetricCard } from "@/components/MetricCard"
import i18n from "../utils/i18n"

export default function Settings() {
  const [autoBackup, setAutoBackup] = useState(true)
  const [twoFactorAuth, setTwoFactorAuth] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const { settings, updateSettings } = useSettings()

  const [criticalAlerts, setCriticalAlerts] = useState(true)
  const [themeColor, setThemeColor] = useState(settings.themeColor || "blue")
  const [language, setLanguage] = useState(settings.language || "en")

  useEffect(() => {
    // Retirer toutes les classes de thème précédentes
    document.body.classList.remove('blue', 'green', 'purple', 'orange');
    // Ajouter la nouvelle classe de thème
    document.body.classList.add(themeColor);
    // Sauvegarder dans les settings
    updateSettings({ themeColor: themeColor });
  }, [themeColor, updateSettings])

  useEffect(() => {
    setLanguage(i18n.language)
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Paramètre du Système</h1>
          <p className="text-muted-foreground">
            Configurer les préférences système et les paramètres globaux
          </p>
        </div>
        <Button className="text-white bg-bouton hover:bg-bouton-hover" variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Paramètres d'exportation
        </Button>
      </div>

      {/* System Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Temps de disponibilité du système"
          value="99.8%"
          icon={<SettingsIcon className="h-4 w-4" />}
          variant="success"
        />
        <MetricCard
          title="Taille de la base de données"
          value="0.01 GB"
          trend={{ value: 52.2, label: "croissance ce mois-ci" }}
          icon={<Database className="h-4 w-4" />}
        />
        <MetricCard
          title="Sessions actives"
          value="1"
          trend={{ value: 3, label: "utilisateurs en ligne" }}
          icon={<Shield className="h-4 w-4" />}
        />
        <MetricCard
          title="Requêtes API"
          value="1.2M"
          trend={{ value: 8.5, label: "ce mois-ci" }}
          icon={<Globe className="h-4 w-4" />}
        />
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="security">Sécurité</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integration">Integration</TabsTrigger>
          <TabsTrigger value="backup">Sauvegarde</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Informations système</CardTitle>
                <CardDescription>
                  Configuration et informations de base du système
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Nom de l'entreprise</Label>
                  <Input id="company-name" defaultValue="Predistock Inc." />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="system-name">Nom du système</Label>
                  <Input id="system-name" defaultValue="Predistock Analytics" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuseau horaire</Label>
                  <Select defaultValue="utc">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utc">UTC</SelectItem>
                      <SelectItem value="est">Eastern Time</SelectItem>
                      <SelectItem value="pst">Pacific Time</SelectItem>
                      <SelectItem value="cet">Central European Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="language">Langue par défaut</Label>
                  <Select 
                    value={language}
                    onValueChange={(value) => {
                      setLanguage(value)
                      i18n.changeLanguage(value)
                      updateSettings({ language: value })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">Anglais</SelectItem>
                      {/* <SelectItem value="es">Spanish</SelectItem> */}
                      <SelectItem value="fr">Français</SelectItem>
                      {/* <SelectItem value="de"></SelectItem> */}
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full text-white bg-bouton hover:bg-bouton-hover" variant="outline">Enregistrer les paramètres généraux</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Apparence</CardTitle>
                <CardDescription>
                  Personnaliser l'apparence de l'application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/*<div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Mode Sombre</Label>
                    <p className="text-sm text-muted-foreground">
                      Activer le thème sombre pour l'interface
                    </p>
                  </div>
                  <Switch checked={settings.darkMode} onCheckedChange={(checked) => updateSettings({ darkMode: checked})} />
                </div>*/}

                <div className="space-y-2">
                  <Label htmlFor="theme-color">Theme Color</Label>
                  <Select
                    value={themeColor}
                    onValueChange={(value) => {
                      setThemeColor(value)
                      updateSettings({ themeColor: value }) // si tu veux sauvegarder dans le contexte
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blue">Bleue (Couleur par défaut)</SelectItem>
                      <SelectItem value="green">Vert</SelectItem>
                      <SelectItem value="purple">Violet</SelectItem>
                      <SelectItem value="orange">Orange</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date-format">Format de date</Label>
                  <Select defaultValue="mdy">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Devise</Label>
                  <Select defaultValue="usd">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usd">USD ($)</SelectItem>
                      <SelectItem value="eur">EUR (€)</SelectItem>
                      <SelectItem value="gbp">GBP (£)</SelectItem>
                      <SelectItem value="jpy">JPY (¥)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full text-white bg-bouton hover:bg-bouton-hover" variant="outline">Enregistrer les paramètres d'apparence</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Authentification</CardTitle>
                <CardDescription>
                  Gestion d'authentification et accès au paramètre de contrôle
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Facteur de double authentification</Label>
                    <p className="text-sm text-muted-foreground">
                      Requis le F2A pour toutes les comptes utilisateurs
                    </p>
                  </div>
                  <Switch checked={twoFactorAuth} onCheckedChange={setTwoFactorAuth} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session-timeout">Fin de session (minutes)</Label>
                  <Input id="session-timeout" type="number" defaultValue="60" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password-policy">Police de mot de passe</Label>
                  <Select defaultValue="strong">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic (8 characters)</SelectItem>
                      <SelectItem value="medium">Medium (10 characters + symbols)</SelectItem>
                      <SelectItem value="strong">Strong (12 characters + complexity)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* <div className="space-y-2">
                  <Label htmlFor="login-attempts">Max Login Attempts</Label>
                  <Input id="login-attempts" type="number" defaultValue="5" />
                </div> */}

                <Button className="w-full ">Save Security Settings</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contrôle d'accès</CardTitle>
                <CardDescription>
                  Configurer la restrictions IP et l'accès au configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="allowed-ips">Accordé l'adresse IP</Label>
                  <Textarea 
                    id="allowed-ips" 
                    placeholder="Enter IP addresses or ranges, one per line"
                    rows={4}
                  />
                  <p className="text-sm text-muted-foreground">
                    Leave empty to allow all IPs
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-rate-limit">API Rate Limit (requests/hour)</Label>
                  <Input id="api-rate-limit" type="number" defaultValue="1000" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Audit Logging</Label>
                    <p className="text-sm text-muted-foreground">
                      Log all user actions and system events
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Button className="w-full text-white bg-bouton hover:bg-bouton-hover" variant="outline">Save Access Control</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>System Notifications</CardTitle>
                <CardDescription>
                  Configure system-wide notification settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Critical Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable critical system alerts
                    </p>
                  </div>
                  <Switch checked={criticalAlerts} onCheckedChange={setCriticalAlerts} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-email">Admin Email</Label>
                  <Input id="admin-email" type="email" defaultValue="admin@predistock.com" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-server">SMTP Server</Label>
                  <Input id="smtp-server" defaultValue="smtp.predistock.com" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-port">SMTP Port</Label>
                  <Input id="smtp-port" type="number" defaultValue="587" />
                </div>

                <Button className="w-full text-white bg-bouton hover:bg-bouton-hover" variant="outline">Save Notification Settings</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alert Thresholds</CardTitle>
                <CardDescription>
                  Set system-wide alert thresholds and conditions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="low-stock-threshold">Low Stock Threshold (%)</Label>
                  <Input id="low-stock-threshold" type="number" defaultValue="20" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="critical-stock-threshold">Critical Stock Threshold (%)</Label>
                  <Input id="critical-stock-threshold" type="number" defaultValue="5" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="forecast-accuracy-threshold">Min Forecast Accuracy (%)</Label>
                  <Input id="forecast-accuracy-threshold" type="number" defaultValue="85" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prediction-horizon">Default Prediction Horizon (days)</Label>
                  <Input id="prediction-horizon" type="number" defaultValue="30" />
                </div>

                <Button className="w-full text-white bg-bouton hover:bg-bouton-hover" variant="outline">Save Alert Thresholds</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="integration">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>API Configuration</CardTitle>
                <CardDescription>
                  Manage external API integrations and keys
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <Input id="api-key" type="password" defaultValue="••••••••••••••••" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input id="webhook-url" defaultValue="https://api.predistock.com/webhooks" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>API Access</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable external API access
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-version">API Version</Label>
                  <Select defaultValue="v1">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="v1">Version 1.0</SelectItem>
                      <SelectItem value="v2">Version 2.0 (Beta)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full text-white bg-bouton hover:bg-bouton-hover" variant="outline">Save API Settings</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>External Services</CardTitle>
                <CardDescription>
                  Configure connections to external services
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Shopify Integration</h4>
                      <p className="text-sm text-muted-foreground">Connected</p>
                    </div>
                    <Button className="text-white bg-bouton hover:bg-bouton-hover" variant="outline" size="sm">Configure</Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">WooCommerce</h4>
                      <p className="text-sm text-muted-foreground">Not connected</p>
                    </div>
                    <Button className="text-white bg-bouton hover:bg-bouton-hover" variant="outline" size="sm">Connect</Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Amazon Seller Central</h4>
                      <p className="text-sm text-muted-foreground">Connected</p>
                    </div>
                    <Button className="text-white bg-bouton hover:bg-bouton-hover" variant="outline" size="sm">Configure</Button>
                  </div>
                </div>

                <Button className="w-full text-white bg-bouton hover:bg-bouton-hover" variant="outline">Add New Integration</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="backup">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Backup Configuration</CardTitle>
                <CardDescription>
                  Configure automatic backups and data retention
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Automatic Backups</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable scheduled database backups
                    </p>
                  </div>
                  <Switch checked={autoBackup} onCheckedChange={setAutoBackup} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backup-frequency">Backup Frequency</Label>
                  <Select defaultValue="daily">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retention-period">Retention Period (days)</Label>
                  <Input id="retention-period" type="number" defaultValue="30" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backup-location">Backup Location</Label>
                  <Select defaultValue="cloud">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local Storage</SelectItem>
                      <SelectItem value="cloud">Cloud Storage</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full text-white bg-bouton hover:bg-bouton-hover" variant="outline">Save Backup Settings</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Backup Status</CardTitle>
                <CardDescription>
                  Monitor backup operations and history
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Last Backup</span>
                    <span className="text-sm font-medium">2024-01-15 02:00 AM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Backup Size</span>
                    <span className="text-sm font-medium">2.1 GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Next Backup</span>
                    <span className="text-sm font-medium">2024-01-16 02:00 AM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Storage Used</span>
                    <span className="text-sm font-medium">45.2 GB</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button className="w-full text-white bg-bouton hover:bg-bouton-hover" variant="outline">
                    Create Backup Now
                  </Button>
                  <Button className="w-full text-white bg-bouton hover:bg-bouton-hover" variant="outline">
                    Download Latest Backup
                  </Button>
                  <Button className="w-full text-white bg-bouton hover:bg-bouton-hover" variant="outline">
                    View Backup History
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}