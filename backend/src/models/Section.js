import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema(
  {
    sectionId: { type: String, required: true, unique: true, index: true },
    sectionName: { type: String, required: true },
    pageName: { type: String, required: true, default: 'Home' },
    platform: { type: String, default: 'Website' },
    isGenerated: { type: Boolean, default: true },
    sectionStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    // S3 key of uploaded wireframe (full URL stored in Supabase metadata)
    wireframeS3Key: { type: String, default: null },
    wireframeUrl: { type: String, default: null },
    variations: { type: Number, default: 1 },
    cardGridColumns: { type: Number, default: 3 },
    accentColor: { type: String, default: '#ef4444' },
    generatedJsx: { type: String, default: null },
    // Input modes used for this generation
    inputModes: [{ type: String, enum: ['wireframe', 'code', 'prompt'] }],
  },
  { timestamps: true }
);

export default mongoose.model('Section', sectionSchema);
