import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare } from "lucide-react";
import { Message, Friend } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import AppNav from "@/components/app-nav";

export default function MessagesPage() {
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<{ id: string; username: string } | null>(null);
  const [messageInput, setMessageInput] = useState("");

  useEffect(() => {
    const userStr = localStorage.getItem("currentUser");
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
    }
  }, []);

  const { data: friends = [] } = useQuery<Friend[]>({
    queryKey: [`/api/friends/${currentUser?.id}`],
    enabled: !!currentUser?.id,
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: [`/api/messages/${currentUser?.id}/${selectedFriend?.id}`],
    enabled: !!currentUser?.id && !!selectedFriend?.id,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", "/api/messages", {
        receiverId: selectedFriend?.id,
        content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${currentUser?.id}/${selectedFriend?.id}`] });
      setMessageInput("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (messageInput.trim() && selectedFriend) {
      sendMessageMutation.mutate(messageInput);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 dark:from-background dark:to-muted/5 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground" data-testid="text-please-login">
              Please log in to view messages
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 dark:from-background dark:to-muted/5">
      <AppNav currentUser={currentUser} />
      <div className="max-w-7xl mx-auto pt-24 pb-12 px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2" data-testid="text-conversations-title">
                <MessageSquare className="w-5 h-5" />
                Conversations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {friends.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8" data-testid="text-no-friends">
                    No friends to message
                  </p>
                ) : (
                  <div className="space-y-2">
                    {friends.map((friend) => (
                      <Card
                        key={friend.id}
                        className={`cursor-pointer ${selectedFriend?.id === friend.id ? "bg-muted" : ""}`}
                        onClick={() => setSelectedFriend({ id: friend.requesterId === currentUser.id ? friend.receiverId : friend.requesterId, username: "Friend" })}
                        data-testid={`card-friend-${friend.id}`}
                      >
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
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle data-testid="text-messages-title">
                {selectedFriend ? `Chat with ${selectedFriend.username}` : "Select a conversation"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedFriend ? (
                <div className="flex flex-col h-[500px]">
                  <ScrollArea className="flex-1 mb-4" ref={scrollRef}>
                    {messages.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8" data-testid="text-no-messages">
                        No messages yet. Start the conversation!
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.senderId === currentUser.id ? "justify-end" : "justify-start"}`}
                            data-testid={`message-${message.id}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                message.senderId === currentUser.id
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              <p data-testid={`text-message-content-${message.id}`}>{message.content}</p>
                              <p className="text-xs opacity-70 mt-1" data-testid={`text-message-time-${message.id}`}>
                                {message.createdAt ? format(new Date(message.createdAt), "PPp") : "Just now"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  <div className="flex gap-2">
                    <Input
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Type a message..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      data-testid="input-message"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || sendMessageMutation.isPending}
                      data-testid="button-send"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8" data-testid="text-select-conversation">
                  Select a friend to start messaging
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
