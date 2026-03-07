/* ===========================
   Velo Saint-Malo — JavaScript
   =========================== */

// --- Config ---
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3456'
  : 'https://velo-saint-malo.fr/api';  // Update when deployed

// --- State ---
const cart = {};
let currentStep = 1;

// --- Cart Persistence ---
function saveCart() {
  localStorage.setItem('vsm_cart', JSON.stringify(cart));
}

function loadCart() {
  try {
    const saved = localStorage.getItem('vsm_cart');
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.assign(cart, parsed);
    }
  } catch (e) { /* ignore corrupt data */ }
}

// Half-day price map (4h rental, ~65% of daily rate)
const halfDayPrices = {
  'riverside-500': 8, 'gazelle-paris': 10, 'trek-fx3': 12, 'tandem': 20,
  'trek-verve': 20, 'moustache-28': 23, 'cube-touring': 25,
  'giant-talon': 15, 'cube-stereo': 35,
  'draisienne': 3, 'enfant-16': 5, 'enfant-20': 7, 'enfant-24': 9,
  'forfait-famille': 18, 'forfait-famille-elec': 35,
  'casque': 2, 'sacoche': 3, 'gps': 5,
  'siege-enfant': 3, 'remorque': 8, 'followme': 4, 'babboe-cargo': 30
};

let participantCount = 0;

// Mapping: catalog model name -> data-bike ID in HTML
const MODEL_TO_BIKE_ID = {
  'Gazelle Paris C7': 'gazelle-paris',
  'Riverside 500': 'riverside-500',
  'Trek FX 3 Disc': 'trek-fx3',
  'Tandem Peugeot T02': 'tandem',
  'Moustache Samedi 28.3': 'moustache-28',
  'Trek Verve+ 3 Lowstep': 'trek-verve',
  'Cube Touring Hybrid One 625': 'cube-touring',
  'Giant Talon 2 29"': 'giant-talon',
  'Cube Stereo Hybrid 140': 'cube-stereo',
  'Draisienne RunRide 500': 'draisienne',
  'Btwin 500 16"': 'enfant-16',
  'Riverside 500 Junior 20"': 'enfant-20',
  'Trek Precaliber 24"': 'enfant-24',
  'Thule Yepp 2 Maxi': 'siege-enfant',
  'Thule Chariot Cross 2': 'remorque',
  'FollowMe': 'followme',
  'Babboe Curve-E': 'babboe-cargo',
  'Sacoches Ortlieb Back-Roller': 'sacoche',
  'Casque adulte Giro Register MIPS': 'casque',
  'GPS Garmin Edge Explore 2': 'gps',
};

// --- DOM Ready ---
document.addEventListener('DOMContentLoaded', () => {
  loadCart();
  updateNavCartCount();
  initNavigation();
  initBikeFilters();
  initBikeToggles();
  initBookingButtons();
  initFAQ();
  initBookingWizard();
  initScrollAnimations();
  initDateDefaults();
  initParticipants();
  loadLivePrices();
  handlePaymentReturn();
  renderCart();
  updateRecap();
});

// --- Load live prices from backend ---
async function loadLivePrices() {
  try {
    const res = await fetch(`${API_URL}/api/bikes`);
    if (!res.ok) return;
    const bikes = await res.json();

    for (const bike of bikes) {
      const bikeId = MODEL_TO_BIKE_ID[bike.name];
      if (!bikeId) continue;

      // Update daily price in halfDayPrices map
      halfDayPrices[bikeId] = bike.priceHalfDay;

      // Find the add-to-booking button for this bike
      const btn = document.querySelector(`[data-bike="${bikeId}"]`);
      if (!btn) continue;

      // Update data-price attribute
      btn.dataset.price = bike.priceDay;

      // Update the displayed price in the card
      const card = btn.closest('.bike-card');
      if (card) {
        const priceAmount = card.querySelector('.bike-card__price-amount');
        if (priceAmount) priceAmount.innerHTML = `&euro;${bike.priceDay}`;
      }

      // Update cart if this item is already in cart
      if (cart[bikeId]) {
        cart[bikeId].price = bike.priceDay;
        cart[bikeId].priceHalfDay = bike.priceHalfDay;
      }
    }

    // Re-render cart with updated prices
    renderCart();
    updateRecap();
  } catch (err) {
    // Silent: use hardcoded prices as fallback
    console.warn('Live prices unavailable, using defaults');
  }
}

// --- Navigation ---
function initNavigation() {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('navMenu');

  window.addEventListener('scroll', () => {
    nav.classList.toggle('nav--scrolled', window.scrollY > 50);
  });

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    menu.classList.toggle('active');
  });

  menu.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('active');
      menu.classList.remove('active');
    });
  });
}

// --- Bike Card Expand/Collapse Toggles ---
function initBikeToggles() {
  document.querySelectorAll('.bike-card').forEach(card => {
    const desc = card.querySelector('.bike-card__desc');
    if (!desc) return;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'bike-card__toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = 'Specifications <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>';

    desc.insertAdjacentElement('afterend', toggle);

    toggle.addEventListener('click', () => {
      const expanded = card.classList.toggle('expanded');
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.innerHTML = expanded
        ? 'Masquer <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>'
        : 'Specifications <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>';
    });
  });
}

// --- Bike Filters ---
function initBikeFilters() {
  const filters = document.querySelectorAll('.bike-filter');
  const cards = document.querySelectorAll('.bike-card');

  filters.forEach(filter => {
    filter.addEventListener('click', () => {
      filters.forEach(f => f.classList.remove('active'));
      filter.classList.add('active');

      const category = filter.dataset.filter;

      cards.forEach(card => {
        if (category === 'all' || card.dataset.category.includes(category)) {
          card.classList.remove('hidden');
          card.style.animation = 'fadeInUp 0.4s ease both';
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });
}

// --- Booking Buttons (all "Ajouter" / "+" buttons) ---
function initBookingButtons() {
  const isReservationPage = !!document.getElementById('cartItems');
  injectMiniCartDrawer();

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-to-booking');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    const { bike, name, price } = btn.dataset;
    addToCart(bike, name, parseInt(price));

    // Button flash: green checkmark
    const original = btn.innerHTML;
    const originalBg = btn.style.background;
    btn.innerHTML = '&#10003; Ajoute !';
    btn.style.background = '#10b981';
    btn.style.borderColor = '#10b981';
    btn.style.color = '#fff';
    setTimeout(() => {
      btn.innerHTML = original;
      btn.style.background = originalBg;
      btn.style.borderColor = '';
      btn.style.color = '';
    }, 1200);

    // Update navbar cart badge
    updateNavCartCount();

    // Show mini-cart drawer (slides in from right)
    if (!isReservationPage) {
      showMiniCartDrawer();
    }
  });
}

// --- Mini-cart drawer (slides in from right, auto-hides) ---
let miniCartTimeout = null;

function injectMiniCartDrawer() {
  if (document.getElementById('miniCartDrawer')) return;

  const drawer = document.createElement('div');
  drawer.id = 'miniCartDrawer';
  drawer.style.cssText = 'position:fixed;top:0;right:0;width:320px;max-width:85vw;height:100vh;background:#fff;box-shadow:-4px 0 24px rgba(0,0,0,0.15);z-index:9999;transform:translateX(100%);transition:transform 0.35s cubic-bezier(0.16,1,0.3,1);display:flex;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif';

  const isEN = document.documentElement.lang === 'en';

  drawer.innerHTML = `
    <div style="padding:20px 20px 12px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center">
      <h3 style="margin:0;font-size:1rem;color:#111">${isEN ? 'Your selection' : 'Votre selection'}</h3>
      <button id="miniCartClose" type="button" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:#6b7280;padding:4px 8px">&times;</button>
    </div>
    <div id="miniCartItems" style="flex:1;overflow-y:auto;padding:16px 20px"></div>
    <div style="padding:16px 20px;border-top:1px solid #e5e7eb">
      <div id="miniCartTotal" style="display:flex;justify-content:space-between;font-weight:700;font-size:1rem;margin-bottom:12px;color:#111"></div>
      <a href="reservation.html" style="display:block;text-align:center;background:#0c4a6e;color:#fff;padding:12px;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.95rem">${isEN ? 'Book now' : 'Reserver maintenant'}</a>
    </div>
  `;
  document.body.appendChild(drawer);

  // Overlay
  const overlay = document.createElement('div');
  overlay.id = 'miniCartOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:9998;opacity:0;pointer-events:none;transition:opacity 0.3s ease';
  document.body.appendChild(overlay);

  // Close handlers
  document.getElementById('miniCartClose').addEventListener('click', closeMiniCartDrawer);
  overlay.addEventListener('click', closeMiniCartDrawer);
}

function showMiniCartDrawer() {
  const drawer = document.getElementById('miniCartDrawer');
  const overlay = document.getElementById('miniCartOverlay');
  if (!drawer) return;

  // Populate items
  const itemsEl = document.getElementById('miniCartItems');
  const isEN = document.documentElement.lang === 'en';
  let html = '';
  let totalPrice = 0;
  const entries = Object.entries(cart);

  entries.forEach(([id, item]) => {
    totalPrice += item.price * item.qty;
    html += `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f3f4f6">
        <div>
          <div style="font-weight:600;font-size:0.9rem;color:#111">${item.name}</div>
          <div style="font-size:0.8rem;color:#6b7280">${item.qty}x - ${item.price}EUR/${isEN ? 'day' : 'jour'}</div>
        </div>
        <div style="font-weight:700;color:#0c4a6e;font-size:0.95rem">${item.price * item.qty}EUR</div>
      </div>`;
  });

  if (entries.length === 0) {
    html = `<p style="color:#9ca3af;text-align:center;margin-top:40px">${isEN ? 'Your selection is empty' : 'Votre selection est vide'}</p>`;
  }

  itemsEl.innerHTML = html;
  document.getElementById('miniCartTotal').innerHTML = `<span>Total/${isEN ? 'day' : 'jour'}</span><span>${totalPrice}EUR</span>`;

  // Show
  drawer.style.transform = 'translateX(0)';
  overlay.style.opacity = '1';
  overlay.style.pointerEvents = 'auto';

  // Auto-hide after 4s
  clearTimeout(miniCartTimeout);
  miniCartTimeout = setTimeout(closeMiniCartDrawer, 4000);
}

function closeMiniCartDrawer() {
  clearTimeout(miniCartTimeout);
  const drawer = document.getElementById('miniCartDrawer');
  const overlay = document.getElementById('miniCartOverlay');
  if (drawer) drawer.style.transform = 'translateX(100%)';
  if (overlay) { overlay.style.opacity = '0'; overlay.style.pointerEvents = 'none'; }
}

function updateNavCartCount() {
  const count = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
  const ctaLink = document.querySelector('.nav__link--cta');
  if (!ctaLink) return;

  // Add/update badge
  let counter = ctaLink.querySelector('.nav-cart-count');
  if (count === 0) {
    if (counter) counter.remove();
    return;
  }
  if (!counter) {
    counter = document.createElement('span');
    counter.className = 'nav-cart-count';
    counter.style.cssText = 'position:absolute;top:-8px;right:-12px;background:#ef4444;color:#fff;font-size:0.7rem;font-weight:700;min-width:18px;height:18px;border-radius:9px;display:flex;align-items:center;justify-content:center;padding:0 4px;line-height:1';
    ctaLink.style.position = 'relative';
    ctaLink.appendChild(counter);
  }
  counter.textContent = count;
  counter.style.animation = 'none';
  void counter.offsetWidth;
  counter.style.animation = 'cartPulse 0.4s ease';
}

// ============================================
//  CART SYSTEM
// ============================================

function addToCart(bikeId, name, price) {
  if (cart[bikeId]) {
    cart[bikeId].qty += 1;
  } else {
    const priceHalfDay = halfDayPrices[bikeId] || Math.round(price * 0.65);
    cart[bikeId] = { name, price, priceHalfDay, qty: 1 };
  }
  saveCart();
  renderCart();
  updateRecap();

  // Pulse the cart count
  const countEl = document.getElementById('cartCount');
  if (countEl) {
    countEl.classList.add('pulse');
    setTimeout(() => countEl.classList.remove('pulse'), 600);
  }
}

function updateQty(bikeId, delta) {
  if (!cart[bikeId]) return;
  cart[bikeId].qty += delta;
  if (cart[bikeId].qty <= 0) {
    delete cart[bikeId];
  }
  saveCart();
  renderCart();
  updateRecap();
}

function removeFromCart(bikeId) {
  delete cart[bikeId];
  saveCart();
  renderCart();
  updateRecap();
}

function isHalfDay() {
  return document.getElementById('rentalType')?.value === 'halfday';
}

function getCartTotals() {
  const entries = Object.entries(cart);
  const halfDay = isHalfDay();
  let dailyTotal = 0;
  let itemCount = 0;
  let hasEbike = false;

  entries.forEach(([id, item]) => {
    const unitPrice = halfDay ? item.priceHalfDay : item.price;
    dailyTotal += unitPrice * item.qty;
    itemCount += item.qty;
    if (['moustache-28', 'trek-verve', 'cube-touring', 'cube-stereo', 'babboe-cargo'].includes(id)) {
      hasEbike = true;
    }
  });

  const days = halfDay ? 1 : getBookingDays();

  // Discount: 3+ days = 10%, 7+ days = 20% (no discount for half-day)
  let discountPct = 0;
  if (!halfDay) {
    if (days >= 7) discountPct = 20;
    else if (days >= 3) discountPct = 10;
  }

  const subtotal = dailyTotal * days;
  const discount = Math.round(subtotal * discountPct / 100);
  const total = subtotal - discount;

  // Deposit: €300 for e-bikes, €150 for regular
  const deposit = hasEbike ? 300 : (itemCount > 0 ? 150 : 0);

  return { dailyTotal, itemCount, days, discountPct, discount, subtotal, total, deposit, entries, halfDay };
}

function renderCart() {
  const itemsEl = document.getElementById('cartItems');
  const summaryEl = document.getElementById('cartSummary');
  const emptyEl = document.getElementById('cartEmpty');
  const countEl = document.getElementById('cartCount');

  const { dailyTotal, itemCount, days, discountPct, discount, subtotal, total, deposit, entries, halfDay } = getCartTotals();

  // Update count badge
  if (countEl) {
    countEl.textContent = itemCount === 0 ? '0 articles' :
      itemCount === 1 ? '1 article' : `${itemCount} articles`;
  }

  if (entries.length === 0) {
    // Show empty state
    if (emptyEl) emptyEl.style.display = '';
    // Remove any item elements
    itemsEl.querySelectorAll('.booking-cart__item').forEach(el => el.remove());
    summaryEl.style.display = 'none';
    return;
  }

  // Hide empty state
  if (emptyEl) emptyEl.style.display = 'none';

  // Build items HTML
  let html = '';
  const priceLabel = halfDay ? '/4h' : '/jour';
  entries.forEach(([id, item]) => {
    const unitPrice = halfDay ? item.priceHalfDay : item.price;
    const lineTotal = unitPrice * item.qty;
    html += `
      <div class="booking-cart__item">
        <div class="booking-cart__item-info">
          <div class="booking-cart__item-name">${item.name}</div>
          <div class="booking-cart__item-price">${item.qty} x €${unitPrice}${priceLabel} = <strong>€${lineTotal}${priceLabel}</strong></div>
        </div>
        <div class="booking-cart__item-actions">
          <button class="booking-cart__qty-btn" onclick="updateQty('${id}', -1)" aria-label="Diminuer">−</button>
          <span class="booking-cart__qty">${item.qty}</span>
          <button class="booking-cart__qty-btn" onclick="updateQty('${id}', 1)" aria-label="Augmenter">+</button>
          <button class="booking-cart__remove-btn" onclick="removeFromCart('${id}')" aria-label="Supprimer" title="Supprimer">✕</button>
        </div>
      </div>
    `;
  });

  // Insert items (keep empty div, replace items)
  itemsEl.querySelectorAll('.booking-cart__item').forEach(el => el.remove());
  itemsEl.insertAdjacentHTML('beforeend', html);

  // Summary
  summaryEl.style.display = '';
  document.getElementById('cartSubtotal').textContent = `€${dailyTotal}`;

  // Days line
  const daysLineEl = document.getElementById('cartDaysLine');
  if (days > 1) {
    daysLineEl.style.display = '';
    document.getElementById('cartDays').textContent = `${days} jours (€${dailyTotal} x ${days} = €${subtotal})`;
  } else {
    daysLineEl.style.display = 'none';
  }

  // Discount line
  const discountLineEl = document.getElementById('cartDiscountLine');
  if (discount > 0) {
    discountLineEl.style.display = '';
    document.getElementById('cartDiscount').textContent = `-€${discount} (${discountPct}%)`;
  } else {
    discountLineEl.style.display = 'none';
  }

  // Total
  if (halfDay) {
    document.getElementById('cartTotal').textContent = `€${dailyTotal}`;
  } else {
    document.getElementById('cartTotal').textContent = days > 1
      ? `€${total}`
      : `€${dailyTotal}/jour`;
  }

  // Deposit
  document.getElementById('cartDeposit').textContent = `€${deposit}`;
}

// ============================================
//  DATE HANDLING
// ============================================

function getBookingDays() {
  const start = document.getElementById('dateStart')?.value;
  const end = document.getElementById('dateEnd')?.value;
  if (!start || !end) return 1;

  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 1;
}

function initDateDefaults() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const startInput = document.getElementById('dateStart');
  const endInput = document.getElementById('dateEnd');
  if (!startInput || !endInput) return;

  startInput.min = formatDateISO(today);
  endInput.min = formatDateISO(tomorrow);

  // Update duration display when dates change
  const updateDuration = () => {
    const days = getBookingDays();
    const durationEl = document.getElementById('durationDisplay');
    const durationText = document.getElementById('durationText');

    const halfDay = isHalfDay();

    if (halfDay && startInput.value) {
      const startFmt = formatDate(startInput.value);
      durationText.innerHTML = `<strong>${startFmt}</strong> — Demi-journee (4h)`;
      durationEl.style.display = '';
    } else if (!halfDay && startInput.value && endInput.value && days > 0) {
      const startFmt = formatDate(startInput.value);
      const endFmt = formatDate(endInput.value);

      let durationLabel = `${days} jour${days > 1 ? 's' : ''}`;
      if (days >= 7) durationLabel += ' — remise 20% appliquee !';
      else if (days >= 3) durationLabel += ' — remise 10% appliquee !';

      durationText.innerHTML = `<strong>${startFmt}</strong> → <strong>${endFmt}</strong> — ${durationLabel}`;
      durationEl.style.display = '';
    } else {
      durationEl.style.display = 'none';
    }

    renderCart();
    updateRecap();
  };

  // Rental type toggle
  const rentalTypeSelect = document.getElementById('rentalType');
  const dateEndGroup = document.getElementById('dateEndGroup');
  rentalTypeSelect?.addEventListener('change', () => {
    const halfDay = rentalTypeSelect.value === 'halfday';
    if (dateEndGroup) dateEndGroup.style.display = halfDay ? 'none' : '';
    if (halfDay) endInput.required = false;
    else endInput.required = true;
    renderCart();
    updateRecap();
    updateDuration();
  });

  startInput.addEventListener('change', () => {
    const selected = new Date(startInput.value);
    const nextDay = new Date(selected);
    nextDay.setDate(nextDay.getDate() + 1);
    endInput.min = formatDateISO(nextDay);

    if (endInput.value && new Date(endInput.value) <= selected) {
      endInput.value = formatDateISO(nextDay);
    }

    clearError('dateStart');
    updateDuration();
  });

  endInput.addEventListener('change', () => {
    clearError('dateEnd');
    updateDuration();
  });
}

// ============================================
//  BOOKING WIZARD (Step navigation)
// ============================================

function initBookingWizard() {
  const form = document.getElementById('bookingForm');

  // Step 1 → Step 2
  document.getElementById('toStep2')?.addEventListener('click', () => {
    if (validateStep1()) {
      goToStep(2);
    }
  });

  // Step 2 → Step 1
  document.getElementById('backToStep1')?.addEventListener('click', () => goToStep(1));
  document.getElementById('backToStep1Edit')?.addEventListener('click', () => goToStep(1));

  // Submit
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (validateStep2()) {
      showConfirmation();
    }
  });

  // Modal close
  const modal = document.getElementById('confirmationModal');
  document.getElementById('modalClose')?.addEventListener('click', () => closeModal());
  document.getElementById('modalOk')?.addEventListener('click', () => closeModal());
  modal?.querySelector('.modal__overlay')?.addEventListener('click', () => closeModal());

  // Clear errors on input
  document.querySelectorAll('.booking-form__group input, .booking-form__group select').forEach(input => {
    input.addEventListener('input', () => clearError(input.id));
    input.addEventListener('change', () => clearError(input.id));
  });
}

function goToStep(step) {
  currentStep = step;

  // Update step visibility
  document.querySelectorAll('.booking-step').forEach(el => el.classList.remove('active'));
  document.getElementById(`bookingStep${step}`)?.classList.add('active');

  // Update progress bar
  document.querySelectorAll('.booking-progress__step').forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.toggle('active', s <= step);
    el.classList.toggle('completed', s < step);
  });

  document.querySelectorAll('.booking-progress__line').forEach((line, i) => {
    line.classList.toggle('active', i + 1 < step);
  });

  // Scroll to top of booking section
  document.getElementById('reservation')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Update recap on step 2
  if (step === 2) {
    updateRecap();
  }
}

// ============================================
//  RECAP SIDEBAR (Step 2)
// ============================================

function updateRecap() {
  const recapDates = document.getElementById('recapDates');
  const recapItems = document.getElementById('recapItems');
  const recapTotal = document.getElementById('recapTotal');

  if (!recapDates) return;

  const start = document.getElementById('dateStart')?.value;
  const end = document.getElementById('dateEnd')?.value;
  const pickup = document.getElementById('pickupTime')?.value;

  // Dates
  const halfDay = isHalfDay();
  if (halfDay && start) {
    recapDates.innerHTML = `
      <div>${formatDate(start)}</div>
      <div class="booking-recap__days">Demi-journee (4h)${pickup ? ` — recuperation ${pickup}` : ''}</div>
    `;
  } else if (start && end) {
    const days = getBookingDays();
    recapDates.innerHTML = `
      <div>${formatDate(start)} → ${formatDate(end)}</div>
      <div class="booking-recap__days">${days} jour${days > 1 ? 's' : ''}${pickup ? ` — recuperation ${pickup}` : ''}</div>
    `;
  }

  // Items
  const { total, deposit, entries } = getCartTotals();
  if (entries.length > 0) {
    const pLabel = halfDay ? '/4h' : '/j';
    recapItems.innerHTML = entries.map(([, item]) => {
      const unitPrice = halfDay ? item.priceHalfDay : item.price;
      return `<div class="booking-recap__item">${item.qty}x ${item.name} <span>€${unitPrice * item.qty}${pLabel}</span></div>`;
    }).join('');
  }

  // Total
  if (recapTotal) recapTotal.textContent = `€${total}`;
}

// ============================================
//  VALIDATION
// ============================================

function validateStep1() {
  let valid = true;

  // Must have items in cart
  if (Object.keys(cart).length === 0) {
    // Scroll to bikes section
    document.getElementById('velos')?.scrollIntoView({ behavior: 'smooth' });
    showToast('Selectionnez au moins un velo avant de continuer');
    return false;
  }

  // Date start
  const start = document.getElementById('dateStart').value;
  if (!start) {
    showError('dateStart', 'Veuillez choisir une date de debut');
    valid = false;
  }

  // Date end (not required for half-day)
  if (!isHalfDay()) {
    const end = document.getElementById('dateEnd').value;
    if (!end) {
      showError('dateEnd', 'Veuillez choisir une date de retour');
      valid = false;
    } else if (start && new Date(end) <= new Date(start)) {
      showError('dateEnd', 'La date de retour doit être apres la date de debut');
      valid = false;
    }
  }

  // Pickup time
  const pickup = document.getElementById('pickupTime').value;
  if (!pickup) {
    showError('pickupTime', 'Choisissez un creneau de recuperation');
    valid = false;
  }

  if (!valid) {
    // Scroll to first error
    const firstError = document.querySelector('.booking-form__group.has-error');
    firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return valid;
}

function validateStep2() {
  let valid = true;

  const fields = [
    { id: 'firstName', msg: 'Votre prenom est requis' },
    { id: 'lastName', msg: 'Votre nom est requis' },
    { id: 'email', msg: 'Votre email est requis' },
    { id: 'phone', msg: 'Votre numero de telephone est requis' },
  ];

  fields.forEach(({ id, msg }) => {
    const value = document.getElementById(id)?.value?.trim();
    if (!value) {
      showError(id, msg);
      valid = false;
    }
  });

  // Email format
  const email = document.getElementById('email')?.value?.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('email', 'Adresse email invalide');
    valid = false;
  }

  // Phone format (basic)
  const phone = document.getElementById('phone')?.value?.trim();
  if (phone && phone.replace(/[\s\-\+\(\)]/g, '').length < 8) {
    showError('phone', 'Numero de telephone invalide');
    valid = false;
  }

  // Terms checkbox
  if (!document.getElementById('acceptTerms')?.checked) {
    showError('acceptTerms', 'Vous devez accepter les conditions');
    valid = false;
  }

  if (!valid) {
    const firstError = document.querySelector('.booking-form__group.has-error, .booking-form__checkbox.has-error');
    firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return valid;
}

function showError(fieldId, message) {
  const errorEl = document.getElementById(fieldId + 'Error');
  const group = document.getElementById(fieldId)?.closest('.booking-form__group, .booking-form__checkbox');
  if (errorEl) errorEl.textContent = message;
  if (group) group.classList.add('has-error');
}

function clearError(fieldId) {
  const errorEl = document.getElementById(fieldId + 'Error');
  const group = document.getElementById(fieldId)?.closest('.booking-form__group, .booking-form__checkbox');
  if (errorEl) errorEl.textContent = '';
  if (group) group.classList.remove('has-error');
}

// ============================================
//  TOAST NOTIFICATION
// ============================================

function showToast(message) {
  // Remove existing toast
  document.querySelector('.toast')?.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span class="toast__icon">⚠️</span><span>${message}</span>`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ============================================
//  CONFIRMATION
// ============================================

function showConfirmation() {
  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const participants = getParticipantsData();
  const notes = document.getElementById('notes').value.trim();
  const start = document.getElementById('dateStart').value;
  const end = document.getElementById('dateEnd').value;
  const pickup = document.getElementById('pickupTime').value;
  const returnTime = document.getElementById('returnTime').value;

  const { days, discountPct, discount, total, deposit, entries, halfDay } = getCartTotals();

  // Generate reference
  const ref = 'VSM-' + Date.now().toString(36).toUpperCase().slice(-6);

  // Fill receipt
  document.getElementById('receiptRef').textContent = ref;
  document.getElementById('receiptName').textContent = `${firstName} ${lastName}`;
  document.getElementById('receiptEmail').textContent = email;
  document.getElementById('receiptPhone').textContent = phone;

  // Group
  const groupRow = document.getElementById('receiptGroupRow');
  if (participants.length > 0) {
    groupRow.style.display = '';
    const adults = participants.filter(p => p.type !== 'child').length;
    const children = participants.filter(p => p.type === 'child').length;
    let groupLabel = `${participants.length} personne${participants.length > 1 ? 's' : ''}`;
    if (children > 0) groupLabel += ` (${adults} adulte${adults > 1 ? 's' : ''}, ${children} enfant${children > 1 ? 's' : ''})`;
    document.getElementById('receiptGroup').textContent = groupLabel;
  }

  // Dates
  document.getElementById('receiptDateStart').textContent = formatDate(start);
  if (halfDay) {
    document.getElementById('receiptDateEnd').textContent = 'Meme jour';
    document.getElementById('receiptDuration').textContent = 'Demi-journee (4h)';
  } else {
    document.getElementById('receiptDateEnd').textContent = formatDate(end);
    document.getElementById('receiptDuration').textContent = `${days} jour${days > 1 ? 's' : ''}`;
  }
  document.getElementById('receiptPickup').textContent = pickup;
  document.getElementById('receiptReturn').textContent = returnTime === 'flexible' ? 'Flexible (avant fermeture)' : returnTime;

  // Items
  const itemsHtml = entries.map(([, item]) => {
    const unitPrice = halfDay ? item.priceHalfDay : item.price;
    const lineTotal = unitPrice * item.qty * days;
    let discountedTotal = lineTotal;
    if (discountPct > 0) {
      discountedTotal = Math.round(lineTotal * (100 - discountPct) / 100);
    }
    const pLabel = halfDay ? '/4h' : '/jour';
    const dLabel = halfDay ? 'demi-journee' : `${days} jour${days > 1 ? 's' : ''}`;
    return `
      <div class="receipt__row">
        <span>${item.qty}x ${item.name}</span>
        <span>${discountPct > 0 ? `<s>€${lineTotal}</s> ` : ''}€${discountedTotal}</span>
      </div>
      <div class="receipt__row receipt__row--sub">
        <span>${item.qty} x €${unitPrice}${pLabel} x ${dLabel}</span>
        <span></span>
      </div>
    `;
  }).join('');
  document.getElementById('receiptItems').innerHTML = itemsHtml;

  // Discount
  const discountRow = document.getElementById('receiptDiscountRow');
  if (discount > 0) {
    discountRow.style.display = '';
    document.getElementById('receiptDiscount').textContent = `-€${discount} (${discountPct}%)`;
  }

  // Total & deposit & acompte
  const acompte = Math.max(1, Math.round(total * 0.05 * 100) / 100);
  const remaining = Math.round((total - acompte) * 100) / 100;
  document.getElementById('receiptTotal').textContent = `€${total}`;
  document.getElementById('receiptDeposit').textContent = `€${deposit}`;
  document.getElementById('receiptAcompte').textContent = `€${acompte}`;
  document.getElementById('receiptRemaining').textContent = `€${remaining}`;

  // Notes
  const notesSection = document.getElementById('receiptNotesSection');
  if (notes) {
    notesSection.style.display = '';
    document.getElementById('receiptNotes').textContent = notes;
  }

  // Update progress to step 3
  goToStep(3);
  document.querySelectorAll('.booking-progress__step').forEach(el => {
    el.classList.add('active', 'completed');
  });
  document.querySelectorAll('.booking-progress__line').forEach(l => l.classList.add('active'));

  // Send booking to API, then redirect to payment
  const bookingData = {
    reference: ref,
    firstName,
    lastName,
    email,
    phone,
    dateStart: start,
    dateEnd: end || undefined,
    halfDay,
    pickupTime: pickup,
    returnTime,
    participants: participants.length || 1,
    items: entries.map(([, item]) => `${item.qty}x ${item.name}`).join(', '),
    subtotal: total + discount,
    discount: discount > 0 ? `-${discount} (${discountPct}%)` : undefined,
    total,
    deposit,
    notes,
  };

  redirectToPayment(bookingData);
}

// --- Redirect to payment after booking ---
async function redirectToPayment(data) {
  const submitBtn = document.getElementById('submitBooking');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Redirection vers l\'acompte...';
  }

  try {
    // 1. Create booking in Notion
    const bookingRes = await fetch(`${API_URL}/api/booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const bookingResult = bookingRes.ok ? await bookingRes.json() : {};

    // 2. Create checkout session
    const checkoutRes = await fetch(`${API_URL}/api/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference: data.reference,
        total: data.total,
        deposit: data.deposit,
        email: data.email,
        bookingId: bookingResult.bookingId,
        clientId: bookingResult.clientId,
      }),
    });
    const checkout = await checkoutRes.json();

    if (checkout.checkoutUrl) {
      // Save booking data for receipt on return
      sessionStorage.setItem('vsm_booking', JSON.stringify(data));
      window.location.href = checkout.checkoutUrl;
      return;
    }
  } catch (err) {
    console.warn('Payment redirect failed:', err.message);
  }

  // Fallback: show confirmation modal without payment
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Continuer vers le paiement <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
  }
  showConfirmationModal(data);
}

// --- Show confirmation modal (after payment or as fallback) ---
function showConfirmationModal(data) {
  const { total, deposit, entries, halfDay, days, discountPct, discount } = getCartTotals();

  // Show modal
  const modal = document.getElementById('confirmationModal');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// --- Handle return from payment page ---
function handlePaymentReturn() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('paid') !== '1') return;

  const ref = params.get('ref');
  const acompte = params.get('acompte');
  const totalParam = params.get('total');
  const depositParam = params.get('deposit');

  // Restore booking data
  const savedData = sessionStorage.getItem('vsm_booking');
  if (!savedData) {
    showPaymentSuccessModal(ref, acompte, totalParam, depositParam);
    return;
  }

  const data = JSON.parse(savedData);
  sessionStorage.removeItem('vsm_booking');

  const paidAcompte = parseFloat(acompte) || Math.max(1, Math.round(data.total * 0.05 * 100) / 100);
  const remaining = Math.round((data.total - paidAcompte) * 100) / 100;

  // Fill receipt from saved data
  document.getElementById('receiptRef').textContent = data.reference || ref;
  document.getElementById('receiptName').textContent = `${data.firstName} ${data.lastName}`;
  document.getElementById('receiptEmail').textContent = data.email;
  document.getElementById('receiptPhone').textContent = data.phone;
  document.getElementById('receiptDateStart').textContent = formatDate(data.dateStart);

  if (data.halfDay) {
    document.getElementById('receiptDateEnd').textContent = 'Meme jour';
    document.getElementById('receiptDuration').textContent = 'Demi-journee (4h)';
  } else if (data.dateEnd) {
    document.getElementById('receiptDateEnd').textContent = formatDate(data.dateEnd);
    const d = Math.ceil((new Date(data.dateEnd) - new Date(data.dateStart)) / 86400000);
    document.getElementById('receiptDuration').textContent = `${d} jour${d > 1 ? 's' : ''}`;
  }

  document.getElementById('receiptPickup').textContent = data.pickupTime || '-';
  document.getElementById('receiptReturn').textContent = data.returnTime === 'flexible' ? 'Flexible (avant fermeture)' : (data.returnTime || '-');
  document.getElementById('receiptItems').innerHTML = `<div class="receipt__row"><span>${data.items}</span><span></span></div>`;
  document.getElementById('receiptTotal').textContent = `EUR${data.total}`;
  document.getElementById('receiptAcompte').innerHTML = `EUR${paidAcompte} <span style="color:#16a34a;font-size:0.8em;font-weight:600;">PAYE</span>`;
  document.getElementById('receiptRemaining').textContent = `EUR${remaining}`;
  document.getElementById('receiptDeposit').textContent = `EUR${data.deposit}`;

  if (data.notes) {
    document.getElementById('receiptNotesSection').style.display = '';
    document.getElementById('receiptNotes').textContent = data.notes;
  }

  // Update receipt header for confirmed status
  const receiptTitle = document.querySelector('.receipt__title');
  if (receiptTitle) receiptTitle.textContent = 'Reservation confirmee !';
  const receiptSubtitle = document.querySelector('.receipt__subtitle');
  if (receiptSubtitle) receiptSubtitle.textContent = 'Votre acompte est paye. Le reste sera regle sur place. Un email de confirmation arrive dans quelques minutes.';

  // Show modal
  const modal = document.getElementById('confirmationModal');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Update progress bar
  document.querySelectorAll('.booking-progress__step').forEach(el => {
    el.classList.add('active', 'completed');
  });
  document.querySelectorAll('.booking-progress__line').forEach(l => l.classList.add('active'));

  // Clean URL
  window.history.replaceState({}, '', window.location.pathname);
}

function showPaymentSuccessModal(ref, acompte, total, deposit) {
  document.getElementById('receiptRef').textContent = ref || '-';
  const paidAcompte = parseFloat(acompte) || 0;
  const totalVal = parseFloat(total) || 0;
  const remaining = Math.round((totalVal - paidAcompte) * 100) / 100;
  document.getElementById('receiptTotal').textContent = `EUR${totalVal}`;
  document.getElementById('receiptAcompte').innerHTML = `EUR${paidAcompte} <span style="color:#16a34a;font-size:0.8em;font-weight:600;">PAYE</span>`;
  document.getElementById('receiptRemaining').textContent = `EUR${remaining}`;
  document.getElementById('receiptDeposit').textContent = `EUR${deposit || 0}`;

  const receiptTitle = document.querySelector('.receipt__title');
  if (receiptTitle) receiptTitle.textContent = 'Reservation confirmee !';

  const modal = document.getElementById('confirmationModal');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  window.history.replaceState({}, '', window.location.pathname);
}

function closeModal() {
  const modal = document.getElementById('confirmationModal');
  modal.classList.remove('active');
  document.body.style.overflow = '';

  // Reset everything
  document.getElementById('bookingForm')?.reset();
  Object.keys(cart).forEach(k => delete cart[k]);
  saveCart();
  renderCart();
  updateRecap();
  initDateDefaults();
  goToStep(1);
}

// ============================================
//  PARTICIPANTS
// ============================================

function initParticipants() {
  // Start with 2 participants by default
  addParticipantCard('adult');
  addParticipantCard('adult');

  document.getElementById('addParticipant')?.addEventListener('click', () => {
    addParticipantCard('adult');
  });
}

function addParticipantCard(defaultType) {
  participantCount++;
  const idx = participantCount;
  const list = document.getElementById('participantsList');
  if (!list) return;

  const card = document.createElement('div');
  card.className = 'participant-card';
  card.dataset.idx = idx;
  card.innerHTML = `
    <div class="participant-card__header">
      <span class="participant-card__label">Participant ${idx}</span>
      ${idx > 1 ? '<button type="button" class="participant-card__remove" title="Supprimer">✕</button>' : ''}
    </div>
    <div class="participant-card__fields">
      <div class="participant-card__field">
        <label for="pType${idx}">Profil</label>
        <select id="pType${idx}" name="pType${idx}">
          <option value="man"${defaultType === 'adult' ? ' selected' : ''}>Homme</option>
          <option value="woman">Femme</option>
          <option value="child">Enfant</option>
        </select>
      </div>
      <div class="participant-card__field">
        <label for="pHeight${idx}">Taille (cm)</label>
        <input type="number" id="pHeight${idx}" name="pHeight${idx}" placeholder="ex: 175" min="80" max="210">
      </div>
      <div class="participant-card__field participant-card__field--age" id="pAgeGroup${idx}" style="display:none">
        <label for="pAge${idx}">Age</label>
        <input type="number" id="pAge${idx}" name="pAge${idx}" placeholder="ex: 8" min="1" max="17">
      </div>
    </div>
    <div class="participant-card__options">
      <label class="participant-card__toggle">
        <input type="checkbox" id="pEbike${idx}" name="pEbike${idx}">
        Velo electrique
      </label>
      <label class="participant-card__toggle">
        <input type="checkbox" id="pHelmet${idx}" name="pHelmet${idx}" checked>
        Casque
      </label>
    </div>
  `;

  list.appendChild(card);

  // Show/hide age field based on type
  const typeSelect = card.querySelector(`#pType${idx}`);
  const ageGroup = card.querySelector(`#pAgeGroup${idx}`);
  const ebikeCheckbox = card.querySelector(`#pEbike${idx}`);

  typeSelect.addEventListener('change', () => {
    const isChild = typeSelect.value === 'child';
    ageGroup.style.display = isChild ? '' : 'none';
    if (isChild) {
      ebikeCheckbox.checked = false;
      ebikeCheckbox.disabled = true;
    } else {
      ebikeCheckbox.disabled = false;
    }
    updateParticipantLabels();
  });

  // Remove button
  const removeBtn = card.querySelector('.participant-card__remove');
  removeBtn?.addEventListener('click', () => {
    card.remove();
    updateParticipantLabels();
  });

  updateParticipantLabels();
}

function updateParticipantLabels() {
  const cards = document.querySelectorAll('.participant-card');
  cards.forEach((card, i) => {
    const label = card.querySelector('.participant-card__label');
    const typeSelect = card.querySelector('select[id^="pType"]');
    const typeLabels = { man: 'Homme', woman: 'Femme', child: 'Enfant' };
    const type = typeSelect ? typeLabels[typeSelect.value] || '' : '';
    label.textContent = `Participant ${i + 1}${type ? ' — ' + type : ''}`;
  });
}

function getParticipantsData() {
  const cards = document.querySelectorAll('.participant-card');
  const participants = [];
  cards.forEach(card => {
    const idx = card.dataset.idx;
    participants.push({
      type: document.getElementById(`pType${idx}`)?.value || 'man',
      height: document.getElementById(`pHeight${idx}`)?.value || '',
      age: document.getElementById(`pAge${idx}`)?.value || '',
      ebike: document.getElementById(`pEbike${idx}`)?.checked || false,
      helmet: document.getElementById(`pHelmet${idx}`)?.checked || false
    });
  });
  return participants;
}

// ============================================
//  FAQ
// ============================================

function initFAQ() {
  document.querySelectorAll('.faq-item__question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const isActive = item.classList.contains('active');
      document.querySelectorAll('.faq-item').forEach(i => {
        i.classList.remove('active');
        i.querySelector('.faq-item__question')?.setAttribute('aria-expanded', 'false');
      });
      if (!isActive) {
        item.classList.add('active');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

// ============================================
//  SCROLL ANIMATIONS
// ============================================

function initScrollAnimations() {
  const elements = document.querySelectorAll(
    '.bike-card, .step, .route-card, .review-card, .faq-item'
  );

  elements.forEach(el => el.classList.add('animate-on-scroll'));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('visible'), index * 50);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );

  elements.forEach(el => observer.observe(el));
}

// ============================================
//  HELPERS
// ============================================

function formatDateISO(date) {
  return date.toISOString().split('T')[0];
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Expose to global for onclick handlers
window.updateQty = updateQty;
window.removeFromCart = removeFromCart;
