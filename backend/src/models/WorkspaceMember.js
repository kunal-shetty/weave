import mongoose from 'mongoose';

const workspaceMemberSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    email: { type: String, required: true },
    fullName: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    role: {
      type: String,
      enum: ['owner', 'editor', 'viewer'],
      default: 'viewer',
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'removed'],
      default: 'active',
    },
  },
  { timestamps: true }
);

// One member per user per workspace
workspaceMemberSchema.index({ sessionId: 1, userId: 1 }, { unique: true });
workspaceMemberSchema.index({ sessionId: 1, status: 1 });

export default mongoose.model('WorkspaceMember', workspaceMemberSchema);
