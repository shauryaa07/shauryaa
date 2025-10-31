import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { User, MessageSquare, Video, Users, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AppNavProps {
  currentUser: { id: string; username: string } | null;
}

export default function AppNav({ currentUser }: AppNavProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  if (!currentUser) return null;

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
      
      // Clear localStorage
      localStorage.removeItem("currentUser");
      
      toast({
        title: "Logged out",
        description: "You've been successfully logged out.",
      });
      
      // Redirect to home or reload
      window.location.href = "/app";
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear localStorage and redirect even if API call fails
      localStorage.removeItem("currentUser");
      window.location.href = "/app";
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 dark:bg-background/95 backdrop-blur border-b border-border dark:border-border">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Video className="w-5 h-5 text-primary" />
            </div>
            <span className="font-semibold text-foreground dark:text-foreground">
              StudyConnect
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/app">
              <Button variant="ghost" size="sm" data-testid="button-nav-app">
                <Video className="w-4 h-4 mr-2" />
                App
              </Button>
            </Link>
            <Link href="/friends">
              <Button variant="ghost" size="sm" data-testid="button-nav-friends">
                <Users className="w-4 h-4 mr-2" />
                Friends
              </Button>
            </Link>
            <Link href="/messages">
              <Button variant="ghost" size="sm" data-testid="button-nav-messages">
                <MessageSquare className="w-4 h-4 mr-2" />
                Messages
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="ghost" size="sm" data-testid="button-nav-profile">
                <User className="w-4 h-4 mr-2" />
                Profile
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
