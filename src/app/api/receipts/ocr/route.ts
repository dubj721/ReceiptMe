import { NextRequest, NextResponse } from "next/server";
import type { ReceiptCategory } from "@/types";

export async function POST(req: NextRequest) {
  const { image_b64, mime_type } = await req.json();

  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OCR API not configured" }, { status: 503 });
  }

  const dataUrl = `data:${mime_type ?? "image/jpeg"};base64,${image_b64}`;

  const formData = new URLSearchParams();
  formData.append("apikey", apiKey);
  formData.append("base64Image", dataUrl);
  formData.append("language", "eng");
  formData.append("isTable", "true");
  formData.append("OCREngine", "2");
  formData.append("scale", "true");
  formData.append("detectOrientation", "true");

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

  const fullText: string = ocrData.ParsedResults?.[0]?.ParsedText ?? "";
  const extracted = parseReceiptText(fullText);
  return NextResponse.json(extracted);
}

/* ─── Known vendor normalization ─────────────────────────────────────────── */
const KNOWN_VENDORS: [RegExp, string][] = [
  [/starbucks/i,              "Starbucks Coffee"],
  [/mcdonald/i,               "McDonald's"],
  [/chick.?fil.?a/i,          "Chick-fil-A"],
  [/chipotle/i,               "Chipotle Mexican Grill"],
  [/panera/i,                 "Panera Bread"],
  [/subway\b/i,               "Subway"],
  [/dunkin/i,                 "Dunkin'"],
  [/burger\s*king/i,          "Burger King"],
  [/taco\s*bell/i,            "Taco Bell"],
  [/wendy/i,                  "Wendy's"],
  [/five\s*guys/i,            "Five Guys"],
  [/shake\s*shack/i,          "Shake Shack"],
  [/domino/i,                 "Domino's Pizza"],
  [/pizza\s*hut/i,            "Pizza Hut"],
  [/olive\s*garden/i,         "Olive Garden"],
  [/applebee/i,               "Applebee's"],
  [/chili.?s\b/i,             "Chili's"],
  [/outback/i,                "Outback Steakhouse"],
  [/hilton/i,                 "Hilton Hotels"],
  [/marriott/i,               "Marriott Hotels"],
  [/hyatt/i,                  "Hyatt Hotels"],
  [/hampton\s*inn/i,          "Hampton Inn"],
  [/holiday\s*inn/i,          "Holiday Inn"],
  [/sheraton/i,               "Sheraton Hotels"],
  [/westin/i,                 "Westin Hotels"],
  [/courtyard/i,              "Courtyard by Marriott"],
  [/delta\s*air/i,            "Delta Air Lines"],
  [/united\s*air/i,           "United Airlines"],
  [/southwest\s*air/i,        "Southwest Airlines"],
  [/american\s*air/i,         "American Airlines"],
  [/jetblue/i,                "JetBlue Airways"],
  [/\buber\b/i,               "Uber"],
  [/\blyft\b/i,               "Lyft"],
  [/\bamazon\b/i,             "Amazon"],
  [/\bwhole\s*foods\b/i,      "Whole Foods Market"],
  [/trader\s*joe/i,           "Trader Joe's"],
  [/\btarget\b/i,             "Target"],
  [/\bwalmart\b/i,            "Walmart"],
  [/\bcostco\b/i,             "Costco"],
  [/\bshell\b/i,              "Shell"],
  [/\bexxon/i,                "ExxonMobil"],
  [/\bbp\b/i,                 "BP"],
  [/\bchevron\b/i,            "Chevron"],
];

function normalizeVendor(raw: string): string {
  for (const [pattern, name] of KNOWN_VENDORS) {
    if (pattern.test(raw)) return name;
  }
  // Convert ALL-CAPS to Title Case
  if (raw === raw.toUpperCase() && raw.length > 3) {
    return raw
      .toLowerCase()
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return raw;
}

/* ─── Vendor extraction ──────────────────────────────────────────────────── */
function extractVendorName(lines: string[]): string | undefined {
  const SKIP = [
    /^\d{3}[-.\s()]{1,3}\d{3}[-.\s]\d{4}/,          // phone numbers
    /^\+?1[\s.-]?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/, // intl phone
    /\d+\s+(st|ave|blvd|dr|rd|ln|way|pkwy|hwy|suite|ste|fl)\b/i, // street
    /^(receipt|invoice|welcome|thank\s*you|order\s*#|ticket|guest\s*check|check\s*#)/i,
    /^www\.|\.com|\.net|\.org|http/i,                 // URLs
    /^[\d\s\-+().]{7,}$/,                             // pure numbers/symbols
    /^(date|time|server|cashier|terminal|store\s*#|ref|trans|auth|tel|fax)/i,
    /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/,            // dates
    /^(tax|total|subtotal|balance|amount|cash|change|tip|gratuity)/i,
    /^\*+/,                                            // decorative lines
    /^[-=_]{3,}/,                                      // separator lines
  ];

  const candidates: string[] = [];

  for (const line of lines.slice(0, 10)) {
    const trimmed = line.trim();
    if (trimmed.length < 3) continue;
    if (SKIP.some(p => p.test(trimmed))) continue;
    // Must be mostly alphabetic (at least 40% letters)
    const alpha = (trimmed.match(/[a-zA-Z]/g) ?? []).length;
    if (alpha < trimmed.length * 0.4) continue;
    // Skip very long lines (likely a description, not a name)
    if (trimmed.length > 50) continue;

    candidates.push(trimmed);
    if (candidates.length >= 3) break;
  }

  if (candidates.length === 0) return lines[0]?.trim();

  // Combine top two lines if both are short — handles split store names
  // e.g. "MARRIOTT" / "BOSTON COPLEY" → "Marriott Boston Copley"
  if (
    candidates.length >= 2 &&
    candidates[0].length <= 22 &&
    candidates[1].length <= 22 &&
    !candidates[1].match(/^(llc|inc|corp|ltd|co\b)/i)
  ) {
    const combined = `${candidates[0]} ${candidates[1]}`.trim();
    return normalizeVendor(combined);
  }

  return normalizeVendor(candidates[0]);
}

/* ─── Main parser ────────────────────────────────────────────────────────── */
function parseReceiptText(text: string): {
  vendor_name?: string;
  transaction_date?: string;
  amount?: string;
  category?: ReceiptCategory;
} {
  const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);

  const vendor_name = extractVendorName(lines);

  /* ── Date ── */
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+(\d{1,2}),?\s+(\d{4})/i,
    /(\d{4})[\/\-](\d{2})[\/\-](\d{2})/,
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})/i,
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

  /* ── Amount — take the largest dollar value, skip obvious tax lines ── */
  const amountLines = text
    .split("\n")
    .filter(l => !/^(tax|tip|gratuity)/i.test(l.trim()));
  const amountText = amountLines.join("\n");
  const amountMatches = [...amountText.matchAll(/\$?\s?(\d{1,5}[.,]\d{2})/g)]
    .map((m: RegExpMatchArray) => parseFloat(m[1].replace(",", ".")))
    .filter((n: number) => !isNaN(n) && n > 0);
  const amount = amountMatches.length
    ? String(Math.max(...amountMatches).toFixed(2))
    : undefined;

  /* ── Category ── */
  const lower = text.toLowerCase();
  let category: ReceiptCategory | undefined;
  if (/hotel|inn|resort|motel|airbnb|lodging|accommodation|stay|nights?/.test(lower))
    category = "lodging";
  else if (/airline|flight|uber|lyft|taxi|cab|train|transit|rail|delta air|united air|southwest|jetblue|airport/.test(lower))
    category = "transit";
  else if (/restaurant|café|cafe|coffee|lunch|dinner|breakfast|grill|bistro|bar\b|pub|diner|eatery|pizza|sushi|burger|taco/.test(lower))
    category = "meals";

  return { vendor_name, transaction_date, amount, category };
}
