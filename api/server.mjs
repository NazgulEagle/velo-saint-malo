/**
 * Velo Saint-Malo — Booking & Payment API server
 * Receives bookings from the website, processes payments, writes to Notion.
 *
 * Payment model:
 *   - Online: 5% aanbetaling (acompte) to confirm reservation
 *   - On location: remaining amount + deposit (caution)
 *
 * Run: node api/server.mjs
 * Endpoints:
 *   POST /api/booking         — create a new booking + client
 *   POST /api/create-checkout  — create payment session (5% acompte), return checkout URL
 *   GET  /api/payment-success  — handle payment callback, update Notion
 *   GET  /api/payment-cancel   — handle cancelled payment
 *   POST /api/checkin          — mark booking as picked up (admin)
 *   POST /api/checkout         — mark booking as returned, release stock (admin)
 */

import http from 'http';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, '.env') });

import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_TOKEN });
const DB_CLIENTS = process.env.VELO_DB_CLIENTS;
const DB_BOOKINGS = process.env.VELO_DB_BOOKINGS;
const DB_BIKES = process.env.VELO_DB_BIKES;
const PORT = process.env.PORT || 3456;
const STRIPE_MODE = process.env.STRIPE_MODE || 'test';
const SITE_URL = process.env.SITE_URL || 'http://localhost:8080';

// In-memory payment sessions (in production, use Stripe sessions)
const paymentSessions = new Map();

// In-memory cache for bikes (refreshed every 60s)
let bikesCache = null;
let bikesCacheTime = 0;
const CACHE_TTL = 60_000;

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'http://localhost',
  'http://127.0.0.1',
  'https://velo-saint-malo.fr',
  'https://nazguleagle.github.io',
];

function cors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o));
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

// Find or create a client by email
async function findOrCreateClient(data) {
  // Search by email
  const existing = await notion.databases.query({
    database_id: DB_CLIENTS,
    filter: { property: 'Email', email: { equals: data.email } },
    page_size: 1,
  });

  if (existing.results.length > 0) {
    const client = existing.results[0];
    // Increment booking count
    const currentCount = client.properties['Total reservations']?.number || 0;
    await notion.pages.update({
      page_id: client.id,
      properties: {
        'Total reservations': { number: currentCount + 1 },
        'Statut': { select: { name: currentCount >= 1 ? 'Fidele' : 'Actif' } },
      },
    });
    return client.id;
  }

  // Create new client
  const newClient = await notion.pages.create({
    parent: { database_id: DB_CLIENTS },
    properties: {
      'Nom': { title: [{ text: { content: `${data.firstName} ${data.lastName}` } }] },
      'Email': { email: data.email },
      'Telephone': { phone_number: data.phone || null },
      'Statut': { select: { name: 'Nouveau' } },
      'Total reservations': { number: 1 },
    },
  });
  return newClient.id;
}

// Create booking linked to client
async function createBooking(data, clientId) {
  const props = {
    'Reference': { title: [{ text: { content: data.reference } }] },
    'Client': { relation: [{ id: clientId }] },
    'Date demande': { date: { start: new Date().toISOString().split('T')[0] } },
    'Date debut': { date: { start: data.dateStart } },
    'Demi-journee': { checkbox: !!data.halfDay },
    'Heure recuperation': { rich_text: [{ text: { content: data.pickupTime || '' } }] },
    'Heure retour': { rich_text: [{ text: { content: data.returnTime || '' } }] },
    'Articles': { rich_text: [{ text: { content: data.items || '' } }] },
    'Nombre participants': { number: data.participants || 1 },
    'Total': { number: data.total || 0 },
    'Caution': { number: data.deposit || 0 },
    'Acompte': { number: 0 },
    'Statut': { select: { name: 'Nouveau' } },
    'Source': { select: { name: 'Site web' } },
  };

  if (data.dateEnd && !data.halfDay) {
    props['Date fin'] = { date: { start: data.dateEnd } };
  }
  if (data.discount) {
    props['Remise'] = { rich_text: [{ text: { content: data.discount } }] };
  }
  if (data.subtotal) {
    props['Sous-total'] = { number: data.subtotal };
  }
  if (data.notes) {
    props['Notes'] = { rich_text: [{ text: { content: data.notes } }] };
  }

  const booking = await notion.pages.create({
    parent: { database_id: DB_BOOKINGS },
    properties: props,
  });
  return booking.id;
}

// Fetch all bikes from Notion (cached)
async function getBikes() {
  if (bikesCache && Date.now() - bikesCacheTime < CACHE_TTL) return bikesCache;

  const pages = [];
  let cursor = undefined;
  do {
    const res = await notion.databases.query({
      database_id: DB_BIKES,
      start_cursor: cursor,
      page_size: 100,
    });
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  bikesCache = pages.map(p => {
    const props = p.properties;
    return {
      id: p.id,
      name: props['Modele']?.title?.[0]?.plain_text || '',
      category: props['Categorie']?.select?.name || '',
      priceHalfDay: props['Prix demi-journee']?.number ?? 0,
      priceDay: props['Prix jour']?.number ?? 0,
      priceWeekend: props['Prix week-end']?.number ?? 0,
      priceWeek: props['Prix semaine']?.number ?? 0,
      deposit: props['Caution']?.number ?? 0,
      stock: props['Stock total']?.number ?? 0,
      stockRented: props['Stock loue']?.number ?? 0,
      stockAvailable: (props['Stock total']?.number ?? 0) - (props['Stock loue']?.number ?? 0),
      status: props['Statut']?.select?.name || '',
      description: props['Description']?.rich_text?.[0]?.plain_text || '',
    };
  });
  bikesCacheTime = Date.now();
  return bikesCache;
}

// Mapping: bike display names -> Notion model names (for stock tracking)
const BIKE_NAME_MAP = {
  'Gazelle Paris C7': 'Gazelle Paris C7',
  'Moustache Samedi 28.3': 'Moustache Samedi 28.3',
  'Trek Verve+ 3 Lowstep': 'Trek Verve+ 3 Lowstep',
  'Giant Talon 2 29"': 'Giant Talon 2 29"',
  'Tandem Peugeot T02': 'Tandem Peugeot T02',
  'Draisienne RunRide 500': 'Draisienne RunRide 500',
  'Velo Enfant 16"': 'Btwin 500 16"',
  'Velo Enfant 20"': 'Riverside 500 Junior 20"',
  'Trek Precaliber 24"': 'Trek Precaliber 24"',
  'Siege Thule Yepp 2 Maxi': 'Thule Yepp 2 Maxi',
  'Remorque Thule Chariot Cross 2': 'Thule Chariot Cross 2',
  'Babboe Curve-E Cargo': 'Babboe Curve-E',
  'Sacoches Ortlieb': 'Sacoches Ortlieb Back-Roller',
};

// Update stock in Notion (delta: +1 for rent, -1 for return)
async function updateStock(articlesText, delta) {
  if (!articlesText) return;

  // Parse "2x Gazelle Paris C7, 1x Moustache Samedi 28.3"
  const items = articlesText.split(',').map(s => s.trim());

  for (const item of items) {
    const match = item.match(/^(\d+)x\s+(.+)$/);
    if (!match) continue;

    const qty = parseInt(match[1]);
    const name = match[2].trim();

    // Find model name in Notion
    const notionName = BIKE_NAME_MAP[name] || name;

    try {
      const results = await notion.databases.query({
        database_id: DB_BIKES,
        filter: { property: 'Modele', title: { equals: notionName } },
        page_size: 1,
      });

      if (results.results.length > 0) {
        const bike = results.results[0];
        const currentLoue = bike.properties['Stock loue']?.number || 0;
        const newLoue = Math.max(0, currentLoue + (qty * delta));

        await notion.pages.update({
          page_id: bike.id,
          properties: {
            'Stock loue': { number: newLoue },
          },
        });
        console.log(`  Stock update: ${notionName} -> Stock loue: ${currentLoue} -> ${newLoue}`);
      }
    } catch (err) {
      console.error(`  Stock update failed for ${notionName}:`, err.message);
    }
  }
}

// HTTP server
const server = http.createServer(async (req, res) => {
  cors(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // GET /api/bikes — live prices from Notion
  if (req.method === 'GET' && req.url === '/api/bikes') {
    try {
      const bikes = await getBikes();
      res.setHeader('Cache-Control', 'public, max-age=60');
      return json(res, 200, bikes);
    } catch (err) {
      console.error('Bikes fetch error:', err.message);
      return json(res, 500, { error: 'Failed to fetch bikes' });
    }
  }

  if (req.method === 'POST' && req.url === '/api/booking') {
    try {
      const data = await parseBody(req);

      // Validate required fields
      if (!data.email || !data.firstName || !data.lastName || !data.dateStart || !data.reference) {
        return json(res, 400, { error: 'Missing required fields: email, firstName, lastName, dateStart, reference' });
      }

      const clientId = await findOrCreateClient(data);
      const bookingId = await createBooking(data, clientId);

      json(res, 201, { ok: true, bookingId, clientId, reference: data.reference });
    } catch (err) {
      console.error('Booking error:', err.message);
      json(res, 500, { error: 'Failed to create booking' });
    }
    return;
  }

  // GET /api/availability?date=2026-04-15 — check bookings on a date
  if (req.method === 'GET' && req.url?.startsWith('/api/availability')) {
    try {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      const date = url.searchParams.get('date');
      if (!date) return json(res, 400, { error: 'Missing ?date=YYYY-MM-DD' });

      const bookings = await notion.databases.query({
        database_id: DB_BOOKINGS,
        filter: {
          and: [
            { property: 'Date debut', date: { on_or_before: date } },
            { or: [
              { property: 'Date fin', date: { on_or_after: date } },
              { property: 'Demi-journee', checkbox: { equals: true } },
            ]},
            { property: 'Statut', select: { does_not_equal: 'Annule' } },
          ],
        },
      });

      const bookedItems = bookings.results.map(b => ({
        reference: b.properties['Reference']?.title?.[0]?.plain_text || '',
        items: b.properties['Articles']?.rich_text?.[0]?.plain_text || '',
        dateStart: b.properties['Date debut']?.date?.start || '',
        dateEnd: b.properties['Date fin']?.date?.start || '',
        status: b.properties['Statut']?.select?.name || '',
      }));

      return json(res, 200, { date, bookings: bookedItems });
    } catch (err) {
      console.error('Availability error:', err.message);
      return json(res, 500, { error: 'Failed to check availability' });
    }
  }

  // POST /api/create-checkout — create a payment session (5% acompte)
  if (req.method === 'POST' && req.url === '/api/create-checkout') {
    try {
      const data = await parseBody(req);

      if (!data.reference || !data.total) {
        return json(res, 400, { error: 'Missing: reference, total' });
      }

      // 5% acompte (minimum EUR1)
      const acompte = Math.max(1, Math.round(data.total * 0.05 * 100) / 100);
      const remaining = Math.round((data.total - acompte) * 100) / 100;

      // Create payment session
      const sessionId = 'ps_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      paymentSessions.set(sessionId, {
        reference: data.reference,
        total: data.total,
        acompte,
        remaining,
        deposit: data.deposit || 0,
        email: data.email,
        bookingId: data.bookingId,
        clientId: data.clientId,
        status: 'pending',
        created: Date.now(),
      });

      // In test mode, redirect to local mock payment page
      const checkoutUrl = `${SITE_URL}/paiement.html?session=${sessionId}&acompte=${acompte}&total=${data.total}&deposit=${data.deposit || 0}&ref=${data.reference}`;

      return json(res, 200, { sessionId, checkoutUrl, acompte, remaining, mode: STRIPE_MODE });
    } catch (err) {
      console.error('Checkout error:', err.message);
      return json(res, 500, { error: 'Failed to create checkout session' });
    }
  }

  // GET /api/payment-success?session=xxx — handle successful acompte payment
  if (req.method === 'GET' && req.url?.startsWith('/api/payment-success')) {
    try {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      const sessionId = url.searchParams.get('session');

      if (!sessionId || !paymentSessions.has(sessionId)) {
        return json(res, 400, { error: 'Invalid session' });
      }

      const session = paymentSessions.get(sessionId);

      if (session.status === 'paid') {
        return json(res, 200, { ok: true, already: true, reference: session.reference });
      }

      // Mark acompte as paid
      session.status = 'paid';
      session.paidAt = new Date().toISOString();

      // Update Notion booking status to "Confirme" (acompte paid, awaiting pickup)
      try {
        const bookings = await notion.databases.query({
          database_id: DB_BOOKINGS,
          filter: { property: 'Reference', title: { equals: session.reference } },
          page_size: 1,
        });

        if (bookings.results.length > 0) {
          const booking = bookings.results[0];
          await notion.pages.update({
            page_id: booking.id,
            properties: {
              'Statut': { select: { name: 'Confirme' } },
              'Acompte': { number: session.acompte },
            },
          });
          console.log(`Booking ${session.reference} confirmed (acompte EUR${session.acompte})`);

          // Update stock: reserve bikes
          const articlesText = booking.properties['Articles']?.rich_text?.[0]?.plain_text || '';
          await updateStock(articlesText, 1);
        }
      } catch (notionErr) {
        console.error('Notion update error:', notionErr.message);
      }

      return json(res, 200, {
        ok: true,
        reference: session.reference,
        acompte: session.acompte,
        remaining: session.remaining,
        deposit: session.deposit,
        total: session.total,
      });
    } catch (err) {
      console.error('Payment success error:', err.message);
      return json(res, 500, { error: 'Failed to process payment' });
    }
  }

  // GET /api/payment-cancel?session=xxx — handle cancelled payment
  if (req.method === 'GET' && req.url?.startsWith('/api/payment-cancel')) {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const sessionId = url.searchParams.get('session');
    if (sessionId && paymentSessions.has(sessionId)) {
      paymentSessions.get(sessionId).status = 'cancelled';
    }
    return json(res, 200, { ok: true, cancelled: true });
  }

  // POST /api/checkin — client picks up bikes, pays remaining + deposit on location (admin)
  if (req.method === 'POST' && req.url === '/api/checkin') {
    try {
      const data = await parseBody(req);
      if (!data.reference) return json(res, 400, { error: 'Missing reference' });

      const bookings = await notion.databases.query({
        database_id: DB_BOOKINGS,
        filter: { property: 'Reference', title: { equals: data.reference } },
        page_size: 1,
      });

      if (bookings.results.length === 0) return json(res, 404, { error: 'Booking not found' });

      await notion.pages.update({
        page_id: bookings.results[0].id,
        properties: {
          'Statut': { select: { name: 'En cours' } },
        },
      });

      console.log(`Checkin: ${data.reference} -> En cours`);
      return json(res, 200, { ok: true, reference: data.reference, status: 'En cours' });
    } catch (err) {
      console.error('Checkin error:', err.message);
      return json(res, 500, { error: 'Failed to check in' });
    }
  }

  // POST /api/checkout — client returns bikes, deposit released (admin)
  if (req.method === 'POST' && req.url === '/api/checkout') {
    try {
      const data = await parseBody(req);
      if (!data.reference) return json(res, 400, { error: 'Missing reference' });

      const bookings = await notion.databases.query({
        database_id: DB_BOOKINGS,
        filter: { property: 'Reference', title: { equals: data.reference } },
        page_size: 1,
      });

      if (bookings.results.length === 0) return json(res, 404, { error: 'Booking not found' });

      const booking = bookings.results[0];

      await notion.pages.update({
        page_id: booking.id,
        properties: {
          'Statut': { select: { name: 'Termine' } },
        },
      });

      // Free up stock
      const articlesText = booking.properties['Articles']?.rich_text?.[0]?.plain_text || '';
      await updateStock(articlesText, -1);

      console.log(`Checkout: ${data.reference} -> Termine, stock freed`);
      return json(res, 200, { ok: true, reference: data.reference, status: 'Termine' });
    } catch (err) {
      console.error('Checkout error:', err.message);
      return json(res, 500, { error: 'Failed to check out' });
    }
  }

  // Health check
  if (req.method === 'GET' && req.url === '/api/health') {
    return json(res, 200, { status: 'ok', stripeMode: STRIPE_MODE });
  }

  json(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Velo Saint-Malo API running on http://localhost:${PORT}`);
  console.log(`Mode: ${STRIPE_MODE} | Site: ${SITE_URL}`);
  console.log('Endpoints: /api/bikes, /api/booking, /api/create-checkout, /api/payment-success, /api/payment-cancel, /api/checkin, /api/checkout, /api/health');
});
