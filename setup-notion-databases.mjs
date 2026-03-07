/**
 * Setup Notion databases for Velo Saint-Malo
 * Creates: Clients, Bookings, Bikes, Locations
 * Run once: node setup-notion-databases.mjs
 */

import { pathToFileURL } from 'url';
const clientPath = 'C:/Users/josco/Documents/Projects/seller-services-jc/seller-services-jc/agents/notion-agent/src/notion-client.mjs';
const { notion, searchPages } = await import(pathToFileURL(clientPath).href);

// Find the existing Velo Saint-Malo project page
const results = await searchPages('Velo Saint-Malo');
const projectPage = results.find(p => p.title.includes('Velo Saint-Malo'));
if (!projectPage) {
  console.error('Could not find Velo Saint-Malo project page in Notion');
  process.exit(1);
}
const PARENT_ID = projectPage.id;
console.log(`Found project page: ${projectPage.title} (${PARENT_ID})\n`);

// --- 1. Clients Database ---
const clientsDb = await notion.databases.create({
  parent: { page_id: PARENT_ID },
  title: [{ text: { content: 'Clients' } }],
  icon: { emoji: '👤' },
  properties: {
    'Nom': { title: {} },
    'Email': { email: {} },
    'Telephone': { phone_number: {} },
    'Pays': {
      select: {
        options: [
          { name: 'France', color: 'blue' },
          { name: 'Royaume-Uni', color: 'red' },
          { name: 'Allemagne', color: 'yellow' },
          { name: 'Pays-Bas', color: 'orange' },
          { name: 'Belgique', color: 'green' },
          { name: 'Autre', color: 'gray' },
        ],
      },
    },
    'Langue': {
      select: {
        options: [
          { name: 'FR', color: 'blue' },
          { name: 'EN', color: 'red' },
          { name: 'DE', color: 'yellow' },
          { name: 'NL', color: 'orange' },
        ],
      },
    },
    'Statut': {
      select: {
        options: [
          { name: 'Nouveau', color: 'blue' },
          { name: 'Actif', color: 'green' },
          { name: 'Fidele', color: 'purple' },
        ],
      },
    },
    'Total reservations': { number: { format: 'number' } },
    'Notes': { rich_text: {} },
  },
});
console.log(`Clients DB: ${clientsDb.id}`);

// --- 2. Bookings Database ---
const bookingsDb = await notion.databases.create({
  parent: { page_id: PARENT_ID },
  title: [{ text: { content: 'Reservations' } }],
  icon: { emoji: '📋' },
  properties: {
    'Reference': { title: {} },
    'Client': { relation: { database_id: clientsDb.id, single_property: {} } },
    'Date demande': { date: {} },
    'Date debut': { date: {} },
    'Date fin': { date: {} },
    'Demi-journee': { checkbox: {} },
    'Heure recuperation': { rich_text: {} },
    'Heure retour': { rich_text: {} },
    'Articles': { rich_text: {} },
    'Nombre participants': { number: { format: 'number' } },
    'Sous-total': { number: { format: 'euro' } },
    'Remise': { rich_text: {} },
    'Total': { number: { format: 'euro' } },
    'Caution': { number: { format: 'euro' } },
    'Statut': {
      select: {
        options: [
          { name: 'Nouveau', color: 'blue' },
          { name: 'En traitement', color: 'yellow' },
          { name: 'Confirme', color: 'green' },
          { name: 'Termine', color: 'gray' },
          { name: 'Annule', color: 'red' },
        ],
      },
    },
    'Source': {
      select: {
        options: [
          { name: 'Site web', color: 'blue' },
          { name: 'Telephone', color: 'green' },
          { name: 'Sur place', color: 'orange' },
          { name: 'Email', color: 'purple' },
        ],
      },
    },
    'Notes': { rich_text: {} },
  },
});
console.log(`Reservations DB: ${bookingsDb.id}`);

// --- 3. Bikes Database ---
const bikesDb = await notion.databases.create({
  parent: { page_id: PARENT_ID },
  title: [{ text: { content: 'Velos & Equipement' } }],
  icon: { emoji: '🚲' },
  properties: {
    'Modele': { title: {} },
    'Categorie': {
      select: {
        options: [
          { name: 'Ville', color: 'blue' },
          { name: 'Electrique', color: 'green' },
          { name: 'VTT', color: 'brown' },
          { name: 'Enfant', color: 'pink' },
          { name: 'Tandem', color: 'purple' },
          { name: 'Cargo', color: 'orange' },
          { name: 'Accessoire', color: 'gray' },
        ],
      },
    },
    'Prix demi-journee': { number: { format: 'euro' } },
    'Prix jour': { number: { format: 'euro' } },
    'Prix week-end': { number: { format: 'euro' } },
    'Prix semaine': { number: { format: 'euro' } },
    'Caution': { number: { format: 'euro' } },
    'Stock total': { number: { format: 'number' } },
    'Statut': {
      select: {
        options: [
          { name: 'Disponible', color: 'green' },
          { name: 'Loue', color: 'blue' },
          { name: 'Maintenance', color: 'red' },
        ],
      },
    },
    'Description': { rich_text: {} },
  },
});
console.log(`Velos DB: ${bikesDb.id}`);

// --- 4. Locations Database ---
const locationsDb = await notion.databases.create({
  parent: { page_id: PARENT_ID },
  title: [{ text: { content: 'Localisations' } }],
  icon: { emoji: '📍' },
  properties: {
    'Nom': { title: {} },
    'Type': {
      select: {
        options: [
          { name: 'Boutique', color: 'blue' },
          { name: 'Point relais', color: 'green' },
          { name: 'Hotel partenaire', color: 'purple' },
          { name: 'Livraison', color: 'orange' },
        ],
      },
    },
    'Adresse': { rich_text: {} },
    'Actif': { checkbox: {} },
    'Notes': { rich_text: {} },
  },
});
console.log(`Localisations DB: ${locationsDb.id}`);

// --- Summary ---
console.log('\n--- Database IDs (save these) ---');
console.log(`VELO_DB_CLIENTS=${clientsDb.id}`);
console.log(`VELO_DB_BOOKINGS=${bookingsDb.id}`);
console.log(`VELO_DB_BIKES=${bikesDb.id}`);
console.log(`VELO_DB_LOCATIONS=${locationsDb.id}`);

// --- Seed bikes from the catalog ---
console.log('\nSeeding bike catalog...');

const catalog = [
  { name: 'Gazelle Paris C7', cat: 'Ville', hd: 10, day: 15, we: 26, week: 75, dep: 150, desc: 'Velo hollandais confort, Shimano Nexus 7v' },
  { name: 'Riverside 500', cat: 'Ville', hd: 8, day: 12, we: 20, week: 60, dep: 150, desc: 'Hybride polyvalent, Shimano Altus 9v' },
  { name: 'Trek FX 3 Disc', cat: 'Ville', hd: 12, day: 18, we: 32, week: 90, dep: 150, desc: 'Fitness sportif, disques hydrauliques' },
  { name: 'Tandem Peugeot T02', cat: 'Tandem', hd: 20, day: 30, we: 52, week: 155, dep: 150, desc: 'Tandem 2 places' },
  { name: 'Moustache Samedi 28.3', cat: 'Electrique', hd: 23, day: 35, we: 62, week: 180, dep: 300, desc: 'E-bike Bosch CX 625 Wh, 80-120 km autonomie' },
  { name: 'Trek Verve+ 3 Lowstep', cat: 'Electrique', hd: 20, day: 30, we: 52, week: 155, dep: 300, desc: 'E-bike confort Bosch 500 Wh, enjambement bas' },
  { name: 'Cube Touring Hybrid One 625', cat: 'Electrique', hd: 25, day: 38, we: 68, week: 200, dep: 300, desc: 'E-touring longue distance, Bosch CX 625 Wh' },
  { name: 'Giant Talon 2 29"', cat: 'VTT', hd: 15, day: 22, we: 38, week: 110, dep: 150, desc: 'VTT hardtail, Shimano Deore 20v' },
  { name: 'Cube Stereo Hybrid 140', cat: 'VTT', hd: 35, day: 55, we: 95, week: 280, dep: 300, desc: 'E-VTT full suspension, Bosch CX 750 Wh' },
  { name: 'Draisienne RunRide 500', cat: 'Enfant', hd: 3, day: 5, we: 8, week: 25, dep: 50, desc: '2-4 ans, sans pedales' },
  { name: 'Btwin 500 16"', cat: 'Enfant', hd: 5, day: 8, we: 14, week: 40, dep: 50, desc: '4-6 ans, stabilisateurs' },
  { name: 'Riverside 500 Junior 20"', cat: 'Enfant', hd: 7, day: 10, we: 17, week: 50, dep: 50, desc: '6-9 ans' },
  { name: 'Trek Precaliber 24"', cat: 'Enfant', hd: 9, day: 14, we: 24, week: 70, dep: 50, desc: '9-12 ans, VTT junior' },
  { name: 'Thule Yepp 2 Maxi', cat: 'Accessoire', hd: 3, day: 5, we: 8, week: 25, dep: 50, desc: 'Siege enfant, 9 mois-6 ans' },
  { name: 'Thule Chariot Cross 2', cat: 'Accessoire', hd: 8, day: 12, we: 20, week: 60, dep: 50, desc: 'Remorque enfant 2 places' },
  { name: 'FollowMe', cat: 'Accessoire', hd: 4, day: 6, we: 10, week: 30, dep: 50, desc: 'Barre de remorquage tandem parent-enfant' },
  { name: 'Babboe Curve-E', cat: 'Cargo', hd: 30, day: 45, we: 78, week: 230, dep: 300, desc: 'Biporteur electrique familial' },
  { name: 'Sacoches Ortlieb Back-Roller', cat: 'Accessoire', hd: 3, day: 4, we: 7, week: 20, dep: 0, desc: 'Paire etanche 2x20L' },
  { name: 'Casque adulte Giro Register MIPS', cat: 'Accessoire', hd: 2, day: 2, we: 3, week: 8, dep: 0, desc: 'Casque route/ville' },
  { name: 'GPS Garmin Edge Explore 2', cat: 'Accessoire', hd: 5, day: 7, we: 12, week: 35, dep: 100, desc: 'Itineraires pre-charges' },
];

for (const bike of catalog) {
  await notion.pages.create({
    parent: { database_id: bikesDb.id },
    properties: {
      'Modele': { title: [{ text: { content: bike.name } }] },
      'Categorie': { select: { name: bike.cat } },
      'Prix demi-journee': { number: bike.hd },
      'Prix jour': { number: bike.day },
      'Prix week-end': { number: bike.we },
      'Prix semaine': { number: bike.week },
      'Caution': { number: bike.dep },
      'Stock total': { number: 3 },
      'Statut': { select: { name: 'Disponible' } },
      'Description': { rich_text: [{ text: { content: bike.desc } }] },
    },
  });
  process.stdout.write('.');
}

// Seed default location
await notion.pages.create({
  parent: { database_id: locationsDb.id },
  properties: {
    'Nom': { title: [{ text: { content: 'Boutique Intra-Muros' } }] },
    'Type': { select: { name: 'Boutique' } },
    'Adresse': { rich_text: [{ text: { content: '12 Rue de Dinan, Intra-Muros, 35400 Saint-Malo' } }] },
    'Actif': { checkbox: true },
  },
});

console.log('\nDone! All databases created and seeded.');
