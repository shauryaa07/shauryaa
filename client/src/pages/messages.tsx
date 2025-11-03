import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Message, Friend, Profile } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import AppNav from "@/components/app-nav";

export default function MessagesPage() {
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<{ id: string; username: string; photoUrl?: string } | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("currentUser");
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
    }
  }, []);

  // WebSocket connection for real-time messaging
  useEffect(() => {
    if (!currentUser) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    console.log("Connecting to WebSocket for messaging:", wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected for messaging");
      setWsConnected(true);
      
      // Register for messaging
      ws.send(JSON.stringify({
        type: "register-messaging",
        userId: currentUser.id,
        username: currentUser.username,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("Received WebSocket message:", message);

        if (message.type === "dm-message") {
          // Invalidate queries to refetch messages
          queryClient.invalidateQueries({ queryKey: [`/api/messages/${currentUser.id}/${message.senderId}`] });
          queryClient.invalidateQueries({ queryKey: [`/api/messages/${message.senderId}/${currentUser.id}`] });
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setWsConnected(false);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setWsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [currentUser]);

  const { data: friends = [] } = useQuery<Friend[]>({
    queryKey: [`/api/friends/${currentUser?.id}`],
    enabled: !!currentUser?.id,
  });

  const acceptedFriends = friends.filter(f => f.status === "accepted");

  const { data: profiles = [] } = useQuery<Profile[]>({
    queryKey: ["/api/profiles"],
    enabled: acceptedFriends.length > 0,
    queryFn: async () => {
      const profilePromises = acceptedFriends.map(async (friend) => {
        const friendUserId = friend.requesterId === currentUser?.id ? friend.receiverId : friend.requesterId;
        try {
          const res = await apiRequest("GET", `/api/profiles/${friendUserId}`);
          return await res.json();
        } catch {
          return null;
        }
      });
      const results = await Promise.all(profilePromises);
      return results.filter((p: Profile | null): p is Profile => p !== null);
    },
  });

  const friendsWithProfiles = acceptedFriends.map(friend => {
    const friendUserId = friend.requesterId === currentUser?.id ? friend.receiverId : friend.requesterId;
    const profile = profiles.find(p => p?.userId === friendUserId);
    return {
      id: friendUserId,
      username: friendUserId,
      photoUrl: profile?.photoUrl,
    };
  });

  const { data: messages = [], refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: [`/api/messages/${currentUser?.id}/${selectedFriend?.id}`],
    enabled: !!currentUser?.id && !!selectedFriend?.id,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      // Save to database
      const response = await apiRequest("POST", "/api/messages", {
        senderId: currentUser?.id,
        receiverId: selectedFriend?.id,
        content,
      });
      
      // Send via WebSocket for real-time delivery if connected
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && selectedFriend) {
        wsRef.current.send(JSON.stringify({
          type: "dm-message",
          receiverId: selectedFriend.id,
          content,
        }));
      }
      
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${currentUser?.id}/${selectedFriend?.id}`] });
      setMessageInput("");
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Fallback polling only if WebSocket is not connected
  useEffect(() => {
    if (selectedFriend && currentUser && !wsConnected) {
      const interval = setInterval(() => {
        refetchMessages();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedFriend, currentUser, wsConnected, refetchMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedFriend) return;
    sendMessageMutation.mutate(messageInput.trim());
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 dark:from-background dark:to-muted/5 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground dark:text-muted-foreground mb-4">
              Please log in to view messages
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 dark:from-background dark:to-muted/5">
      <AppNav currentUser={currentUser} />
      <div className="max-w-6xl mx-auto py-8 px-4 mt-16">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
          {/* Friends List */}
          <Card className="bg-card dark:bg-card border border-border dark:border-border md:col-span-1">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-foreground dark:text-foreground">
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-300px)]">
                {friendsWithProfiles.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground dark:text-muted-foreground">
                    <p>No friends yet</p>
                    <p className="text-sm mt-2">Add friends to start messaging</p>
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {friendsWithProfiles.map((friend) => (
                      <button
                        key={friend.id}
                        onClick={() => setSelectedFriend(friend)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-muted/50 dark:hover:bg-muted/30 ${
                          selectedFriend?.id === friend.id
                            ? "bg-primary/10 dark:bg-primary/20"
                            : ""
                        }`}
                        data-testid={`button-friend-${friend.id}`}
                      >
                        <Avatar>
                          <AvatarImage src={friend.photoUrl} alt={friend.username} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {friend.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-foreground dark:text-foreground">
                            {friend.username}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="bg-card dark:bg-card border border-border dark:border-border md:col-span-2">
            {selectedFriend ? (
              <>
                <CardHeader className="border-b border-border dark:border-border">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={selectedFriend.photoUrl} alt={selectedFriend.username} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {selectedFriend.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-xl font-bold text-foreground dark:text-foreground">
                        {selectedFriend.username}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex flex-col h-[calc(100vh-350px)]">
                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                    <div className="space-y-4">
                      {messages.length === 0 ? (
                        <div className="text-center text-muted-foreground dark:text-muted-foreground py-8">
                          No messages yet. Start the conversation!
                        </div>
                      ) : (
                        messages.map((message) => {
                          const isCurrentUser = message.senderId === currentUser.id;
                          return (
                            <div
                              key={message.id}
                              className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                              data-testid={`message-${message.id}`}
                            >
                              <div
                                className={`max-w-[70%] rounded-lg p-3 ${
                                  isCurrentUser
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted dark:bg-muted/50 text-foreground dark:text-foreground"
                                }`}
                              >
                                <p className="break-words">{message.content}</p>
                                <p className="text-xs mt-1 opacity-70">
                                  {format(new Date(message.createdAt), "h:mm a")}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>

                  {/* Input */}
                  <div className="border-t border-border dark:border-border p-4">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input
                        placeholder="Type a message..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        disabled={sendMessageMutation.isPending}
                        data-testid="input-message"
                      />
                      <Button
                        type="submit"
                        disabled={!messageInput.trim() || sendMessageMutation.isPending}
                        data-testid="button-send"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex items-center justify-center h-full">
                <p className="text-muted-foreground dark:text-muted-foreground">
                  Select a friend to start messaging
                </p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
