const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

// Store active users and their socket connections
const activeUsers = new Map(); // userId -> socketId
const userSockets = new Map(); // socketId -> userId
const conversationRooms = new Map(); // conversationId -> Set of socketIds
const typingUsers = new Map(); // conversationId -> Set of userIds

console.log('🚀 Socket.IO Real-time Server Starting...');

io.on('connection', (socket) => {
  console.log('👤 New client connected:', socket.id);

  // User joins the system
  socket.on('user-online', (userId) => {
    console.log('✅ User online:', userId, 'Socket:', socket.id);
    
    // Store user mapping
    activeUsers.set(userId, socket.id);
    userSockets.set(socket.id, userId);
    
    // Join user to their personal room
    socket.join(`user-${userId}`);
    
    // Notify all users that this user is online
    socket.broadcast.emit('user-status-change', {
      userId: userId,
      isOnline: true
    });
    
    // Send current online users to the newly connected user
    const onlineUsers = Array.from(activeUsers.keys());
    socket.emit('online-users', onlineUsers);
  });

  // User joins a conversation
  socket.on('join-conversation', (data) => {
    const { conversationId, userId } = data;
    console.log('💬 User', userId, 'joined conversation:', conversationId);
    
    // Join the conversation room
    socket.join(`conversation-${conversationId}`);
    
    // Track conversation membership
    if (!conversationRooms.has(conversationId)) {
      conversationRooms.set(conversationId, new Set());
    }
    conversationRooms.get(conversationId).add(socket.id);
    
    // Notify others in the conversation
    socket.to(`conversation-${conversationId}`).emit('user-joined-conversation', {
      userId: userId,
      conversationId: conversationId
    });
  });

  // User leaves a conversation
  socket.on('leave-conversation', (data) => {
    const { conversationId, userId } = data;
    console.log('👋 User', userId, 'left conversation:', conversationId);
    
    socket.leave(`conversation-${conversationId}`);
    
    // Remove from conversation tracking
    if (conversationRooms.has(conversationId)) {
      conversationRooms.get(conversationId).delete(socket.id);
    }
    
    // Remove from typing users
    if (typingUsers.has(conversationId)) {
      typingUsers.get(conversationId).delete(userId);
      if (typingUsers.get(conversationId).size === 0) {
        typingUsers.delete(conversationId);
      }
    }
  });

  // Handle new message
  socket.on('send-message', (messageData) => {
    console.log('📨 New message received on server:', messageData);
    
    const { conversationId, message, participants } = messageData;
    
    // Send to all participants in the conversation (including sender for confirmation)
    participants.forEach(participantId => {
      const participantSocketId = activeUsers.get(participantId);
      if (participantSocketId) {
        // Send to specific user (works even if they're not in the conversation screen)
        io.to(`user-${participantId}`).emit('new-message', {
          conversationId: conversationId,
          message: message,
          isInConversation: conversationRooms.get(conversationId)?.has(participantSocketId) || false
        });
        console.log('✅ Message sent to user:', participantId, 'Socket:', participantSocketId);
      } else {
        console.log('⚠️ User not online:', participantId);
      }
    });
    
    // Also broadcast to the conversation room for real-time updates
    socket.to(`conversation-${conversationId}`).emit('conversation-message', {
      conversationId: conversationId,
      message: message
    });
    
    // Trigger conversation list updates for all participants
    participants.forEach(participantId => {
      const participantSocketId = activeUsers.get(participantId);
      if (participantSocketId) {
        io.to(`user-${participantId}`).emit('conversation-update', {
          conversationId: conversationId,
          lastMessage: message
        });
        console.log('✅ Conversation update sent to user:', participantId);
      }
    });
    
    console.log('📤 Message broadcast complete for conversation:', conversationId);
  });

  // Handle typing indicators with improved real-time updates
  socket.on('typing-start', (data) => {
    const { conversationId, userId, userName } = data;
    console.log('⌨️ User started typing:', userName, 'in conversation:', conversationId);
    
    // Track typing user
    if (!typingUsers.has(conversationId)) {
      typingUsers.set(conversationId, new Set());
    }
    typingUsers.get(conversationId).add(userId);
    
    // Broadcast to all users in the conversation except the sender
    socket.to(`conversation-${conversationId}`).emit('user-typing', {
      userId: userId,
      userName: userName,
      conversationId: conversationId,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('typing-stop', (data) => {
    const { conversationId, userId } = data;
    console.log('⌨️ User stopped typing:', userId, 'in conversation:', conversationId);
    
    // Remove from typing users
    if (typingUsers.has(conversationId)) {
      typingUsers.get(conversationId).delete(userId);
      if (typingUsers.get(conversationId).size === 0) {
        typingUsers.delete(conversationId);
      }
    }
    
    // Broadcast to all users in the conversation except the sender
    socket.to(`conversation-${conversationId}`).emit('user-stopped-typing', {
      userId: userId,
      conversationId: conversationId,
      timestamp: new Date().toISOString()
    });
  });

  // Handle instant message read receipts - INSTANT BLUE TICK UPDATES
  socket.on('messages-read', (data) => {
    const { conversationId, userId, userName } = data;
    console.log('📖 INSTANT: All messages marked as read by:', userName, 'in conversation:', conversationId);
    
    const timestamp = new Date().toISOString();
    
    // IMMEDIATE confirmation back to sender (no delay)
    socket.emit('read-receipt-confirmed', {
      conversationId: conversationId,
      readBy: userId,
      readByName: userName,
      timestamp: timestamp
    });
    
    // Send instant read receipt to ALL participants in the conversation
    socket.to(`conversation-${conversationId}`).emit('messages-read-receipt', {
      conversationId: conversationId,
      readBy: userId,
      readByName: userName,
      timestamp: timestamp
    });
    
    // Also send to all participants' personal rooms for cross-device sync
    socket.broadcast.emit('instant-read-receipt', {
      conversationId: conversationId,
      readBy: userId,
      readByName: userName,
      timestamp: timestamp
    });
    
    // Additional instant events for better coverage
    socket.to(`conversation-${conversationId}`).emit('conversation-read-receipt', {
      conversationId: conversationId,
      readBy: userId,
      readByName: userName,
      timestamp: timestamp
    });
    
    console.log('✅ INSTANT read receipt broadcast complete for conversation:', conversationId);
  });

  // Handle individual message read receipt
  socket.on('message-read', (data) => {
    const { conversationId, messageId, userId, userName } = data;
    console.log('📖 Individual message read receipt:', { conversationId, messageId, userId });
    
    const timestamp = new Date().toISOString();
    
    // Send instant read receipt to all participants
    socket.to(`conversation-${conversationId}`).emit('message-read-receipt', {
      messageId: messageId,
      readBy: userId,
      readByName: userName,
      conversationId: conversationId,
      timestamp: timestamp
    });
    
    // Also broadcast globally for instant updates
    socket.broadcast.emit('instant-message-read', {
      messageId: messageId,
      readBy: userId,
      readByName: userName,
      conversationId: conversationId,
      timestamp: timestamp
    });
  });

  // Handle conversation read (legacy support)
  socket.on('conversation-read', (data) => {
    const { conversationId, userId } = data;
    console.log('📖 Conversation marked as read (legacy):', { conversationId, userId });
    
    const timestamp = new Date().toISOString();
    
    // Notify other participants that this user has read the conversation
    socket.to(`conversation-${conversationId}`).emit('conversation-read-receipt', {
      conversationId: conversationId,
      readBy: userId,
      timestamp: timestamp
    });
  });

  // Handle message deletion
  socket.on('message_deleted', (data) => {
    const { messageId, deleteForEveryone, userId } = data;
    console.log('🗑️ Message deletion:', { messageId, deleteForEveryone, userId });
    
    const timestamp = new Date().toISOString();
    
    if (deleteForEveryone) {
      // Notify all participants that message was deleted for everyone
      socket.broadcast.emit('message_deleted_for_everyone', {
        messageId: messageId,
        deletedBy: userId,
        timestamp: timestamp
      });
    } else {
      // Only update UI for the user who deleted it
      socket.emit('message_deleted_for_user', {
        messageId: messageId,
        userId: userId,
        timestamp: timestamp
      });
    }
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    const userId = userSockets.get(socket.id);
    console.log('👋 Client disconnected:', socket.id, 'User:', userId);
    
    if (userId) {
      // Remove user from active users
      activeUsers.delete(userId);
      userSockets.delete(socket.id);
      
      // Remove from all conversation rooms
      conversationRooms.forEach((sockets, conversationId) => {
        sockets.delete(socket.id);
        
        // Remove from typing users
        if (typingUsers.has(conversationId)) {
          typingUsers.get(conversationId).delete(userId);
          if (typingUsers.get(conversationId).size === 0) {
            typingUsers.delete(conversationId);
          }
          
          // Notify others that user stopped typing
          socket.to(`conversation-${conversationId}`).emit('user-stopped-typing', {
            userId: userId,
            conversationId: conversationId,
            timestamp: new Date().toISOString()
          });
        }
      });
      
      // Notify all users that this user is offline
      socket.broadcast.emit('user-status-change', {
        userId: userId,
        isOnline: false
      });
    }
  });

  // Heartbeat to keep connection alive
  socket.on('ping', () => {
    socket.emit('pong');
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    activeUsers: activeUsers.size,
    conversations: conversationRooms.size,
    typingUsers: typingUsers.size,
    timestamp: new Date().toISOString()
  });
});

// Get active users endpoint
app.get('/active-users', (req, res) => {
  res.json({
    count: activeUsers.size,
    users: Array.from(activeUsers.keys())
  });
});

// Get typing status endpoint
app.get('/typing-status', (req, res) => {
  const typingStatus = {};
  typingUsers.forEach((users, conversationId) => {
    typingStatus[conversationId] = Array.from(users);
  });
  res.json(typingStatus);
});

const PORT = process.env.SOCKET_PORT || 3001;

server.listen(PORT, () => {
  console.log('🚀 Socket.IO Real-time Server running on port:', PORT);
  console.log('📡 Ready for INSTANT messaging and blue tick updates!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Server shutting down...');
  server.close(() => {
    console.log('✅ Server closed');
  });
});

module.exports = { app, server, io };