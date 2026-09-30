require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const boardRoutes = require('./routes/boardRoutes');
const listRoutes = require('./routes/listRoutes');
const cardRoutes = require('./routes/cardRoutes');
const activityRoutes = require('./routes/activityRoutes');

const app = express();
const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

// Socket.IO Room Management
io.on('connection', (socket) => {
  socket.on('join:board', (boardId) => {
    socket.join(`board:${boardId}`);
  });

  socket.on('leave:board', (boardId) => {
    socket.leave(`board:${boardId}`);
  });
});

// Middleware
app.use(cors());
app.use(express.json());

// Attach io instance to req so controllers can broadcast events
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/activities', activityRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'SyncBoard API is running' });
});

// Centralized error handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB();

const startKeepAwake = require('./utils/keepAwake');

// Only listen if run directly (avoids port collisions during Jest tests)
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // Self-ping to prevent Render free instance from sleeping
    if (
      process.env.NODE_ENV === 'production' ||
      process.env.RENDER ||
      process.env.RENDER_EXTERNAL_URL ||
      process.env.ENABLE_KEEP_AWAKE === 'true'
    ) {
      startKeepAwake(process.env.RENDER_EXTERNAL_URL || 'https://syncboard-ve0c.onrender.com', 10);
    }
  });
}

module.exports = { app, server, io };
