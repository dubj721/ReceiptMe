import { NextRequest, NextResponse } from "next/server";
import type { ReceiptCategory } from "@/types";

export async function POST(req: NextRequest) {
  const { image_b64, mime_type } = await req.json();

  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OCR API not configured" }, { status: 503 });
  }

  // OCR.space accepts a base64 data URL
  const dataUrl = `data:${mime_type ?? "image/jpeg"};base64,${image_b64}`;

  const formData = new URLSearchParams();
  formData.append("apikey", apiKey);
  formData.append("base64Image", dataUrl);
  formData.append("language", "eng");
  formData.append("isTable", "true");
  formData.append("OCREngine", "2");
  formData.append("scale", "true");

  const ocrRes = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  if (!ocrRes.ok) {
    return NextResponse.json({ error: "OCR API error" }, { status: 502 });
  }

  const ocrData = await ocrRes.json();

  if (ocrData.IsErroredOnProcessing) {
    return NextResponse.json({ error: ocrData.ErrorMessage ?? "OCR failed" }, { status: 422 });
  }

  const fullText: string =
    ocrData.ParsedResults?.[0]?.ParsedText ?? "";

  const extracted = parseReceiptText(fullText);
  return NextResponse.json(extracted);
}

function parseReceiptText(text: string): {
  vendor_name?: string;
  transaction_date?: string;
  amount?: string;
  category?: ReceiptCategory;
} {
  const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);
  const vendor_name = lines[0] ?? undefined;

  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2}),?\s+(\d{4})/i,
    /(\d{4})[\/\-](\d{2})[\/\-](\d{2})/,
  ];
  let transaction_date: string | undefined;
  for (const pat of datePatterns) {
    const m = text.match(pat);
    if (m) {
      try {
        const d = new Date(m[0]);
        if (!isNaN(d.getTime())) {
          transaction_date = d.toISOString().split("T")[0];
          break;
        }
      } catch { /* ignore */ }
    }
  }

  const amountMatches = [...text.matchAll(/\$?\s?(\d{1,5}[.,]\d{2})/g)]
    .map((m: RegExpMatchArray) => parseFloat(m[1].replace(",", ".")))
    .filter((n: number) => !isNaN(n) && n > 0);
  const amount = amountMatches.length
    ? String(Math.max(...amountMatches).toFixed(2))
    : undefined;

  const lower = text.toLowerCase();
  let category: ReceiptCategory | undefined;
  if (/hotel|inn|resort|motel|airbnb|lodging|stay/.test(lower))         category = "lodging";
  else if (/airline|flight|uber|lyft|taxi|train|delta|united|southwest/.test(lower)) category = "transit";
  else if (/restaurant|café|cafe|coffee|lunch|dinner|breakfast|grill/.test(lower))   category = "meals";

  return { vendor_name, transaction_date, amount, category };
}
