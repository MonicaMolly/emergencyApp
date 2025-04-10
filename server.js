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

// Serve index.html on the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'emergency.html'));
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.log('❌ MongoDB Connection Error:', err);
    process.exit(1);  // Terminate server on DB failure
  });


// Chat Message Schema
const chatMessageSchema = new mongoose.Schema({
  user: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
});
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

// Emergency Call Schema (define it before usage)
const emergencyCallSchema = new mongoose.Schema({
  userId: String, // User ID for the emergency call
  timestamp: { type: Date, default: Date.now },
});
const EmergencyCall = mongoose.model('EmergencyCall', emergencyCallSchema);

// WebSocket Events for signaling
io.on('connection', (socket) => {
  console.log('🔗 User connected');

  // Send previously stored chat messages when a user joins
  ChatMessage.find().sort({ timestamp: 1 }).then((messages) => {
    socket.emit('receiveMessage', messages);
  });

  socket.on('sendMessage', async (msg) => {
    console.log(`💬 New Message: ${msg.user}: ${msg.text}`);
    const chatMessage = new ChatMessage({ user: msg.user, message: msg.text });
    await chatMessage.save();
    io.emit('receiveMessage', msg);
  });

  // Emergency Call Feature
  socket.on('emergencyCall', async (call) => {
    try {
      if (!call || !call.userId || !call.serviceId) {
        throw new Error('Missing call information');
      }
      console.log(`🚨 Emergency Call from User: ${call.userId}, Service: ${call.serviceId}`);
  
      const emergencyCall = new EmergencyCall({ userId: call.userId });
      await emergencyCall.save();
      io.emit('emergencyAlert', call);
    } catch (err) {
      console.error('Error processing emergency call:', err);
      socket.emit('error', { message: 'Failed to process emergency call', error: err.message });
    }
  });
  

  // Disconnect
  socket.on('disconnect', () => {
    console.log('❌ User disconnected');
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
