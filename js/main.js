/* ===========================
   Velo Saint-Malo — JavaScript
   =========================== */

// --- State ---
const cart = {};

// --- DOM Ready ---
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initBikeFilters();
  initBookingButtons();
  initPricingToggle();
  initFAQ();
  initBookingForm();
  initScrollAnimations();
  initDateDefaults();
});

// --- Navigation ---
function initNavigation() {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('navMenu');

  // Scroll effect
  window.addEventListener('scroll', () => {
    nav.classList.toggle('nav--scrolled', window.scrollY > 50);
  });

  // Mobile toggle
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    menu.classList.toggle('active');
  });

  // Close menu on link click
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

// --- Booking Buttons ---
function initBookingButtons() {
  document.querySelectorAll('.add-to-booking').forEach(btn => {
    btn.addEventListener('click', () => {
      const { bike, name, price } = btn.dataset;
      addToCart(bike, name, parseInt(price));

      // Visual feedback
      const originalText = btn.textContent;
      btn.textContent = 'Ajoute !';
      btn.style.background = '#10b981';
      btn.style.borderColor = '#10b981';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
        btn.style.borderColor = '';
      }, 1000);

      // Scroll to reservation if on bike section
      const reservationSection = document.getElementById('reservation');
      if (reservationSection) {
        setTimeout(() => {
          reservationSection.scrollIntoView({ behavior: 'smooth' });
        }, 500);
      }
    });
  });
}

// --- Cart ---
function addToCart(bikeId, name, price) {
  if (cart[bikeId]) {
    cart[bikeId].qty += 1;
  } else {
    cart[bikeId] = { name, price, qty: 1 };
  }
  renderCart();
}

function updateQty(bikeId, delta) {
  if (!cart[bikeId]) return;
  cart[bikeId].qty += delta;
  if (cart[bikeId].qty <= 0) {
    delete cart[bikeId];
  }
  renderCart();
}

function renderCart() {
  const itemsEl = document.getElementById('cartItems');
  const summaryEl = document.getElementById('cartSummary');
  const subtotalEl = document.getElementById('cartSubtotal');
  const totalEl = document.getElementById('cartTotal');

  const entries = Object.entries(cart);

  if (entries.length === 0) {
    itemsEl.innerHTML = '<p class="booking-cart__empty">Aucun velo selectionne. <a href="#velos">Choisir un velo</a></p>';
    summaryEl.style.display = 'none';
    return;
  }

  let html = '';
  let subtotal = 0;

  entries.forEach(([id, item]) => {
    const lineTotal = item.price * item.qty;
    subtotal += lineTotal;
    html += `
      <div class="booking-cart__item">
        <div class="booking-cart__item-info">
          <div>
            <div class="booking-cart__item-name">${item.name}</div>
            <div class="booking-cart__item-price">&euro;${item.price}/jour</div>
          </div>
        </div>
        <div class="booking-cart__item-actions">
          <button class="booking-cart__qty-btn" onclick="updateQty('${id}', -1)">-</button>
          <span class="booking-cart__qty">${item.qty}</span>
          <button class="booking-cart__qty-btn" onclick="updateQty('${id}', 1)">+</button>
        </div>
      </div>
    `;
  });

  itemsEl.innerHTML = html;
  summaryEl.style.display = 'block';

  // Calculate days from date inputs
  const days = getBookingDays();
  const total = subtotal * days;

  subtotalEl.textContent = `€${subtotal}/jour`;
  totalEl.textContent = days > 1
    ? `€${total} (${days} jours)`
    : `€${subtotal}/jour`;
}

function getBookingDays() {
  const start = document.getElementById('dateStart').value;
  const end = document.getElementById('dateEnd').value;
  if (!start || !end) return 1;

  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 1;
}

// --- Pricing Toggle ---
function initPricingToggle() {
  const buttons = document.querySelectorAll('.pricing-toggle__btn');
  const amounts = document.querySelectorAll('.pricing-card__amount');
  const periods = document.querySelectorAll('.pricing-card__period');

  const periodLabels = {
    day: '/jour',
    weekend: '/week-end',
    week: '/semaine',
  };

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const duration = btn.dataset.duration;

      amounts.forEach(amount => {
        const price = amount.dataset[duration];
        if (price) {
          amount.textContent = `€${price}`;
        }
      });

      periods.forEach(period => {
        period.textContent = periodLabels[duration];
      });
    });
  });
}

// --- FAQ ---
function initFAQ() {
  document.querySelectorAll('.faq-item__question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const isActive = item.classList.contains('active');

      // Close all
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));

      // Toggle current
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
}

// --- Booking Form ---
function initBookingForm() {
  const form = document.getElementById('bookingForm');
  const modal = document.getElementById('confirmationModal');
  const modalClose = document.getElementById('modalClose');
  const modalOk = document.getElementById('modalOk');
  const modalDetails = document.getElementById('modalDetails');

  // Update cart total when dates change
  document.getElementById('dateStart').addEventListener('change', renderCart);
  document.getElementById('dateEnd').addEventListener('change', renderCart);

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Check if cart has items
    if (Object.keys(cart).length === 0) {
      alert('Veuillez selectionner au moins un velo avant de reserver.');
      return;
    }

    // Validate dates
    const start = document.getElementById('dateStart').value;
    const end = document.getElementById('dateEnd').value;
    if (!start || !end) {
      alert('Veuillez selectionner les dates de location.');
      return;
    }

    if (new Date(end) <= new Date(start)) {
      alert('La date de fin doit être apres la date de debut.');
      return;
    }

    // Build confirmation details
    const name = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const pickup = document.getElementById('pickupTime').value;
    const days = getBookingDays();

    let bikeList = '';
    let total = 0;
    Object.entries(cart).forEach(([, item]) => {
      const lineTotal = item.price * item.qty * days;
      total += lineTotal;
      bikeList += `${item.qty}x ${item.name} — €${lineTotal}<br>`;
    });

    const startFormatted = formatDate(start);
    const endFormatted = formatDate(end);

    modalDetails.innerHTML = `
      <strong>${name}</strong><br>
      ${email} | ${phone}<br><br>
      <strong>Velos :</strong><br>
      ${bikeList}<br>
      <strong>Dates :</strong> ${startFormatted} → ${endFormatted} (${days} jour${days > 1 ? 's' : ''})<br>
      <strong>Recuperation :</strong> ${pickup}<br><br>
      <strong>Total estime : €${total}</strong>
    `;

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  });

  // Close modal
  [modalClose, modalOk].forEach(el => {
    el.addEventListener('click', () => {
      modal.classList.remove('active');
      document.body.style.overflow = '';

      // Reset form and cart
      form.reset();
      Object.keys(cart).forEach(k => delete cart[k]);
      renderCart();
      initDateDefaults();
    });
  });

  // Close on overlay click
  modal.querySelector('.modal__overlay').addEventListener('click', () => {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  });
}

// --- Date Defaults ---
function initDateDefaults() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const startInput = document.getElementById('dateStart');
  const endInput = document.getElementById('dateEnd');

  startInput.min = formatDateISO(today);
  endInput.min = formatDateISO(tomorrow);

  startInput.addEventListener('change', () => {
    const selected = new Date(startInput.value);
    const nextDay = new Date(selected);
    nextDay.setDate(nextDay.getDate() + 1);
    endInput.min = formatDateISO(nextDay);

    if (endInput.value && new Date(endInput.value) <= selected) {
      endInput.value = formatDateISO(nextDay);
    }
  });
}

// --- Scroll Animations ---
function initScrollAnimations() {
  const elements = document.querySelectorAll(
    '.bike-card, .step, .pricing-card, .route-card, .review-card, .faq-item'
  );

  elements.forEach(el => el.classList.add('animate-on-scroll'));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, index * 50);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );

  elements.forEach(el => observer.observe(el));
}

// --- Helpers ---
function formatDateISO(date) {
  return date.toISOString().split('T')[0];
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Make updateQty globally accessible for onclick handlers
window.updateQty = updateQty;
