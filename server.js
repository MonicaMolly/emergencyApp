const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Serve emergency.html on root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'emergency.html'));
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.log('❌ MongoDB Connection Error:', err);
    process.exit(1); // Fail fast
  });

  // Agora Token Generation (Add at the bottom of your server.js)

const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

const APP_ID = process.env.AGORA_APP_ID; // Agora App ID
const APP_CERTIFICATE = process.env.AGORA_APP_CERT; // Agora App Certificate
const CHANNEL_NAME = 'emergency-video-call'; // Optional: use dynamic from frontend

// Chat Message Schema
const chatMessageSchema = new mongoose.Schema({
  user: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
});
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

// Emergency Call Schema
const emergencyCallSchema = new mongoose.Schema({
  userId: String,
  serviceId: String,
  timestamp: { type: Date, default: Date.now },
});
const EmergencyCall = mongoose.model('EmergencyCall', emergencyCallSchema);

// Endpoint to generate token
app.get('/api/token', (req, res) => {
  const uid = req.query.uid || Math.floor(Math.random() * 100000);
  const role = RtcRole.PUBLISHER;
  const expireTimeSeconds = 30 * 24 * 60 * 60; // 30 days

  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expireTimeSeconds;

  const token = RtcTokenBuilder.buildTokenWithUid(
    APP_ID, APP_CERTIFICATE, CHANNEL_NAME, uid, role, privilegeExpiredTs
  );

  return res.json({ token, uid });
});


// Socket.io logic
io.on('connection', (socket) => {
  console.log('🔗 User connected');

  // Load chat history
  ChatMessage.find().sort({ timestamp: 1 }).then((messages) => {
    socket.emit('receiveMessage', messages);
  });

  // New chat message
  socket.on('sendMessage', async (msg) => {
    console.log(`💬 ${msg.user}: ${msg.text}`);
    const chatMessage = new ChatMessage({ user: msg.user, message: msg.text });
    await chatMessage.save();
    io.emit('receiveMessage', msg); // broadcast to all clients
  });

  // Alternate chat-message event (e.g., from another frontend script)
  socket.on("chat-message", (data) => {
    console.log("📨 Alt Chat received:", data);
    socket.broadcast.emit("chat-message", data);
  });

  // Emergency call handling
  socket.on('emergencyCall', async (call) => {
    try {
      if (!call || !call.userId || !call.serviceId) {
        throw new Error('Missing call information');
      }

      console.log(`🚨 Emergency Call: ${call.userId} -> ${call.serviceId}`);

      const emergencyCall = new EmergencyCall({
        userId: call.userId,
        serviceId: call.serviceId
      });

      await emergencyCall.save();
      io.emit('emergencyAlert', call); // Notify all clients
    } catch (err) {
      console.error('❌ Emergency call failed:', err);
      socket.emit('error', {
        message: 'Failed to process emergency call',
        error: err.message
      });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('❌ User disconnected');
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
