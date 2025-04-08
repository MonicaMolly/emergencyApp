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
  .catch(err => console.log('❌ MongoDB Connection Error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
});
const User = mongoose.model('User', userSchema);

// Emergency Call Schema
const emergencyCallSchema = new mongoose.Schema({
  userId: String,
  location: String,
  timestamp: { type: Date, default: Date.now },
});
const EmergencyCall = mongoose.model('EmergencyCall', emergencyCallSchema);

// Chat Message Schema
const chatMessageSchema = new mongoose.Schema({
  user: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
});
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

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
    console.log(`🚨 Emergency Call from User: ${call.userId}, Location: ${call.location}`);
    const emergencyCall = new EmergencyCall({ userId: call.userId, location: call.location });
    await emergencyCall.save();
    io.emit('emergencyAlert', call);
  });

  socket.on('disconnect', () => {
    console.log('❌ User disconnected');
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
