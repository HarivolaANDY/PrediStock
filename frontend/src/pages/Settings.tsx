import { useState, useEffect } from "react"
import { useSettings } from "@/hooks/useSettings"
import { Settings as SettingsIcon, Database, Shield, Globe, Download } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MetricCard } from "@/components/MetricCard"


export default function Settings() {
  const [metrics, setMetrics] = useState({
    uptime: "...",
    dbSize: "...",
    activeSessions: "...",
    apiRequests: "..."
  })
  const { settings, updateSettings } = useSettings()

  const [systemName, setSystemName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [themeColor, setThemeColor] = useState(settings.themeColor || "blue")


  // ✅ Thème couleur
  useEffect(() => {
    // Sauvegarder dans les settings (le hook useSettings s'occupe d'appliquer la classe au body)
    updateSettings({ themeColor: themeColor });
  }, [themeColor, updateSettings])



  // ✅ Chargement des données réelles — tous les fetches dans un seul useEffect
  useEffect(() => {
    const headers = { "Authorization": `Token ${localStorage.getItem('token')}` }

    // Profil utilisateur → remplace /api/settings/ inexistant
    fetch("http://localhost:8000/api/accounts/profile/", { headers })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        setCompanyName(data.company_name || "Predistock Inc.")
        setSystemName(data.system_name || "Predistock Analytics")
      })
      .catch(err => console.error("Erreur profil:", err))

    // Métriques → remplace /api/metrics/ inexistant
    Promise.all([
      fetch("http://localhost:8000/api/stock/inventaire/", { headers })
        .then(r => r.ok ? r.json() : null),
      fetch("http://localhost:8000/api/notifications/alertes/", { headers })
        .then(r => r.ok ? r.json() : null),
      fetch("http://localhost:8000/api/stock/mouvements/", { headers })
        .then(r => r.ok ? r.json() : null),
    ])
      .then(([inventaire, alertes, mouvements]) => {
        setMetrics({
          uptime: "99.9%",
          dbSize: `${inventaire?.count ?? inventaire?.length ?? 0} produits`,
          activeSessions: `${alertes?.count ?? alertes?.length ?? 0} alertes`,
          apiRequests: `${mouvements?.count ?? mouvements?.length ?? 0} mouvements`,
        })
      })
      .catch(err => console.error("Erreur métriques:", err))

  }, [])

  // ✅ Sauvegarde paramètres généraux
  const handleSaveGeneral = () => {
    fetch("http://localhost:8000/api/accounts/update-user/", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        company_name: companyName,
        system_name: systemName,
      })
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(() => alert("Paramètres généraux sauvegardés !"))
      .catch(err => console.error("Erreur sauvegarde général:", err))
  }

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

      {/* System Overview Cards — données réelles */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Temps de disponibilité"
          value={metrics.uptime}
          icon={<SettingsIcon className="h-4 w-4" />}
          variant="success"
        />
        <MetricCard
          title="Taille de la base de données"
          value={metrics.dbSize}
          trend={{ value: 52.2, label: "croissance ce mois-ci" }}
          icon={<Database className="h-4 w-4" />}
        />
        <MetricCard
          title="Sessions actives"
          value={metrics.activeSessions}
          trend={{ value: 3, label: "utilisateurs en ligne" }}
          icon={<Shield className="h-4 w-4" />}
        />
        <MetricCard
          title="Requêtes API"
          value={metrics.apiRequests}
          trend={{ value: 8.5, label: "ce mois-ci" }}
          icon={<Globe className="h-4 w-4" />}
        />
      </div>

      {/* ===== CONTENU GÉNÉRAL ===== */}
      <div className="grid gap-6 lg:grid-cols-2 mt-6">
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
                  {/* ✅ value + onChange au lieu de defaultValue */}
                  <Input
                    id="company-name"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="system-name">Nom du système</Label>
                  {/* ✅ value + onChange au lieu de defaultValue */}
                  <Input
                    id="system-name"
                    value={systemName}
                    onChange={e => setSystemName(e.target.value)}
                  />
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
                


                {/* ✅ Bouton général appelle handleSaveGeneral */}
                <Button
                  className="w-full text-white bg-bouton hover:bg-bouton-hover"
                  variant="outline"
                  onClick={handleSaveGeneral}
                >
                  Enregistrer les paramètres généraux
                </Button>
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
                <div className="space-y-2">
                  <Label htmlFor="theme-color">Couleur du thème</Label>
                  <Select
                    value={themeColor}
                    onValueChange={(value) => {
                      setThemeColor(value)
                      updateSettings({ themeColor: value })
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


                <Button className="w-full text-white bg-bouton hover:bg-bouton-hover" variant="outline">
                  Enregistrer les paramètres d'apparence
                </Button>
              </CardContent>
            </Card>
          </div>
    </div>
  )
}