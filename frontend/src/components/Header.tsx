import { Bell, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import { useState, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { API_BASE_URL, API_ORIGIN, getAuthHeaders } from "@/config/api.config"

const ROUTE_LABELS: Record<string, { section?: string; title: string }> = {
  "/dashboard": { title: "Tableau de bord" },
  "/dashboard-admin": { title: "Tableau de bord Administrateur" },
  "/products": { title: "Produits" },
  "/suppliers": { title: "Fournisseurs" },
  "/stock": { title: "Analyse des stocks" },
  "/product-manager": { title: "Entrée / Sortie" },
  "/forecasting": { title: "Prévisions" },
  "/alerts": { title: "Alertes" },
  "/data": { title: "Gestion des données" },
  "/models": { title: "Modèles IA" },
  "/reports": { title: "Rapports" },
  "/notifications": { title: "Notifications" },
  "/settings": { title: "Paramètres" },
  "/profile": { title: "Mon profil" },
  "/buy-sell/achats": { section: "Achats & Ventes", title: "Achats" },
  "/buy-sell/ventes": { section: "Achats & Ventes", title: "Ventes" },
  "/buy-sell/retours": { section: "Achats & Ventes", title: "Remboursements" },
  "/buy-sell/analyse": { section: "Achats & Ventes", title: "Analyse Financière" },
  "/buy-sell/mouvements": { section: "Achats & Ventes", title: "Transactions" },
}

export function Header() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [avatarUrl, setAvatarUrl] = useState("")
  const [unreadCount, setUnreadCount] = useState(0)

  // Résolution du libellé de route et section pour le fil d'Ariane
  const currentPath = location.pathname
  const routeInfo = ROUTE_LABELS[currentPath] || {
    title: currentPath.startsWith("/product/") ? "Détails produit" : "Predistock",
  }

  // Initiales robustes pour l'avatar (gère prénom+nom, prénom seul, username seul, ou repli par défaut)
  const getInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    }
    if (user?.first_name) {
      return user.first_name.slice(0, 2).toUpperCase()
    }
    if (user?.username) {
      return user.username.slice(0, 2).toUpperCase()
    }
    return "PR"
  }

  const displayName = (user?.first_name && user?.last_name)
    ? `${user.first_name} ${user.last_name}`
    : (user?.username || "Utilisateur")

  const displayRole = typeof user?.role === "string"
    ? user.role
    : (user?.role?.name || "Opérateur")

  useEffect(() => {
    if (user?.avatar) {
      const url = user.avatar.startsWith("http") ? user.avatar : `${API_ORIGIN}${user.avatar}`
      setAvatarUrl(url)
    } else {
      setAvatarUrl("")
    }
  }, [user])

  useEffect(() => {
    document.title = `Predistock - ${routeInfo.title}`
  }, [routeInfo.title])

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/notifications/?status=non%20lu`, {
          headers: getAuthHeaders(),
        })
        if (response.ok) {
          const data = await response.json()
          const list = Array.isArray(data) ? data : (data.results || [])
          setUnreadCount(list.length)
        }
      } catch (err) {
        console.error("Error fetching unread count", err)
      }
    }

    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => {
    logout()
    navigate("/login")
    toast.success("Vous avez été déconnecté")
  }

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        {/* Navigation contextuelle (SidebarTrigger + Séparateur + Fil d'Ariane) */}
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-1" aria-label="Basculer la barre latérale" />
          <Separator orientation="vertical" className="h-4 hidden sm:block" />

          <Breadcrumb className="hidden sm:block">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                    Accueil
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {routeInfo?.section && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <span className="text-muted-foreground text-xs sm:text-sm">
                      {routeInfo.section}
                    </span>
                  </BreadcrumbItem>
                </>
              )}
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium text-foreground text-xs sm:text-sm">
                  {routeInfo?.title || "Page"}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Espace central flexible */}
        <div className="flex-1" />

        {/* Actions de droite (Notifications + Carte Utilisateur) */}
        <div className="flex items-center gap-2 sm:gap-3">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
                  onClick={() => navigate("/notifications")}
                  aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ""}`}
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center animate-in zoom-in duration-200">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{unreadCount > 0 ? `${unreadCount} notification(s) non lue(s)` : "Aucune notification non lue"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Separator orientation="vertical" className="h-5 hidden sm:block" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-10 px-2 gap-2.5 rounded-full sm:rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors focus-visible:ring-1"
                aria-label="Menu utilisateur"
              >
                <Avatar className="h-7 w-7 border border-background">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-[11px] select-none">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start text-left leading-none space-y-0.5 pr-0.5">
                  <span className="text-xs font-semibold text-foreground max-w-[130px] truncate">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-muted-foreground capitalize">
                    {displayRole}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden md:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-2">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{displayName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{displayRole}</p>
                  {user?.email && (
                    <p className="text-[11px] leading-none text-muted-foreground/80 truncate pt-0.5">
                      {user.email}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                Profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer"
                onClick={handleLogout}
              >
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
