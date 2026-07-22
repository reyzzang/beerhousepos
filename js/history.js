// history.js - Reports, shifts, financial math, sales logs, and backups with full admin edit/delete controls

import { getCurrentUser, getShifts, isAdmin, calculateShiftFinancials } from './auth.js';
import { downloadLocalBackup, restoreFromBackup } from './backup.js';

export function getSales() {
  return JSON.parse(localStorage.getItem('sales') || '[]');
}

export function saveSales(sales) {
  localStorage.setItem('sales', JSON.stringify(sales));
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
      <button class="tab" data-tab="data">მონაცემები</button>
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
        <div class="table-responsive mt-2" style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch;">
          <table class="data-table" id="sales-table" style="width: 100%; min-width: 750px; border-collapse: collapse; white-space: nowrap;">
            <thead>
              <tr>
                <th style="text-align: left; padding: 12px 10px;">თარიღი/დრო</th>
                <th style="text-align: left; padding: 12px 10px;">თანამშრომელი</th>
                <th style="text-align: left; padding: 12px 10px;">პროდუქტები</th>
                <th style="text-align: left; padding: 12px 10px;">ჯამი</th>
                <th style="text-align: left; padding: 12px 10px;">გადახდა</th>
                ${isAdmin() ? '<th style="text-align: left; padding: 12px 10px;">მოქმედება</th>' : ''}
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

    <div class="tab-content" id="tab-data">
      <div class="card">
        <h2>მონაცემების მართვა (Data Management)</h2>
        <p>აქედან შეგიძლიათ გადმოწეროთ ექსელის რეპორტები ან სრულად შეინახოთ/აღადგინოთ სისტემის მონაცემები.</p>
        
        <div style="display: flex; gap: 10px; margin-top: 15px;">
          <button id="export-excel-btn" class="btn btn-success">Excel-ის გადმოწერა</button>
          <button id="manual-backup-btn" class="btn btn-primary">სრული ბექაპის გადმოწერა (D Disk)</button>
        </div>

        <hr style="margin: 20px 0; border-top: 1px solid #eee;">

        <div class="restore-section">
          <label for="restore-file-input"><strong>მონაცემების აღდგენა (Restore):</strong></label>
          <br>
          <input type="file" id="restore-file-input" accept=".json" style="margin-top: 10px;">
          <small style="display: block; color: #666; margin-top: 5px;">აირჩიეთ წინასწარ შენახული .json ფაილი მონაცემების აღსადგენად.</small>
        </div>
      </div>
    </div>

    <!-- Edit Sale Modal (Admin Only) -->
    <div class="modal" id="edit-sale-modal">
      <div class="modal-content" style="width: 90%; max-width: 520px; box-sizing: border-box;">
        <div class="modal-header">
          <h3>გაყიდვის რედაქტირება</h3>
          <button class="modal-close" data-modal="edit-sale-modal">×</button>
        </div>
        <div class="modal-body">
          <form id="edit-sale-form" class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; width: 100%; box-sizing: border-box;">
            <input type="hidden" id="edit-sale-id">
            <div class="form-group" style="display: flex; flex-direction: column; gap: 0.35rem; min-width: 0;">
              <label>თანამშრომელი / მოლარე</label>
              <input type="text" id="sale-username" class="form-input" style="width: 100%; box-sizing: border-box;" required>
            </div>
            <div class="form-group" style="display: flex; flex-direction: column; gap: 0.35rem; min-width: 0;">
              <label>გადახდის მეთოდი</label>
              <select id="sale-method" class="form-input" style="width: 100%; box-sizing: border-box;" required>
                <option value="cash">ნაღდი</option>
                <option value="card">ბარათი</option>
              </select>
            </div>
            <div class="form-group" style="display: flex; flex-direction: column; gap: 0.35rem; min-width: 0;">
              <label>ჯამური თანხა (₾)</label>
              <input type="number" id="sale-total" class="form-input" step="0.01" min="0" style="width: 100%; box-sizing: border-box;" required>
            </div>
            <div class="form-group" style="display: flex; flex-direction: column; gap: 0.35rem; min-width: 0;">
              <label>ნაღდი თანხის წილი (₾)</label>
              <input type="number" id="sale-cash-amount" class="form-input" step="0.01" min="0" style="width: 100%; box-sizing: border-box;">
            </div>
            <div class="form-group" style="display: flex; flex-direction: column; gap: 0.35rem; min-width: 0;">
              <label>ბარათის თანხის წილი (₾)</label>
              <input type="number" id="sale-card-amount" class="form-input" step="0.01" min="0" style="width: 100%; box-sizing: border-box;">
            </div>
            <div class="form-group" style="display: flex; flex-direction: column; gap: 0.35rem; min-width: 0;">
              <label>თარიღი / დრო</label>
              <input type="text" id="sale-timestamp" class="form-input" style="width: 100%; box-sizing: border-box;" required>
            </div>
            <div class="form-group full-width" style="display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; grid-column: 1 / -1;">
              <label>პროდუქტების აღწერა (მაგ: კოკა-კოლა (2), წყალი (1))</label>
              <textarea id="sale-items-desc" class="form-input" style="width: 100%; box-sizing: border-box; min-height: 80px; resize: vertical;" required></textarea>
            </div>
            <div class="form-group full-width" style="grid-column: 1 / -1; margin-top: 10px;">
              <button type="submit" class="btn btn-primary" style="width: 100%;">ცვლილებების შენახვა</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  // Tabs logic
  document.querySelectorAll('.tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');

      if (tab.dataset.tab === 'stats') renderStats();
      if (tab.dataset.tab === 'shifts') renderShiftsTable();
    });
  });

  // Filters logic
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderSalesTable(btn.dataset.filter);
    });
  });

  // Modal close handlers
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modal;
      if (modalId) {
        document.getElementById(modalId).classList.remove('active');
      }
    });
  });

  // Edit Sale Form Submit Handler
  const editSaleForm = document.getElementById('edit-sale-form');
  if (editSaleForm) {
    editSaleForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!isAdmin()) return;

      const saleId = document.getElementById('edit-sale-id').value;
      const userName = document.getElementById('sale-username').value.trim();
      const paymentMethod = document.getElementById('sale-method').value;
      const paymentMethodLabel = paymentMethod === 'cash' ? 'ნაღდი' : 'ბარათი';
      const total = parseFloat(document.getElementById('sale-total').value);
      const cashAmount = parseFloat(document.getElementById('sale-cash-amount').value) || 0;
      const cardAmount = parseFloat(document.getElementById('sale-card-amount').value) || 0;
      const timestampInput = document.getElementById('sale-timestamp').value.trim();
      const itemsText = document.getElementById('sale-items-desc').value.trim();

      const items = itemsText.split(',').map(part => {
        const match = part.match(/^(.*?)\s*\((\d+)\)?$/);
        if (match) {
          return { name: match[1].trim(), quantity: parseInt(match[2]) || 1 };
        }
        return { name: part.trim(), quantity: 1 };
      });

      let sales = getSales();
      sales = sales.map(s => {
        if (String(s.id) === String(saleId)) {
          return {
            ...s,
            userName,
            paymentMethod,
            paymentMethodLabel,
            total,
            cashAmount,
            cardAmount,
            timestamp: !isNaN(new Date(timestampInput).getTime()) ? new Date(timestampInput).toISOString() : s.timestamp,
            items: items.length > 0 ? items : s.items
          };
        }
        return s;
      });

      saveSales(sales);
      document.getElementById('edit-sale-modal').classList.remove('active');
      const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'today';
      renderSalesTable(activeFilter);
      alert('გაყიდვა წარმატებით განახლდა.');
    });
  }

  // Attach Event Listeners for Data Management Buttons
  const excelBtn = document.getElementById('export-excel-btn');
  if (excelBtn) {
    excelBtn.addEventListener('click', () => {
      downloadExcelHistory();
    });
  }

  const backupBtn = document.getElementById('manual-backup-btn');
  if (backupBtn) {
    backupBtn.addEventListener('click', () => {
      downloadLocalBackup();
      alert('ბექაპი გადმოიწერა. შეამოწმეთ Downloads ან D დისკი.');
    });
  }

  const restoreInput = document.getElementById('restore-file-input');
  if (restoreInput) {
    restoreInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if(confirm('დარწმუნებული ხართ? ეს წაშლის მიმდინარე მონაცემებს და ჩაანაცვლებს ფაილიდან.')) {
          restoreFromBackup(file);
        } else {
          e.target.value = '';
        }
      }
    });
  }

  // Initial render calls
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

  sales.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const colSpanCount = isAdmin() ? 6 : 5;

  tbody.innerHTML = sales.map(s => {
    const itemsStr = (s.items || []).map(i => `${i.name} (${i.quantity || i.qty || 1})`).join(', ');
    const time = new Date(s.timestamp).toLocaleString('ka-GE');
    return `
      <tr>
        <td style="padding: 10px;">${time}</td>
        <td style="padding: 10px;">${s.userName || s.user || 'უცნობი'}</td>
        <td class="items-cell" style="padding: 10px; max-width: 250px; overflow: hidden; text-overflow: ellipsis;" title="${itemsStr}">${itemsStr.length > 60 ? itemsStr.slice(0, 60) + '...' : itemsStr}</td>
        <td style="padding: 10px;"><strong>${(s.total || 0).toFixed(2)} ₾</strong></td>
        <td style="padding: 10px;">
          <span class="badge ${s.paymentMethod === 'cash' ? 'badge-success' : s.paymentMethod === 'card' ? 'badge-info' : 'badge-warning'}">${s.paymentMethodLabel || s.paymentMethod || 'ნაღდი'}</span>
          ${s.cashAmount > 0 ? `<br><small>ნაღდი: ${s.cashAmount.toFixed(2)} ₾</small>` : ''}
          ${s.cardAmount > 0 ? `<br><small>ბარათი: ${s.cardAmount.toFixed(2)} ₾</small>` : ''}
        </td>
        ${isAdmin() ? `
          <td style="padding: 10px;">
            <div style="display: inline-flex; gap: 6px; align-items: center;">
              <button class="btn btn-outline btn-sm edit-sale" data-id="${s.id}">რედაქტირება</button>
              <button class="btn btn-danger btn-sm delete-sale" data-id="${s.id}">წაშლა</button>
            </div>
          </td>` : ''}
      </tr>
    `;
  }).join('') || `<tr><td colspan="${colSpanCount}" class="text-center" style="padding: 20px;">გაყიდვები არ არის</td></tr>`;

  if (isAdmin()) {
    tbody.querySelectorAll('.delete-sale').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('ნამდვილად გსურთ ამ გაყიდვის წაშლა?')) {
          let sales = getSales().filter(s => String(s.id) !== String(btn.dataset.id));
          saveSales(sales);
          const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'today';
          renderSalesTable(activeFilter);
        }
      });
    });

    tbody.querySelectorAll('.edit-sale').forEach(btn => {
      btn.addEventListener('click', () => {
        const saleId = btn.dataset.id;
        const sales = getSales();
        const sale = sales.find(s => String(s.id) === String(saleId));
        if (!sale) return;

        document.getElementById('edit-sale-id').value = sale.id;
        document.getElementById('sale-username').value = sale.userName || sale.user || '';
        document.getElementById('sale-method').value = sale.paymentMethod || 'cash';
        document.getElementById('sale-total').value = sale.total || 0;
        document.getElementById('sale-cash-amount').value = sale.cashAmount || 0;
        document.getElementById('sale-card-amount').value = sale.cardAmount || 0;
        document.getElementById('sale-timestamp').value = sale.timestamp ? new Date(sale.timestamp).toLocaleString('ka-GE') : '';
        
        const itemsStr = (sale.items || []).map(i => `${i.name} (${i.quantity || i.qty || 1})`).join(', ');
        document.getElementById('sale-items-desc').value = itemsStr;

        document.getElementById('edit-sale-modal').classList.add('active');
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
    (sale.items || []).forEach(item => {
      const key = item.productId || item.name;
      if (!productMap[key]) {
        productMap[key] = { name: item.name, qty: 0, revenue: 0 };
      }
      productMap[key].qty += item.quantity || item.qty || 1;
      productMap[key].revenue += item.total || (item.price * (item.quantity || item.qty || 1)) || 0;
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

export function downloadExcelHistory() {
  const sales = getSales();
  
  if (sales.length === 0) {
    alert('ისტორია ცარიელია (History is empty)');
    return;
  }

  let csvContent = "\uFEFF"; 
  csvContent += "თარიღი,დრო,ცვლა,მოლარე,გადახდის მეთოდი,ჯამი (₾),პროდუქტები\n";

  sales.forEach(sale => {
    const date = sale.date || (sale.timestamp ? sale.timestamp.split('T')[0] : '');
    const time = sale.timestamp ? new Date(sale.timestamp).toLocaleTimeString('ka-GE') : '';
    const shift = sale.shiftBlock?.name || '—';
    const user = sale.userName || sale.username || '';
    const method = sale.paymentMethodLabel || sale.paymentMethod || '';
    const total = (sale.total || 0).toFixed(2);

    const itemsStr = (sale.items || []).map(i => `${i.name} (${i.quantity || i.qty || 1} ${i.unit || ''})`).join('; ');
    const escapedItems = `"${itemsStr.replace(/"/g, '""')}"`;

    csvContent += `${date},${time},${shift},${user},${method},${total},${escapedItems}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  link.setAttribute("href", url);
  link.setAttribute("download", `გაყიდვების_ისტორია_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}