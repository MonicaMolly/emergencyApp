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
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
const chatSchema = new mongoose.Schema({
  user: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
});
const ChatMessage = mongoose.model('ChatMessage', chatSchema);

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

// Routes
app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: 'User registered' });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/emergency-call', authenticateToken, async (req, res) => {
  try {
    const { location } = req.body;
    const newCall = new EmergencyCall({ userId: req.user._id, location });
    await newCall.save();
    res.status(201).json({ message: 'Emergency call recorded' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record emergency call' });
  }
});

app.get('/chat-history', async (req, res) => {
  try {
    const messages = await ChatMessage.find().sort({ timestamp: 1 });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});


// WebSocket Events for signaling
io.on('connection', (socket) => {
  console.log('🔗 User connected');

  socket.on('joinRoom', (room) => {
      socket.join(room);
      console.log(`USer Joined Room: ${room}`);
  });

  socket.on('offer', (offer) => {
      socket.broadcast.emit('offer', offer);
  });

  socket.on('answer', (answer) => {
      socket.broadcast.emit('answer', answer);
  });

  socket.on('candidate', (candidate) => {
      socket.broadcast.emit('candidate', candidate);
  });

  socket.on('disconnect', () => {
      console.log('❌ User disconnected');
  });

  // Emergency Call Feature
    socket.on('emergencyCall', async (call) => {
        console.log(`🚨 Emergency Call from User: ${call.userId}, Location: ${call.location}`);
        const emergencyCall = new EmergencyCall({ userId: call.userId, location: call.location });
        await emergencyCall.save();
        io.emit('emergencyAlert', call);
    }); 
  // Call Feature
    socket.on('sendMessage', async (msg) => {
        console.log(`💬 New Message: ${msg.user}: ${msg.text}`);
        const chatMessage = new ChatMessage({ user: msg.user, message: msg.text });
        await chatMessage.save();
        io.emit('receiveMessage', msg);
    });

    socket.on('disconnect', () => {
        console.log('❌ User disconnected');
    });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
