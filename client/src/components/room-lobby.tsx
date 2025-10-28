import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "@shared/schema";
import { Shuffle, Lock, Plus, Users, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RoomLobbyProps {
  user: User;
  onJoinRandom: () => void;
  onJoinPrivate: (password: string) => void;
  onCreateRoom: (name: string, type: "public" | "private", password?: string) => void;
}

export default function RoomLobby({
  user,
  onJoinRandom,
  onJoinPrivate,
  onCreateRoom,
}: RoomLobbyProps) {
  const [showJoinPrivate, setShowJoinPrivate] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [joinPassword, setJoinPassword] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomType, setRoomType] = useState<"public" | "private">("public");
  const [roomPassword, setRoomPassword] = useState("");
  const { toast } = useToast();

  const handleJoinPrivate = () => {
    if (!joinPassword.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter the room password",
        variant: "destructive",
      });
      return;
    }
    onJoinPrivate(joinPassword);
    setShowJoinPrivate(false);
    setJoinPassword("");
  };

  const handleCreateRoom = () => {
    if (!roomName.trim()) {
      toast({
        title: "Room Name Required",
        description: "Please enter a name for your room",
        variant: "destructive",
      });
      return;
    }
    if (roomType === "private" && !roomPassword.trim()) {
      toast({
        title: "Password Required",
        description: "Private rooms require a password",
        variant: "destructive",
      });
      return;
    }
    onCreateRoom(roomName, roomType, roomType === "private" ? roomPassword : undefined);
    setShowCreateRoom(false);
    setRoomName("");
    setRoomPassword("");
    setRoomType("public");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <Video className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-2 dark:text-white">Welcome, {user.username}!</h1>
          <p className="text-muted-foreground">
            Choose how you'd like to connect with study partners
          </p>
        </div>

        {/* Main Options */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Join Random Room */}
          <Card className="border-2 hover:border-primary/50 transition-all cursor-pointer group" data-testid="card-join-random">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-2 group-hover:bg-blue-500/20 transition-colors">
                <Shuffle className="w-6 h-6 text-blue-500" />
              </div>
              <CardTitle>Join Random Room</CardTitle>
              <CardDescription>
                Connect instantly with available study partners in public rooms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                size="lg"
                onClick={onJoinRandom}
                data-testid="button-join-random"
              >
                <Shuffle className="w-4 h-4 mr-2" />
                Find Study Partners
              </Button>
            </CardContent>
          </Card>

          {/* Join Private Room */}
          <Card className="border-2 hover:border-purple-500/50 transition-all cursor-pointer group" data-testid="card-join-private">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-2 group-hover:bg-purple-500/20 transition-colors">
                <Lock className="w-6 h-6 text-purple-500" />
              </div>
              <CardTitle>Join Private Room</CardTitle>
              <CardDescription>
                Join a specific room using a password shared by your friends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                size="lg"
                variant="secondary"
                onClick={() => setShowJoinPrivate(true)}
                data-testid="button-show-join-private"
              >
                <Lock className="w-4 h-4 mr-2" />
                Enter Password
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Create Room */}
        <Card className="border-2 border-dashed hover:border-primary transition-all" data-testid="card-create-room">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create Your Own Room
              </CardTitle>
              <CardDescription className="mt-1">
                Set up a custom room and invite friends or make it public
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full md:w-auto"
              variant="outline"
              size="lg"
              onClick={() => setShowCreateRoom(true)}
              data-testid="button-show-create-room"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Room
            </Button>
          </CardContent>
        </Card>

        {/* Join Private Room Dialog */}
        <Dialog open={showJoinPrivate} onOpenChange={setShowJoinPrivate}>
          <DialogContent data-testid="dialog-join-private">
            <DialogHeader>
              <DialogTitle>Join Private Room</DialogTitle>
              <DialogDescription>
                Enter the password provided by your friend to join their private room.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="join-password">Room Password</Label>
              <Input
                id="join-password"
                type="password"
                placeholder="Enter password..."
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoinPrivate()}
                data-testid="input-join-password"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowJoinPrivate(false)} data-testid="button-cancel-join">
                Cancel
              </Button>
              <Button onClick={handleJoinPrivate} data-testid="button-submit-join">
                Join Room
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Room Dialog */}
        <Dialog open={showCreateRoom} onOpenChange={setShowCreateRoom}>
          <DialogContent data-testid="dialog-create-room">
            <DialogHeader>
              <DialogTitle>Create New Room</DialogTitle>
              <DialogDescription>
                Set up your study room. Choose between public (anyone can join) or private (password required).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="room-name">Room Name</Label>
                <Input
                  id="room-name"
                  placeholder="e.g., Physics Study Group"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  data-testid="input-room-name"
                />
              </div>

              <div>
                <Label>Room Type</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <Button
                    type="button"
                    variant={roomType === "public" ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setRoomType("public")}
                    data-testid="button-type-public"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Public
                  </Button>
                  <Button
                    type="button"
                    variant={roomType === "private" ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setRoomType("private")}
                    data-testid="button-type-private"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Private
                  </Button>
                </div>
              </div>

              {roomType === "private" && (
                <div>
                  <Label htmlFor="room-password">Room Password</Label>
                  <Input
                    id="room-password"
                    type="password"
                    placeholder="Set a password..."
                    value={roomPassword}
                    onChange={(e) => setRoomPassword(e.target.value)}
                    data-testid="input-room-password"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Share this password with people you want to invite
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateRoom(false)} data-testid="button-cancel-create">
                Cancel
              </Button>
              <Button onClick={handleCreateRoom} data-testid="button-submit-create">
                Create Room
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
