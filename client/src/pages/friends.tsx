import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Users } from "lucide-react";
import { Friend, Profile } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AppNav from "@/components/app-nav";

export default function FriendsPage() {
  const { toast } = useToast();
  
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("currentUser");
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
            <p className="text-center text-muted-foreground" data-testid="text-please-login">
              Please log in to view friends
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 dark:from-background dark:to-muted/5">
      <AppNav currentUser={currentUser} />
      <div className="max-w-4xl mx-auto pt-24 pb-12 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" data-testid="text-friends-title">
              <Users className="w-5 h-5" />
              Friends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="friends">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="friends" data-testid="tab-friends">
                  Friends ({friends.length})
                </TabsTrigger>
                <TabsTrigger value="requests" data-testid="tab-requests">
                  Requests ({friendRequests.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="friends" className="mt-4">
                <ScrollArea className="h-[400px]">
                  {friends.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8" data-testid="text-no-friends">
                      No friends yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {friends.map((friend) => (
                        <Card key={friend.id} data-testid={`card-friend-${friend.id}`}>
                          <CardContent className="p-4 flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {friend.requesterId.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium" data-testid={`text-friend-name-${friend.id}`}>
                                Friend
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
              <TabsContent value="requests" className="mt-4">
                <ScrollArea className="h-[400px]">
                  {friendRequests.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8" data-testid="text-no-requests">
                      No friend requests
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {friendRequests.map((request) => (
                        <Card key={request.id} data-testid={`card-request-${request.id}`}>
                          <CardContent className="p-4 flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {request.requesterId.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium" data-testid={`text-request-name-${request.id}`}>
                                Friend Request
                              </p>
                            </div>
                            {request.receiverId === currentUser.id && request.status === "pending" && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => respondToRequestMutation.mutate({ requestId: request.id, status: "accepted" })}
                                  data-testid={`button-accept-${request.id}`}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => respondToRequestMutation.mutate({ requestId: request.id, status: "declined" })}
                                  data-testid={`button-decline-${request.id}`}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
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
