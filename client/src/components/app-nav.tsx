import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { User, MessageSquare, Video, Users } from "lucide-react";

interface AppNavProps {
  currentUser: { id: string; username: string } | null;
}

export default function AppNav({ currentUser }: AppNavProps) {
  if (!currentUser) return null;

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
          </div>
        </div>
      </div>
    </nav>
  );
}
