import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { Section, Element } from "@/lib/models"
import { generateSection, diffMergeElements } from "@/lib/generation-engine"
import { generateFieldId } from "@/lib/id-generator"
import { sanitiseHtml, stripSensitiveInfo } from "@/lib/sanitizer"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export const dynamic = "force-dynamic"

/**
 * POST /api/generate
 * Accepts: wireframe file, code text, prompt, pageName, sectionName
 * Returns: generated section + elements + preview link
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || ""

    let prompt: string | undefined
    let code: string | undefined
    let pageName = "Home"
    let sectionName = "Hero"
    let wireframePath: string | null = null
    let wireframeDescription: string | undefined

    if (contentType.includes("multipart/form-data")) {
      // Handle file upload
      const formData = await request.formData()
      prompt = (formData.get("prompt") as string) || undefined
      code = (formData.get("code") as string) || undefined
      pageName = (formData.get("pageName") as string) || "Home"
      sectionName = (formData.get("sectionName") as string) || "Hero"

      const wireframeFile = formData.get("wireframe") as File | null
      if (wireframeFile && wireframeFile.size > 0) {
        // Save wireframe file
        const uploadsDir = path.join(process.cwd(), "public", "uploads")
        await mkdir(uploadsDir, { recursive: true })

        const ext = wireframeFile.name.split(".").pop() || "png"
        const fileName = `${Date.now()}-${generateFieldId()}.${ext}`
        const filePath = path.join(uploadsDir, fileName)

        const buffer = Buffer.from(await wireframeFile.arrayBuffer())
        await writeFile(filePath, buffer)

        wireframePath = `/uploads/${fileName}`
        wireframeDescription = `Uploaded wireframe image: ${wireframeFile.name} (saved at ${wireframePath})`
      }
    } else {
      // Handle JSON body
      const body = await request.json()
      prompt = body.prompt
      code = body.code
      pageName = body.pageName || "Home"
      sectionName = body.sectionName || "Hero"
      wireframeDescription = body.wireframeDescription
    }

    // Validate: at least one input required
    if (!prompt && !code && !wireframeDescription) {
      return NextResponse.json(
        { error: "At least one input mode (prompt, code, or wireframe) is required." },
        { status: 422 }
      )
    }

    // Sanitise code input
    if (code) {
      code = stripSensitiveInfo(code)
    }

    // Generate section via AI
    const generated = await generateSection({
      prompt,
      code,
      wireframeDescription,
      pageName,
      sectionName,
    })

    // Connect to DB and persist
    await connectDB()

    const sectionId = generateFieldId()

    // Check for existing section with same name + page (for diff-merge)
    const existingSection = await Section.findOne({
      sectionName: generated.sectionName,
      pageName,
    })

    let existingElements: Awaited<ReturnType<typeof Element.find>> = []
    if (existingSection) {
      existingElements = await Element.find({
        sectionId: existingSection.sectionId,
      })
      // Update existing section
      existingSection.variations += 1
      existingSection.wireframes = wireframePath || existingSection.wireframes
      await existingSection.save()
    }

    // Create or update section
    const targetSectionId = existingSection?.sectionId || sectionId
    if (!existingSection) {
      await Section.create({
        sectionId: targetSectionId,
        sectionName: generated.sectionName,
        pageName,
        platform: "Website",
        isGenerated: true,
        sectionStatus: "Pending",
        wireframes: wireframePath,
        variations: 1,
        cardGridColumns: generated.cardGridColumns,
      })
    }

    // Diff-merge elements if existing
    let elementsToSave = generated.elements
    if (existingElements.length > 0) {
      const existingMapped = existingElements.map((el) => ({
        fieldId: el.fieldId,
        elementName: el.elementName,
        contentType: el.contentType as "Image" | "Text" | "Textfield" | "Button" | "Cards",
        content: el.content,
        loop: (el.loop || undefined) as { fieldId: string; value: string; label: string }[] | undefined,
      }))
      elementsToSave = diffMergeElements(existingMapped, generated.elements)
    }

    // Sanitise all text content
    elementsToSave = elementsToSave.map((el) => ({
      ...el,
      content: el.contentType === "Text" || el.contentType === "Textfield"
        ? sanitiseHtml(el.content)
        : el.content,
    }))

    // Upsert elements
    for (const el of elementsToSave) {
      await Element.findOneAndUpdate(
        { fieldId: el.fieldId },
        {
          fieldId: el.fieldId,
          sectionId: targetSectionId,
          elementName: el.elementName,
          contentType: el.contentType,
          content: el.content,
          loop: el.loop || null,
          css: null,
          pageName,
        },
        { upsert: true, new: true }
      )
    }

    // Replace fieldIds in JSX with actual generated IDs
    let jsx = generated.jsx
    generated.elements.forEach((genEl, i) => {
      const savedEl = elementsToSave[i]
      if (savedEl && genEl.fieldId !== savedEl.fieldId) {
        jsx = jsx.replace(new RegExp(genEl.fieldId, "g"), savedEl.fieldId)
      }
    })

    return NextResponse.json({
      success: true,
      sectionId: targetSectionId,
      sectionName: generated.sectionName,
      pageName,
      variations: existingSection ? existingSection.variations : 1,
      elementCount: elementsToSave.length,
      jsx,
      previewUrl: `/preview/${pageName}`,
      wireframe: wireframePath,
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Generation failed"
    console.error("[Generate API Error]", message)
    return NextResponse.json(
      { error: `Generation failed: ${message}` },
      { status: 500 }
    )
  }
}
