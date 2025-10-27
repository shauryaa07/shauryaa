import { Button } from "@/components/ui/button";
import { User, Preference } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface MatchingStateProps {
  user: User;
  preferences: Preference;
  onComplete: () => void;
  onCancel: () => void;
}

export default function MatchingState({
  user,
  preferences,
  onComplete,
  onCancel,
}: MatchingStateProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 dark:from-background dark:to-muted/5 flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        <div className="bg-card dark:bg-card border border-border dark:border-border rounded-2xl shadow-xl p-12 animate-fade-in">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            
            <h2 className="text-2xl font-bold text-foreground dark:text-foreground mb-3">
              Finding Your Study Partners
            </h2>
            
            <p className="text-muted-foreground dark:text-muted-foreground mb-2">
              Looking for the perfect study group for you...
            </p>
            
            <div className="flex items-center justify-center gap-2 mt-6">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full h-10"
            data-testid="button-cancel-matching"
          >
            Cancel
          </Button>
        </div>

        <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-6">
          Connecting to signaling server...
        </p>
      </div>
    </div>
  );
}
