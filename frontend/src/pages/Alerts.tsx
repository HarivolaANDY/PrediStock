import { useState, useEffect } from "react"
import { Bell,Search, AlertTriangle, CheckCircle, Clock, Filter } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MetricCard } from "@/components/MetricCard"
import { fetchAlerts, AlertData } from "@/services/alertService"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertConfigModal } from "@/components/AlertConfigModal"

function mapType(type_alert: string): string {
  if (type_alert === "rupture") return "stockout";
  if (type_alert === "faible stock") return "low_stock";
  if (type_alert === "surstock") return "overstock";
  return type_alert;
}

function mapPriority(priorite: string): string {
  if (priorite.toLowerCase().includes("high")) return "high";
  if (priorite.toLowerCase().includes("medium")) return "medium";
  if (priorite.toLowerCase().includes("low")) return "low";
  return "unknown";
}

interface AertStatsProps {
  selectedAlert: string;
  onStatusChange: (value: string) => void;
}

export default function Alerts() {
  const [selectedTab, setSelectedTab] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [alerts, setAlerts] = useState<AlertData[]>([])
  const [selectedAlert, setSelectedAlert] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  

  useEffect(() => {
    setLoading(true)
    fetchAlerts()
      .then(data => {
        setAlerts(data)
        setLoading(false)
      })
      .catch(e => {
        setError(e.message)
        setLoading(false)
      })
  }, [])

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">High</Badge>
      case "medium":
        return <Badge className="bg-warning text-warning-foreground">Medium</Badge>
      case "low":
        return <Badge variant="secondary">Low</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "rupture_stock":
        return <AlertTriangle className="h-4 w-4 text-destructive" />
      case "low_stock":
        return <Clock className="h-4 w-4 text-warning" />
      case "overstock":
        return <CheckCircle className="h-4 w-4 text-muted-foreground" />
      case "prediction":
        return <Bell className="h-4 w-4 text-prediction" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    return status === "active" ? 
      <Badge variant="default">Active</Badge> : 
      <Badge variant="outline">Resolved</Badge>
  }

  // Affichage dynamique des alertes dans le tableau
  const filteredAlerts = alerts
    .filter(alert => {
      const statusMatch = 
        selectedTab === "all" ? true :
        selectedTab === "active" ? !alert.est_resolu :
        selectedTab === "resolved" ? alert.est_resolu : true;

        const searchLower = searchTerm.toLowerCase();
        const searchMatch = searchTerm === "" ||
          alert.product.toLowerCase().includes(searchLower) ||
          alert.sku_alert.toLowerCase().includes(searchLower);
        const filterPriority = selectedAlert === "high" ? alert.priorite.toLowerCase() === "high" :
          selectedAlert === "medium" ? alert.priorite.toLowerCase() === "medium" :
          selectedAlert === "low" ? alert.priorite.toLowerCase() === "low" : true;
      return statusMatch && searchMatch && (filterPriority || selectedAlert === "all" || selectedAlert === "active" || selectedAlert === "resolved");
    })
    .map(alert => ({
      ...alert,
      type: mapType(alert.type_alert),
      priority: mapPriority(alert.priorite),
      status: alert.est_resolu ? "resolved" : "active",
      timestamp: new Date(alert.creer_le).toLocaleString(),
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alertes & Notifications</h1>
          <p className="text-muted-foreground">
            Surveillez les événements critiques d'inventaire et les prédictions basées sur l'IA
          </p>
        </div>
          <AlertConfigModal>
            <Button variant="outline">
              <Bell className="h-4 w-4 mr-2" />
              Configurer les alertes
            </Button>
          </AlertConfigModal>
      </div>

      {/* Alert Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Alertes Actives"
          value={filteredAlerts.filter(a => a.status === "active").length.toString()}
          trend={{ value: 0, label: "vs yesterday" }}
          icon={<Bell className="h-4 w-4" />}
          variant="warning"
        />
        <MetricCard
          title="Problèmes critiques"
          value={filteredAlerts.filter(a => a.priority === "high").length.toString()}
          trend={{ value: 0, label: "new today" }}
          icon={<AlertTriangle className="h-4 w-4" />}
          variant="destructive"
        />
        <MetricCard
          title="Résolues"
          value={filteredAlerts.filter(a => a.status === "resolved").length.toString()}
          trend={{ value: 0, label: "vs yesterday" }}
          icon={<CheckCircle className="h-4 w-4" />}
          variant="success"
        />
        <MetricCard
          title="Prédictions IA"
          value={filteredAlerts.filter(a => a.type === "prediction").length.toString()}
          trend={{ value: 0, label: "new predictions" }}
          icon={<Bell className="h-4 w-4" />}
          variant="prediction"
        />
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Toutes les alertes</TabsTrigger>
          <TabsTrigger value="active">Actives</TabsTrigger>
          <TabsTrigger value="resolved">Résolues</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab}>
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedTab === "all" ? "Toutes les Alertes" :
                  selectedTab === "active" ? "Alertes Actives" : "Alertes résolues"}
              </CardTitle>
              <CardDescription>
                {selectedTab === "all" ? "Liste complète des alertes et notifications du système" :
                  selectedTab === "active" ? "Alertes nécessitant une attention immédiate" :
                  "Historique récent des alertes résolues"}
              </CardDescription>
            </CardHeader>
            <CardContent>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                      placeholder="Recherche des alertes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={selectedAlert} onValueChange={setSelectedAlert}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filtrer par statut" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les niveaux</SelectItem>
                        <SelectItem value="high">Niveau Elévée</SelectItem>
                        <SelectItem value="medium">Niveau Moyenne</SelectItem>
                        <SelectItem value="low">Niveau Faible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
              <div className="rounded-md border">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Recherche des alertes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                  <Select value={selectedAlert} onValueChange={setSelectedAlert}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filtrer par statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les niveaux</SelectItem>
                      <SelectItem value="high">Niveau Elévée</SelectItem>
                      <SelectItem value="medium">Niveau Moyenne</SelectItem>
                      <SelectItem value="low">Niveau Faible</SelectItem>
                    </SelectContent>
                  </Select>
              </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAlerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(alert.type)}
                            <span className="capitalize">{alert.type.replace('_', ' ')}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{alert.product}</TableCell>
                        <TableCell>{alert.message}</TableCell>
                        <TableCell>{getPriorityBadge(alert.priority)}</TableCell>
                        <TableCell>{alert.timestamp}</TableCell>
                        <TableCell>{getStatusBadge(alert.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {alert.status === "active" ? (
                              <>
                                <Button size="sm" variant="outline" title="Resoudre">
                                  <CheckCircle className="h-4 w-4" />
                                </Button>

                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground">No action needed</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}