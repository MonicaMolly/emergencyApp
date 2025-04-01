import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Fix MongoDB Connection
mongoose.connect('mongodb+srv://monicatapiwa3:Tapiwa03@cluster0.hvogui3.mongodb.net/emergencyApp')
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

// Routes
app.get('/', (req, res) => {
    res.send('Welcome to the Emergency Video Call API');
});

app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const newUser = new User({ name, email, password });
    await newUser.save();
    res.status(201).json({ message: 'User registered' });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/emergency-call', async (req, res) => {
  try {
    const { userId, location } = req.body;
    const newCall = new EmergencyCall({ userId, location });
    await newCall.save();
    res.status(201).json({ message: 'Emergency call recorded' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record emergency call' });
  }
});

// WebSocket Events
io.on('connection', (socket) => {
    console.log('🔗 User connected');

    socket.on('joinRoom', (room) => {
        socket.join(room);
        console.log(`👥 Joined Room: ${room}`);
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

    socket.on('sendLocation', async (location) => {
        console.log(`📍 Emergency call from: ${location.lat}, ${location.lon}`);
        
        // Store location in MongoDB
        const newCall = new EmergencyCall({ userId: "Anonymous", location });
        await newCall.save();
    });

    socket.on('disconnect', () => {
        console.log('❌ User disconnected');
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
