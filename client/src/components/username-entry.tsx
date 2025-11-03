import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Video, ArrowRight } from "lucide-react";
import { Link } from "wouter";

interface UsernameEntryProps {
  onSubmit: (username: string) => void;
}

export default function UsernameEntry({ onSubmit }: UsernameEntryProps) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (username.trim().length < 2) {
      setError("Username must be at least 2 characters");
      return;
    }
    
    if (username.trim().length > 20) {
      setError("Username must be less than 20 characters");
      return;
    }
    
    onSubmit(username.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 dark:from-background dark:to-muted/5 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <button className="inline-flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity" data-testid="link-home">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Video className="w-6 h-6 text-primary" />
              </div>
              <span className="font-semibold text-foreground dark:text-foreground text-lg">Hey Buddy</span>
            </button>
          </Link>
          
          <h1 className="text-3xl font-bold text-foreground dark:text-foreground mb-3">
            Welcome Back
          </h1>
          <p className="text-muted-foreground dark:text-muted-foreground">
            Enter your username to connect with study partners
          </p>
        </div>

        <div className="bg-card dark:bg-card border border-border dark:border-border rounded-2xl shadow-xl p-8 animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-foreground dark:text-foreground">
                Username
              </label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                className="h-12 text-base"
                autoFocus
                data-testid="input-username"
              />
              {error && (
                <p className="text-xs text-destructive dark:text-destructive" data-testid="text-error">
                  {error}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-medium"
              data-testid="button-continue"
            >
              Continue
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border dark:border-border">
            <p className="text-xs text-muted-foreground dark:text-muted-foreground text-center">
              No registration required. Your privacy is our priority.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
