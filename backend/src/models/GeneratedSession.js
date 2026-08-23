import mongoose from 'mongoose';

const generatedSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    prompt: { type: String, required: true },
    htmlContent: { type: String, required: true },
    fileCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['generated', 'edited', 'archived'],
      default: 'generated',
    },
  },
  { timestamps: true }
);

// Compound index for looking up sessions by user
generatedSessionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('GeneratedSession', generatedSessionSchema);
