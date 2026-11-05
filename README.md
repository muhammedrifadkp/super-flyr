# Super Flyr – Supermarket Offer Poster Maker

A web app (and installable PWA) for supermarkets and grocery stores. Staff add products once, pick a template and get a professional offer poster in about a minute. They can download it as PNG, JPG or PDF, print it, share it to WhatsApp, or publish it as a public offer page.

Each client gets **their own deployment** (own Vercel project, URL, MongoDB database and Cloudinary folder) from this one codebase.

## Features

| Area | What it does |
| --- | --- |
| Store branding | Name, tagline, logo, 3 brand colours, phone, WhatsApp, address, Maps link (`/dashboard/settings`) |
| Products | Name, Malayalam name, category, unit, MRP, offer price, photo. Quick inline price edits. One-click demo catalogue |
| Free background removal | In-browser flood-fill removal for white/plain backgrounds, strength slider, auto-crop. No paid API |
| Templates | 13 designs in 7 groups: Weekend Big Deals, Fresh Deals Grid, Fresh Market (Wood), Green Fresh Deals, Leafy Fresh Deal, Fresh Deals (Paper), Fresh Market Days, Weekend Fresh Sale (Malayalam), Onam Chantha, Special Offers, Daily Deals, Kasavu Festival, Brand Classic. Category templates auto-add products |
| Design system | Every part is editable: 9 header layouts, 4 card styles, 7 price styles, 5 discount badges, 4 footers, textures (wood, paper, soft light, lines), decorations (Onam flowers, leaves, sparkles, swoosh, rays, kasavu), 3D or slanted headlines, header picture (upload or emoji), offer box, English / Malayalam / both product names, every colour and font |
| Poster editor | React Konva canvas. Sizes: portrait, square, story, A4 print, TV screen. Rows/columns (or auto), spacing, image size, colours, header/badge styles, decorations, fonts (Latin and Malayalam), texts, dates, per-poster price overrides, undo/redo, autosave, multi-page |
| Export | PNG / JPG (1×, 2×, print quality), multi-page PDF, direct print, native share sheet (WhatsApp, Instagram) |
| Public offer link | `/o/<slug>` page with Call / WhatsApp / Directions buttons and a WhatsApp link preview image. `/` lists every live offer |
| PWA | Manifest with store name and brand colours, generated icons, offline fallback, cached images |
| Staff login | One shared `ADMIN_PASSWORD` per deployment (HMAC-signed cookie) |

## Tech stack

Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 · React Konva · MongoDB Atlas · Cloudinary · Next.js Route Handlers · Vercel

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000/dashboard. With no environment variables set, the app runs in **demo mode**:

- Data is saved to `.data/db.json` and images to `.data/uploads/` (git-ignored).
- Login is off.

Go to **Products → Load 20 demo products**, then **Posters → New poster**.

## Environment variables

Copy `.env.example` to `.env.local` (local) or add the values in Vercel → Settings → Environment Variables.

| Variable | Required on Vercel | Purpose |
| --- | --- | --- |
| `ADMIN_PASSWORD` | yes | Staff password for `/dashboard` |
| `AUTH_SECRET` | recommended | Random string that signs login cookies |
| `MONGODB_URI` | yes | MongoDB Atlas connection string |
| `MONGODB_DB` | no | Database name (default `superflyr`) |
| `CLOUDINARY_URL` | yes | `cloudinary://<key>:<secret>@<cloud>` |
| `STORE_ID` | no | Tags every record with a store id (default `default`), so stores can share a database later |

Vercel has no writable disk, so the app refuses to start writes there without `MONGODB_URI` and `CLOUDINARY_URL`.

## New client setup (about 15 minutes)

1. **MongoDB Atlas:** reuse the `superflyr-cluster` and the same `MONGODB_URI`. Give each client its own database name: `MONGODB_DB=freshmart-superflyr`. The database is created on first write. Network Access must allow `0.0.0.0/0`, because Vercel IPs change.
2. **Cloudinary:** reuse the same `CLOUDINARY_URL`. Images go to `super-flyr/<MONGODB_DB>/<STORE_ID>`, so each client gets a separate folder.
3. **Check:** put the client's values in `.env.local`, then run `npm run check:env`. To move products you prepared locally in demo mode into the client's database, run `npm run import:local`. It refuses to run if the database already has data.
4. **Vercel:** import this repository as a new project, for example `freshmart-offers`. Add the environment variables, then deploy.
5. Optional: add the client's domain, for example `offers.freshmart.in`.
6. Open `/dashboard/settings` and add the logo, colours and contact details. Load or add products. Create the first poster with the client.
7. Install the app on the staff phone: Chrome → **Install app** / Safari → **Share → Add to Home Screen**.

Keep one codebase. Put client differences in environment variables and in-app branding, not in code forks. A bug fix then reaches every client with a redeploy.

## Project structure

```
src/
  app/
    page.tsx                     Public store page (all live offers)
    o/[slug]/                    Public offer page + WhatsApp preview image
    login/                       Staff login
    dashboard/(main)/            Home, posters list, template picker, products, branding
    dashboard/posters/[id]/      Full-screen poster editor
    api/                         Route handlers (store, products, posters, upload, files, auth, status)
    manifest.ts, pwa-icon/       PWA manifest and generated icons
  components/
    poster/PosterCanvas.tsx      Konva renderer (shared by editor, previews and export)
    poster/EditorPanels.tsx      Products / Layout / Style / Text panels
    poster/ExportHost.tsx        Off-screen full-size render for downloads
    screens/                     Dashboard screens
  lib/
    poster/templates.ts          Templates, formats, brand-colour mapping
    poster/layout.ts             Grid and pagination maths
    poster/fonts.ts              Poster fonts incl. Malayalam (Baloo Chettan 2, Anek, Noto Sans, Manjari)
    client/image.ts              Free background removal, trim, encoding
    db/                          MongoDB + local JSON storage behind one interface
public/sw.js                     Service worker
```

## Notes

- Prices on posters come from the product library, so a price change updates every poster that uses the product. Use **Edit on this poster** to override a price for one poster only.
- Background removal works best on plain white or single-colour backgrounds. For complex photos, use a photo with a clean background, or add a paid API later.
- The WhatsApp preview image uses Latin text only. The image renderer has no Malayalam font yet.
