import { Bell, Search, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { useEffect, useState } from "react"
import { notificationService } from "@/services/notification.service"

export function Header() {
const [ pseudo, setPseudo ] = useState()
  useEffect(()=>{
    setheaderPseudo(setPseudo, pseudo)

  })
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center gap-4 px-4">
        <SidebarTrigger/>
        
        <div className="flex flex-1 items-center gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products, forecasts..."
              className="w-full bg-background pl-10"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
          <Button variant="ghost" size="icon" className="relative" onClick={() => window.location.href = '/notifications'}>
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-xs text-destructive-foreground flex items-center justify-center">
              3
            </span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{pseudo}</DropdownMenuLabel>

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.location.href = '/profile'}>Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.location.href = '/settings'}>Paramètre</DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                window.location.href = '/login';
                toast.success("Vous avez été déconnecté");
                }
                }>Se deconnecter</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

function setheaderPseudo(setPseudo, pseudo: undefined) {
  const user = localStorage.getItem("user")

  setPseudo(JSON.parse(user).last_name + ' ' + JSON.parse(user).first_name || JSON.parse(user).username)
  document.title = "Predistock - " + pseudo
}
