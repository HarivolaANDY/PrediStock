import { useState } from "react"
import { NavLink, useLocation } from "react-router-dom"
import predistockLogo from "@/image/predistock.png"
import {
  LayoutDashboard,
  Home,
  ShieldCheck,
  Package,
  TrendingUp,
  Database,
  Brain,
  Bell,
  Settings,
  Users,
  FileText,
  BarChart3,
  Package2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Warehouse,
  ShoppingCart,
  DollarSign,
  RotateCcw,
  LineChart,
  Sparkles,
  ArrowLeftRight,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"

const mainItems = [
  { title: "Tableau de bord", icon: LayoutDashboard, hasSubmenu: true },
  { title: "Produits", url: "/products", icon: Package },
  { title: "Fournisseurs", url: "/suppliers", icon: Package2 },
  { title: "Analyse des stocks", url: "/stock", icon: BarChart3 },
  { title: "Entrée/Sortie", url: "/product-manager", icon: Warehouse },
  { title: "Prévisions", url: "/forecasting", icon: TrendingUp },
  { title: "Alertes", url: "/alerts", icon: AlertTriangle },
]

const achatVenteItems = [
  { title: "Achats", url: "/buy-sell/achats", icon: ShoppingCart },
  { title: "Ventes", url: "/buy-sell/ventes", icon: DollarSign },
  { title: "Retours", url: "/buy-sell/retours", icon: RotateCcw },
  { title: "Analyse", url: "/buy-sell/analyse", icon: LineChart },
  { title: "Recommandations", url: "/buy-sell/recommandations", icon: Sparkles },
  { title: "Mouvements", url: "/buy-sell/mouvements", icon: ArrowLeftRight },
]

const dataItems = [
  { title: "Gestion des données", url: "/data", icon: Database },
  { title: "Modèles IA", url: "/models", icon: Brain },
  { title: "Rapports", url: "/reports", icon: FileText },
]

const systemItems = [
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Paramètres", url: "/settings", icon: Settings },
]

export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname
  const collapsed = state === "collapsed"
  const [openDashboard, setOpenDashboard] = useState(false)
  const [openAchatVente, setOpenAchatVente] = useState(false)

  const isActive = (path: string) => currentPath === path

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
      : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <img 
            src={predistockLogo} 
            alt="Predistock Logo"
            className="h-6 w-6 object-contain"
            />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground">Predistock</h1>
              <p className="text-xs text-sidebar-foreground/70">Prévisions des stocks</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.hasSubmenu ? (
                    <>
                      {/* Bouton Dashboard */}
                      <SidebarMenuButton
                        onClick={() => setOpenDashboard(!openDashboard)}
                        className="flex items-center justify-between w-full"
                      >
                        <span className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </span>
                        {!collapsed &&
                          (openDashboard ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          ))}
                      </SidebarMenuButton>

                      {/* Sous-menu */}
                      {openDashboard && !collapsed && (
                        <ul className="ml-8 mt-1 space-y-1 text-sm">
                          <li className="gap-2 flex hover:bg-sidebar-accent text-sidebar-accent-foreground px-2 py-1 rounded-md items-center">
                            <Home className="max-h-4"/>
                            <NavLink
                              to="/dashboard"
                              end
                            >
                              Principal
                            </NavLink>
                          </li>
                          <li className="gap-2 flex hover:bg-sidebar-accent text-sidebar-accent-foreground px-2 py-1 rounded-md items-center">
                            <ShieldCheck className="max-h-4"/>
                            <NavLink
                              to="/dashboard-admin"
                              end
                            >
                              Administrateur
                            </NavLink>
                          </li>
                        </ul>
                      )}
                    </>
                  ) : (
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url!} end className={getNavCls}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Achats & Ventes */}
        <SidebarGroup>
          <SidebarGroupLabel>Achats & Ventes</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setOpenAchatVente(!openAchatVente)}
                  className="flex items-center justify-between w-full"
                >
                  <span className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    {!collapsed && <span>Achats & Ventes</span>}
                  </span>
                  {!collapsed &&
                    (openAchatVente ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    ))}
                </SidebarMenuButton>

                {openAchatVente && !collapsed && (
                  <ul className="ml-8 mt-1 space-y-1 text-sm">
                    {achatVenteItems.map((item) => (
                      <li key={item.title} className="gap-2 flex hover:bg-sidebar-accent text-sidebar-accent-foreground px-2 py-1 rounded-md items-center">
                        <item.icon className="max-h-4 w-4" />
                        <NavLink
                          to={item.url}
                          end
                          className={isActive(item.url) ? "font-medium" : ""}
                        >
                          {item.title}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Données & IA */}
        <SidebarGroup>
          <SidebarGroupLabel>Données & IA</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dataItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Système */}
        <SidebarGroup>
          <SidebarGroupLabel>Système</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}