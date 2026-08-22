import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { Element } from "@/lib/models"

export const dynamic = "force-dynamic"

/**
 * PATCH /api/elements/:fieldId
 * Update content and/or css for one element.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ fieldId: string }> }
) {
  try {
    await connectDB()
    const { fieldId } = await params
    const body = await request.json()

    const updateFields: Record<string, unknown> = {}
    if (body.content !== undefined) updateFields.content = body.content
    if (body.css !== undefined) updateFields.css = body.css
    if (body.loop !== undefined) updateFields.loop = body.loop

    const element = await Element.findOneAndUpdate(
      { fieldId },
      { $set: updateFields },
      { new: true }
    )

    if (!element) {
      return NextResponse.json(
        { error: "Element not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, element })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update element"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * GET /api/elements/:fieldId
 * Get a single element by fieldId.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fieldId: string }> }
) {
  try {
    await connectDB()
    const { fieldId } = await params

    const element = await Element.findOne({ fieldId })
    if (!element) {
      return NextResponse.json(
        { error: "Element not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, element })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch element"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/elements/:fieldId
 * Delete a single element.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fieldId: string }> }
) {
  try {
    await connectDB()
    const { fieldId } = await params

    await Element.deleteOne({ fieldId })

    return NextResponse.json({
      success: true,
      message: "Element deleted",
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete element"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
