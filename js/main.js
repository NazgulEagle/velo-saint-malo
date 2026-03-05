/* ===========================
   Velo Saint-Malo — JavaScript
   =========================== */

// --- State ---
const cart = {};
let currentStep = 1;

// --- DOM Ready ---
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initBikeFilters();
  initBookingButtons();
  initFAQ();
  initBookingWizard();
  initScrollAnimations();
  initDateDefaults();
});

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
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-to-booking');
    if (!btn) return;

    const { bike, name, price } = btn.dataset;
    addToCart(bike, name, parseInt(price));

    // Visual feedback
    const original = btn.textContent;
    const originalBg = btn.style.background;
    btn.textContent = '✓';
    btn.style.background = '#10b981';
    btn.style.borderColor = '#10b981';
    setTimeout(() => {
      btn.textContent = original;
      btn.style.background = originalBg;
      btn.style.borderColor = '';
    }, 800);
  });
}

// ============================================
//  CART SYSTEM
// ============================================

function addToCart(bikeId, name, price) {
  if (cart[bikeId]) {
    cart[bikeId].qty += 1;
  } else {
    cart[bikeId] = { name, price, qty: 1 };
  }
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
  renderCart();
  updateRecap();
}

function removeFromCart(bikeId) {
  delete cart[bikeId];
  renderCart();
  updateRecap();
}

function getCartTotals() {
  const entries = Object.entries(cart);
  let dailyTotal = 0;
  let itemCount = 0;
  let hasEbike = false;

  entries.forEach(([id, item]) => {
    dailyTotal += item.price * item.qty;
    itemCount += item.qty;
    if (['moustache-28', 'trek-verve', 'cube-touring', 'cube-stereo', 'babboe-cargo'].includes(id)) {
      hasEbike = true;
    }
  });

  const days = getBookingDays();

  // Discount: 3+ days = 10%, 7+ days = 20%
  let discountPct = 0;
  if (days >= 7) discountPct = 20;
  else if (days >= 3) discountPct = 10;

  const subtotal = dailyTotal * days;
  const discount = Math.round(subtotal * discountPct / 100);
  const total = subtotal - discount;

  // Deposit: €300 for e-bikes, €150 for regular
  const deposit = hasEbike ? 300 : (itemCount > 0 ? 150 : 0);

  return { dailyTotal, itemCount, days, discountPct, discount, subtotal, total, deposit, entries };
}

function renderCart() {
  const itemsEl = document.getElementById('cartItems');
  const summaryEl = document.getElementById('cartSummary');
  const emptyEl = document.getElementById('cartEmpty');
  const countEl = document.getElementById('cartCount');

  const { dailyTotal, itemCount, days, discountPct, discount, subtotal, total, deposit, entries } = getCartTotals();

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
  entries.forEach(([id, item]) => {
    const lineTotal = item.price * item.qty;
    html += `
      <div class="booking-cart__item">
        <div class="booking-cart__item-info">
          <div class="booking-cart__item-name">${item.name}</div>
          <div class="booking-cart__item-price">${item.qty} x €${item.price}/jour = <strong>€${lineTotal}/jour</strong></div>
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
  document.getElementById('cartTotal').textContent = days > 1
    ? `€${total}`
    : `€${dailyTotal}/jour`;

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

    if (startInput.value && endInput.value && days > 0) {
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
  if (start && end) {
    const days = getBookingDays();
    recapDates.innerHTML = `
      <div>${formatDate(start)} → ${formatDate(end)}</div>
      <div class="booking-recap__days">${days} jour${days > 1 ? 's' : ''}${pickup ? ` — recuperation ${pickup}` : ''}</div>
    `;
  }

  // Items
  const { total, deposit, entries } = getCartTotals();
  if (entries.length > 0) {
    recapItems.innerHTML = entries.map(([, item]) =>
      `<div class="booking-recap__item">${item.qty}x ${item.name} <span>€${item.price * item.qty}/j</span></div>`
    ).join('');
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

  // Date end
  const end = document.getElementById('dateEnd').value;
  if (!end) {
    showError('dateEnd', 'Veuillez choisir une date de retour');
    valid = false;
  } else if (start && new Date(end) <= new Date(start)) {
    showError('dateEnd', 'La date de retour doit être apres la date de debut');
    valid = false;
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
  const groupSize = document.getElementById('groupSize').value;
  const notes = document.getElementById('notes').value.trim();
  const start = document.getElementById('dateStart').value;
  const end = document.getElementById('dateEnd').value;
  const pickup = document.getElementById('pickupTime').value;
  const returnTime = document.getElementById('returnTime').value;

  const { days, discountPct, discount, total, deposit, entries } = getCartTotals();

  // Generate reference
  const ref = 'VSM-' + Date.now().toString(36).toUpperCase().slice(-6);

  // Fill receipt
  document.getElementById('receiptRef').textContent = ref;
  document.getElementById('receiptName').textContent = `${firstName} ${lastName}`;
  document.getElementById('receiptEmail').textContent = email;
  document.getElementById('receiptPhone').textContent = phone;

  // Group
  const groupRow = document.getElementById('receiptGroupRow');
  if (groupSize !== '1') {
    groupRow.style.display = '';
    document.getElementById('receiptGroup').textContent = `${groupSize} personne${groupSize === '2' ? 's' : 's'}`;
  }

  // Dates
  document.getElementById('receiptDateStart').textContent = formatDate(start);
  document.getElementById('receiptDateEnd').textContent = formatDate(end);
  document.getElementById('receiptDuration').textContent = `${days} jour${days > 1 ? 's' : ''}`;
  document.getElementById('receiptPickup').textContent = pickup;
  document.getElementById('receiptReturn').textContent = returnTime === 'flexible' ? 'Flexible (avant fermeture)' : returnTime;

  // Items
  const itemsHtml = entries.map(([, item]) => {
    const lineTotal = item.price * item.qty * days;
    let discountedTotal = lineTotal;
    if (discountPct > 0) {
      discountedTotal = Math.round(lineTotal * (100 - discountPct) / 100);
    }
    return `
      <div class="receipt__row">
        <span>${item.qty}x ${item.name}</span>
        <span>${discountPct > 0 ? `<s>€${lineTotal}</s> ` : ''}€${discountedTotal}</span>
      </div>
      <div class="receipt__row receipt__row--sub">
        <span>${item.qty} x €${item.price}/jour x ${days} jour${days > 1 ? 's' : ''}</span>
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

  // Total & deposit
  document.getElementById('receiptTotal').textContent = `€${total}`;
  document.getElementById('receiptDeposit').textContent = `€${deposit}`;

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

  // Show modal
  const modal = document.getElementById('confirmationModal');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const modal = document.getElementById('confirmationModal');
  modal.classList.remove('active');
  document.body.style.overflow = '';

  // Reset everything
  document.getElementById('bookingForm')?.reset();
  Object.keys(cart).forEach(k => delete cart[k]);
  renderCart();
  updateRecap();
  initDateDefaults();
  goToStep(1);
}

// ============================================
//  FAQ
// ============================================

function initFAQ() {
  document.querySelectorAll('.faq-item__question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const isActive = item.classList.contains('active');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
      if (!isActive) item.classList.add('active');
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
