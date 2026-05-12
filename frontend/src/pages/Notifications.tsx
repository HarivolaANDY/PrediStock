import { useState, useEffect, useCallback, useRef } from "react"
import { Bell, Check, X, Mail, RefreshCcw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Notification } from "@/types/notification"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

// const notifications: Notification[] = fetchNotification()

export default function Notifications() {
  const [selectedTab, setSelectedTab] = useState("all")
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const isMounted = useRef(true)
  const isFirstLoad = useRef(true)
  const prevCriticalIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:8000/api/notifications/", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${localStorage.getItem('token')}`
        }
      })
      
      if (!response.ok) throw new Error("Failed to fetch notifications")
      
      const data = await response.json()
      const list = Array.isArray(data) ? data : (data.results || data.data || [])
      
      if (isMounted.current) {
        const newCriticalIds = new Set<string>()
        const newlyArrivedCriticals: Notification[] = []

        list.forEach((n: Notification) => {
          const p = typeof n.priorite === 'string' ? n.priorite.toLowerCase() : n.priorite
          if (p === 2 || p === 'high' || p === 'critique') {
            newCriticalIds.add(n.id)
            if (!prevCriticalIds.current.has(n.id)) {
              newlyArrivedCriticals.push(n)
            }
          }
        })

        if (!isFirstLoad.current && newlyArrivedCriticals.length > 0) {
          newlyArrivedCriticals.forEach(n => toast.error(`Alerte Critique: ${n.titre}`))
        }

        isFirstLoad.current = false
        prevCriticalIds.current = newCriticalIds

        // Defer state updates to avoid cascading render warning
        setTimeout(() => {
          if (isMounted.current) {
            setNotifications(list)
            setIsLoading(false)
          }
        }, 0)
      }
    } catch (err) {
      console.error("Erreur lors de la récupération des notifications:", err)
      if (isMounted.current) {
        setTimeout(() => {
          if (isMounted.current) {
            setIsError(true)
            setIsLoading(false)
          }
        }, 0)
      }
    }
  }, [])

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/notifications/${id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: "lu" })
      })

      if (response.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: "lu" } : n))
        toast.success("Notification marquée comme lue")
      }
    } catch (err) {
      console.error("Error marking notification as read", err)
      toast.error("Une erreur est survenue")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette notification ?")) return

    try {
      const response = await fetch(`http://localhost:8000/api/notifications/${id}/`, {
        method: "DELETE",
        headers: {
          "Authorization": `Token ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id))
        toast.success("Notification supprimée")
      }
    } catch (err) {
      console.error("Error deleting notification", err)
      toast.error("Une erreur est survenue")
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000) // Poll every 30 seconds
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const getPriorityBadge = (priority: number | string) => {
    const p = typeof priority === 'string' ? priority.toLowerCase() : priority
    
    if (p === 2 || p === 'high' || p === 'critique') {
      return <Badge variant="destructive">Critique</Badge>
    }
    if (p === 1 || p === 'medium' || p === 'haute') {
      return <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-none">Haute</Badge>
    }
    return <Badge variant="secondary">Basique</Badge>
  }

  const getTypeBadge = (type: string) => {
    const t = type?.toLowerCase() || ""
    if (t.includes("stock")) return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Stock</Badge>
    if (t.includes("alerte")) return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Alerte</Badge>
    if (t.includes("commande")) return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Commande</Badge>
    return <Badge variant="outline">{type || "Général"}</Badge>
  }


  const filteredNotifications = selectedTab === "all" 
    ? notifications 
    : selectedTab === "unread" 
    ? notifications.filter(n => n.status === "non lu")
    : notifications.filter(n => n.status === "lu")


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


      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Toutes Notifications
          </TabsTrigger>
          <TabsTrigger value="unread" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Non lues
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab}>
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
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                        </TableRow>
                      ))
                    ) : isError ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <p className="text-destructive font-medium">Une erreur est survenue lors du chargement.</p>
                            <Button variant="outline" size="sm" onClick={() => {
                              setIsLoading(true);
                              setIsError(false);
                              fetchNotifications();
                            }}>
                              <RefreshCcw className="mr-2 h-4 w-4" /> Réessayer
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredNotifications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                          Aucune notification à afficher.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredNotifications.map((notification) => (
                        <TableRow 
                          key={notification.id}
                          className={notification.status === "non lu" ? "bg-muted/30" : ""}
                        >
                          <TableCell>
                            {getPriorityBadge(notification.priorite)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className={`font-medium ${notification.status === "non lu" ? "font-semibold text-primary" : ""}`}>
                                {notification.titre}
                              </p>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {notification.message}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{getTypeBadge(notification.type_notification)}</TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {notification.creer_le
                                ? new Date(notification.creer_le).toLocaleString("fr-FR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })
                                : "--"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={notification.status === "lu" ? "outline" : "default"} className={notification.status === "non lu" ? "bg-primary/10 text-primary border-primary/20" : ""}>
                              {notification.status === "lu" ? "Lu" : "Non lu"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {notification.status === "non lu" && (
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  title="Marquer comme lu"
                                  onClick={() => handleMarkAsRead(notification.id)}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-destructive hover:text-destructive hover:bg-destructive/10" 
                                title="Supprimer"
                                onClick={() => handleDelete(notification.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}