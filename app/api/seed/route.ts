import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { Section, Element } from "@/lib/models"
import { readFileSync } from "fs"
import path from "path"

export const dynamic = "force-dynamic"

/**
 * POST /api/seed
 * Import seed data into MongoDB.
 */
export async function POST() {
  try {
    await connectDB()

    // Read seed data from file
    const seedPath = path.join(process.cwd(), "seed", "pulse-fit-hero.json")
    const seedData = JSON.parse(readFileSync(seedPath, "utf-8"))

    // Upsert section
    const sectionData = seedData.section
    await Section.findOneAndUpdate(
      { sectionId: sectionData.sectionId },
      { $set: sectionData },
      { upsert: true, new: true }
    )

    // Upsert elements
    let count = 0
    for (const el of seedData.elements) {
      await Element.findOneAndUpdate(
        { fieldId: el.fieldId },
        { $set: el },
        { upsert: true, new: true }
      )
      count++
    }

    return NextResponse.json({
      success: true,
      message: `Seeded 1 section and ${count} elements`,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Seed failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
