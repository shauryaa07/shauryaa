import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { User, Room } from "@shared/schema";
import { Search, Users, Video, Shuffle, Lock, Globe, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AppNav from "@/components/app-nav";

interface UnifiedLobbyProps {
  user: User;
  onJoinRoom: (roomId: string, password: string) => void;
  onCreateRoom: (name: string, password: string, type: "public" | "private") => void;
  onJoinRandom: () => void;
}

export default function UnifiedLobby({
  user,
  onJoinRoom,
  onCreateRoom,
  onJoinRandom,
}: UnifiedLobbyProps) {
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showSearchRoom, setShowSearchRoom] = useState(false);
  const [showJoinRoomDialog, setShowJoinRoomDialog] = useState(false);
  const [selectedRoomForJoin, setSelectedRoomForJoin] = useState<Room | null>(null);
  const [generatedRoomId, setGeneratedRoomId] = useState("");
  const [roomIdCopied, setRoomIdCopied] = useState(false);
  const [roomPassword, setRoomPassword] = useState("");
  const [roomType, setRoomType] = useState<"public" | "private">("public");
  const [searchRoomId, setSearchRoomId] = useState("");
  const [searchResults, setSearchResults] = useState<Room[]>([]);
  const [joinPassword, setJoinPassword] = useState("");
  const { toast } = useToast();

  const generateRoomId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  useEffect(() => {
    if (showCreateRoom && !generatedRoomId) {
      setGeneratedRoomId(generateRoomId());
    }
  }, [showCreateRoom, generatedRoomId]);

  const { data: allRooms } = useQuery<Room[]>({
    queryKey: ["/api/rooms/public"],
  });

  const handleCopyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(generatedRoomId);
      setRoomIdCopied(true);
      toast({
        title: "Copied!",
        description: "Room ID copied to clipboard",
      });
      setTimeout(() => setRoomIdCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy room ID",
        variant: "destructive",
      });
    }
  };

  const handleCreateRoom = () => {
    if (!generatedRoomId) {
      toast({
        title: "Error",
        description: "Room ID not generated. Please try again.",
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
    
    onCreateRoom(generatedRoomId, roomPassword, roomType);
    setShowCreateRoom(false);
    setGeneratedRoomId("");
    setRoomPassword("");
    setRoomType("public");
    setRoomIdCopied(false);
  };

  const handleSearchRoom = async () => {
    if (!searchRoomId.trim()) {
      toast({
        title: "Room ID Required",
        description: "Please enter a room ID to search",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const response = await fetch(`/api/rooms/search?id=${encodeURIComponent(searchRoomId)}`);
      if (!response.ok) {
        throw new Error("Search failed");
      }
      const rooms = await response.json();
      setSearchResults(rooms);
      
      if (rooms.length === 0) {
        toast({
          title: "No Rooms Found",
          description: `No rooms found with ID "${searchRoomId}"`,
        });
      }
    } catch (error) {
      console.error("Error searching rooms:", error);
      toast({
        title: "Error",
        description: "Failed to search rooms. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRoomClick = (room: Room) => {
    setSelectedRoomForJoin(room);
    
    // If public room, join directly (capacity will be checked in handleJoinRoom)
    if (room.type === "public") {
      onJoinRoom(room.id, "");
    } else {
      // For private rooms, show password dialog
      setShowJoinRoomDialog(true);
    }
  };

  const handleJoinSelectedRoom = () => {
    if (!selectedRoomForJoin) return;
    
    // Only require password for private rooms
    if (selectedRoomForJoin.type === "private" && !joinPassword.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter the room password",
        variant: "destructive",
      });
      return;
    }
    
    onJoinRoom(selectedRoomForJoin.id, joinPassword);
    setShowJoinRoomDialog(false);
    setJoinPassword("");
    setSelectedRoomForJoin(null);
  };

  return (
    <div className="min-h-screen bg-background dark:bg-background flex flex-col">
      <AppNav currentUser={{ id: user.id, username: user.username }} />
      <div className="flex flex-col p-6 mt-16 flex-1">
        <div className="flex flex-col flex-1">
        <div className="bg-card dark:bg-card rounded-lg border border-border dark:border-border flex-1 mb-4 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border dark:border-border">
            <h2 className="text-lg font-semibold text-foreground dark:text-foreground">Available Rooms</h2>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">Click on a room to join and start studying with others</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {allRooms && allRooms.length > 0 ? (
              <div className="divide-y divide-border dark:divide-border">
                {allRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => handleRoomClick(room)}
                    className="w-full p-4 hover:bg-muted/50 dark:hover:bg-muted/20 transition-colors flex items-center justify-between group cursor-pointer text-left"
                    data-testid={`row-room-${room.id}`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-16 h-16 bg-muted dark:bg-muted rounded overflow-hidden">
                        <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          {room.type === "public" ? (
                            <Globe className="w-6 h-6 text-blue-400" />
                          ) : (
                            <Lock className="w-6 h-6 text-purple-400" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-foreground dark:text-foreground font-medium font-mono text-lg" data-testid={`text-room-name-${room.id}`}>
                          {room.name}
                        </h3>
                        <p className="text-sm text-muted-foreground dark:text-muted-foreground">{room.type === "public" ? "Public Room" : "Private Room"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground dark:text-muted-foreground flex items-center gap-1">
                          {room.type === "public" ? (
                            <>
                              <Globe className="w-3 h-3" />
                              Public Room
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3" />
                              Private Room
                            </>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground/70 dark:text-muted-foreground/70">
                          {room.type === "public" ? "Click to Join" : "Password Required"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 min-w-[100px] justify-end">
                        <Users className="w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
                        <span className="text-foreground dark:text-foreground font-medium" data-testid={`text-occupancy-${room.id}`}>
                          {room.currentOccupancy} / {room.maxOccupancy}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-muted-foreground dark:text-muted-foreground mb-4">No rooms available</p>
                  <p className="text-sm text-muted-foreground/70 dark:text-muted-foreground/70">Create a new room to get started</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-card dark:bg-card rounded-lg border border-border dark:border-border px-4 py-2">
            <Search className="w-5 h-5 text-muted-foreground dark:text-muted-foreground" />
            <button
              onClick={() => setShowSearchRoom(true)}
              className="flex-1 text-left text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground transition-colors py-1"
              data-testid="button-search-room"
            >
              Search for rooms by ID
            </button>
          </div>
          
          <Button
            onClick={onJoinRandom}
            variant="outline"
            className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700 px-6"
            data-testid="button-random-join"
          >
            <Shuffle className="w-4 h-4 mr-2" />
            RANDOM JOIN
          </Button>

          <Button
            onClick={() => setShowCreateRoom(true)}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-8"
            data-testid="button-create"
          >
            CREATE
          </Button>
        </div>
        </div>
      </div>

      <Dialog open={showCreateRoom} onOpenChange={setShowCreateRoom}>
        <DialogContent data-testid="dialog-create-room" className="bg-card dark:bg-card border-border dark:border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground dark:text-foreground">Create New Room</DialogTitle>
            <DialogDescription className="text-muted-foreground dark:text-muted-foreground">
              Set up your study room. Public rooms can be joined by anyone with the password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-foreground dark:text-foreground">Room Type</Label>
              <RadioGroup value={roomType} onValueChange={(value) => setRoomType(value as "public" | "private")} className="flex gap-4 mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="public" id="public" data-testid="radio-public" />
                  <Label htmlFor="public" className="text-foreground dark:text-foreground cursor-pointer flex items-center gap-1">
                    <Globe className="w-4 h-4" />
                    Public
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="private" id="private" data-testid="radio-private" />
                  <Label htmlFor="private" className="text-foreground dark:text-foreground cursor-pointer flex items-center gap-1">
                    <Lock className="w-4 h-4" />
                    Private
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-2">
                {roomType === "public" 
                  ? "Anyone can find and join this room with the password" 
                  : "Only people you share the room ID with can join"}
              </p>
            </div>

            <div>
              <Label htmlFor="room-id" className="text-foreground dark:text-foreground">Room ID</Label>
              <div className="flex gap-2">
                <Input
                  id="room-id"
                  value={generatedRoomId}
                  readOnly
                  className="bg-muted dark:bg-muted border-border dark:border-border text-foreground dark:text-foreground font-mono text-lg"
                  data-testid="input-room-id"
                />
                <Button
                  type="button"
                  onClick={handleCopyRoomId}
                  variant="outline"
                  size="icon"
                  className="bg-muted dark:bg-muted border-border dark:border-border hover:bg-muted/80 dark:hover:bg-muted/80"
                  data-testid="button-copy-room-id"
                >
                  {roomIdCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                Share this Room ID with others to let them join
              </p>
            </div>

            {roomType === "private" && (
              <div>
                <Label htmlFor="room-password" className="text-foreground dark:text-foreground">Room Password</Label>
                <Input
                  id="room-password"
                  type="password"
                  placeholder="Set a password..."
                  value={roomPassword}
                  onChange={(e) => setRoomPassword(e.target.value)}
                  className="bg-muted dark:bg-muted border-border dark:border-border text-foreground dark:text-foreground"
                  data-testid="input-room-password"
                />
                <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                  Share this password with people you want to invite
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateRoom(false)} 
              className="bg-muted dark:bg-muted border-border dark:border-border text-foreground dark:text-foreground hover:bg-muted/80 dark:hover:bg-muted/80"
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateRoom} 
              className="bg-yellow-500 hover:bg-yellow-600 text-black"
              data-testid="button-submit-create"
            >
              Create Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSearchRoom} onOpenChange={(open) => {
        setShowSearchRoom(open);
        if (!open) {
          setSearchRoomId("");
          setSearchResults([]);
        }
      }}>
        <DialogContent data-testid="dialog-search-room" className="bg-card dark:bg-card border-border dark:border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground dark:text-foreground">Search Rooms</DialogTitle>
            <DialogDescription className="text-muted-foreground dark:text-muted-foreground">
              Enter a room ID to find and join a specific room.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                id="search-room-id"
                placeholder="Enter room ID (e.g., ABC12345)..."
                value={searchRoomId}
                onChange={(e) => setSearchRoomId(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleSearchRoom()}
                className="bg-muted dark:bg-muted border-border dark:border-border text-foreground dark:text-foreground flex-1 font-mono"
                data-testid="input-search-room-id"
              />
              <Button 
                onClick={handleSearchRoom}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-submit-search"
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">{searchResults.length} room(s) found</p>
                {searchResults.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => {
                      setSelectedRoomForJoin(room);
                      setShowSearchRoom(false);
                      if (room.type === "public") {
                        onJoinRoom(room.id, "");
                      } else {
                        setShowJoinRoomDialog(true);
                      }
                    }}
                    className="w-full p-3 bg-muted/50 dark:bg-muted/50 hover:bg-muted dark:hover:bg-muted rounded border border-border dark:border-border text-left transition-colors"
                    data-testid={`search-result-${room.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {room.type === "public" ? (
                          <Globe className="w-5 h-5 text-blue-400" />
                        ) : (
                          <Lock className="w-5 h-5 text-purple-400" />
                        )}
                        <div>
                          <h3 className="text-foreground dark:text-foreground font-medium font-mono text-lg">{room.name}</h3>
                          <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                            Room ID: {room.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
                        <span className="text-foreground dark:text-foreground">{room.currentOccupancy}/{room.maxOccupancy}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showJoinRoomDialog} onOpenChange={(open) => {
        setShowJoinRoomDialog(open);
        if (!open) {
          setJoinPassword("");
          setSelectedRoomForJoin(null);
        }
      }}>
        <DialogContent data-testid="dialog-join-room" className="bg-card dark:bg-card border-border dark:border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground dark:text-foreground">Join Room: {selectedRoomForJoin?.name}</DialogTitle>
            <DialogDescription className="text-muted-foreground dark:text-muted-foreground">
              Enter the password to join this {selectedRoomForJoin?.type} room.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="join-password" className="text-foreground dark:text-foreground">Password</Label>
              <Input
                id="join-password"
                type="password"
                placeholder="Enter room password..."
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoinSelectedRoom()}
                className="bg-muted dark:bg-muted border-border dark:border-border text-foreground dark:text-foreground"
                data-testid="input-join-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowJoinRoomDialog(false);
                setJoinPassword("");
                setSelectedRoomForJoin(null);
              }} 
              className="bg-muted dark:bg-muted border-border dark:border-border text-foreground dark:text-foreground hover:bg-muted/80 dark:hover:bg-muted/80"
              data-testid="button-cancel-join"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleJoinSelectedRoom}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-submit-join"
            >
              Join Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
