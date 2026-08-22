import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { connectMongo } from './config/mongo.js';
import { connectSupabase } from './config/supabase.js';
import generateRoutes from './routes/generate.js';
import sectionsRoutes from './routes/sections.js';
import elementsRoutes from './routes/elements.js';
import healthRoutes from './routes/health.js';
import clerkWebhookRoutes from './routes/webhooks/clerk.js';
import { errorHandler } from './middleware/errorHandler.js';
import { setupSocketIO } from './config/socket.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Raw body for Clerk webhook — MUST come before express.json()
// Keeps req.body as a Buffer so svix can verify the original bytes.
app.use('/api/webhooks', express.raw({ type: 'application/json', limit: '1mb' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Attach io to requests for real-time updates
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/generate', generateRoutes);
app.use('/api/sections', sectionsRoutes);
app.use('/api/elements', elementsRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/webhooks', clerkWebhookRoutes);

// Error handler
app.use(errorHandler);

// Socket.IO setup
setupSocketIO(io);

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  await connectMongo();
  connectSupabase(); // non-blocking validation
  httpServer.listen(PORT, () => {
    console.log(`🚀 CodeX API running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
