import { useState, useEffect } from "react"
import { Bell, Settings, Check, X, Mail, Smartphone, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { MetricCard } from "@/components/MetricCard"
import { Notification } from "@/types/notification"


// const notifications: Notification[] = fetchNotification()

const notificationSettings = [
  {
    category: "Stock Alerts",
    description: "Notifications pour les changements de niveaux de stock",
    email: true,
    sms: true,
    push: false
  },
  {
    category: "AI & Forecasting",
    description: "Mises à jour des modèles IA et des prédictions",
    email: true,
    sms: false,
    push: true
  },
  {
    category: "Reports",
    description: "Génération et livraison de rapports",
    email: true,
    sms: false,
    push: false
  },
  {
    category: "System Updates",
    description: "Maintenance et mises à jour du système",
    email: false,
    sms: false,
    push: true
  }
]

export default function Notifications() {
  const [selectedTab, setSelectedTab] = useState("all")
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    fetch("http://localhost:8000/notification/", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token ${localStorage.getItem('token')}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        setNotifications(data.data.reverse())
        console.log(data);
      })
      .catch((err) => console.error("Erreur lors de la récupération des notifications:", err))
  }, [])

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "stockout":
        return <Badge variant="destructive">Alerte Stock</Badge>
      case "low_stock":
        return <Badge className="bg-warning text-warning-foreground">Stock Faible</Badge>
      case "report":
        return <Badge className="bg-notification-secondary" variant="default">Report</Badge>
      case "system":
        return <Badge variant="secondary">System</Badge>
      default:
        return <Badge variant="outline">Other</Badge>
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <AlertTriangle className="h-4 w-4 text-destructive" />
      case "medium":
        return <Bell className="h-4 w-4 text-warning" />
      case "low":
        return <Bell className="h-4 w-4 text-muted-foreground" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email":
        return <Mail className="h-4 w-4" />
      case "sms":
        return <Smartphone className="h-4 w-4" />
      case "dashboard":
        return <Bell className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const filteredNotifications = selectedTab === "all" 
    ? notifications 
    : selectedTab === "unread" 
    ? notifications.filter(n => n.status !== "read")
    : notifications.filter(n => n.status === "read")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Gérez vos préférences de notifications et consultez les alertes récentes
          </p>
        </div>
      </div>

      {/* Notification Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Unread Notifications"
          value="8"
          trend={{ value: -2, label: "vs yesterday" }}
          icon={<Bell className="h-4 w-4" />}
          variant="warning"
        />
        <MetricCard
          title="Critical Alerts"
          value="3"
          trend={{ value: 1, label: "new today" }}
          icon={<AlertTriangle className="h-4 w-4" />}
          variant="destructive"
        />
        <MetricCard
          title="Email Notifications"
          value="45"
          trend={{ value: 8, label: "this week" }}
          icon={<Mail className="h-4 w-4" />}
        />
        <MetricCard
          title="SMS Alerts"
          value="12"
          trend={{ value: 3, label: "this week" }}
          icon={<Smartphone className="h-4 w-4" />}
        />
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Toutes Notifications</TabsTrigger>
          <TabsTrigger value="unread">Non lues</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab}>
          {selectedTab !== "settings" ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedTab === "all" ? "Toutes Notifications" : "Notifications non lues"}
                </CardTitle>
                <CardDescription>
                  {selectedTab === "all" 
                    ? "Liste complète des notifications et alertes système"
                    : "Notifications nécessitant votre attention"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Priorité</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredNotifications.map((notification) => (
                        <TableRow 
                          key={notification.id}
                          className={!notification.message ? "bg-muted/50" : ""}
                        >
                          <TableCell>
                          <div className="flex items-center gap-2">
                            {getPriorityIcon(notification.type)}
                          </div>
                          </TableCell>
                          <TableCell>
                          <div>
                            <p className={`font-medium ${notification.status !== "read" ? "font-semibold" : ""}`}>
                            {notification.titre}
                            </p>
                            <p className="text-sm text-muted-foreground">
                            {notification.message}
                            </p>
                          </div>
                          </TableCell>
                          <TableCell>{getTypeBadge(notification.type)}</TableCell>
                          <TableCell>
                          <div className="flex items-center gap-2">
                            {getChannelIcon(notification.channel)}
                            <span className="capitalize">{notification.channel}</span>
                          </div>
                          </TableCell>
                          <TableCell>
                          {notification.creer_le
                            ? new Date(notification.creer_le).toLocaleString("fr-FR", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit"
                            }).replace(",", " à")
                            : "--"}
                          </TableCell>
                          <TableCell>
                            {notification.status === "lu" ? (

                              <Badge variant="outline">Lu</Badge>
                            ) : (
                              <Badge className="bg-primary text-primary-foreground">Nouveau</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {notification.status !== "read" && (
                                <Button size="sm" variant="outline">
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              <Button size="sm" variant="outline">
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Préférences de notification</CardTitle>
                  <CardDescription>
                    Configurez comment vous souhaitez recevoir les différents types de notifications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {notificationSettings.map((setting, index) => (
                      <div key={index} className="space-y-3">
                        <div>
                          <h4 className="font-medium">{setting.category}</h4>
                          <p className="text-sm text-muted-foreground">{setting.description}</p>
                        </div>
                        <div className="flex items-center gap-6 pl-4">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Email</span>
                            <Switch checked={setting.email} />
                          </div>
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">SMS</span>
                            <Switch checked={setting.sms} />
                          </div>
                          <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Push</span>
                            <Switch checked={setting.push} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Paramètres de livraison</CardTitle>
                  <CardDescription>
                    Configurez quand et comment les notifications sont envoyées
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="font-medium">Paramètres Email</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Envoi immédiat</span>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Résumé quotidien</span>
                        <Switch />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Résumé hebdomadaire</span>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Heures silencieuses</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Activer les heures silencieuses</span>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>From: 10:00 PM</span>
                        <Button size="sm" variant="outline">Modifier</Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>To: 8:00 AM</span>
                        <Button size="sm" variant="outline">Modifier</Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Alertes critiques</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Ignorer les heures silencieuses</span>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Canaux multiples</span>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}