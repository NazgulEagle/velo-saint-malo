/**
 * Create a private Notion project page for Velo Saint-Malo
 * Separate from professional databases
 */

import { pathToFileURL } from 'url';
const clientPath = 'C:/Users/josco/Documents/Projects/seller-services-jc/seller-services-jc/agents/notion-agent/src/notion-client.mjs';
const { createPage, appendBlocks, blocks, notion, ROOT_PAGE_ID } = await import(pathToFileURL(clientPath).href);

// 1. Create the main project page
const project = await createPage('Velo Saint-Malo — Location de Velos', [], {
  icon: '🚲',
  cover: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200',
});

console.log('Project page created:', project.url);

// 2. Add content blocks
await appendBlocks(project.id, [
  blocks.callout('Projet prive — location de velos a Saint-Malo. Pas lie aux activites professionnelles.', '🏖️'),
  blocks.divider(),

  // --- Overview ---
  blocks.heading1('Apercu du Projet'),
  blocks.paragraph('Site web pour une entreprise de location de velos a Saint-Malo, Bretagne. Systeme autonome avec catalogue de velos reels, reservation en ligne et tarification transparente.'),
  blocks.divider(),

  // --- Links ---
  blocks.heading2('Liens Importants'),
  blocks.bookmark('https://github.com/NazgulEagle/velo-saint-malo', 'GitHub Repository'),
  blocks.bulletedList('Site local: ouvrir index.html dans le navigateur'),
  blocks.bulletedList('Dossier projet: C:/Users/josco/Documents/Projects/velo-saint-malo/'),
  blocks.divider(),

  // --- Catalogue ---
  blocks.heading2('Catalogue de Velos'),
  blocks.heading3('Velos Classiques'),
  blocks.table([
    ['Modele', 'Type', 'Prix/jour'],
    ['Gazelle Paris C7', 'Ville', '15 EUR'],
    ['Riverside 500', 'VTC', '18 EUR'],
    ['Trek FX 3 Disc', 'Sport', '22 EUR'],
  ]),

  blocks.heading3('Velos Electriques'),
  blocks.table([
    ['Modele', 'Type', 'Prix/jour'],
    ['Moustache Samedi 28.3', 'E-Ville', '35 EUR'],
    ['Trek Verve+ 3 Lowstep', 'E-Confort', '35 EUR'],
    ['Cube Touring Hybrid One 625', 'E-Touring', '38 EUR'],
  ]),

  blocks.heading3('VTT / Sport'),
  blocks.table([
    ['Modele', 'Type', 'Prix/jour'],
    ['Giant Talon 2', 'VTT', '25 EUR'],
    ['Cube Stereo Hybrid 140', 'E-VTT', '45 EUR'],
    ['Tandem Peugeot T02', 'Tandem', '30 EUR'],
  ]),

  blocks.heading3('Enfants & Accessoires'),
  blocks.table([
    ['Article', 'Type', 'Prix/jour'],
    ['Draisienne RunRide 500', '2-4 ans', '5 EUR'],
    ['Btwin 500 16"', '4-6 ans', '8 EUR'],
    ['Riverside 500 Junior 20"', '6-9 ans', '10 EUR'],
    ['Trek Precaliber 24"', '9-12 ans', '12 EUR'],
    ['Thule Yepp 2 Maxi', 'Siege bebe', '5 EUR'],
    ['Thule Chariot Cross 2', 'Remorque', '12 EUR'],
    ['FollowMe', 'Barre de remorquage', '8 EUR'],
    ['Babboe Curve-E', 'Velo cargo', '25 EUR'],
  ]),

  blocks.divider(),

  // --- Pricing ---
  blocks.heading2('Tarification'),
  blocks.callout('Remise 10% a partir de 3 jours | Remise 20% a partir de 7 jours', '💰'),
  blocks.bulletedList('Caution standard: 150 EUR (300 EUR pour e-bikes)'),
  blocks.bulletedList('Inclus: casque, antivol, kit de reparation, carte des itineraires'),
  blocks.divider(),

  // --- Tech Stack ---
  blocks.heading2('Stack Technique'),
  blocks.bulletedList('HTML5 / CSS3 / JavaScript vanilla — pas de framework'),
  blocks.bulletedList('Design responsive (mobile-first)'),
  blocks.bulletedList('Systeme de reservation en 3 etapes (wizard)'),
  blocks.bulletedList('Filtres par categorie de velo'),
  blocks.bulletedList('Animations au scroll (IntersectionObserver)'),
  blocks.bulletedList('Heberge sur GitHub Pages (a activer)'),
  blocks.divider(),

  // --- Roadmap ---
  blocks.heading2('Roadmap'),
  blocks.todo('Site web statique avec catalogue et reservation', true),
  blocks.todo('Velos reels avec specifications detaillees', true),
  blocks.todo('Systeme de reservation en 3 etapes', true),
  blocks.todo('Notion project prive', true),
  blocks.todo('Deployer sur GitHub Pages ou Netlify'),
  blocks.todo('Ajouter photos reelles des velos'),
  blocks.todo('Integrer systeme de paiement (Stripe)'),
  blocks.todo('Ajouter calendrier de disponibilite en temps reel'),
  blocks.todo('Backend pour gestion des reservations'),
  blocks.todo('Envoyer confirmation par email (SendGrid/Resend)'),
  blocks.todo('Version multilingue (FR/EN/NL)'),
  blocks.todo('Google Maps integration pour les itineraires'),
  blocks.divider(),

  // --- Notes ---
  blocks.heading2('Notes'),
  blocks.paragraph('Ce projet est un side-project personnel, pas lie a JC Marketing ou aux clients. Objectif: creer un systeme de location de velos fonctionnel pour Saint-Malo.'),
]);

console.log('\nNotion project ready!');
console.log('URL:', project.url);
