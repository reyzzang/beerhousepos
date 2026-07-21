// shifts.js - Independent shift management with full admin edit/delete

import { getCurrentUser, getCurrentShift, getShifts, saveShifts, calculateShiftFinancials, isAdmin, determineShiftBlock } from './auth.js';

let editingShiftId = null;

export function renderShiftsPage() {
  const content = document.getElementById('main-content');
  if (!content) return;

  const currentShift = getCurrentShift();
  const user = getCurrentUser();
  const isAdminUser = isAdmin();

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
        <button id="end-shift-btn" class="btn btn-danger">ცვლის დასრულება</button>
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
  calculateShiftFinancials(current);

  const shifts = getShifts();
  const idx = shifts.findIndex(s => s.id === current.id);
  if (idx !== -1) shifts[idx] = current;
  saveShifts(shifts);

  localStorage.removeItem('currentShift');

  alert('ცვლა დასრულდა.');
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
    return `
      <tr>
        <td>${s.date}</td>
        <td>${s.shiftBlock?.name || '-'}</td>
        <td>${s.userName}</td>
        <td>${login}</td>
        <td>${logout}</td>
        <td>${(s.totalSales || 0).toFixed(2)} ₾</td>
        <td>${(s.netCash || 0).toFixed(2)} ₾</td>
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