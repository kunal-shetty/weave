import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { Section } from "@/lib/models"
import { generateFieldId } from "@/lib/id-generator"

export const dynamic = "force-dynamic"

/**
 * GET /api/sections?pageName=Home
 * List all section metadata records, optionally filtered by pageName.
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const pageName = searchParams.get("pageName")
    const sectionId = searchParams.get("sectionId")

    let query: Record<string, string> = {}
    if (pageName) query.pageName = pageName
    if (sectionId) query.sectionId = sectionId

    const sections = await Section.find(query).sort({ createdAt: -1 })

    return NextResponse.json({
      success: true,
      count: sections.length,
      sections,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch sections"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/sections
 * Create a new section metadata record.
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const body = await request.json()
    const sectionId = body.sectionId || generateFieldId()

    const section = await Section.create({
      sectionId,
      sectionName: body.sectionName || "New Section",
      pageName: body.pageName || "Home",
      platform: body.platform || "Website",
      isGenerated: body.isGenerated ?? false,
      sectionStatus: body.sectionStatus || "Pending",
      wireframes: body.wireframes || null,
      variations: body.variations || 1,
      cardGridColumns: body.cardGridColumns || 3,
    })

    return NextResponse.json({ success: true, section }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create section"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
