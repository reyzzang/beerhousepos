// history.js - Reports, shifts, financial math, and sales logs

import { getCurrentUser, getShifts, isAdmin, calculateShiftFinancials } from './auth.js';

export function getSales() {
  return JSON.parse(localStorage.getItem('sales') || '[]');
}

export function getDailySummaries() {
  return JSON.parse(localStorage.getItem('dailySummaries') || '[]');
}

export function renderHistoryPage() {
  const content = document.getElementById('main-content');
  if (!content) return;

  content.innerHTML = `
    <div class="page-header">
      <h1>ისტორია და სტატისტიკა</h1>
    </div>

    <div class="tabs">
      <button class="tab active" data-tab="sales">გაყიდვების ისტორია</button>
      <button class="tab" data-tab="stats">სტატისტიკა</button>
      <button class="tab" data-tab="shifts">ცვლები</button>
      <button class="tab" data-tab="daily">დღიური შეჯამება</button>
    </div>

    <div class="tab-content active" id="tab-sales">
      <div class="card">
        <div class="filters">
          <button class="btn btn-outline filter-btn active" data-filter="today">დღეს</button>
          <button class="btn btn-outline filter-btn" data-filter="week">ამ კვირაში</button>
          <button class="btn btn-outline filter-btn" data-filter="month">ამ თვეში</button>
          <button class="btn btn-outline filter-btn" data-filter="year">ამ წელს</button>
          <button class="btn btn-outline filter-btn" data-filter="all">ყველა</button>
        </div>
        <div class="table-responsive mt-2">
          <table class="data-table" id="sales-table">
            <thead>
              <tr>
                <th>თარიღი/დრო</th>
                <th>თანამშრომელი</th>
                <th>პროდუქტები</th>
                <th>ჯამი</th>
                <th>გადახდა</th>
                ${isAdmin() ? '<th>მოქმედება</th>' : ''}
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="tab-content" id="tab-stats">
      <div class="card">
        <h2>ყველაზე გაყიდვადი პროდუქტები</h2>
        <div class="table-responsive">
          <table class="data-table" id="stats-table">
            <thead>
              <tr>
                <th>#</th>
                <th>პროდუქტი</th>
                <th>გაყიდული რაოდენობა</th>
                <th>ჯამური შემოსავალი</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="tab-content" id="tab-shifts">
      <div class="card">
        <h2>ცვლების ისტორია</h2>
        <div class="table-responsive">
          <table class="data-table" id="shifts-table">
            <thead>
              <tr>
                <th>თარიღი</th>
                <th>ცვლა</th>
                <th>თანამშრომელი</th>
                <th>შესვლა</th>
                <th>გასვლა</th>
                <th>გაყიდვები</th>
                <th>ნაღდი</th>
                <th>ბარათი</th>
                <th>გამოკლება</th>
                <th>დარჩენილი ნაღდი</th>
                <th>სტატუსი</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="tab-content" id="tab-daily">
      <div class="card">
        <h2>დღიური შეჯამებები (დღის ბოლოს)</h2>
        <div id="daily-summaries-container"></div>
      </div>
    </div>
  `;

  // Tabs
  document.querySelectorAll('.tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');

      if (tab.dataset.tab === 'stats') renderStats();
      if (tab.dataset.tab === 'shifts') renderShiftsTable();
      if (tab.dataset.tab === 'daily') renderDailySummaries();
    });
  });

  // Filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderSalesTable(btn.dataset.filter);
    });
  });

  renderSalesTable('today');
  renderShiftsTable();
}

function renderSalesTable(filter = 'today') {
  const tbody = document.querySelector('#sales-table tbody');
  if (!tbody) return;

  let sales = getSales();
  const now = new Date();

  sales = sales.filter(s => {
    const d = new Date(s.timestamp);
    if (filter === 'today') {
      return d.toDateString() === now.toDateString();
    } else if (filter === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    } else if (filter === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    } else if (filter === 'year') {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  });

  // Sort newest first
  sales.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  tbody.innerHTML = sales.map(s => {
    const itemsStr = s.items.map(i => `${i.name} (${i.quantity})`).join(', ');
    const time = new Date(s.timestamp).toLocaleString('ka-GE');
    return `
      <tr>
        <td>${time}</td>
        <td>${s.userName}</td>
        <td class="items-cell" title="${itemsStr}">${itemsStr.length > 60 ? itemsStr.slice(0, 60) + '...' : itemsStr}</td>
        <td><strong>${s.total.toFixed(2)} ₾</strong></td>
        <td>
          <span class="badge ${s.paymentMethod === 'cash' ? 'badge-success' : s.paymentMethod === 'card' ? 'badge-info' : 'badge-warning'}">${s.paymentMethodLabel}</span>
          ${s.cashAmount > 0 ? `<br><small>ნაღდი: ${s.cashAmount.toFixed(2)} ₾</small>` : ''}
          ${s.cardAmount > 0 ? `<br><small>ბარათი: ${s.cardAmount.toFixed(2)} ₾</small>` : ''}
        </td>
        ${isAdmin() ? `<td><button class="btn btn-danger btn-sm delete-sale" data-id="${s.id}">წაშლა</button></td>` : ''}
      </tr>
    `;
  }).join('') || '<tr><td colspan="6" class="text-center">გაყიდვები არ არის</td></tr>';

  if (isAdmin()) {
    tbody.querySelectorAll('.delete-sale').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('ნამდვილად გსურთ ამ გაყიდვის წაშლა?')) {
          let sales = getSales().filter(s => s.id !== btn.dataset.id);
          localStorage.setItem('sales', JSON.stringify(sales));
          renderSalesTable(document.querySelector('.filter-btn.active')?.dataset.filter || 'today');
        }
      });
    });
  }
}

function renderStats() {
  const tbody = document.querySelector('#stats-table tbody');
  if (!tbody) return;

  const sales = getSales();
  const productMap = {};

  sales.forEach(sale => {
    sale.items.forEach(item => {
      const key = item.productId || item.name;
      if (!productMap[key]) {
        productMap[key] = { name: item.name, qty: 0, revenue: 0 };
      }
      productMap[key].qty += item.quantity || 1;
      productMap[key].revenue += item.total || 0;
    });
  });

  const sorted = Object.values(productMap).sort((a, b) => b.qty - a.qty);

  tbody.innerHTML = sorted.slice(0, 30).map((p, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${p.name}</td>
      <td>${p.qty}</td>
      <td>${p.revenue.toFixed(2)} ₾</td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="text-center">მონაცემები არ არის</td></tr>';
}

function renderShiftsTable() {
  const tbody = document.querySelector('#shifts-table tbody');
  if (!tbody) return;

  let shifts = getShifts();
  shifts = shifts.map(s => {
    if (!s.closed) {
      return calculateShiftFinancials({ ...s });
    }
    return s;
  });

  shifts.sort((a, b) => new Date(b.loginTime) - new Date(a.loginTime));

  tbody.innerHTML = shifts.map(s => {
    const login = new Date(s.loginTime).toLocaleString('ka-GE');
    const logout = s.logoutTime ? new Date(s.logoutTime).toLocaleString('ka-GE') : 'აქტიური';
    return `
      <tr class="${!s.closed ? 'active-shift' : ''}">
        <td>${s.date}</td>
        <td>${s.shiftBlock?.name || '-'}</td>
        <td>${s.userName}</td>
        <td>${login}</td>
        <td>${logout}</td>
        <td>${(s.totalSales || 0).toFixed(2)} ₾</td>
        <td>${(s.cashTotal || 0).toFixed(2)} ₾</td>
        <td>${(s.cardTotal || 0).toFixed(2)} ₾</td>
        <td>${(s.deductions || 0).toFixed(2)} ₾</td>
        <td><strong>${(s.netCash || 0).toFixed(2)} ₾</strong></td>
        <td><span class="badge ${s.closed ? 'badge-secondary' : 'badge-success'}">${s.closed ? 'დახურული' : 'აქტიური'}</span></td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="11" class="text-center">ცვლები არ არის</td></tr>';
}

function renderDailySummaries() {
  const container = document.getElementById('daily-summaries-container');
  if (!container) return;

  const summaries = getDailySummaries().sort((a, b) => b.date.localeCompare(a.date));

  if (summaries.length === 0) {
    container.innerHTML = '<p class="text-center">დღიური შეჯამებები ჯერ არ არის გენერირებული (გენერირდება II ცვლის დახურვისას).</p>';
    return;
  }

  container.innerHTML = summaries.map(sum => `
    <div class="daily-summary-card">
      <div class="daily-header">
        <h3>${sum.date}</h3>
        <span class="badge badge-info">დღის ბოლო</span>
      </div>
      <div class="daily-grid">
        <div class="daily-stat">
          <span class="label">სულ გაყიდვები</span>
          <span class="value">${sum.totalSales.toFixed(2)} ₾</span>
        </div>
        <div class="daily-stat">
          <span class="label">ბარათი</span>
          <span class="value">${sum.totalCard.toFixed(2)} ₾</span>
        </div>
        <div class="daily-stat">
          <span class="label">ნაღდი</span>
          <span class="value">${sum.totalCash.toFixed(2)} ₾</span>
        </div>
        <div class="daily-stat">
          <span class="label">სულ გამოკლება (ხარჯები + ხელფასები)</span>
          <span class="value text-danger">${sum.totalDeductions.toFixed(2)} ₾</span>
        </div>
        <div class="daily-stat highlight">
          <span class="label">დარჩენილი ნაღდი (დღის)</span>
          <span class="value">${sum.netCash.toFixed(2)} ₾</span>
        </div>
      </div>
      <div class="daily-shifts">
        <strong>ცვლები:</strong>
        ${sum.shifts.map(sh => `${sh.user} (${sh.shiftBlock}): ${sh.totalSales.toFixed(2)} ₾ → ნეტი ${sh.netCash.toFixed(2)} ₾`).join(' | ')}
      </div>
    </div>
  `).join('');
}