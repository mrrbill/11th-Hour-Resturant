# 11th Hour Restaurant

Menu and ordering app for **11th Hour Restaurant**, the restaurant of Love Country Church (Ghana). It is built for phones first.

- **Customers** (no login): view the menu → choose food → place an order → get an order number with a live status and a QR code. They pay cash or MoMo at the counter when they collect. There is no online payment.
- **Staff** (`/staff`, email and password): live order board, scan a customer's QR code, menu, prices and opening hours, daily totals, and a printable menu QR poster.

Stack: React + TypeScript + Tailwind (Vite), Supabase (Postgres, Realtime, Auth, Storage), deployed on Vercel.

---

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com). Pick the **West EU (London)** region or the nearest one to Ghana.
2. Open **SQL Editor** and run these two files in order:
   1. [supabase/migrations/20261125000000_init.sql](supabase/migrations/20261125000000_init.sql) creates the tables, security rules, order functions, realtime, the photo bucket and the default settings.
   2. [supabase/seed.sql](supabase/seed.sql) adds the four starting dishes.

   If you use the Supabase CLI instead, run `supabase link`, then `supabase db push`, then run `seed.sql` in the SQL editor.
3. **Turn off public sign-ups.** Go to Authentication → Sign In / Providers → Email and switch off "Allow new users to sign up". Only the staff account(s) you create below can log in. Even if sign-ups stay on, a new account gets no staff access unless it is in the `staff` table.
4. Copy your keys from **Project Settings → API**:
   - Project URL
   - `anon` / publishable key (safe to use in the browser)
   - `service_role` / secret key (**secret**: use it only on your own computer)

### Create the staff login

```bash
cp .env.example .env        # then fill in the values
npm install
npm run create-staff
```

This creates (or resets the password of) the user `STAFF_EMAIL` / `STAFF_PASSWORD` and gives it staff access. Run it again with a different email to add more staff.

## 2. Dish photos

Put the original photos in `photos-original/` with these names (any of jpg, png, webp or heic):

| File name         | Dish                |
| ----------------- | ------------------- |
| `jollof-rice.*`   | Jollof Rice (hero)  |
| `gari-beans.*`    | Gari & Beans        |
| `ampesi.*`        | Ampesi              |
| `fried-rice.*`    | Fried Rice          |

Then run:

```bash
npm run optimize-images
```

The script crops each photo to a square 640 px JPEG of about 40–70 KB and saves it in `public/images/`. Until then, a plain plate icon shows instead of the photo.

New dish photos uploaded in **Staff → Menu & prices** are cropped and compressed in the browser before upload.

## 3. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173 for the menu and http://localhost:5173/staff for the dashboard.

Other commands:

- `npm run build` does a type check and a production build into `dist/`.
- `npm run preview` serves the production build.

**Testing on a phone on the same Wi-Fi:** run `npm run dev -- --host` and open the network URL it prints. The camera scanner only works on `https` or `localhost`, so test scanning on the deployed site.

## 4. Deploy to Vercel

1. Push this repo to GitHub and import it at [vercel.com/new](https://vercel.com/new). Vercel detects Vite automatically.
2. Add these **Environment Variables** (Production and Preview):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_PUBLIC_SITE_URL`: your final address, e.g. `https://11thhour.vercel.app` (or your own domain). Every QR code uses this address. If you leave it out, the QR codes use whatever address the dashboard was opened on.
   - **Do not** add the service-role key to Vercel.
3. Deploy. [vercel.json](vercel.json) sends every page to the app and sets cache headers.

## 5. QR codes

### Menu QR (posters and table cards)

Go to **Staff → QR code & poster**. The page shows:

- an **A4 poster** and an **A6 table card** in the brand style, with the opening hours from settings
- **Download PNG**, **Download PDF** and **Print** buttons for each

The QR code encodes `VITE_PUBLIC_SITE_URL/?src=qr`, so printed posters keep working as long as the address stays the same. Scans are counted per day on **Daily totals** ("Menu QR scans").

The code is dark navy on white with error correction level Q. It prints 10.4 cm wide on A4 and 5.2 cm on A6. When printing, choose **"Actual size / 100%"**, not "Fit to page".

To make a plain QR image from the command line:

```bash
npm run qr -- https://11thhour.vercel.app     # → menu-qr.png
```

### Order QR (collecting food)

After ordering, the customer's screen shows a QR code under the order number with the label "Show this at the counter". It links to `/staff/scan/<order id>`.

- Staff tap **Scan** on the Orders page, or use the phone camera, to open that order in a large panel with **Paid & collected** / **Not collected**.
- If the order is not ready yet, the panel says so instead of showing the buttons. If it was already collected, it shows a red warning with the time, so food is never given out twice.
- If a customer opens the link, they just see their own order screen.
- No phone? Type the order number into the search box on the Orders page.

---

## How it works

### Orders are checked on the server

Customers place orders through one Postgres function, `place_order(items, first_name, client_ref)`. The function:

- rejects orders when orders are paused or the restaurant is outside opening hours (Africa/Accra time)
- checks each plate: `min_price ≤ amount ≤ max_price` and `(amount − min_price) % step = 0`
- rejects unavailable dishes, and copies each dish name onto the order line
- works out the total itself and ignores any total sent by the browser
- assigns the order number from `daily_counters` with `INSERT … ON CONFLICT DO UPDATE … RETURNING`. That row lock means two orders at the same moment can never get the same number. Numbers start at **101** each day.
- treats `client_ref` as an idempotency key, so a retry on a bad connection can't create a second order

Only staff can change an order's status, through `set_order_status`. It allows only these steps: `new → preparing → ready → collected | not_collected`. A not-collected order can still be marked collected if the customer comes late. Each step records its time (`preparing_at`, `ready_at`, `closed_at`).

### Row-level security

| Table            | Public (anon)                                | Staff                |
| ---------------- | -------------------------------------------- | -------------------- |
| `dishes`         | read available dishes                        | read and write all   |
| `settings`       | read                                         | update               |
| `orders` / items | only one order, by its id, via `get_order()` | read; status via RPC |
| `daily_counters` | none                                         | none (RPC only)      |
| `visits`         | insert via `log_visit()`                     | read                 |

### Live updates

- **Staff board:** Supabase Realtime `postgres_changes` on `orders`. RLS applies, so only staff receive rows. A new order plays a chime and is highlighted. The board reloads when the connection comes back or the tab becomes visible again.
- **Customer screen:** a database trigger broadcasts each status change on the channel `order:<uuid>`. The page also checks every 20 seconds in case realtime is blocked. When the order is ready, the card turns orange, a chime plays and the phone vibrates.

### Built for cheap phones and slow data

- The menu loads with plain `fetch` calls, about 90 KB gzipped of JS. The Supabase client, QR, scanner and PDF libraries download only on the pages that use them.
- The menu and settings are saved on the phone, so a repeat visit shows the menu immediately and then refreshes it.
- Images load lazily and are compressed. The cart and the active order are saved in `localStorage`.

### Notes

- Ghana uses UTC+0 all year, so "today" and opening hours use Africa/Accra time on both the server and the browser.
- Opening hours that cross midnight are not supported. The closing time must be after the opening time.
- The "Menu text instead of times" field (e.g. "after service") only changes what the menu shows. Orders are still accepted only between the opening and closing times.
