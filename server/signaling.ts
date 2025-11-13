import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";

interface SignalingEvents {
  join: { room: string };
  signal: { room: string; to?: string; data: SignalData };
  leave: { room: string };
}

interface SignalData {
  type: 'offer' | 'answer' | 'ice';
  payload: any;
}

export function setupSignaling(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.id);

    socket.on('join', ({ room }: SignalingEvents['join']) => {
      console.log(`👤 ${socket.id} joining room ${room}`);
      
      // Get current participants in room
      const clients = Array.from(io.sockets.adapter.rooms.get(room) || []);
      
      // Enforce 2-participant room limit
      if (clients.length >= 2) {
        socket.emit('room-full', { 
          message: 'Room only supports 2 participants' 
        });
        console.log(`❌ Room ${room} is full`);
        return;
      }

      // Join the room
      socket.join(room);
      
      // Notify others in room about new peer
      socket.to(room).emit('peer-joined', { from: socket.id });
      
      // Confirm join to the user
      socket.emit('joined', { room, id: socket.id });
      
      console.log(`✅ ${socket.id} joined room ${room}. Occupancy: ${clients.length + 1}/2`);
    });

    // Relay offer/answer/ice candidates
    socket.on('signal', ({ room, to, data }: SignalingEvents['signal']) => {
      console.log(`📡 Signal from ${socket.id} in room ${room}. Type: ${data.type}`);
      
      if (to) {
        // Send to specific peer
        io.to(to).emit('signal', { from: socket.id, data });
      } else {
        // Broadcast to room (other participant)
        socket.to(room).emit('signal', { from: socket.id, data });
      }
    });

    socket.on('leave', ({ room }: SignalingEvents['leave']) => {
      console.log(`👋 ${socket.id} leaving room ${room}`);
      socket.leave(room);
      socket.to(room).emit('peer-left', { from: socket.id });
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected:', socket.id);
      // Socket.io automatically removes from rooms on disconnect
      // Rooms are self-cleaning
    });
  });

  console.log('✅ WebRTC signaling server initialized');
  
  return io;
}
