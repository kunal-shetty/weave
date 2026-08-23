import mongoose from 'mongoose';

const reviewItemSchema = new mongoose.Schema(
  {
    reviewId: { type: String, required: true, unique: true, index: true },
    sessionId: { type: String, index: true },
    sectionId: { type: String, index: true },

    // What kind of review item
    type: {
      type: String,
      enum: [
        'wireframe_region',  // Confidence-flagged region from wireframe analysis
        'field_change',      // A CMS field was modified during regeneration
        'new_element',       // A new element appeared in regeneration
        'removed_element',   // An element was removed during regeneration
        'reordered',         // Elements were reordered
      ],
      required: true,
    },

    // Confidence score 0–100 (wireframe regions get this from Gemini)
    confidence: { type: Number, min: 0, max: 100, default: 50 },

    // Review lifecycle
    status: {
      type: String,
      enum: ['pending', 'assigned', 'approved', 'rejected', 'needs_changes'],
      default: 'pending',
    },
    assignedTo: { type: String, default: null },   // userId
    assignedName: { type: String, default: null }, // display name

    // Wireframe region bounding box (relative 0–1 coords)
    region: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
    },
    wireframeLabel: { type: String, default: null },  // e.g. "hero", "cta", "stat-card"
    wireframeSuggestion: { type: String, default: null }, // AI suggestion for what to do

    // CMS field references
    fieldId: { type: String, default: null },
    elementName: { type: String, default: null },

    // Diff context — before/after values
    previousContent: { type: String, default: null },
    newContent: { type: String, default: null },

    // Reviewer notes
    notes: { type: String, default: null },

    // Who created this item (system or user)
    createdBy: { type: String, default: 'system' },
  },
  { timestamps: true }
);

// Compound index for fast workspace queries
reviewItemSchema.index({ sessionId: 1, status: 1 });
reviewItemSchema.index({ sessionId: 1, type: 1 });

export default mongoose.model('ReviewItem', reviewItemSchema);
