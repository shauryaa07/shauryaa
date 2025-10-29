import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, ArrowLeft, Users } from "lucide-react";
import { Link } from "wouter";
import { Friend, Profile } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function FriendsPage() {
  const { toast } = useToast();
  
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("studyconnect_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
    }
  }, []);

  const { data: friendRequests = [] } = useQuery<Friend[]>({
    queryKey: [`/api/friends/${currentUser?.id}/requests`],
    enabled: !!currentUser?.id,
  });

  const { data: friends = [] } = useQuery<Friend[]>({
    queryKey: [`/api/friends/${currentUser?.id}`],
    enabled: !!currentUser?.id,
  });

  const respondToRequestMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: "accepted" | "declined" }) => {
      return await apiRequest("PATCH", `/api/friends/${requestId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/friends/${currentUser?.id}/requests`] });
      queryClient.invalidateQueries({ queryKey: [`/api/friends/${currentUser?.id}`] });
      toast({
        title: "Request Updated",
        description: "Friend request has been updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update friend request",
        variant: "destructive",
      });
    },
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 dark:from-background dark:to-muted/5 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground dark:text-muted-foreground mb-4">
              Please log in to view friends
            </p>
            <Link href="/app">
              <Button className="w-full" data-testid="button-login">
                Go to App
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingRequests = friendRequests.filter(
    (req) => req.status === "pending" && req.receiverId === currentUser.id
  );
  const sentRequests = friendRequests.filter(
    (req) => req.status === "pending" && req.requesterId === currentUser.id
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 dark:from-background dark:to-muted/5 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/app">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to App
            </Button>
          </Link>
        </div>

        <Card className="bg-card dark:bg-card border border-border dark:border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-foreground dark:text-foreground flex items-center gap-2">
              <Users className="w-6 h-6" />
              Friends & Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="friends">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="friends" data-testid="tab-friends">
                  Friends ({friends.length})
                </TabsTrigger>
                <TabsTrigger value="pending" data-testid="tab-pending">
                  Requests ({pendingRequests.length})
                </TabsTrigger>
                <TabsTrigger value="sent" data-testid="tab-sent">
                  Sent ({sentRequests.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="friends" className="mt-4">
                <ScrollArea className="h-[500px]">
                  {friends.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground dark:text-muted-foreground">
                      <p>No friends yet</p>
                      <p className="text-sm mt-2">Connect with study partners to add friends!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {friends.map((friend) => {
                        const friendUserId =
                          friend.requesterId === currentUser.id
                            ? friend.receiverId
                            : friend.requesterId;
                        return (
                          <div
                            key={friend.id}
                            className="flex items-center gap-3 p-4 rounded-lg bg-muted/20 dark:bg-muted/10 border border-border dark:border-border"
                            data-testid={`friend-${friend.id}`}
                          >
                            <Avatar>
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {friendUserId.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium text-foreground dark:text-foreground">
                                {friendUserId}
                              </p>
                              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                                Friends since {new Date(friend.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Link href="/messages">
                              <Button variant="outline" size="sm" data-testid={`button-message-${friend.id}`}>
                                Message
                              </Button>
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="pending" className="mt-4">
                <ScrollArea className="h-[500px]">
                  {pendingRequests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground dark:text-muted-foreground">
                      <p>No pending requests</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingRequests.map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center gap-3 p-4 rounded-lg bg-muted/20 dark:bg-muted/10 border border-border dark:border-border"
                          data-testid={`request-${request.id}`}
                        >
                          <Avatar>
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {request.requesterId.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-foreground dark:text-foreground">
                              {request.requesterId}
                            </p>
                            <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                              Sent {new Date(request.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() =>
                                respondToRequestMutation.mutate({
                                  requestId: request.id,
                                  status: "accepted",
                                })
                              }
                              disabled={respondToRequestMutation.isPending}
                              size="sm"
                              data-testid={`button-accept-${request.id}`}
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Accept
                            </Button>
                            <Button
                              onClick={() =>
                                respondToRequestMutation.mutate({
                                  requestId: request.id,
                                  status: "declined",
                                })
                              }
                              disabled={respondToRequestMutation.isPending}
                              variant="outline"
                              size="sm"
                              data-testid={`button-decline-${request.id}`}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Decline
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="sent" className="mt-4">
                <ScrollArea className="h-[500px]">
                  {sentRequests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground dark:text-muted-foreground">
                      <p>No sent requests</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sentRequests.map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center gap-3 p-4 rounded-lg bg-muted/20 dark:bg-muted/10 border border-border dark:border-border"
                          data-testid={`sent-${request.id}`}
                        >
                          <Avatar>
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {request.receiverId.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-foreground dark:text-foreground">
                              {request.receiverId}
                            </p>
                            <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                              Sent {new Date(request.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-sm">
                            Pending
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
