import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import SignupPage from "@/pages/signup";
import LoginPage from "@/pages/login";
import App from "@/pages/app";
import ProfilePage from "@/pages/profile";
import MessagesPage from "@/pages/messages";
import FriendsPage from "@/pages/friends";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/app" component={App} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/messages" component={MessagesPage} />
      <Route path="/friends" component={FriendsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default Root;
