import { NextRequest, NextResponse } from "next/server";

interface OcrWord {
  WordText: string;
  Left:     number;
  Top:      number;
  Height:   number;
  Width:    number;
}

interface OcrLine {
  LineText:  string;
  Words:     OcrWord[];
  MaxHeight: number;
  MinTop:    number;
}

export interface StatementRow {
  date:    string;   // raw date string e.g. "04/15"
  isoDate: string;   // ISO date e.g. "2026-04-15"
  vendor:  string;   // normalized vendor name
  amount:  string;   // e.g. "218.50"
  rawText: string;
  bbox:    { x: number; y: number; w: number; h: number };
}

export async function POST(req: NextRequest) {
  const { image_b64, mime_type, image_width, image_height } = await req.json();

  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OCR not configured" }, { status: 503 });

  const dataUrl = `data:${mime_type ?? "image/jpeg"};base64,${image_b64}`;
  const fd = new URLSearchParams();
  fd.append("apikey",            apiKey);
  fd.append("base64Image",       dataUrl);
  fd.append("language",          "eng");
  fd.append("isOverlayRequired", "true");
  fd.append("OCREngine",         "2");
  fd.append("scale",             "true");
  fd.append("detectOrientation", "true");

  const ocrRes = await fetch("https://api.ocr.space/parse/image", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    fd.toString(),
  });

  if (!ocrRes.ok) return NextResponse.json({ error: "OCR error" }, { status: 502 });

  const ocrData = await ocrRes.json();
  if (ocrData.IsErroredOnProcessing) {
    return NextResponse.json({ error: ocrData.ErrorMessage ?? "OCR failed" }, { status: 422 });
  }

  const lines: OcrLine[] = ocrData.ParsedResults?.[0]?.TextOverlay?.Lines ?? [];
  const imgW = image_width  ?? 1200;
  const imgH = image_height ?? 1600;
  const rows = parseTransactionRows(lines, imgW, imgH);

  return NextResponse.json({ rows, imageWidth: imgW, imageHeight: imgH });
}

// Matches: date  description  amount  (debit/credit optional)
const TX_ROW = /^(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\s{1,6}(.+?)\s{1,6}[-–]?\$?(\d{1,6}[.,]\d{2})\s*(?:[-–]?\$?\d+[.,]\d+)?$/;

function parseTransactionRows(lines: OcrLine[], imgW: number, imgH: number): StatementRow[] {
  const rows: StatementRow[] = [];

  for (const line of lines) {
    const text = line.LineText.trim();
    const m = TX_ROW.exec(text);
    if (!m) continue;

    const [, rawDate, rawVendor, rawAmount] = m;

    let isoDate = "";
    try {
      const parts    = rawDate.split(/[\/\-]/);
      const month    = parseInt(parts[0]);
      const day      = parseInt(parts[1]);
      const rawYear  = parts[2] ? parseInt(parts[2]) : new Date().getFullYear();
      const fullYear = rawYear < 100 ? 2000 + rawYear : rawYear;
      const d = new Date(fullYear, month - 1, day);
      if (!isNaN(d.getTime())) isoDate = d.toISOString().split("T")[0];
    } catch { /* leave empty */ }

    const vendor = normalizeVendor(rawVendor.trim());
    const amount = parseFloat(rawAmount.replace(",", ".")).toFixed(2);

    const PAD  = 4;
    const bbox = {
      x: 0,
      y: Math.max(0, line.MinTop - PAD),
      w: imgW,
      h: Math.min(line.MaxHeight + PAD * 2, imgH),
    };

    rows.push({ date: rawDate, isoDate, vendor, amount, rawText: text, bbox });
  }

  return rows;
}

const KNOWN_VENDORS: [RegExp, string][] = [
  [/marriott/i,         "Marriott Hotels"],
  [/hilton/i,           "Hilton Hotels"],
  [/hyatt/i,            "Hyatt Hotels"],
  [/hampton\s*inn/i,    "Hampton Inn"],
  [/holiday\s*inn/i,    "Holiday Inn"],
  [/sheraton/i,         "Sheraton Hotels"],
  [/westin/i,           "Westin Hotels"],
  [/courtyard/i,        "Courtyard by Marriott"],
  [/delta\s*air/i,      "Delta Air Lines"],
  [/united\s*air/i,     "United Airlines"],
  [/southwest/i,        "Southwest Airlines"],
  [/american\s*air/i,   "American Airlines"],
  [/jetblue/i,          "JetBlue Airways"],
  [/\buber\b/i,         "Uber"],
  [/\blyft\b/i,         "Lyft"],
  [/\bamazon\b/i,       "Amazon"],
  [/starbucks/i,        "Starbucks Coffee"],
  [/whole\s*foods/i,    "Whole Foods Market"],
  [/trader\s*joe/i,     "Trader Joe's"],
  [/\btarget\b/i,       "Target"],
  [/\bwalmart\b/i,      "Walmart"],
  [/mcdonald/i,         "McDonald's"],
  [/chick.?fil.?a/i,    "Chick-fil-A"],
  [/chipotle/i,         "Chipotle"],
  [/panera/i,           "Panera Bread"],
];

function normalizeVendor(raw: string): string {
  for (const [pat, name] of KNOWN_VENDORS) {
    if (pat.test(raw)) return name;
  }
  if (raw === raw.toUpperCase() && raw.length > 2) {
    return raw.toLowerCase().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  return raw;
}
