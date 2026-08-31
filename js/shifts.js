// shifts.js - Shift management, dynamic financial calculations, and admin controls

import { getCurrentUser, getCurrentShift, getShifts, saveShifts, calculateShiftFinancials, isAdmin, determineShiftBlock } from './auth.js';
import { getDistributions, getExpenses } from './distribution.js';
import { saveToDisk, endShiftToDisk } from './dbSync.js';

let editingShiftId = null;

function canCloseShift(user, currentShift) {
  if (!user || !currentShift) return false;
  if (isAdmin()) return true;

  return (user.username && currentShift.username && user.username === currentShift.username) ||
         (user.name && currentShift.userName && user.name === currentShift.userName);
}

// FIX: This now calculates dynamically from global sales for ALL shifts, not just active ones
function calculateLiveShiftFinancials(shift) {
  let totalSales = 0;
  let cardTotal = 0;
  let cashTotal = 0;

  // Always pull fresh from global sales to catch admin edits
  const globalSales = JSON.parse(localStorage.getItem('sales') || '[]');
  
  // Match sales that happened during this shift's timeframe by this user
  const shiftSales = globalSales.filter(s => {
    // If the sale already has the shiftId attached, use that
    if (s.shiftId === shift.id) return true;
    
    // Otherwise, match by time boundary and user
    const saleTime = new Date(s.timestamp || s.date).getTime();
    const loginTime = new Date(shift.loginTime).getTime();
    const logoutTime = shift.logoutTime ? new Date(shift.logoutTime).getTime() : Date.now();
    const sameUser = (s.userName === shift.userName || s.user === shift.userName || s.userName === shift.username);
    
    return sameUser && saleTime >= loginTime && saleTime <= logoutTime;
  });

  shiftSales.forEach(s => {
    totalSales += (s.total || s.totalAmount || 0);
    cardTotal += (s.cardAmount || (s.paymentMethod === 'card' ? (s.total || 0) : 0));
    cashTotal += (s.cashAmount || (s.paymentMethod === 'cash' ? (s.total || 0) : 0));
  });

  const distributions = getDistributions().filter(d => d.shiftId === shift.id && d.paymentSource === 'cash_desk');
  const expenses = getExpenses().filter(e => e.shiftId === shift.id && e.paymentSource === 'cash_desk');

  let cashDeskExpenses = 0;
  distributions.forEach(d => cashDeskExpenses += (d.totalAmount || 0));
  expenses.forEach(e => cashDeskExpenses += (e.amount || 0));

  const salary = shift.salary || (shift.shiftBlock?.id === 1 ? 30 : 40);
  const netCash = cashTotal - cashDeskExpenses - salary;

  return { totalSales, cardTotal, cashTotal, cashDeskExpenses, salary, netCash };
}

export function renderShiftsPage() {
  const content = document.getElementById('main-content');
  if (!content) return;

  const currentShift = getCurrentShift();
  const user = getCurrentUser();
  const isAdminUser = isAdmin();
  const canUserClose = currentShift ? canCloseShift(user, currentShift) : false;

  let activeShiftFinancialBreakdown = '';
  if (currentShift) {
    const breakdown = calculateLiveShiftFinancials(currentShift);
    activeShiftFinancialBreakdown = `
      <div class="mt-2" style="background: rgba(0,0,0,0.03); padding: 10px; border-radius: 6px;">
        <p><strong>მთლიანი შემოსავალი :</strong> ${(breakdown.totalSales || 0).toFixed(2)} ₾</p>
        <p><strong>ბარათით გადახდილი:</strong> ${(breakdown.cardTotal || 0).toFixed(2)} ₾</p>
        <p><strong>ნაღდი ფული (სულ):</strong> ${(breakdown.cashTotal || 0).toFixed(2)} ₾</p>
        <p><strong>კასრიდან გადახდილი ხარჯები/დისტრიბუცია:</strong> -${(breakdown.cashDeskExpenses || 0).toFixed(2)} ₾</p>
        <p><strong>ხელფასი (მითითებული):</strong> -${(breakdown.salary || 0).toFixed(2)} ₾</p>
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
        ${canUserClose ? `
          <button id="end-shift-btn" class="btn btn-danger mt-3">ცვლის დასრულება</button>
        ` : `
          <div class="mt-3 p-2" style="background: #fff3cd; color: #856404; border: 1px solid #ffeeba; border-radius: 6px; font-weight: bold;">
            ⚠️ მიმდინარე ცვლა გახსნილია <u>${currentShift.userName}</u>-ის მიერ. ცვლის დახურვა შეუძლია მხოლოდ მას ან ადმინისტრატორს.
          </div>
        `}
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

  if (document.getElementById('start-shift-btn')) {
    document.getElementById('start-shift-btn').addEventListener('click', startNewShift);
  }
  if (document.getElementById('end-shift-btn')) {
    document.getElementById('end-shift-btn').addEventListener('click', endCurrentShift);
  }

  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modal;
      document.getElementById(modalId).classList.remove('active');
      editingShiftId = null;
    });
  });

  renderAllShiftsTable(isAdminUser);
}

async function startNewShift() {
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

  await saveToDisk();

  alert(`ცვლა დაიწყო: ${shiftBlock.name}`);
  renderShiftsPage();
}

async function endCurrentShift() {
  const current = getCurrentShift();
  if (!current || current.closed) return;

  const user = getCurrentUser();
  if (!canCloseShift(user, current)) {
    alert(`წვდომა შეზღუდულია! ცვლის დახურვა შეუძლია მხოლოდ იმ თანამშრომელს, ვინც გახსნა ცვლა (${current.userName}), ან ადმინისტრატორს.`);
    return;
  }

  if (!confirm('ნამდვილად გსურთ ცვლის დასრულება?')) return;

  current.logoutTime = new Date().toISOString();
  current.closed = true;

  // Calculate finals one last time
  const financials = calculateLiveShiftFinancials(current);
  current.totalSales = financials.totalSales;
  current.cardTotal = financials.cardTotal;
  current.cashTotal = financials.cashTotal;
  current.cashDeskExpenses = financials.cashDeskExpenses;
  current.netCash = financials.netCash;
  
  if (typeof calculateShiftFinancials === 'function') {
    try { calculateShiftFinancials(current); } catch (err) { console.warn(err); }
  }

  const shifts = getShifts();
  const idx = shifts.findIndex(s => s.id === current.id);
  if (idx !== -1) shifts[idx] = current;
  saveShifts(shifts);

  const shiftDate = current.date || new Date().toISOString().split('T')[0];
  const shiftNumber = current.shiftBlock?.id || 1;

  await endShiftToDisk(shiftNumber, shiftDate, current);

  localStorage.removeItem('currentShift');
  await saveToDisk();

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
    
    // FIX: Always dynamically calculate financials even for closed shifts 
    // to instantly reflect any admin edits made in history.js
    const breakdown = calculateLiveShiftFinancials(s);

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
      btn.addEventListener('click', async () => {
        if (confirm('ნამდვილად გსურთ ამ ცვლის წაშლა?')) {
          let shifts = getShifts().filter(s => s.id !== btn.dataset.id);
          saveShifts(shifts);
          await saveToDisk();
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

async function saveEditedShift() {
  if (!editingShiftId) return;

  const shifts = getShifts();
  const shift = shifts.find(s => s.id === editingShiftId);
  if (!shift) return;

  shift.date = document.getElementById('edit-date').value;
  shift.userName = document.getElementById('edit-username').value;
  shift.loginTime = document.getElementById('edit-login-time').value ? document.getElementById('edit-login-time').value + ':00' : shift.loginTime;
  shift.logoutTime = document.getElementById('edit-logout-time').value ? document.getElementById('edit-logout-time').value + ':00' : shift.logoutTime;

  saveShifts(shifts);
  await saveToDisk();

  document.getElementById('edit-shift-modal').classList.remove('active');
  editingShiftId = null;

  alert('ცვლა განახლებულია');
  renderShiftsPage();
}