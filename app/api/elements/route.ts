import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { Element } from "@/lib/models"
import { generateFieldId } from "@/lib/id-generator"

export const dynamic = "force-dynamic"

/**
 * GET /api/elements?sectionId=xxx&pageName=Home
 * Elements array (includes Cards.loop).
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const sectionId = searchParams.get("sectionId")
    const pageName = searchParams.get("pageName")

    const query: Record<string, string> = {}
    if (sectionId) query.sectionId = sectionId
    if (pageName) query.pageName = pageName

    const elements = await Element.find(query).sort({ createdAt: 1 })

    // Also fetch loop sub-elements for Cards
    const enrichedElements = await Promise.all(
      elements.map(async (el) => {
        if (el.contentType === "Cards" && el.loop && el.loop.length > 0) {
          // Fetch nested card elements
          const cardFieldIds = el.loop.map(
            (card: { fieldId: string }) => card.fieldId
          )
          const cardElements = await Element.find({
            fieldId: { $in: cardFieldIds },
          })
          const cardMap = new Map(
            cardElements.map((ce) => [ce.fieldId, ce])
          )
          el.loop = el.loop.map(
            (card: { fieldId: string; value?: string; label?: string }) => {
              const dbCard = cardMap.get(card.fieldId)
              return {
                fieldId: card.fieldId,
                value: dbCard?.content || card.value || "",
                label: dbCard?.elementName || card.label || "",
              }
            }
          )
        }
        return el
      })
    )

    return NextResponse.json({
      success: true,
      count: enrichedElements.length,
      elements: enrichedElements,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch elements"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/elements
 * Create a new element.
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const body = await request.json()
    const fieldId = body.fieldId || generateFieldId()

    const element = await Element.create({
      fieldId,
      sectionId: body.sectionId,
      elementName: body.elementName,
      contentType: body.contentType || "Text",
      content: body.content || "",
      loop: body.loop || null,
      css: body.css || null,
      pageName: body.pageName || "Home",
    })

    return NextResponse.json({ success: true, element }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create element"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
