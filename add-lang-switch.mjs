/**
 * Add language switch to all HTML pages
 * Run once: node add-lang-switch.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, basename } from 'path';

const ROOT = 'c:/Users/josco/Documents/Projects/velo-saint-malo';

// Page mapping: FR filename -> EN filename
const PAGE_MAP = {
  'index.html': 'index.html',
  'velos.html': 'velos.html',
  'tarifs.html': 'tarifs.html',
  'itineraires.html': 'itineraires.html',
  'reservation.html': 'reservation.html',
  'conditions-generales.html': 'terms-and-conditions.html',
  'politique-confidentialite.html': 'privacy-policy.html',
};

// Reverse mapping: EN -> FR
const EN_TO_FR = {};
for (const [fr, en] of Object.entries(PAGE_MAP)) {
  EN_TO_FR[en] = fr;
}

// FR pages
for (const frFile of Object.keys(PAGE_MAP)) {
  const filePath = resolve(ROOT, frFile);
  try {
    let html = readFileSync(filePath, 'utf-8');
    const enFile = PAGE_MAP[frFile];

    // Build the language switch HTML
    const langSwitch = `<li class="nav__lang"><a href="${frFile}" class="active">FR</a><span class="nav__lang-sep">|</span><a href="en/${enFile}">EN</a></li>`;

    // Insert after the CTA link (last li in nav__menu)
    if (html.includes('nav__lang')) {
      console.log(`SKIP (already has switch): ${frFile}`);
      continue;
    }

    // Find the closing </ul> of nav__menu and insert before it
    html = html.replace(
      /(<li><a href="[^"]*" class="nav__link nav__link--cta">(?:Reserver|Book(?:\s+Now)?)<\/a><\/li>)\s*(<\/ul>)/,
      `$1\n        ${langSwitch}\n      $2`
    );

    // Add hreflang tags if not present
    if (!html.includes('hreflang="en"')) {
      const enUrl = `https://velo-saint-malo.fr/en/${enFile}`;
      const frUrl = `https://velo-saint-malo.fr/${frFile === 'index.html' ? '' : frFile}`;
      const hreflangTags = `\n  <link rel="alternate" hreflang="fr" href="${frUrl}">\n  <link rel="alternate" hreflang="en" href="${enUrl}">`;
      html = html.replace('</head>', `${hreflangTags}\n</head>`);
    }

    writeFileSync(filePath, html);
    console.log(`Updated: ${frFile}`);
  } catch (e) {
    console.error(`Error with ${frFile}:`, e.message);
  }
}

// EN pages
for (const enFile of Object.values(PAGE_MAP)) {
  const filePath = resolve(ROOT, 'en', enFile);
  try {
    let html = readFileSync(filePath, 'utf-8');
    const frFile = EN_TO_FR[enFile];

    const langSwitch = `<li class="nav__lang"><a href="../${frFile}">FR</a><span class="nav__lang-sep">|</span><a href="${enFile}" class="active">EN</a></li>`;

    if (html.includes('nav__lang')) {
      console.log(`SKIP (already has switch): en/${enFile}`);
      continue;
    }

    html = html.replace(
      /(<li><a href="[^"]*" class="nav__link nav__link--cta">(?:Reserver|Book(?:\s+Now)?)<\/a><\/li>)\s*(<\/ul>)/,
      `$1\n        ${langSwitch}\n      $2`
    );

    writeFileSync(filePath, html);
    console.log(`Updated: en/${enFile}`);
  } catch (e) {
    console.error(`Error with en/${enFile}:`, e.message);
  }
}

console.log('\nDone!');
