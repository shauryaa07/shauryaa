import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import App from "@/pages/app";
import ProfilePage from "@/pages/profile";
import MessagesPage from "@/pages/messages";
import FriendsPage from "@/pages/friends";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
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
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default Root;
