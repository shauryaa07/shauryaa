import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { UserPlus, Check, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Friend } from "@shared/schema";

interface FriendRequestButtonProps {
  currentUserId: string;
  targetUserId: string;
  targetUsername: string;
}

export default function FriendRequestButton({
  currentUserId,
  targetUserId,
  targetUsername,
}: FriendRequestButtonProps) {
  const { toast } = useToast();

  const { data: friendRequests = [] } = useQuery<Friend[]>({
    queryKey: [`/api/friends/${currentUserId}/requests`],
  });

  const sendRequestMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/friends/request", {
        receiverId: targetUserId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/friends/${currentUserId}/requests`] });
      toast({
        title: "Friend Request Sent",
        description: `Sent a friend request to ${targetUsername}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send friend request",
        variant: "destructive",
      });
    },
  });

  const existingRequest = friendRequests.find(
    (req) =>
      (req.requesterId === currentUserId && req.receiverId === targetUserId) ||
      (req.requesterId === targetUserId && req.receiverId === currentUserId)
  );

  const isFriend = existingRequest?.status === "accepted";
  const isPending = existingRequest?.status === "pending";

  if (currentUserId === targetUserId) {
    return null;
  }

  if (isFriend) {
    return (
      <Button variant="outline" size="sm" disabled data-testid={`button-friend-status-${targetUserId}`}>
        <Check className="w-4 h-4 mr-2" />
        Friends
      </Button>
    );
  }

  if (isPending) {
    return (
      <Button variant="outline" size="sm" disabled data-testid={`button-pending-${targetUserId}`}>
        <X className="w-4 h-4 mr-2" />
        Pending
      </Button>
    );
  }

  return (
    <Button
      onClick={() => sendRequestMutation.mutate()}
      disabled={sendRequestMutation.isPending}
      size="sm"
      data-testid={`button-add-friend-${targetUserId}`}
    >
      <UserPlus className="w-4 h-4 mr-2" />
      {sendRequestMutation.isPending ? "Sending..." : "Add Friend"}
    </Button>
  );
}
