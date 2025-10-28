import { useState } from "react";
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
import { Search, Users, Video, Shuffle, Lock, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [roomName, setRoomName] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [roomType, setRoomType] = useState<"public" | "private">("public");
  const [searchRoomId, setSearchRoomId] = useState("");
  const [searchPassword, setSearchPassword] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const { toast } = useToast();

  const { data: allRooms } = useQuery<Room[]>({
    queryKey: ["/api/rooms/public"],
  });

  const handleCreateRoom = () => {
    if (!roomName.trim()) {
      toast({
        title: "Room Name Required",
        description: "Please enter a name for your room",
        variant: "destructive",
      });
      return;
    }
    if (!roomPassword.trim()) {
      toast({
        title: "Password Required",
        description: "All rooms require a password",
        variant: "destructive",
      });
      return;
    }
    onCreateRoom(roomName, roomPassword, roomType);
    setShowCreateRoom(false);
    setRoomName("");
    setRoomPassword("");
    setRoomType("public");
  };

  const handleSearchRoom = () => {
    if (!searchRoomId.trim()) {
      toast({
        title: "Room ID Required",
        description: "Please enter the room ID",
        variant: "destructive",
      });
      return;
    }
    if (!searchPassword.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter the room password",
        variant: "destructive",
      });
      return;
    }
    onJoinRoom(searchRoomId, searchPassword);
    setShowSearchRoom(false);
    setSearchRoomId("");
    setSearchPassword("");
  };

  const handleRoomClick = (room: Room) => {
    setSelectedRoomForJoin(room);
    setShowJoinRoomDialog(true);
  };

  const handleJoinSelectedRoom = () => {
    if (!selectedRoomForJoin) return;
    
    if (!joinPassword.trim()) {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
            <Video className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">StudyConnect</h1>
            <p className="text-sm text-gray-400">Welcome, {user.username}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 flex-1 mb-4 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Available Rooms</h2>
            <p className="text-sm text-gray-400 mt-1">Click on a room to join and start studying with others</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {allRooms && allRooms.length > 0 ? (
              <div className="divide-y divide-slate-700">
                {allRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => handleRoomClick(room)}
                    className="w-full p-4 hover:bg-slate-700/30 transition-colors flex items-center justify-between group cursor-pointer text-left"
                    data-testid={`row-room-${room.id}`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-16 h-16 bg-slate-700 rounded overflow-hidden">
                        <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          {room.type === "public" ? (
                            <Globe className="w-6 h-6 text-blue-400" />
                          ) : (
                            <Lock className="w-6 h-6 text-purple-400" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-medium" data-testid={`text-room-name-${room.id}`}>
                          {room.name}
                        </h3>
                        <p className="text-sm text-gray-400">ID: {room.id}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-sm text-gray-400 flex items-center gap-1">
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
                        <div className="text-sm text-gray-500">Password Required</div>
                      </div>
                      <div className="flex items-center gap-2 min-w-[100px] justify-end">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-white font-medium" data-testid={`text-occupancy-${room.id}`}>
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
                  <p className="text-gray-400 mb-4">No rooms available</p>
                  <p className="text-sm text-gray-500">Create a new room to get started</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-slate-800/50 rounded-lg border border-slate-700 px-4 py-2">
            <Search className="w-5 h-5 text-gray-400" />
            <button
              onClick={() => setShowSearchRoom(true)}
              className="flex-1 text-left text-gray-400 hover:text-gray-300 transition-colors py-1"
              data-testid="button-search-room"
            >
              CLICK TO ENTER ROOM ID
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

      <Dialog open={showCreateRoom} onOpenChange={setShowCreateRoom}>
        <DialogContent data-testid="dialog-create-room" className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Room</DialogTitle>
            <DialogDescription className="text-gray-400">
              Set up your study room. Public rooms can be joined by anyone with the password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-300">Room Type</Label>
              <RadioGroup value={roomType} onValueChange={(value) => setRoomType(value as "public" | "private")} className="flex gap-4 mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="public" id="public" data-testid="radio-public" />
                  <Label htmlFor="public" className="text-gray-300 cursor-pointer flex items-center gap-1">
                    <Globe className="w-4 h-4" />
                    Public
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="private" id="private" data-testid="radio-private" />
                  <Label htmlFor="private" className="text-gray-300 cursor-pointer flex items-center gap-1">
                    <Lock className="w-4 h-4" />
                    Private
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-gray-500 mt-2">
                {roomType === "public" 
                  ? "Anyone can find and join this room with the password" 
                  : "Only people you share the room ID with can join"}
              </p>
            </div>

            <div>
              <Label htmlFor="room-name" className="text-gray-300">Room Name</Label>
              <Input
                id="room-name"
                placeholder="e.g., Physics Study Group"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                data-testid="input-room-name"
              />
            </div>

            <div>
              <Label htmlFor="room-password" className="text-gray-300">Room Password</Label>
              <Input
                id="room-password"
                type="password"
                placeholder="Set a password..."
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                data-testid="input-room-password"
              />
              <p className="text-xs text-gray-500 mt-1">
                Share this password with people you want to invite
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateRoom(false)} 
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
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

      <Dialog open={showSearchRoom} onOpenChange={setShowSearchRoom}>
        <DialogContent data-testid="dialog-search-room" className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Join Private Room</DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter the room ID and password to join a private study room.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="search-room-id" className="text-gray-300">Room ID</Label>
              <Input
                id="search-room-id"
                placeholder="Enter room ID..."
                value={searchRoomId}
                onChange={(e) => setSearchRoomId(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                data-testid="input-search-room-id"
              />
            </div>

            <div>
              <Label htmlFor="search-password" className="text-gray-300">Password</Label>
              <Input
                id="search-password"
                type="password"
                placeholder="Enter password..."
                value={searchPassword}
                onChange={(e) => setSearchPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchRoom()}
                className="bg-slate-700 border-slate-600 text-white"
                data-testid="input-search-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowSearchRoom(false)} 
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
              data-testid="button-cancel-search"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSearchRoom}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-submit-search"
            >
              Join Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showJoinRoomDialog} onOpenChange={setShowJoinRoomDialog}>
        <DialogContent data-testid="dialog-join-room" className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Join Room: {selectedRoomForJoin?.name}</DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter the password to join this {selectedRoomForJoin?.type} room.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="join-password" className="text-gray-300">Password</Label>
              <Input
                id="join-password"
                type="password"
                placeholder="Enter room password..."
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoinSelectedRoom()}
                className="bg-slate-700 border-slate-600 text-white"
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
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
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
