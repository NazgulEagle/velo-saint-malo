/**
 * Publish competitor analysis report to Notion
 * Under the Velo Saint-Malo project page
 */

import { pathToFileURL } from 'url';
const clientPath = 'C:/Users/josco/Documents/Projects/seller-services-jc/seller-services-jc/agents/notion-agent/src/notion-client.mjs';
const { createPage, appendBlocks, blocks } = await import(pathToFileURL(clientPath).href);

const PARENT_ID = '31a0a8bc-a7ba-81f0-9bc5-d91d9f4637a9'; // Velo Saint-Malo project page

const page = await createPage('Concurrentieanalyse - Location de Velos Saint-Malo', [], {
  parentId: PARENT_ID,
  icon: '🔍',
});

console.log('Page created:', page.url);

await appendBlocks(page.id, [
  blocks.callout('Concurrentie-onderzoek via Google Search + Google Maps. Data verzameld op 7 maart 2026.', '📊'),
  blocks.divider(),

  // --- SAMENVATTING ---
  blocks.heading1('Samenvatting'),
  blocks.paragraph('Er zijn 5-6 directe concurrenten in Saint-Malo zelf, en nog eens 6+ in de regio (Cancale, Dinan, Mont Saint-Michel). De markt is relatief klein en lokaal. Belangrijkste kansen: geen enkele concurrent draait Google Ads, en er is sterke zoekintentie op "location velo saint malo intra muros" en "location velo electrique saint malo".'),
  blocks.divider(),

  // --- KANSEN ---
  blocks.heading1('Kansen & Strategische Inzichten'),

  blocks.heading2('1. Geen Google Ads concurrentie'),
  blocks.paragraph('Geen enkele concurrent adverteert op Google Ads voor de zoektermen "location velo Saint-Malo", "location velo electrique Saint-Malo" of "bike rental Saint-Malo". Dit is een open markt voor betaalde zoekresultaten.'),

  blocks.heading2('2. Zoekintentie bevestigt positionering'),
  blocks.paragraph('Google Autocomplete toont sterke vraag naar:'),
  blocks.bulletedList('location velo saint malo intra muros - exact onze locatie'),
  blocks.bulletedList('location velo saint malo prix - prijsvergelijking'),
  blocks.bulletedList('location velo saint malo gare - bij het station'),
  blocks.bulletedList('location velo electrique saint malo - e-bikes'),
  blocks.bulletedList('location vtt saint malo - mountainbikes'),

  blocks.heading2('3. Organisch zoeken gedomineerd door Velo Emeraude'),
  blocks.paragraph('velo-corsaire.fr (Velo Emeraude) staat #1 voor alle 3 de zoekopdrachten. Ze zijn gevestigd in La Gouesniere (10 min buiten Saint-Malo) en bezorgen in de regio. SEO-strategie nodig om hen te concurreren.'),

  blocks.heading2('4. Toeristenkantoor als kanaal'),
  blocks.paragraph('saint-malo-tourisme.com staat #3 in de organische resultaten. Vermelding op de website van het toeristenkantoor is essentieel voor zichtbaarheid.'),

  blocks.heading2('5. Hoge gemiddelde ratings'),
  blocks.paragraph('Alle concurrenten scoren 4.2+ op Google. Kwaliteit en reviews zijn kritisch. Streefdoel: 4.8+ met minimaal 50 reviews in het eerste seizoen.'),

  blocks.divider(),

  // --- DIRECTE CONCURRENTEN ---
  blocks.heading1('Directe Concurrenten in Saint-Malo'),

  blocks.table([
    ['Bedrijf', 'Locatie', 'Rating', 'Reviews', 'Type'],
    ['Gyro Malo Sasu', 'Esplanade Saint-Vincent', '4.9', '145', 'Verhuur (fietsen + steps)'],
    ['Alex Hinault Cycles', 'Av. de Launay Breton', '4.7', '116', 'Fietsenwinkel + verhuur'],
    ['Giant Saint Malo', 'Rue du General Patton', '4.6', '82', 'Fietsenwinkel + verhuur'],
    ['Cycles Nicole', 'Rue du President R. Schuman', '4.3', '55', 'Fietsenwinkel + verhuur'],
    ['Mobilici', 'Esplanade Saint-Vincent', '4.2', '5', 'Verhuur (Lokki platform)'],
  ]),

  blocks.heading3('Gyro Malo Sasu - Sterkste concurrent'),
  blocks.bulletedList('Locatie: Esplanade Saint-Vincent (toeristengebied, bij de muren)'),
  blocks.bulletedList('4.9 rating met 145 reviews - uitstekende reputatie'),
  blocks.bulletedList('Website: gyromalo.fr'),
  blocks.bulletedList('Tel: 07 71 12 09 00'),
  blocks.bulletedList('Biedt fietsen + steps aan'),

  blocks.heading3('Alex Hinault Cycles'),
  blocks.bulletedList('Fietsenwinkel met verhuurservice'),
  blocks.bulletedList('Website: alexhinaultsaintmalocycles.fr'),
  blocks.bulletedList('4.7 rating, 116 reviews'),

  blocks.heading3('Mobilici'),
  blocks.bulletedList('Nieuw op de markt (slechts 5 reviews)'),
  blocks.bulletedList('Gebruikt Lokki verhuurplatform'),
  blocks.bulletedList('Zelfde locatie als Gyro Malo (Esplanade Saint-Vincent)'),

  blocks.divider(),

  // --- ONLINE CONCURRENTEN ---
  blocks.heading1('Online / Bezorgingsgerichte Concurrenten'),

  blocks.table([
    ['Bedrijf', 'Website', 'Bijzonderheden'],
    ['Velo Emeraude', 'velo-corsaire.fr', '#1 in Google organisch, La Gouesniere (10 min)'],
    ['Les Velos Bleus / VeloCouest', 'velos-bleus.fr', '#2 in Google organisch'],
    ['Loc\'Malouine', 'loc-malouine.com', 'Organische zoekresultaten'],
    ['Velo MAT', 'velomat.stmalo-agglomeration.fr', 'Openbaar deelfietsensysteem'],
    ['Gerald Services', 'gerald-services.fr', 'Combourg, ook in Maps'],
  ]),

  blocks.divider(),

  // --- REGIONALE CONCURRENTEN ---
  blocks.heading1('Regionale Concurrenten (Cancale, Dinan, Mont Saint-Michel)'),

  blocks.table([
    ['Bedrijf', 'Locatie', 'Rating', 'Reviews', 'Website'],
    ['CANCAVELO', 'Cancale', '4.9', '80', 'cancavelo.fr'],
    ['Scoot Escape', 'Cancale', '4.8', '63', 'scootescape.bzh'],
    ['KAOUANN', 'Dinan', '4.8', '125', 'kaouann.fr'],
    ['Velos Aventure', 'Saint-Cast-le-Guildo', '4.8', '38', 'velosaventure.fr'],
    ['BIK\'INBAIE', 'Beauvoir (Mont SM)', '5.0', '381', 'bikinbaie.com'],
    ['BICLOUZH', 'Regio Bretagne', '5.0', '209', 'biclouzh.fr'],
  ]),

  blocks.callout('BIK\'INBAIE bij Mont Saint-Michel heeft 381 reviews en een 5.0 rating - duidelijk de referentie in de regio. Ze bedienen het Mont Saint-Michel toerisme.', '⭐'),

  blocks.divider(),

  // --- POSITIONERING ---
  blocks.heading1('Aanbevolen Positionering'),

  blocks.heading2('Onze sterke punten vs. concurrentie'),
  blocks.bulletedList('Locatie Intra-Muros (binnen de muren) - uniek, de meeste concurrenten zitten erbuiten'),
  blocks.bulletedList('Breed aanbod: stad, electrisch, VTT, kinderen, cargo, tandems'),
  blocks.bulletedList('Laagste caution in de regio (150 EUR / 300 EUR e-bikes)'),
  blocks.bulletedList('Demi-journee beschikbaar (4 uur) - niet alle concurrenten bieden dit'),
  blocks.bulletedList('Online reserveringssysteem met directe bevestiging'),
  blocks.bulletedList('Tweetalige website (FR/EN) voor internationale toeristen'),
  blocks.bulletedList('Gratis bezorging Intra-Muros & Saint-Servan bij 3+ dagen'),

  blocks.heading2('Actiepunten'),
  blocks.todo('Google Business Profile aanmaken en optimaliseren'),
  blocks.todo('Vermelding aanvragen bij saint-malo-tourisme.com'),
  blocks.todo('Google Ads campagne starten (geen concurrentie!)'),
  blocks.todo('Reviews actief verzamelen vanaf dag 1 (streefdoel: 50+ eerste seizoen)'),
  blocks.todo('SEO optimalisatie voor "location velo saint malo intra muros"'),
  blocks.todo('Partnerships met hotels Intra-Muros voor doorverwijzingen'),
  blocks.todo('Aanwezigheid op Lokki of vergelijkbare verhuurplatforms overwegen'),
]);

console.log('\nReport published!');
console.log('URL:', page.url);
