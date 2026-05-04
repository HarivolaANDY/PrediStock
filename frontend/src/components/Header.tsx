import { Bell, User } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { useState, useEffect } from "react"

interface UserData {
  last_name?: string;
  first_name?: string;
  username?: string;
}

export function Header() {
  const [pseudo, setPseudo] = useState("")
  const [unreadCount, setUnreadCount] = useState(0)
  
  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const userData: UserData = JSON.parse(user);
        const name = (userData.last_name && userData.first_name) 
          ? `${userData.last_name} ${userData.first_name}` 
          : (userData.username || "Utilisateur");
        
        setPseudo(name);
        document.title = "Predistock - " + name;
      } catch (e) {
        console.error("Error parsing user data in Header", e);
      }
    }
  }, []);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/notifications/?status=non%20lu", {
          headers: {
            "Authorization": `Token ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          const list = Array.isArray(data) ? data : (data.results || []);
          setUnreadCount(list.length);
        }
      } catch (err) {
        console.error("Error fetching unread count", err);
      }
    };

    fetchUnreadCount();
    // Refresh count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-6">
        <SidebarTrigger className="-ml-1" />
        
        <div className="flex-1" />

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="relative h-9 w-9" onClick={() => window.location.href = '/notifications'}>
            <Bell className="h-5 w-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center animate-in zoom-in duration-300">
                {unreadCount}
              </span>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full border bg-muted/50">
                <User className="h-5 w-5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-2">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{pseudo}</p>
                  <p className="text-xs leading-none text-muted-foreground">Administrateur</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.location.href = '/profile'}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.location.href = '/settings'}>
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("user");
                  window.location.href = '/login';
                  toast.success("Vous avez été déconnecté");
                }}
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


