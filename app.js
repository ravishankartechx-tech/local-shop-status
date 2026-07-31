// ── State ─────────────────────────────────────────────
let shops = JSON.parse(localStorage.getItem('shopstatus_shops') || '[]');
let currentFilter  = 'all';
let currentCat     = 'all';
let currentStatus  = 'open';
let searchQuery    = '';

const CAT_LABELS = {
  grocery:    '🛒 Grocery',
  medical:    '💊 Medical',
  clinic:     '🏥 Clinic',
  restaurant: '🍽️ Restaurant',
  salon:      '✂️ Salon',
  petrol:     '⛽ Petrol',
  atm:        '🏧 ATM',
  other:      '📦 Other',
};

// ── Persistence ───────────────────────────────────────
function save() {
  localStorage.setItem('shopstatus_shops', JSON.stringify(shops));
}

// ── Helpers ───────────────────────────────────────────
function timeAgo(ts) {
  const diff  = Date.now() - ts;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function statusLabel(s) {
  return { open: '🟢 Open', closed: '🔴 Closed', unknown: '⚪ Unknown' }[s] || s;
}

// ── Render ────────────────────────────────────────────
function render() {
  const feed = document.getElementById('feed');
  const emptyState = document.getElementById('emptyState');

  let filtered = shops.filter(s => {
    const matchFilter = currentFilter === 'all' || s.status === currentFilter;
    const matchCat    = currentCat === 'all' || s.category === currentCat;
    const matchSearch = !searchQuery ||
      s.name.toLowerCase().includes(searchQuery) ||
      s.area.toLowerCase().includes(searchQuery);
    return matchFilter && matchCat && matchSearch;
  });

  // Banner stats
  document.getElementById('openCount').textContent   = shops.filter(s => s.status === 'open').length;
  document.getElementById('closedCount').textContent  = shops.filter(s => s.status === 'closed').length;
  document.getElementById('totalCount').textContent   = shops.length;

  // Remove old cards
  feed.querySelectorAll('.card').forEach(c => c.remove());

  if (filtered.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  filtered.forEach(shop => feed.appendChild(createCard(shop)));
}

function createCard(shop) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = shop.id;

  const nextStatus = shop.status === 'open' ? 'closed' : 'open';
  const toggleLabel = shop.status === 'open' ? '🔴 Mark Closed' : '🟢 Mark Open';

  card.innerHTML = `
    <div class="card-stripe ${shop.status}"></div>
    <div class="card-top">
      <span class="status-badge ${shop.status}">
        <span class="dot-pulse"></span>
        ${shop.status === 'open' ? 'Open Now' : shop.status === 'closed' ? 'Closed' : 'Unknown'}
      </span>
      <span class="cat-tag">${CAT_LABELS[shop.category] || '📦 Other'}</span>
    </div>
    <div class="card-body">
      <div class="card-name">${escapeHTML(shop.name)}</div>
      <div class="card-area">📍 ${escapeHTML(shop.area)}</div>
      ${shop.note ? `<div class="card-note">${escapeHTML(shop.note)}</div>` : ''}
    </div>
    <div class="card-confirm">
      <span class="confirm-label">Helpful?</span>
      <button class="thumb-btn ${shop.myVote ? 'voted' : ''}" data-id="${shop.id}">
        👍 <span class="thumb-count">${shop.confirms || 0}</span>
      </button>
    </div>
    <div class="card-footer">
      <div class="card-meta">
        <span class="card-reporter">👤 ${escapeHTML(shop.reporter)}</span>
        <span class="card-time">${timeAgo(shop.updatedAt || shop.createdAt)}</span>
      </div>
      <div class="card-actions">
        <button class="btn-toggle-status" data-id="${shop.id}" data-next="${nextStatus}">${toggleLabel}</button>
        <button class="btn-delete" data-id="${shop.id}" title="Delete">🗑</button>
      </div>
    </div>
  `;

  card.querySelector('.thumb-btn').addEventListener('click', () => toggleConfirm(shop.id));
  card.querySelector('.btn-toggle-status').addEventListener('click', () => toggleStatus(shop.id, nextStatus));
  card.querySelector('.btn-delete').addEventListener('click', () => deleteShop(shop.id));

  return card;
}

// ── Actions ───────────────────────────────────────────
function addShop(data) {
  const shop = {
    id: Date.now().toString(),
    ...data,
    confirms: 0,
    myVote: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  shops.unshift(shop);
  save();
  render();
}

function toggleStatus(id, newStatus) {
  shops = shops.map(s =>
    s.id === id ? { ...s, status: newStatus, updatedAt: Date.now() } : s
  );
  save();
  render();
  const msg = newStatus === 'open' ? '🟢 Marked as Open!' : '🔴 Marked as Closed!';
  showToast(msg);
}

function toggleConfirm(id) {
  shops = shops.map(s => {
    if (s.id !== id) return s;
    const myVote   = !s.myVote;
    const confirms = myVote ? (s.confirms || 0) + 1 : Math.max(0, (s.confirms || 1) - 1);
    return { ...s, myVote, confirms };
  });
  save();
  render();
}

function deleteShop(id) {
  shops = shops.filter(s => s.id !== id);
  save();
  render();
  showToast('🗑 Shop removed');
}

// ── Modal ─────────────────────────────────────────────
function openModal() {
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('shopName').focus();
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  resetForm();
}

function resetForm() {
  document.getElementById('shopName').value = '';
  document.getElementById('shopArea').value = '';
  document.getElementById('shopNote').value = '';
  document.getElementById('reporterName').value = '';
  document.getElementById('shopCat').value = 'grocery';
  document.getElementById('noteCount').textContent = '0/200';
  setStatus('open');
}

function setStatus(status) {
  currentStatus = status;
  document.querySelectorAll('.status-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.status === status);
  });
}

// ── Toast ─────────────────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ── Events ────────────────────────────────────────────
document.getElementById('openModal').addEventListener('click', openModal);
document.getElementById('openModalEmpty')?.addEventListener('click', openModal);
document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);

document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});

document.querySelectorAll('.status-btn').forEach(btn => {
  btn.addEventListener('click', () => setStatus(btn.dataset.status));
});

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', function () {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    currentFilter = this.dataset.filter;
    render();
  });
});

document.querySelectorAll('.cat-pill').forEach(pill => {
  pill.addEventListener('click', function () {
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
    this.classList.add('active');
    currentCat = this.dataset.cat;
    render();
  });
});

document.getElementById('searchInput').addEventListener('input', function () {
  searchQuery = this.value.trim().toLowerCase();
  render();
});

document.getElementById('shopNote').addEventListener('input', function () {
  document.getElementById('noteCount').textContent = `${this.value.length}/200`;
});

document.getElementById('submitBtn').addEventListener('click', () => {
  const name     = document.getElementById('shopName').value.trim();
  const area     = document.getElementById('shopArea').value.trim();
  const note     = document.getElementById('shopNote').value.trim();
  const reporter = document.getElementById('reporterName').value.trim();
  const category = document.getElementById('shopCat').value;

  if (!name || !area || !reporter) {
    showToast('⚠️ Please fill in all required fields');
    return;
  }

  addShop({ name, area, note, reporter, category, status: currentStatus });
  closeModal();
  showToast('✅ Shop added successfully!');
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// ── Demo Data ─────────────────────────────────────────
if (shops.length === 0) {
  const now = Date.now();
  shops = [
    {
      id: '1', name: 'Sri Murugan Medical Store', category: 'medical',
      area: 'Anna Nagar', status: 'open',
      note: 'Open till 10pm today. Doctor available from 6-8pm.',
      reporter: 'Suresh', confirms: 8, myVote: false,
      createdAt: now - 1000*60*20, updatedAt: now - 1000*60*20,
    },
    {
      id: '2', name: 'Amma Mess', category: 'restaurant',
      area: 'T. Nagar', status: 'closed',
      note: 'Closed today for Pongal holiday. Opens tomorrow.',
      reporter: 'Deepa', confirms: 5, myVote: false,
      createdAt: now - 1000*60*60, updatedAt: now - 1000*60*60,
    },
    {
      id: '3', name: 'Reliance Fresh', category: 'grocery',
      area: 'Velachery', status: 'open',
      note: 'Open as usual, 8am to 10pm.',
      reporter: 'Ramesh', confirms: 11, myVote: false,
      createdAt: now - 1000*60*45, updatedAt: now - 1000*60*45,
    },
    {
      id: '4', name: 'Indian Bank ATM', category: 'atm',
      area: 'Adyar', status: 'closed',
      note: 'Machine out of cash since morning.',
      reporter: 'Kavitha', confirms: 14, myVote: false,
      createdAt: now - 1000*60*90, updatedAt: now - 1000*60*90,
    },
    {
      id: '5', name: 'Style Zone Salon', category: 'salon',
      area: 'Nungambakkam', status: 'open',
      note: 'Walk-ins welcome. No waiting today.',
      reporter: 'Priya', confirms: 3, myVote: false,
      createdAt: now - 1000*60*30, updatedAt: now - 1000*60*30,
    },
    {
      id: '6', name: 'HP Petrol Bunk', category: 'petrol',
      area: 'Porur', status: 'unknown',
      note: 'Not sure if open, someone please confirm.',
      reporter: 'Arun', confirms: 1, myVote: false,
      createdAt: now - 1000*60*120, updatedAt: now - 1000*60*120,
    },
  ];
  save();
}

// ── Init ──────────────────────────────────────────────
render();
setInterval(render, 60000);
