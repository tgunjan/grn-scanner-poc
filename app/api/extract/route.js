import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const EXTRACTION_PROMPT = `You are an intelligent document processing system for Indian construction procurement, specifically trained on delivery challans received by Nikhil Group (Nikhil Constructiongroup Pvt. Ltd / Nikhil Infra / NIPL / Nikhil Construction Group Pvt Ltd) in Pune, Maharashtra.

You are analyzing a photograph of a Delivery Challan (DC) — a document that accompanies every material delivery to a construction site or RMC (Ready-Mix Concrete) plant.

CRITICAL RULES FOR THIS TASK:
- The document may be ROTATED (sideways, upside down). Read it in whatever orientation the text flows naturally.
- Many challans have a NIKHIL GROUP rubber stamp overlaid on them containing GRN No., PO No., GRN Date, Store Keeper Sign, Project Incharge Sign. Extract these SEPARATELY in the "receiver_stamp" section — do NOT confuse them with the supplier's challan fields.
- Some images show TWO documents side by side (challan + weighbridge slip). Extract from the CHALLAN (the delivery document from the supplier), not the weighbridge slip. If the weighbridge slip has weight data, extract it in the "weighbridge_data" section.
- If a field is not visible, not present, or completely illegible, return null. Do NOT guess or hallucinate values.
- For handwritten text that is unclear, provide your best reading but set confidence to "low" or "medium".
- Return ONLY valid JSON. No markdown, no backticks, no explanation text.

FIELDS TO EXTRACT:

From the SUPPLIER'S CHALLAN:
1. dc_number — Delivery Challan number / Bill number / Ch. No. (look for DC No, Challan No, Ch. No., Bill No, No.)
2. dc_date — Date on the challan (convert to DD-MM-YYYY format regardless of how written)
3. supplier_name — Supplier / Consignor / Seller / company name from the letterhead or header
4. material_description — What material is being delivered. Be specific with grades and types:
   - Cement: specify grade (OPC 53, PPC, OPC S3, etc.) and brand if visible
   - Aggregate/Stone: specify size (10mm, 20mm, 40mm, grit, dust)
   - Sand: specify type (M-Sand, Crush Sand, Plaster Sand, River Sand)
   - Fly Ash: specify type (Super Fine Fly Ash Bulker, Fly Ash Bag, Pond Ash)
   - Concrete: specify grade (M20, M25, M30, M45PT, etc.)
   - Steel: specify type (TMT bars, sheets, CPC coated, angles, flats)
   - Others: Bricks (size), Water, Gypsum, AAC Blocks, Admixture, etc.
5. quantity — Numeric quantity value only (e.g., "28.5", "1700", "6.0", "44000", "10000")
6. quantity_unit — Unit of measurement. Common units on Indian construction challans:
   - MT or Tonnes (metric tonnes - bulk materials)
   - KG (kilograms)
   - Bags or No. of Bags
   - Pcs or Nos (pieces/numbers - for bricks, blocks, sheets)
   - Brass (volume unit for aggregate, 1 brass = 100 cubic feet)
   - M3 or Cum (cubic meters - for ready-mix concrete)
   - Ltrs or Litres (for water, admixture)
   - CFT (cubic feet)
7. vehicle_number — Truck / Vehicle / Transit Mixer registration number (Indian format: MH 12 AB 1234). Look for "Vehicle No", "Truck No", "Transit Mixer No", "Veh. No."
8. lr_number — Lorry Receipt number / LR No. / T.R. No. (transport receipt). May not be present.
9. driver_name — Driver name. Often handwritten, may be partially illegible.
10. delivery_site — Where the material is going. Look for "To", "Consignee", "Site", "Delivered at", "Site Address", "At Site". Include project/site name if mentioned (e.g., "Kohinoor Amville", "Keshavnagar", "RMC Plant Hinjewadi", "Kolwadi")
11. rate_per_unit — Rate / Price per unit if mentioned on the challan
12. gross_weight — Gross weight from challan (not from weighbridge slip)
13. tare_weight — Tare weight from challan
14. net_weight — Net weight from challan
15. remarks — Any other notable info: order number, e-way bill, batch number, concrete grade details, loading time, dispatch time

From the NIKHIL GROUP RECEIVER STAMP (if present — this is a rubber stamp overlaid on the challan):
16. receiver_grn_number — GRN No. from the Nikhil Group stamp
17. receiver_grn_date — GRN Date from the stamp
18. receiver_po_number — PO No. from the stamp

From WEIGHBRIDGE SLIP (if a weighbridge slip is visible alongside or attached):
19. wb_gross — Gross weight from weighbridge
20. wb_tare — Tare weight from weighbridge  
21. wb_net — Net weight from weighbridge
22. wb_vehicle — Vehicle number on weighbridge slip (to confirm it matches challan)

RETURN FORMAT:
{
  "fields": {
    "dc_number": { "value": "...", "confidence": "high|medium|low" },
    "dc_date": { "value": "DD-MM-YYYY", "confidence": "high|medium|low" },
    "supplier_name": { "value": "...", "confidence": "high|medium|low" },
    "material_description": { "value": "...", "confidence": "high|medium|low" },
    "quantity": { "value": "...", "confidence": "high|medium|low" },
    "quantity_unit": { "value": "...", "confidence": "high|medium|low" },
    "vehicle_number": { "value": "...", "confidence": "high|medium|low" },
    "lr_number": { "value": null or "...", "confidence": "high|medium|low" },
    "driver_name": { "value": null or "...", "confidence": "high|medium|low" },
    "delivery_site": { "value": "...", "confidence": "high|medium|low" },
    "rate_per_unit": { "value": null or "...", "confidence": "high|medium|low" },
    "gross_weight": { "value": null or "...", "confidence": "high|medium|low" },
    "tare_weight": { "value": null or "...", "confidence": "high|medium|low" },
    "net_weight": { "value": null or "...", "confidence": "high|medium|low" },
    "remarks": { "value": null or "...", "confidence": "high|medium|low" }
  },
  "receiver_stamp": {
    "grn_number": null or "...",
    "grn_date": null or "...",
    "po_number": null or "..."
  },
  "weighbridge_data": {
    "gross": null or "...",
    "tare": null or "...",
    "net": null or "...",
    "vehicle": null or "..."
  },
  "document_type": "delivery_challan|tax_invoice_cum_challan|weighbridge_slip|ready_mix_challan|unknown",
  "language_detected": "english|hindi|marathi|mixed",
  "overall_quality": "good|fair|poor",
  "document_orientation": "normal|rotated_90_cw|rotated_90_ccw|rotated_180",
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

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
