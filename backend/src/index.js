import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import connectDB from './config/db.js';
import { connectRedis } from './services/redisService.js';
import { initSocket } from './socket/index.js';

import authRoutes from './routes/auth.js';
import orgRoutes from './routes/organizations.js';
import projectRoutes from './routes/projects.js';
import environmentRoutes from './routes/environments.js';
import flagRoutes from './routes/flags.js';
import evalRoutes from './routes/eval.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/organizations', orgRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/environments', environmentRoutes);
app.use('/api/flags', flagRoutes);
app.use('/api/eval', evalRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    await connectDB();
    console.log('Database connected');

    await connectRedis();
    console.log('Redis connected');

    initSocket(server);
    console.log('Socket.io initialized');

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();