import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { generateFieldId } from "@/lib/id-generator"

export const dynamic = "force-dynamic"

/**
 * POST /api/upload
 * Upload wireframe image file.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PNG, JPG, and WebP images are allowed" },
        { status: 400 }
      )
    }

    // Save file
    const uploadsDir = path.join(process.cwd(), "public", "uploads")
    await mkdir(uploadsDir, { recursive: true })

    const ext = file.name.split(".").pop() || "png"
    const fileName = `${Date.now()}-${generateFieldId()}.${ext}`
    const filePath = path.join(uploadsDir, fileName)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    return NextResponse.json({
      success: true,
      fileName,
      url: `/uploads/${fileName}`,
      size: file.size,
      type: file.type,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Upload failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
