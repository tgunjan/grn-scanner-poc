import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXTRACTION_PROMPT = `You are an intelligent document processing system for Indian construction procurement. 
You are analyzing a photograph of a Delivery Challan (DC) — a document that accompanies every material delivery to a construction site or RMC (Ready-Mix Concrete) plant.

Extract the following fields from this challan image. The challan may be:
- Printed, handwritten, or a mix of both
- In English, Hindi, Marathi, or a mix
- Smudged, folded, or poorly photographed
- From any supplier — every supplier has a different format

Fields to extract:

1. **dc_number** — Delivery Challan number / Bill number / Invoice number (look for DC No, Challan No, Bill No, Inv No)
2. **dc_date** — Date on the challan (may be in DD/MM/YYYY or DD-MM-YYYY format)
3. **supplier_name** — Supplier / Consignor / Seller name (the company sending the material)
4. **material_description** — What material is being delivered (e.g., OPC 53 Grade Cement, 20mm Aggregate, M-Sand, Fly Ash, GGBS, Admixture). Include grade/specification if mentioned.
5. **quantity** — Quantity loaded / dispatched (look for Qty, Quantity, Weight, MT, Tonnes, KG, Bags, Nos)
6. **quantity_unit** — Unit of measurement (MT, Tonnes, KG, Bags, Cubic Meter, Nos, Ltrs)
7. **vehicle_number** — Truck / Vehicle registration number (Indian format like MH12AB1234)
8. **lr_number** — Lorry Receipt number / LR No / Transport document number (may not be present on all challans)
9. **driver_name** — Driver name (may be handwritten, may not be present)
10. **delivery_site** — Consignee / Delivery address / Site name (where the material is being delivered)
11. **rate_per_unit** — Rate / Price per unit if mentioned (may not be on all challans — some show only quantity, not price)
12. **gross_weight** — Gross weight if mentioned (loaded truck weight)
13. **tare_weight** — Tare weight if mentioned (empty truck weight)  
14. **net_weight** — Net weight if mentioned (material weight = gross - tare)
15. **remarks** — Any other notable information (damage notes, special instructions, batch number, MTC reference)

IMPORTANT RULES:
- If a field is not visible, not present, or completely illegible, return null for that field.
- If you can partially read a handwritten field, provide your best reading.
- For each extracted field, also provide a "confidence" score: "high", "medium", or "low".
- Return ONLY valid JSON, no markdown, no backticks, no explanation.

Return format:
{
  "fields": {
    "dc_number": { "value": "...", "confidence": "high|medium|low" },
    "dc_date": { "value": "...", "confidence": "high|medium|low" },
    ...
  },
  "document_type": "delivery_challan|weighbridge_slip|tax_invoice|unknown",
  "language_detected": "english|hindi|marathi|mixed",
  "overall_quality": "good|fair|poor",
  "notes": "any relevant observations about the document"
}`;

export async function POST(request) {
  try {
    const { image, mimeType } = await request.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType || "image/jpeg",
                data: image,
              },
            },
            {
              type: "text",
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });

    const rawText = response.content[0].text;

    // Parse JSON, handling potential markdown fences
    const cleaned = rawText.replace(/```json\s?|```/g, "").trim();
    const extracted = JSON.parse(cleaned);

    return NextResponse.json({ success: true, data: extracted });
  } catch (error) {
    console.error("Extraction error:", error);
    return NextResponse.json(
      {
        error: "Failed to process challan",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
