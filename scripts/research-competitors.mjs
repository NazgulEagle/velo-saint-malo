/**
 * Competitor Research: Bike Rental in Saint-Malo, France
 * Runs multiple SerpAPI queries and collects all competitor data.
 */

import { google, googleMaps, googleAutocomplete } from 'file:///C:/Users/josco/Documents/Projects/seller-services-jc/seller-services-jc/shared/tools/serpapi/serpapi-client.mjs';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const results = {
    timestamp: new Date().toISOString(),
    queries: {},
    competitors: {},
  };

  const frOpts = { gl: 'fr', hl: 'fr', google_domain: 'google.fr' };

  // ── 1. Google Search queries ──────────────────────────────────────────
  const searchQueries = [
    'location velo Saint-Malo',
    'location velo electrique Saint-Malo',
    'bike rental Saint-Malo',
  ];

  for (const q of searchQueries) {
    console.log(`\n=== Google Search: "${q}" ===`);
    try {
      const data = await google(q, frOpts);
      const entry = {
        organic_results: (data.organic_results || []).map(r => ({
          position: r.position,
          title: r.title,
          link: r.link,
          snippet: r.snippet,
          displayed_link: r.displayed_link,
        })),
        local_results: (data.local_results?.places || data.local_results || []).map(r => ({
          title: r.title,
          address: r.address,
          phone: r.phone,
          rating: r.rating,
          reviews: r.reviews,
          type: r.type,
          place_id: r.place_id,
          data_id: r.data_id,
          links: r.links,
          website: r.website || r.links?.website,
        })),
        ads: (data.ads || []).map(a => ({
          title: a.title,
          link: a.link,
          displayed_link: a.displayed_link,
          description: a.description,
          tracking_link: a.tracking_link,
        })),
        related_questions: (data.related_questions || []).map(rq => ({
          question: rq.question,
          snippet: rq.snippet,
        })),
        knowledge_graph: data.knowledge_graph || null,
      };
      results.queries[q] = entry;

      console.log(`  Organic results: ${entry.organic_results.length}`);
      console.log(`  Local results: ${entry.local_results.length}`);
      console.log(`  Ads: ${entry.ads.length}`);
      console.log(`  Related questions: ${entry.related_questions.length}`);
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
      results.queries[q] = { error: err.message };
    }
  }

  // ── 2. Google Maps ────────────────────────────────────────────────────
  console.log('\n=== Google Maps: "location velo Saint-Malo" ===');
  try {
    const mapsData = await googleMaps('location velo Saint-Malo', { gl: 'fr', hl: 'fr' });
    results.queries['maps:location velo Saint-Malo'] = {
      local_results: (mapsData.local_results || []).map(r => ({
        title: r.title,
        address: r.address,
        phone: r.phone,
        rating: r.rating,
        reviews: r.reviews,
        reviews_original: r.reviews_original,
        type: r.type,
        types: r.types,
        place_id: r.place_id,
        data_id: r.data_id,
        website: r.website,
        thumbnail: r.thumbnail,
        gps_coordinates: r.gps_coordinates,
        operating_hours: r.operating_hours,
        price: r.price,
        description: r.description,
        extensions: r.extensions,
        service_options: r.service_options,
      })),
    };
    console.log(`  Results: ${results.queries['maps:location velo Saint-Malo'].local_results.length}`);
  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
    results.queries['maps:location velo Saint-Malo'] = { error: err.message };
  }

  // ── 3. Google Autocomplete ────────────────────────────────────────────
  console.log('\n=== Google Autocomplete: "location velo Saint-Malo" ===');
  try {
    const acData = await googleAutocomplete('location velo Saint-Malo', { gl: 'fr', hl: 'fr' });
    results.queries['autocomplete:location velo Saint-Malo'] = {
      suggestions: (acData.suggestions || []).map(s => ({
        value: s.value,
        type: s.type,
      })),
    };
    console.log(`  Suggestions: ${results.queries['autocomplete:location velo Saint-Malo'].suggestions.length}`);
  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
    results.queries['autocomplete:location velo Saint-Malo'] = { error: err.message };
  }

  // ── 4. Consolidate competitors ────────────────────────────────────────
  // Extract unique competitors from all sources
  const seen = new Set();

  function addCompetitor(source, biz) {
    const name = biz.title || biz.displayed_link || 'Unknown';
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!key || seen.has(key)) {
      // Merge data if already seen
      if (seen.has(key) && results.competitors[key]) {
        const existing = results.competitors[key];
        if (!existing.website && biz.website) existing.website = biz.website;
        if (!existing.phone && biz.phone) existing.phone = biz.phone;
        if (!existing.address && biz.address) existing.address = biz.address;
        if (!existing.rating && biz.rating) existing.rating = biz.rating;
        if (!existing.reviews && biz.reviews) existing.reviews = biz.reviews;
        if (biz.link && !existing.found_in_urls?.includes(biz.link)) {
          existing.found_in_urls = existing.found_in_urls || [];
          existing.found_in_urls.push(biz.link);
        }
        if (!existing.sources.includes(source)) existing.sources.push(source);
      }
      return;
    }
    seen.add(key);
    results.competitors[key] = {
      name,
      address: biz.address || null,
      phone: biz.phone || null,
      website: biz.website || biz.link || null,
      rating: biz.rating || null,
      reviews: biz.reviews || null,
      data_id: biz.data_id || null,
      type: biz.type || null,
      sources: [source],
      found_in_urls: biz.link ? [biz.link] : [],
    };
  }

  // From local results (Maps pack in search)
  for (const [queryKey, data] of Object.entries(results.queries)) {
    if (data.error) continue;
    for (const lr of (data.local_results || [])) {
      addCompetitor(`local:${queryKey}`, lr);
    }
    // From organic results - only bike-rental related
    for (const or of (data.organic_results || [])) {
      const link = (or.link || '').toLowerCase();
      const title = (or.title || '').toLowerCase();
      if (
        title.includes('velo') || title.includes('bike') || title.includes('cycle') ||
        title.includes('location') || title.includes('rental') ||
        link.includes('velo') || link.includes('bike') || link.includes('cycle')
      ) {
        addCompetitor(`organic:${queryKey}`, { ...or, website: or.link });
      }
    }
    // From ads
    for (const ad of (data.ads || [])) {
      addCompetitor(`ads:${queryKey}`, { ...ad, website: ad.link });
    }
  }

  // ── 5. Output ─────────────────────────────────────────────────────────
  const outPath = resolve(__dirname, '../output/competitors-raw.json');
  writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n\nResults written to: ${outPath}`);

  // Print summary
  console.log('\n========================================');
  console.log('COMPETITOR SUMMARY');
  console.log('========================================\n');

  const competitorList = Object.values(results.competitors);
  competitorList.sort((a, b) => (b.rating || 0) - (a.rating || 0));

  for (const c of competitorList) {
    console.log(`--- ${c.name} ---`);
    if (c.address) console.log(`  Address:  ${c.address}`);
    if (c.phone) console.log(`  Phone:    ${c.phone}`);
    if (c.website) console.log(`  Website:  ${c.website}`);
    if (c.rating) console.log(`  Rating:   ${c.rating} (${c.reviews || '?'} reviews)`);
    if (c.type) console.log(`  Type:     ${c.type}`);
    console.log(`  Found in: ${c.sources.join(', ')}`);
    console.log('');
  }

  // Print autocomplete suggestions
  const acResults = results.queries['autocomplete:location velo Saint-Malo'];
  if (acResults?.suggestions?.length) {
    console.log('\n========================================');
    console.log('AUTOCOMPLETE SUGGESTIONS');
    console.log('========================================\n');
    for (const s of acResults.suggestions) {
      console.log(`  - ${s.value}`);
    }
  }

  // Print full JSON to stdout
  console.log('\n\n========================================');
  console.log('FULL RAW DATA (JSON)');
  console.log('========================================\n');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
