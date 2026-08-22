import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { Section, Element } from "@/lib/models"
import { generateSection, diffMergeElements } from "@/lib/generation-engine"
import { sanitiseHtml } from "@/lib/sanitizer"

export const dynamic = "force-dynamic"

/**
 * POST /api/sections/:sectionId/regenerate
 * Generate a new variation with diff-merge preservation of stable fieldIds.
 */
export async function POST(
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

    // Get existing elements for diff-merge
    const existingElements = await Element.find({ sectionId })

    const body = await request.json()

    // Generate new variation
    const generated = await generateSection({
      prompt: body.prompt,
      code: body.code,
      wireframeDescription: body.wireframeDescription,
      pageName: section.pageName,
      sectionName: section.sectionName,
    })

    // Diff-merge to preserve stable IDs
    const existingMapped = existingElements.map((el) => ({
      fieldId: el.fieldId,
      elementName: el.elementName,
      contentType: el.contentType as "Image" | "Text" | "Textfield" | "Button" | "Cards",
      content: el.content,
      loop: (el.loop || undefined) as { fieldId: string; value: string; label: string }[] | undefined,
    }))

    const mergedElements = diffMergeElements(existingMapped, generated.elements)

    // Sanitise content
    const sanitisedElements = mergedElements.map((el) => ({
      ...el,
      content:
        el.contentType === "Text" || el.contentType === "Textfield"
          ? sanitiseHtml(el.content)
          : el.content,
    }))

    // Upsert merged elements
    for (const el of sanitisedElements) {
      await Element.findOneAndUpdate(
        { fieldId: el.fieldId },
        {
          fieldId: el.fieldId,
          sectionId,
          elementName: el.elementName,
          contentType: el.contentType,
          content: el.content,
          loop: el.loop || null,
          css: null,
          pageName: section.pageName,
        },
        { upsert: true, new: true }
      )
    }

    // Update variation count
    section.variations += 1
    await section.save()

    return NextResponse.json({
      success: true,
      sectionId,
      variations: section.variations,
      elementCount: sanitisedElements.length,
      jsx: generated.jsx,
      previewUrl: `/preview/${section.pageName}`,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Regeneration failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
