import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowLeft } from "lucide-react";
import { Room } from "@shared/schema";

interface PublicRoomsListProps {
  onJoinRoom: (roomId: string, password?: string) => void;
  onBack: () => void;
}

export default function PublicRoomsList({ onJoinRoom, onBack }: PublicRoomsListProps) {
  const { data: rooms, isLoading } = useQuery<Room[]>({
    queryKey: ["/api/rooms/public"],
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Lobby
          </Button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 dark:text-white">Public Rooms</h1>
          <p className="text-muted-foreground">
            Choose a room to join and start studying together
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
            <p className="mt-4 text-muted-foreground">Loading rooms...</p>
          </div>
        ) : rooms && rooms.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {rooms.map((room) => (
              <Card
                key={room.id}
                className="border-2 hover:border-primary/50 transition-all"
                data-testid={`card-room-${room.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg" data-testid={`text-room-name-${room.id}`}>
                        {room.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Created by user
                      </CardDescription>
                    </div>
                    <Badge
                      variant={room.currentOccupancy >= room.maxOccupancy ? "destructive" : "secondary"}
                      data-testid={`badge-occupancy-${room.id}`}
                    >
                      <Users className="w-3 h-3 mr-1" />
                      {room.currentOccupancy}/{room.maxOccupancy}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={() => onJoinRoom(room.id)}
                    disabled={room.currentOccupancy >= room.maxOccupancy}
                    data-testid={`button-join-${room.id}`}
                  >
                    {room.currentOccupancy >= room.maxOccupancy ? "Room Full" : "Join Room"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground">
                No public rooms available. Create one to get started!
              </p>
              <Button
                className="mt-4"
                onClick={onBack}
                data-testid="button-create-first-room"
              >
                Create Room
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
