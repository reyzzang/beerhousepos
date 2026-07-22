// shifts.js - Independent shift management with full admin edit/delete

import { getCurrentUser, getCurrentShift, getShifts, saveShifts, calculateShiftFinancials, isAdmin, determineShiftBlock } from './auth.js';
import { getDistributions, getExpenses } from './distribution.js';

let editingShiftId = null;

export function renderShiftsPage() {
  const content = document.getElementById('main-content');
  if (!content) return;

  const currentShift = getCurrentShift();
  const user = getCurrentUser();
  const isAdminUser = isAdmin();

  let activeShiftFinancialBreakdown = '';
  if (currentShift) {
    const breakdown = calculateLiveShiftFinancials(currentShift);
    activeShiftFinancialBreakdown = `
      <div class="mt-2" style="background: rgba(0,0,0,0.03); padding: 10px; border-radius: 6px;">
        <p><strong>მთლიანი შემოსავალი :</strong> ${(breakdown.totalSales || 0).toFixed(2)} ₾</p>
        <p><strong>ბარათით გადახდილი:</strong> ${(breakdown.cardTotal || 0).toFixed(2)} ₾</p>
        <p><strong>ნაღდი ფული (სულ):</strong> ${(breakdown.cashTotal || 0).toFixed(2)} ₾</p>
        <p><strong>კასრიდან გადახდილი ხარჯები/დისტრიბუცია:</strong> -${(breakdown.cashDeskExpenses || 0).toFixed(2)} ₾</p>
        <p><strong>ხელფასი (მითითებული):</strong> -${(currentShift.salary || 0).toFixed(2)} ₾</p>
        <hr style="margin: 5px 0;">
        <p style="font-size: 1.1em;"><strong>დარჩენილი სუფთა ნაღდი ფული:</strong> <span style="color: green; font-weight: bold;">${(breakdown.netCash || 0).toFixed(2)} ₾</span></p>
      </div>
    `;
  }

  content.innerHTML = `
    <div class="page-header">
      <h1>ცვლები</h1>
    </div>

    <div class="card">
      <h2>მიმდინარე ცვლა</h2>
      ${currentShift ? `
        <p><strong>თანამშრომელი:</strong> ${currentShift.userName}</p>
        <p><strong>ცვლა:</strong> ${currentShift.shiftBlock?.name || '-'}</p>
        <p><strong>დაწყების დრო:</strong> ${new Date(currentShift.loginTime).toLocaleString('ka-GE')}</p>
        ${activeShiftFinancialBreakdown}
        <button id="end-shift-btn" class="btn btn-danger mt-3">ცვლის დასრულება</button>
      ` : `
        <p>მიმდინარე ცვლა არ არის აქტიური</p>
        <button id="start-shift-btn" class="btn btn-success">ცვლის დაწყება</button>
      `}
    </div>

    <div class="card mt-3">
      <h2>ყველა ცვლის ისტორია</h2>
      <div class="table-responsive">
        <table class="data-table" id="all-shifts-table">
          <thead>
            <tr>
              <th>თარიღი</th>
              <th>ცვლა</th>
              <th>თანამშრომელი</th>
              <th>შესვლა</th>
              <th>გასვლა</th>
              <th>ჯამი</th>
              <th>ბარათი</th>
              <th>ნაღდი</th>
              <th>კასრის ხარჯი</th>
              <th>ხელფასი</th>
              <th>ნეტო ნაღდი</th>
              <th>სტატუსი</th>
              ${isAdminUser ? '<th>მოქმედება</th>' : ''}
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <!-- Edit Shift Modal -->
    <div class="modal" id="edit-shift-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>ცვლის რედაქტირება</h3>
          <button class="modal-close" data-modal="edit-shift-modal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>თარიღი</label>
            <input type="date" id="edit-date" class="form-input">
          </div>
          <div class="form-group">
            <label>თანამშრომელი</label>
            <input type="text" id="edit-username" class="form-input">
          </div>
          <div class="form-group">
            <label>შესვლის დრო</label>
            <input type="datetime-local" id="edit-login-time" class="form-input">
          </div>
          <div class="form-group">
            <label>გასვლის დრო</label>
            <input type="datetime-local" id="edit-logout-time" class="form-input">
          </div>
          <div class="modal-actions">
            <button id="save-edit-btn" class="btn btn-primary">შენახვა</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Buttons
  if (document.getElementById('start-shift-btn')) {
    document.getElementById('start-shift-btn').addEventListener('click', startNewShift);
  }
  if (document.getElementById('end-shift-btn')) {
    document.getElementById('end-shift-btn').addEventListener('click', endCurrentShift);
  }

  // Modal close
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modal;
      document.getElementById(modalId).classList.remove('active');
      editingShiftId = null;
    });
  });

  renderAllShiftsTable(isAdminUser);
}

function calculateLiveShiftFinancials(shift) {
  // Filter sales, distributions, and expenses that belong to this shift ID
  const sales = shift.sales || [];
  let totalSales = 0;
  let cardTotal = 0;
  let cashTotal = 0;

  sales.forEach(s => {
    totalSales += (s.total || s.totalAmount || 0);
    cardTotal += (s.cardAmount || 0);
    cashTotal += (s.cashAmount || 0);
  });

  // Fallback if sales array inside shift is empty, check global sales mapped by shiftId
  if (sales.length === 0) {
    const globalSales = JSON.parse(localStorage.getItem('sales') || '[]');
    const shiftSales = globalSales.filter(s => s.shiftId === shift.id);
    shiftSales.forEach(s => {
      totalSales += (s.total || s.totalAmount || 0);
      cardTotal += (s.cardAmount || 0);
      cashTotal += (s.cashAmount || 0);
    });
  }

  // Calculate cash desk expenses from distributions and expenses tied to this shift where paymentSource === 'cash_desk'
  const distributions = getDistributions().filter(d => d.shiftId === shift.id && d.paymentSource === 'cash_desk');
  const expenses = getExpenses().filter(e => e.shiftId === shift.id && e.paymentSource === 'cash_desk');

  let cashDeskExpenses = 0;
  distributions.forEach(d => cashDeskExpenses += (d.totalAmount || 0));
  expenses.forEach(e => cashDeskExpenses += (e.amount || 0));

  const salary = shift.salary || 0;
  const netCash = cashTotal - cashDeskExpenses - salary;

  return {
    totalSales,
    cardTotal,
    cashTotal,
    cashDeskExpenses,
    salary,
    netCash
  };
}

function startNewShift() {
  const user = getCurrentUser();
  if (!user) return alert('გთხოვთ შეხვიდეთ');

  const now = new Date();
  const shiftBlock = determineShiftBlock(now);

  const shift = {
    id: Date.now().toString(),
    username: user.username,
    userName: user.name,
    role: user.role,
    loginTime: now.toISOString(),
    logoutTime: null,
    shiftBlock: shiftBlock,
    date: now.toISOString().split('T')[0],
    sales: [],
    totalSales: 0,
    cardTotal: 0,
    cashTotal: 0,
    deductions: 0,
    cashDeskExpenses: 0,
    salary: shiftBlock.id === 1 ? 30 : 40,
    netCash: 0,
    closed: false
  };

  localStorage.setItem('currentShift', JSON.stringify(shift));

  const shifts = getShifts();
  shifts.push(shift);
  saveShifts(shifts);

  alert(`ცვლა დაიწყო: ${shiftBlock.name}`);
  renderShiftsPage();
}

function endCurrentShift() {
  const current = getCurrentShift();
  if (!current || current.closed) return;

  if (!confirm('ნამდვილად გსურთ ცვლის დასრულება?')) return;

  current.logoutTime = new Date().toISOString();
  current.closed = true;

  // Calculate precise financials using custom live runner
  const financials = calculateLiveShiftFinancials(current);
  current.totalSales = financials.totalSales;
  current.cardTotal = financials.cardTotal;
  current.cashTotal = financials.cashTotal;
  current.cashDeskExpenses = financials.cashDeskExpenses;
  current.netCash = financials.netCash;

  // Also call auth's calculateShiftFinancials if it exists and handles secondary logic safely
  if (typeof calculateShiftFinancials === 'function') {
    try {
      calculateShiftFinancials(current);
    } catch (err) {
      console.warn(err);
    }
  }

  const shifts = getShifts();
  const idx = shifts.findIndex(s => s.id === current.id);
  if (idx !== -1) shifts[idx] = current;
  saveShifts(shifts);

  localStorage.removeItem('currentShift');

  alert(`ცვლა დასრულდა.\nმთლიანი: ${current.totalSales.toFixed(2)} ₾\nბარათი: ${current.cardTotal.toFixed(2)} ₾\nნაღდი: ${current.cashTotal.toFixed(2)} ₾\nკასრის ხარჯი: ${current.cashDeskExpenses.toFixed(2)} ₾\nხელფასი: ${current.salary} ₾\nსუფთა ნაღდი: ${current.netCash.toFixed(2)} ₾`);
  renderShiftsPage();
}

function renderAllShiftsTable(isAdminUser) {
  const tbody = document.querySelector('#all-shifts-table tbody');
  if (!tbody) return;

  let shifts = getShifts();
  shifts.sort((a, b) => new Date(b.loginTime) - new Date(a.loginTime));

  tbody.innerHTML = shifts.map(s => {
    const login = new Date(s.loginTime).toLocaleString('ka-GE');
    const logout = s.logoutTime ? new Date(s.logoutTime).toLocaleString('ka-GE') : '—';
    
    // Ensure historical shifts display proper breakdown if fields are missing
    const breakdown = s.closed ? {
      totalSales: s.totalSales || 0,
      cardTotal: s.cardTotal || 0,
      cashTotal: s.cashTotal || 0,
      cashDeskExpenses: s.cashDeskExpenses || 0,
      salary: s.salary || 0,
      netCash: s.netCash || 0
    } : calculateLiveShiftFinancials(s);

    return `
      <tr>
        <td>${s.date}</td>
        <td>${s.shiftBlock?.name || '-'}</td>
        <td>${s.userName}</td>
        <td>${login}</td>
        <td>${logout}</td>
        <td>${breakdown.totalSales.toFixed(2)} ₾</td>
        <td>${breakdown.cardTotal.toFixed(2)} ₾</td>
        <td>${breakdown.cashTotal.toFixed(2)} ₾</td>
        <td>${breakdown.cashDeskExpenses.toFixed(2)} ₾</td>
        <td>${breakdown.salary.toFixed(2)} ₾</td>
        <td><strong>${breakdown.netCash.toFixed(2)} ₾</strong></td>
        <td><span class="badge ${s.closed ? 'badge-secondary' : 'badge-success'}">${s.closed ? 'დახურული' : 'აქტიური'}</span></td>
        ${isAdminUser ? `
          <td>
            <button class="btn btn-secondary btn-sm edit-shift-btn" data-id="${s.id}">რედაქტირება</button>
            <button class="btn btn-danger btn-sm delete-shift-btn" data-id="${s.id}">წაშლა</button>
          </td>
        ` : ''}
      </tr>
    `;
  }).join('');

  if (isAdminUser) {
    tbody.querySelectorAll('.edit-shift-btn').forEach(btn => {
      btn.addEventListener('click', () => editShift(btn.dataset.id));
    });
    tbody.querySelectorAll('.delete-shift-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('ნამდვილად გსურთ ამ ცვლის წაშლა?')) {
          let shifts = getShifts().filter(s => s.id !== btn.dataset.id);
          saveShifts(shifts);
          renderAllShiftsTable(true);
        }
      });
    });
  }
}

function editShift(shiftId) {
  const shifts = getShifts();
  const shift = shifts.find(s => s.id === shiftId);
  if (!shift) return;

  editingShiftId = shiftId;

  document.getElementById('edit-date').value = shift.date || '';
  document.getElementById('edit-username').value = shift.userName || '';
  document.getElementById('edit-login-time').value = shift.loginTime ? shift.loginTime.slice(0,16) : '';
  document.getElementById('edit-logout-time').value = shift.logoutTime ? shift.logoutTime.slice(0,16) : '';

  document.getElementById('edit-shift-modal').classList.add('active');

  const saveBtn = document.getElementById('save-edit-btn');
  const newBtn = saveBtn.cloneNode(true);
  saveBtn.parentNode.replaceChild(newBtn, saveBtn);

  newBtn.addEventListener('click', saveEditedShift);
}

function saveEditedShift() {
  if (!editingShiftId) return;

  const shifts = getShifts();
  const shift = shifts.find(s => s.id === editingShiftId);
  if (!shift) return;

  shift.date = document.getElementById('edit-date').value;
  shift.userName = document.getElementById('edit-username').value;
  shift.loginTime = document.getElementById('edit-login-time').value ? document.getElementById('edit-login-time').value + ':00' : shift.loginTime;
  shift.logoutTime = document.getElementById('edit-logout-time').value ? document.getElementById('edit-logout-time').value + ':00' : shift.logoutTime;

  saveShifts(shifts);
  document.getElementById('edit-shift-modal').classList.remove('active');
  editingShiftId = null;

  alert('ცვლა განახლებულია');
  renderShiftsPage();
}