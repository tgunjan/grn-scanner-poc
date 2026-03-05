# GrokIT GRN Scanner

AI-powered Delivery Challan scanner for construction procurement. Photographs a challan, extracts all fields using Claude Vision, matches to Purchase Order, and creates GRN — in under 2 minutes.

## Quick Deploy to Vercel (5 minutes)

### Step 1: Push to GitHub

```bash
cd grn-scanner
git init
git add .
git commit -m "GRN Scanner PWA"
gh repo create grn-scanner --private --push
```

Or create repo manually on GitHub and push.

### Step 2: Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your `grn-scanner` repository
3. Add environment variable:
   - Key: `ANTHROPIC_API_KEY`
   - Value: your Claude API key from [console.anthropic.com](https://console.anthropic.com)
4. Click **Deploy**

Your app will be live at `https://grn-scanner-xxx.vercel.app` in ~60 seconds.

### Step 3: Test on Phone

Open the Vercel URL on your phone. Tap "Scan Delivery Challan", photograph any challan, and watch the AI extract every field.

## For the Demo

The app includes mock Purchase Order data from Nikhil Group (4 POs across Devgad, Jambhulwadi plants). In the demo:

1. Open the app on your phone
2. Photograph a challan (or upload a sample image)
3. Show the AI-extracted fields with confidence scores
4. Show the auto-matched PO with balance tracking
5. Show the weighbridge comparison (manual entry)
6. Tap "Create GRN in StrategicERP"
7. Show the confirmation with WhatsApp approval notification

Key talking points during demo:
- "Notice the confidence score on each field — the AI tells you what it's sure about and what needs human verification"
- "The PO match happened automatically — the system found the right PO from StrategicERP based on supplier and material"
- "The weighbridge comparison catches quantity discrepancies in real-time"
- "WhatsApp approval is sent instantly — no waiting for desktop ERP login"

## Local Development

```bash
npm install
cp .env.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — use Chrome DevTools mobile view for phone-like experience.

## Architecture

```
Phone Camera → Next.js API Route → Claude Vision (claude-sonnet-4-20250514) → Structured JSON → Editable Form → GRN
```

- Frontend: Next.js 14 + React (mobile-first PWA)
- AI: Claude Vision API (server-side, API key never exposed to client)
- Deployment: Vercel (serverless)
- No database needed for demo (mock PO data hardcoded)

## Production Roadmap

For actual deployment with Nikhil Group:
1. Replace mock PO data with StrategicERP API integration
2. Add WhatsApp Business API webhook for the trigger flow
3. Add weighbridge auto-feed integration
4. Add offline support (Service Worker + IndexedDB queue)
5. Add user authentication and site-level access control
