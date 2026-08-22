import mongoose, { Schema, Document, Model } from "mongoose"

// ─── Section Document ───────────────────────────────────────────────
export interface ISection extends Document {
  sectionId: string
  sectionName: string
  pageName: string
  platform: string
  isGenerated: boolean
  sectionStatus: "Pending" | "Approved" | "Rejected"
  wireframes: string | null
  variations: number
  cardGridColumns: number
  createdAt: Date
  updatedAt: Date
}

const SectionSchema = new Schema<ISection>(
  {
    sectionId: { type: String, required: true, unique: true, length: 10 },
    sectionName: { type: String, required: true },
    pageName: { type: String, required: true, default: "Home" },
    platform: { type: String, default: "Website" },
    isGenerated: { type: Boolean, default: true },
    sectionStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    wireframes: { type: String, default: null },
    variations: { type: Number, default: 1 },
    cardGridColumns: { type: Number, default: 3 },
  },
  { timestamps: true }
)

export const Section: Model<ISection> =
  mongoose.models.Section || mongoose.model<ISection>("Section", SectionSchema)

// ─── Element Document ───────────────────────────────────────────────
export type ContentType = "Image" | "Text" | "Textfield" | "Button" | "Cards"

export interface ICardItem {
  fieldId: string
  [key: string]: string
}

export interface IElement extends Document {
  fieldId: string
  sectionId: string
  elementName: string
  contentType: ContentType
  content: string
  loop: ICardItem[] | null
  css: string | null
  pageName: string
  createdAt: Date
  updatedAt: Date
}

const CardItemSchema = new Schema(
  {
    fieldId: { type: String, required: true },
  },
  { strict: false, _id: false }
)

const ElementSchema = new Schema<IElement>(
  {
    fieldId: { type: String, required: true, unique: true, length: 10 },
    sectionId: { type: String, required: true, index: true },
    elementName: { type: String, required: true },
    contentType: {
      type: String,
      enum: ["Image", "Text", "Textfield", "Button", "Cards"],
      required: true,
    },
    content: { type: String, default: "" },
    loop: { type: [CardItemSchema], default: null },
    css: { type: String, default: null },
    pageName: { type: String, required: true, default: "Home" },
  },
  { timestamps: true }
)

export const Element: Model<IElement> =
  mongoose.models.Element || mongoose.model<IElement>("Element", ElementSchema)
