import mongoose from 'mongoose';

const fileDataSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    size: { type: Number, required: true },
    base64: { type: String, default: '' },
  },
  { _id: false }
);

const generatedSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    prompt: { type: String, required: true },
    htmlContent: { type: String, default: '' },
    files: { type: [fileDataSchema], default: [] },
    fileCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['created', 'generated', 'edited', 'archived'],
      default: 'created',
    },
  },
  { timestamps: true }
);

generatedSessionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('GeneratedSession', generatedSessionSchema);
