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
import geminiRoutes from './routes/gemini.js';
import geminiTestRoutes from './routes/gemini-test.js';
import sessionsRoutes from './routes/sessions.js';
import workspaceMembersRoutes from './routes/workspace-members.js';
import reviewRoutes from './routes/reviews.js';
import wireframeAnalysisRoutes from './routes/wireframe-analysis.js';
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
app.use('/api/gemini', geminiRoutes);
app.use('/api/gemini', geminiTestRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/workspace-members', workspaceMembersRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/reviews', wireframeAnalysisRoutes);

// Error handler
app.use(errorHandler);

// Socket.IO setup
setupSocketIO(io);

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  await connectMongo();
  connectSupabase(); // non-blocking validation
  httpServer.listen(PORT, () => {
    console.log(`🚀 Promptify API running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
