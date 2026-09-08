/* ═══════════════════════════════════════════════════════
   TravelPlanner AI — Chatbot conversation engine
═══════════════════════════════════════════════════════ */

/* ── DOM ── */
const messagesEl = document.getElementById('chatMessages');
const chatForm   = document.getElementById('chatForm');
const chatInput  = document.getElementById('chatInput');
const btnSend    = document.getElementById('btnSend');
const chipRow    = document.getElementById('chipRow');
const btnNewChat = document.getElementById('btnNewChat');
const chatStatus = document.getElementById('chatStatus');

/* ══════════════════════════════════════════════════════
   CONVERSATION STATE MACHINE
══════════════════════════════════════════════════════ */
const STEPS = ['destination', 'budget', 'days', 'travel_type', 'confirm'];

const state = {
  step: 0,
  destination: '',
  budget: 0,
  days: 0,
  travel_type: '',
};

const TRAVEL_TYPES = {
  beach:     { label: '🏖 Beach',     chip: '🏖 Beach & Relaxation' },
  adventure: { label: '🧗 Adventure', chip: '🧗 Adventure & Outdoors' },
  cultural:  { label: '🏛 Cultural',  chip: '🏛 Cultural & Historical' },
  luxury:    { label: '💎 Luxury',    chip: '💎 Luxury & Premium' },
  budget:    { label: '🎒 Budget',    chip: '🎒 Budget & Backpacking' },
};

const BOT_AVATAR_SVG = `<svg viewBox="0 0 32 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect y="0" width="32" height="3" fill="currentColor"/>
  <rect x="6" y="5" width="20" height="3" fill="currentColor"/>
  <rect x="6" y="10" width="20" height="3" fill="currentColor"/>
  <rect y="15" width="32" height="3" fill="currentColor"/>
  <rect x="6" y="20" width="20" height="3" fill="currentColor"/>
</svg>`;

/* ══════════════════════════════════════════════════════
   MESSAGE RENDERERS
══════════════════════════════════════════════════════ */
function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function addBotMessage(html, extraClass = '') {
  const row = document.createElement('div');
  row.className = `msg-row bot ${extraClass}`;
  row.innerHTML = `
    <div class="msg-avatar">${BOT_AVATAR_SVG}</div>
    <div>
      <div class="msg-bubble">${html}</div>
      <div class="msg-time">${now()}</div>
    </div>`;
  messagesEl.appendChild(row);
  scrollBottom();
  return row;
}

function addUserMessage(text) {
  const row = document.createElement('div');
  row.className = 'msg-row user';
  row.innerHTML = `
    <div>
      <div class="msg-bubble">${escHtml(text)}</div>
      <div class="msg-time">${now()}</div>
    </div>`;
  messagesEl.appendChild(row);
  scrollBottom();
}

function addTyping() {
  const row = document.createElement('div');
  row.className = 'msg-row bot';
  row.id = 'typingRow';
  row.innerHTML = `
    <div class="msg-avatar">${BOT_AVATAR_SVG}</div>
    <div class="msg-bubble typing-indicator">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>`;
  messagesEl.appendChild(row);
  scrollBottom();
  setStatusTyping(true);
}

function removeTyping() {
  const el = document.getElementById('typingRow');
  if (el) el.remove();
  setStatusTyping(false);
}

function setStatusTyping(on) {
  chatStatus.innerHTML = on
    ? `<span class="status-dot typing"></span> Typing…`
    : `<span class="status-dot online"></span> Online · Powered by IBM Granite`;
}

function scrollBottom() {
  const main = document.querySelector('.chat-main');
  setTimeout(() => { main.scrollTop = main.scrollHeight; }, 50);
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setChips(chips) {
  chipRow.innerHTML = '';
  chips.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.type = 'button';
    btn.textContent = c.label;
    btn.addEventListener('click', () => handleChip(c.value, c.label));
    chipRow.appendChild(btn);
  });
}

function clearChips() { chipRow.innerHTML = ''; }

/* ══════════════════════════════════════════════════════
   CONVERSATION FLOW
══════════════════════════════════════════════════════ */
function startConversation() {
  messagesEl.innerHTML = '';
  clearChips();
  Object.assign(state, { step: 0, destination: '', budget: 0, days: 0, travel_type: '' });
  chatInput.disabled = false;
  chatInput.placeholder = 'Type your destination…';

  setTimeout(() => addBotMessage(`
    <strong>👋 Hello! I'm TravelPlanner AI</strong> — powered by IBM Granite.<br><br>
    I'll help you plan the perfect trip in just a few questions.<br>
    Let's start: <strong>Where would you like to go?</strong>
  `), 200);
}

function askBudget() {
  clearChips();
  chatInput.placeholder = 'e.g. 2000';
  setTimeout(() => addBotMessage(`
    Great choice! <strong>${escHtml(state.destination)}</strong> is amazing. ✈️<br><br>
    What is your <strong>total budget</strong> for the trip in <strong>USD</strong>?
    <br><small style="color:#8d8d8d">Enter a number, e.g. <em>1500</em> or <em>5000</em></small>
  `), 400);
}

function askDays() {
  clearChips();
  chatInput.placeholder = 'e.g. 7';
  setChips([
    { label: '3 days', value: '3' },
    { label: '5 days', value: '5' },
    { label: '7 days', value: '7' },
    { label: '10 days', value: '10' },
    { label: '14 days', value: '14' },
  ]);
  setTimeout(() => addBotMessage(`
    Budget of <strong>$${Number(state.budget).toLocaleString()}</strong> noted 💰<br><br>
    How many <strong>days</strong> are you planning to travel?
  `), 400);
}

function askTravelType() {
  clearChips();
  chatInput.placeholder = 'Type a style or pick one below';
  setChips(Object.keys(TRAVEL_TYPES).map(k => ({
    label: TRAVEL_TYPES[k].chip,
    value: k,
  })));
  setTimeout(() => addBotMessage(`
    <strong>${state.days} days</strong> — that's a great trip! 📅<br><br>
    What kind of travel experience are you looking for?
    <br><small style="color:#8d8d8d">Pick one below or type it</small>
  `), 400);
}

function askConfirm() {
  clearChips();
  chatInput.placeholder = 'yes / no';
  const type = TRAVEL_TYPES[state.travel_type]?.label || state.travel_type;
  setChips([
    { label: '✅ Yes, generate my plan!', value: 'yes' },
    { label: '🔄 Start over', value: 'no' },
  ]);
  setTimeout(() => addBotMessage(`
    <div class="summary-card">
      <div class="summary-title">📋 Trip Summary</div>
      <div class="summary-meta">
        Here's what I'll plan for you:
      </div>
      <div class="summary-badges" style="margin-top:10px">
        <span class="sbadge">📍 ${escHtml(state.destination)}</span>
        <span class="sbadge">💰 $${Number(state.budget).toLocaleString()}</span>
        <span class="sbadge">📅 ${state.days} days</span>
        <span class="sbadge">${type}</span>
      </div>
    </div>
    Shall I generate your personalised travel plan? ✨
  `), 400);
}

async function generatePlan() {
  clearChips();
  chatInput.disabled = true;
  btnSend.disabled = true;

  setTimeout(() => addBotMessage(`
    <svg style="vertical-align:middle;margin-right:6px" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue-60)" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
    <strong>Generating your travel plan with IBM Granite AI…</strong><br>
    <small style="color:#8d8d8d">Crafting hotels, itinerary, budget & tips — this may take a moment.</small>
  `), 300);

  addTyping();

  try {
    const res = await fetch('/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination: state.destination,
        budget:      state.budget,
        days:        state.days,
        travel_type: state.travel_type,
      }),
    });
    if (!res.ok) throw new Error('Server error ' + res.status);
    const data = await res.json();
    removeTyping();
    renderPlanInChat(data);
  } catch (err) {
    removeTyping();
    addBotMessage(`❌ Something went wrong. Please try again or start a new chat.`);
    console.error(err);
  } finally {
    chatInput.disabled = false;
    btnSend.disabled = false;
    chatInput.placeholder = 'Ask a follow-up question or start a new plan…';
  }
}

/* ══════════════════════════════════════════════════════
   INPUT HANDLER
══════════════════════════════════════════════════════ */
function handleChip(value, label) {
  addUserMessage(label);
  clearChips();
  processInput(value);
}

chatForm.addEventListener('submit', e => {
  e.preventDefault();
  const val = chatInput.value.trim();
  if (!val) return;
  chatInput.value = '';
  addUserMessage(val);
  clearChips();
  processInput(val);
});

function processInput(raw) {
  const val = raw.trim();
  const step = STEPS[state.step];

  if (step === 'destination') {
    if (val.length < 2) {
      addBotMessage(`Please enter a valid destination (at least 2 characters).`);
      return;
    }
    state.destination = val.charAt(0).toUpperCase() + val.slice(1);
    state.step++;
    askBudget();

  } else if (step === 'budget') {
    const n = parseInt(val.replace(/[^0-9]/g, ''), 10);
    if (!n || n < 50) {
      addBotMessage(`Please enter a valid budget (minimum $50 USD).`);
      return;
    }
    state.budget = n;
    state.step++;
    askDays();

  } else if (step === 'days') {
    const n = parseInt(val, 10);
    if (!n || n < 1 || n > 60) {
      addBotMessage(`Please enter a number of days between 1 and 60.`);
      return;
    }
    state.days = n;
    state.step++;
    askTravelType();

  } else if (step === 'travel_type') {
    const lower = val.toLowerCase();
    const match = Object.keys(TRAVEL_TYPES).find(k =>
      lower.includes(k) || TRAVEL_TYPES[k].chip.toLowerCase().includes(lower)
    );
    if (!match) {
      addBotMessage(`Please choose a travel style: Beach, Adventure, Cultural, Luxury, or Budget.`);
      setChips(Object.keys(TRAVEL_TYPES).map(k => ({
        label: TRAVEL_TYPES[k].chip, value: k,
      })));
      return;
    }
    state.travel_type = match;
    state.step++;
    askConfirm();

  } else if (step === 'confirm') {
    const lower = val.toLowerCase();
    if (lower.startsWith('y') || lower.includes('yes') || lower.includes('generate')) {
      state.step++;
      generatePlan();
    } else {
      startConversation();
    }

  } else {
    // Post-plan free chat
    addBotMessage(`Your plan for <strong>${escHtml(state.destination)}</strong> is ready above! 👆<br>
      Click <strong>New Chat</strong> in the header to plan another trip.`);
  }
}

/* ══════════════════════════════════════════════════════
   RENDER PLAN AS CHAT CARDS
══════════════════════════════════════════════════════ */
function renderPlanInChat(data) {
  // 1 — greeting card
  const type = TRAVEL_TYPES[data.travel_type.toLowerCase()]?.label || data.travel_type;
  addBotMessage(`
    ✅ <strong>Your trip to ${escHtml(data.destination)} is ready!</strong><br>
    <small style="color:#8d8d8d">${data.days} days · ${data.travel_type} · Budget $${Number(data.budget.total).toLocaleString()}
    ${data.ai_powered ? ' · <span style="color:var(--blue-60);font-weight:600">✦ IBM Granite AI</span>' : ''}</small>
  `);

  // 2 — big tabbed result bubble
  const uid = 'plan_' + Date.now();
  const row = document.createElement('div');
  row.className = 'msg-row bot result-bubble';
  row.style.alignItems = 'flex-start';

  const tabs = [
    { id: 'hotels',    icon: '🏨', label: 'Hotels'    },
    { id: 'itinerary', icon: '🗓', label: 'Itinerary' },
    { id: 'budget',    icon: '💰', label: 'Budget'    },
    { id: 'places',    icon: '📍', label: 'Places'    },
    { id: 'tips',      icon: '💡', label: 'Tips'      },
  ];

  row.innerHTML = `
    <div class="msg-avatar">${BOT_AVATAR_SVG}</div>
    <div style="flex:1;min-width:0">
      <div class="msg-bubble">
        <nav class="result-tabs">
          ${tabs.map((t, i) => `
            <button class="rtab${i === 0 ? ' active' : ''}" data-uid="${uid}" data-panel="${uid}_${t.id}">
              ${t.icon} ${t.label}
            </button>`).join('')}
        </nav>
        ${tabs.map((t, i) => `
          <div id="${uid}_${t.id}" class="rpanel${i === 0 ? '' : ' hidden'}"></div>
        `).join('')}
      </div>
      <div class="msg-time">${now()}</div>
    </div>`;

  messagesEl.appendChild(row);

  // tab switching scoped to this result block
  row.querySelectorAll('.rtab').forEach(btn => {
    btn.addEventListener('click', () => {
      row.querySelectorAll('.rtab').forEach(b => b.classList.remove('active'));
      row.querySelectorAll('.rpanel').forEach(p => p.classList.add('hidden'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.panel).classList.remove('hidden');
    });
  });

  // fill panels
  fillHotels(document.getElementById(`${uid}_hotels`), data.hotels, data.days);
  fillItinerary(document.getElementById(`${uid}_itinerary`), data.itinerary);
  fillBudget(document.getElementById(`${uid}_budget`), data.budget);
  fillPlaces(document.getElementById(`${uid}_places`), data.places);
  fillTips(document.getElementById(`${uid}_tips`), data.tips);

  scrollBottom();

  // post-plan tip
  setTimeout(() => {
    addBotMessage(`💬 Need anything else? Ask me a follow-up, or hit <strong>New Chat</strong> to plan another trip!`);
  }, 800);
}

/* ── Hotels ── */
const HOTEL_ICONS = ['🏨','🏩','🛎'];

function fillHotels(el, hotels, days) {
  el.innerHTML = `<div class="hotel-grid">${hotels.map((h, i) => `
    <div class="hotel-card ${i === 0 ? 'top' : ''}">
      <div class="hotel-stripe"></div>
      <div class="hotel-body">
        <div class="hotel-top">
          <span class="hotel-icon">${HOTEL_ICONS[i] || '🏨'}</span>
          ${i === 0 ? '<span class="hotel-badge">★ Top Pick</span>' : ''}
        </div>
        <div class="hotel-name">${escHtml(h.name)}</div>
        <div class="hotel-meta">
          <span class="tag-rating">★ ${Number(h.rating).toFixed(1)}</span>
          <span class="tag-price">$${h.price_per_night}/night</span>
          <span style="font-size:.72rem;color:#8d8d8d">≈$${h.price_per_night * days} total</span>
        </div>
        ${h.highlight ? `<div class="hotel-highlight">${escHtml(h.highlight)}</div>` : ''}
        <div class="amenity-row">${(h.amenities || []).map(a => `<span class="amenity">${escHtml(a)}</span>`).join('')}</div>
      </div>
    </div>`).join('')}</div>`;
}

/* ── Itinerary ── */
function fillItinerary(el, itinerary) {
  el.innerHTML = `<div class="day-list">${itinerary.map(d => `
    <div class="day-card">
      <div class="day-head">
        <div class="day-num">D${d.day}</div>
        <div class="day-title">${escHtml(d.theme)}</div>
      </div>
      <div class="day-body">
        <div class="day-slot"><span class="slot-label m">Morning</span><span class="slot-text">${escHtml(d.morning || '—')}</span></div>
        <div class="day-slot"><span class="slot-label a">Afternoon</span><span class="slot-text">${escHtml(d.afternoon || '—')}</span></div>
        <div class="day-slot"><span class="slot-label e">Evening</span><span class="slot-text">${escHtml(d.evening || '—')}</span></div>
      </div>
    </div>`).join('')}</div>`;
}

/* ── Budget ── */
const BMETA = {
  accommodation: { icon: '🏨', color: '#0f62fe', bg: '#edf5ff' },
  food:          { icon: '🍽', color: '#198038', bg: '#defbe6' },
  activities:    { icon: '🎯', color: '#8a3ffc', bg: '#f6f2ff' },
  transport:     { icon: '🚌', color: '#00539a', bg: '#e5f6ff' },
  shopping:      { icon: '🛍', color: '#9f1853', bg: '#fff0f7' },
  miscellaneous: { icon: '💼', color: '#6f6f6f', bg: '#f4f4f4' },
};

function fillBudget(el, budget) {
  const keys  = ['accommodation','food','activities','transport','shopping','miscellaneous'];
  const total = Number(budget.total) || 1;

  const bars = keys.map(k => {
    const val  = Number(budget[k]) || 0;
    const pct  = Math.round((val / total) * 100);
    const m    = BMETA[k];
    return `
      <div class="brow">
        <div class="b-icon" style="background:${m.bg};color:${m.color}">${m.icon}</div>
        <div class="b-info">
          <div class="b-hdr">
            <span class="b-name">${k.charAt(0).toUpperCase() + k.slice(1)}</span>
            <span class="b-val">$${val.toLocaleString()} <small style="font-weight:400;color:#8d8d8d;font-family:inherit">(${pct}%)</small></span>
          </div>
          <div class="b-track">
            <div class="b-fill" style="width:0%;background:${m.color}" data-w="${pct}"></div>
          </div>
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div class="budget-wrap">
      <div class="budget-top">
        <div>
          <div class="budget-total-label">Total Budget</div>
          <div class="budget-total-amt">$${total.toLocaleString()}</div>
          <div class="budget-total-sub">All-inclusive estimate</div>
        </div>
        <div class="budget-icon-big">💰</div>
      </div>
      <div class="budget-bars">${bars}</div>
    </div>`;

  requestAnimationFrame(() => {
    el.querySelectorAll('.b-fill').forEach(b => { b.style.width = b.dataset.w + '%'; });
  });
}

/* ── Places ── */
const PLACE_ICONS = ['🗺','🏔','🌊','🌴','🏛','🌅','🎭','🏝','🌺','🦁'];

function fillPlaces(el, places) {
  el.innerHTML = `<div class="places-grid">${places.map((p, i) => {
    const name = typeof p === 'object' ? p.name : p;
    const desc = typeof p === 'object' ? p.desc : '';
    return `
      <div class="place-card">
        <div class="place-top">
          <div class="place-ico">${PLACE_ICONS[i % PLACE_ICONS.length]}</div>
          <div class="place-name">${escHtml(name)}</div>
        </div>
        ${desc ? `<div class="place-desc">${escHtml(desc)}</div>` : ''}
      </div>`;
  }).join('')}</div>`;
}

/* ── Tips ── */
const TIP_CATS = ['Essentials','Safety','Local Insight','Planning','Smart Travel'];

function fillTips(el, tips) {
  el.innerHTML = `<div class="tips-grid">${tips.map((t, i) => `
    <div class="tip-card">
      <div class="tip-num">${i + 1}</div>
      <div class="tip-inner">
        <div class="tip-cat">${TIP_CATS[i] || 'Tip'}</div>
        <div class="tip-txt">${escHtml(t)}</div>
      </div>
    </div>`).join('')}</div>`;
}

/* ══════════════════════════════════════════════════════
   NEW CHAT
══════════════════════════════════════════════════════ */
btnNewChat.addEventListener('click', startConversation);

/* ══════════════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════════════ */
startConversation();
