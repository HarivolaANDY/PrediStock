import { Bell } from "lucide-react"
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
import { useAuth } from "@/contexts/AuthContext"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"



export function Header() {
  const { user } = useAuth()
  const [avatarUrl, setAvatarUrl] = useState("");
  const baseUrl = "http://localhost:8000";

  useEffect(() => {
    if (user?.avatar) {
      const url = user.avatar.startsWith('http') ? user.avatar : `${baseUrl}${user.avatar}`;
      setAvatarUrl(url);
    } else {
      setAvatarUrl("");
    }
  }, [user]);

  const [unreadCount, setUnreadCount] = useState(0)
  
  useEffect(() => {
    if (user) {
      document.title = "Predistock - " + user.first_name + " " + user.last_name;
    }
  }, [user]);

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
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full border bg-muted/50 p-0">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={avatarUrl} alt={user?.last_name} />
                  <AvatarFallback className="bg-transparent">
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-2">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.first_name} {user?.last_name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{typeof user?.role === 'string' ? user.role : (user?.role as any)?.name}</p>
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


