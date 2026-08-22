import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { Section, Element } from "@/lib/models"

export const dynamic = "force-dynamic"

/**
 * GET /api/sections/:sectionId
 * Single section detail with all its elements.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  try {
    await connectDB()
    const { sectionId } = await params

    const section = await Section.findOne({ sectionId })
    if (!section) {
      return NextResponse.json(
        { error: "Section not found" },
        { status: 404 }
      )
    }

    const elements = await Element.find({ sectionId }).sort({ createdAt: 1 })

    return NextResponse.json({
      success: true,
      section,
      elements,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch section"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * PATCH /api/sections/:sectionId
 * Update section metadata (status, name, etc).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  try {
    await connectDB()
    const { sectionId } = await params
    const body = await request.json()

    const section = await Section.findOneAndUpdate(
      { sectionId },
      { $set: body },
      { new: true }
    )

    if (!section) {
      return NextResponse.json(
        { error: "Section not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, section })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update section"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/sections/:sectionId
 * Delete section and all its elements.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  try {
    await connectDB()
    const { sectionId } = await params

    await Element.deleteMany({ sectionId })
    await Section.deleteOne({ sectionId })

    return NextResponse.json({
      success: true,
      message: "Section and its elements deleted",
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete section"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
