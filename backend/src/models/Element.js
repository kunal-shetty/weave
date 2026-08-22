import mongoose from 'mongoose';

const cardItemSchema = new mongoose.Schema(
  {
    fieldId1: { type: String }, // e.g. stat value
    fieldId2: { type: String }, // e.g. stat label
    fieldId3: { type: String }, // optional third field
    value1: { type: String, default: '' },
    value2: { type: String, default: '' },
    value3: { type: String, default: '' },
  },
  { _id: false }
);

const elementSchema = new mongoose.Schema(
  {
    fieldId: { type: String, required: true, unique: true, index: true },
    sectionId: { type: String, required: true, index: true },
    pageName: { type: String, required: true },
    elementName: { type: String, required: true },
    contentType: {
      type: String,
      enum: ['Image', 'Text', 'Textfield', 'Button', 'Cards'],
      required: true,
    },
    content: { type: String, default: '' },
    // For Cards contentType
    loop: { type: [cardItemSchema], default: [] },
    // CSS overlay
    css: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Element', elementSchema);
