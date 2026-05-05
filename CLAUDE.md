# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

- **Client:** Insight Global — mobile-first PWA for employee expense receipt tracking
- **Repo:** https://github.com/dubj721/ReceiptMe.git — `main` branch auto-deploys to Vercel
- **Brand colors:** `#00283C` (navy), `#00D6F2` (cyan)

## Commands

```bash
npm run dev      # Start Next.js dev server (port 3000)
npm run build    # Production build
npm run lint     # ESLint
```

No test suite is configured.

## Architecture

Next.js 15 App Router project using Supabase for auth, database, and storage. Deployed on Vercel.

### Route Groups

- `(auth)/` — `/login`, `/signup` — unauthenticated only
- `(dashboard)/` — `/home`, `/capture`, `/packets`, `/archive`, `/settings` — shared layout with `Sidebar`, `BottomNav`, `TopBar`
- `admin/` — `/admin`, `/admin/users`, `/admin/users/[id]`, `/admin/feedback` — requires `is_admin = true` in user profile
- `api/` — REST handlers + one Vercel Cron job

`src/middleware.ts` guards all routes: unauthenticated → `/login`, authenticated hitting auth pages → `/home`.

### Supabase Clients

Three clients in `src/lib/supabase/`:
- `server.ts` — SSR/server components, reads cookies
- `client.ts` — `"use client"` components
- `admin.ts` — service-role key, bypasses RLS; used only in admin API routes

All database tables have RLS enabled. Users can only access their own rows. Admin routes use the admin client to query across all users.

### Key Data Model

- **receipts** — core entity; `status`: `active | overdue_flagged | archived`; `source`: `photo | email | concur | bank_transaction | manual`; `transaction_date` starts the 60-day policy clock
- **missing_receipt_forms** — one-to-one with `receipts`; required when `source = bank_transaction`; `signature_url` stores `"sig:<name>"`
- **packets** — monthly groupings (auto-created on receipt save, e.g. "January 2025"); `status`: `draft | exported`
- **packet_receipts** — join table
- **notifications** — audit log of day-55/60/61 policy alerts
- **events** — analytics event log (`receipt_created`, `pdf_exported`, etc.)

All types and enums are in `src/types/index.ts`.

### 60-Day Policy (US Only)

Applies only to users with `country = "US"`. Canadian users (`country = "CA"`) are fully exempt. The Vercel Cron job at `GET /api/cron/check-overdue` (runs daily, auth via `CRON_SECRET` Bearer token) queries active US receipts and:
- Day 55–59 → insert `day_55_warning` notification
- Day 60 → insert `day_60_overdue` notification
- Day 61+ → set `status = overdue_flagged`, insert `day_61_archived` notification

### Receipt Capture Flow

`/capture` is a multi-step client-side wizard:
1. Select source → upload image (optional) → POST `/api/receipts/ocr` (OCR.space API) → auto-fill form → POST `/api/receipts` → (if bank_transaction) PUT `/api/missing-forms/[id]` → success

OCR pipeline: client compresses image (max 1200px, JPEG 0.85) → OCR.space → regex extracts vendor (90+ known), date, amount, category.

### Analytics

`src/lib/track.ts` is a fire-and-forget client-side logger. Call it freely — errors are swallowed and never affect the UI.

## ⚠️ CRITICAL — Mobile Layout Rules (never break these)

### The min-w-0 flex rule
Any element that is a **flex item inside a row-direction flex container** MUST have `min-w-0` if it uses `flex-1` or needs to be constrained to the container width. Without it, CSS defaults `min-width: auto`, which lets the item grow to its content's intrinsic width — past 100vw on mobile. Every `w-full` child then inherits that bloated width and cards bleed off-screen.

In `(dashboard)/layout.tsx`, the content wrapper MUST stay:
```tsx
<div className="flex-1 flex flex-col min-h-0 min-w-0">
```
Never remove `min-w-0` from this element.

### No absolute-positioned panels inside overflow:hidden on mobile
Chrome mobile has a known bug where `position: relative` + `overflow: hidden` fails to clip absolutely-positioned children. Do NOT use absolute-positioned background panels inside cards. Use **flex two-panel layouts** instead (left: `flex-1 min-w-0`, right: `flex-shrink-0 width: X%`).

### overflow-x: hidden is not a width constraint
`overflow-x: hidden` clips content that exceeds the container but does NOT prevent elements from computing a width wider than the viewport. It makes overflow invisible, not absent. Always fix the root width cause; don't rely on clipping.
