// distribution.js - Distributor forms, debts, expenses with modal edit

import { distributors } from './products.js';
import { getCurrentUser, getCurrentShift, isAdmin } from './auth.js';

export function getDistributions() {
  return JSON.parse(localStorage.getItem('distributions') || '[]');
}

export function saveDistributions(list) {
  localStorage.setItem('distributions', JSON.stringify(list));
}

export function getExpenses() {
  return JSON.parse(localStorage.getItem('expenses') || '[]');
}

export function saveExpenses(list) {
  localStorage.setItem('expenses', JSON.stringify(list));
}

export function getCustomDistributors() {
  return JSON.parse(localStorage.getItem('customDistributors') || '[]');
}

export function saveCustomDistributors(list) {
  localStorage.setItem('customDistributors', JSON.stringify(list));
}

let editingDistId = null;
let editingExpId = null;

export function renderDistributionPage() {
  const content = document.getElementById('main-content');
  if (!content) return;

  const allDistributors = [...distributors, ...getCustomDistributors()];
  const isAdminUser = isAdmin();

  content.innerHTML = `
    <div class="page-header">
      <h1>დისტრიბუცია</h1>
    </div>

    <div class="tabs">
      <button class="tab active" data-tab="incoming">მიწოდებები</button>
      <button class="tab" data-tab="expenses">დამატებითი ხარჯები</button>
      ${isAdminUser ? '<button class="tab" data-tab="manage">დისტრიბუტორების მართვა</button>' : ''}
    </div>

    <div class="tab-content active" id="tab-incoming">
      <div class="card">
        <h2>ახალი მიწოდება</h2>
        <form id="distribution-form" class="form-grid">
          <div class="form-group">
            <label>დისტრიბუტორი</label>
            <select id="dist-distributor" class="form-input" required>
              <option value="">აირჩიეთ...</option>
              ${allDistributors.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>თარიღი</label>
            <input type="date" id="dist-date" class="form-input" required value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-group">
            <label>დრო</label>
            <input type="time" id="dist-time" class="form-input" required value="${new Date().toTimeString().slice(0,5)}">
          </div>
          <div class="form-group">
            <label>პროდუქტის აღწერა</label>
            <textarea id="dist-description" class="form-input" rows="2" placeholder="მაგ: 10 კასრი ყაზბეგი..." required></textarea>
          </div>
          <div class="form-group">
            <label>ჯამური თანხა (₾)</label>
            <input type="number" id="dist-amount" class="form-input" step="0.01" min="0" required>
          </div>
          <div class="form-group">
            <label>სტატუსი</label>
            <select id="dist-status" class="form-input" required>
              <option value="გადასახდელია">გადასახდელია</option>
              <option value="გადახდილია">გადახდილია</option>
            </select>
          </div>
          <div class="form-group full-width">
            <button type="submit" class="btn btn-primary">შენახვა</button>
          </div>
        </form>
      </div>

      <div class="card mt-3">
        <h2>მიწოდებების ისტორია</h2>
        <div class="table-responsive">
          <table class="data-table" id="distributions-table">
            <thead>
              <tr>
                <th>თარიღი</th>
                <th>დრო</th>
                <th>დისტრიბუტორი</th>
                <th>აღწერა</th>
                <th>თანხა</th>
                <th>სტატუსი</th>
                <th>ცვლა</th>
                ${isAdminUser ? '<th>მოქმედება</th>' : ''}
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="tab-content" id="tab-expenses">
      <div class="card">
        <h2>დამატებითი ხარჯი</h2>
        <form id="expense-form" class="form-grid">
          <div class="form-group">
            <label>აღწერა</label>
            <input type="text" id="exp-description" class="form-input" placeholder="პლასტმასის პარკები..." required>
          </div>
          <div class="form-group">
            <label>თანხა (₾)</label>
            <input type="number" id="exp-amount" class="form-input" step="0.01" min="0" required>
          </div>
          <div class="form-group">
            <label>თარიღი</label>
            <input type="date" id="exp-date" class="form-input" required value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-group full-width">
            <button type="submit" class="btn btn-primary">შენახვა</button>
          </div>
        </form>
      </div>

      <div class="card mt-3">
        <h2>ხარჯების ისტორია</h2>
        <div class="table-responsive">
          <table class="data-table" id="expenses-table">
            <thead>
              <tr>
                <th>თარიღი</th>
                <th>აღწერა</th>
                <th>თანხა</th>
                <th>ცვლა</th>
                <th>თანამშრომელი</th>
                ${isAdminUser ? '<th>მოქმედება</th>' : ''}
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </div>

    ${isAdminUser ? `
    <div class="tab-content" id="tab-manage">
      <div class="card">
        <h2>ახალი დისტრიბუტორის დამატება</h2>
        <form id="new-distributor-form" class="form-grid">
          <div class="form-group">
            <label>სახელი</label>
            <input type="text" id="new-dist-name" class="form-input" required>
          </div>
          <div class="form-group">
            <label>პროდუქტები (მოკლე აღწერა)</label>
            <input type="text" id="new-dist-products" class="form-input" placeholder="მაგ: სხვადასხვა პროდუქტები">
          </div>
          <div class="form-group full-width">
            <button type="submit" class="btn btn-primary">დამატება</button>
          </div>
        </form>
      </div>
      <div class="card mt-3">
        <h2>არსებული დისტრიბუტორები</h2>
        <ul id="distributors-list" class="simple-list"></ul>
      </div>
    </div>
    ` : ''}

    <!-- Edit Distribution Modal -->
    <div class="modal" id="edit-dist-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>მიწოდების რედაქტირება</h3>
          <button class="modal-close" data-modal="edit-dist-modal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>დისტრიბუტორი</label>
            <select id="edit-dist-distributor" class="form-input"></select>
          </div>
          <div class="form-group">
            <label>თარიღი</label>
            <input type="date" id="edit-dist-date" class="form-input">
          </div>
          <div class="form-group">
            <label>დრო</label>
            <input type="time" id="edit-dist-time" class="form-input">
          </div>
          <div class="form-group">
            <label>აღწერა</label>
            <textarea id="edit-dist-description" class="form-input" rows="2"></textarea>
          </div>
          <div class="form-group">
            <label>ჯამური თანხა (₾)</label>
            <input type="number" id="edit-dist-amount" class="form-input" step="0.01">
          </div>
          <div class="form-group">
            <label>სტატუსი</label>
            <select id="edit-dist-status" class="form-input">
              <option value="გადასახდელია">გადასახდელია</option>
              <option value="გადახდილია">გადახდილია</option>
            </select>
          </div>
          <div class="modal-actions">
            <button id="save-edit-dist-btn" class="btn btn-primary">შენახვა</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Expense Modal -->
    <div class="modal" id="edit-exp-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>ხარჯის რედაქტირება</h3>
          <button class="modal-close" data-modal="edit-exp-modal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>აღწერა</label>
            <input type="text" id="edit-exp-description" class="form-input">
          </div>
          <div class="form-group">
            <label>თანხა (₾)</label>
            <input type="number" id="edit-exp-amount" class="form-input" step="0.01">
          </div>
          <div class="form-group">
            <label>თარიღი</label>
            <input type="date" id="edit-exp-date" class="form-input">
          </div>
          <div class="modal-actions">
            <button id="save-edit-exp-btn" class="btn btn-primary">შენახვა</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Tab switching
  document.querySelectorAll('.tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });

  // Forms
  document.getElementById('distribution-form').addEventListener('submit', handleDistributionSubmit);
  document.getElementById('expense-form').addEventListener('submit', handleExpenseSubmit);

  // Modal close
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modal;
      document.getElementById(modalId).classList.remove('active');
      editingDistId = null;
      editingExpId = null;
    });
  });

  if (isAdminUser) {
    document.getElementById('new-distributor-form').addEventListener('submit', handleNewDistributor);
    renderDistributorsList();
  }

  renderDistributionsTable();
  renderExpensesTable();
}

function handleDistributionSubmit(e) {
  e.preventDefault();
  const shift = getCurrentShift();
  const user = getCurrentUser();
  if (!shift || !user) return;

  const distId = document.getElementById('dist-distributor').value;
  const allD = [...distributors, ...getCustomDistributors()];
  const dist = allD.find(d => d.id === distId);

  const entry = {
    id: Date.now().toString(),
    distributorId: distId,
    distributorName: dist ? dist.name : distId,
    date: document.getElementById('dist-date').value,
    time: document.getElementById('dist-time').value,
    description: document.getElementById('dist-description').value,
    totalAmount: parseFloat(document.getElementById('dist-amount').value),
    status: document.getElementById('dist-status').value,
    shiftId: shift.id,
    username: user.username,
    userName: user.name,
    createdAt: new Date().toISOString()
  };

  const list = getDistributions();
  list.unshift(entry);
  saveDistributions(list);

  e.target.reset();
  document.getElementById('dist-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('dist-time').value = new Date().toTimeString().slice(0,5);
  renderDistributionsTable();
  alert('მიწოდება შენახულია');
}

function handleExpenseSubmit(e) {
  e.preventDefault();
  const shift = getCurrentShift();
  const user = getCurrentUser();
  if (!shift || !user) return;

  const entry = {
    id: Date.now().toString(),
    description: document.getElementById('exp-description').value,
    amount: parseFloat(document.getElementById('exp-amount').value),
    date: document.getElementById('exp-date').value,
    shiftId: shift.id,
    username: user.username,
    userName: user.name,
    createdAt: new Date().toISOString()
  };

  const list = getExpenses();
  list.unshift(entry);
  saveExpenses(list);

  e.target.reset();
  document.getElementById('exp-date').value = new Date().toISOString().split('T')[0];
  renderExpensesTable();
  alert('ხარჯი შენახულია');
}

function handleNewDistributor(e) {
  e.preventDefault();
  const name = document.getElementById('new-dist-name').value.trim();
  const products = document.getElementById('new-dist-products').value.trim();
  if (!name) return;

  const list = getCustomDistributors();
  list.push({
    id: 'custom_' + Date.now(),
    name: name,
    products: products ? [products] : []
  });
  saveCustomDistributors(list);
  e.target.reset();
  renderDistributorsList();
  alert('დისტრიბუტორი დამატებულია');
}

function renderDistributionsTable() {
  const tbody = document.querySelector('#distributions-table tbody');
  if (!tbody) return;

  const list = getDistributions();
  const isAdminUser = isAdmin();

  tbody.innerHTML = list.map(d => `
    <tr>
      <td>${d.date}</td>
      <td>${d.time}</td>
      <td>${d.distributorName}</td>
      <td>${d.description}</td>
      <td>${d.totalAmount.toFixed(2)} ₾</td>
      <td><span class="badge ${d.status === 'გადახდილია' ? 'badge-success' : 'badge-warning'}">${d.status}</span></td>
      <td>${d.userName || '-'}</td>
      ${isAdminUser ? `
        <td>
          <button class="btn btn-secondary btn-sm edit-dist-btn" data-id="${d.id}">რედაქტირება</button>
          <button class="btn btn-danger btn-sm delete-dist-btn" data-id="${d.id}">წაშლა</button>
        </td>
      ` : ''}
    </tr>
  `).join('') || '<tr><td colspan="8" class="text-center">ჩანაწერები არ არის</td></tr>';

  if (isAdminUser) {
    tbody.querySelectorAll('.edit-dist-btn').forEach(btn => {
      btn.addEventListener('click', () => editDistribution(btn.dataset.id));
    });
    tbody.querySelectorAll('.delete-dist-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('ნამდვილად გსურთ წაშლა?')) {
          const list = getDistributions().filter(d => d.id !== btn.dataset.id);
          saveDistributions(list);
          renderDistributionsTable();
        }
      });
    });
  }
}

function renderExpensesTable() {
  const tbody = document.querySelector('#expenses-table tbody');
  if (!tbody) return;

  const list = getExpenses();
  const isAdminUser = isAdmin();

  tbody.innerHTML = list.map(e => `
    <tr>
      <td>${e.date}</td>
      <td>${e.description}</td>
      <td>${e.amount.toFixed(2)} ₾</td>
      <td>${e.userName || '-'}</td>
      <td>${e.username || '-'}</td>
      ${isAdminUser ? `
        <td>
          <button class="btn btn-secondary btn-sm edit-exp-btn" data-id="${e.id}">რედაქტირება</button>
          <button class="btn btn-danger btn-sm delete-exp-btn" data-id="${e.id}">წაშლა</button>
        </td>
      ` : ''}
    </tr>
  `).join('') || '<tr><td colspan="6" class="text-center">ჩანაწერები არ არის</td></tr>';

  if (isAdminUser) {
    tbody.querySelectorAll('.edit-exp-btn').forEach(btn => {
      btn.addEventListener('click', () => editExpense(btn.dataset.id));
    });
    tbody.querySelectorAll('.delete-exp-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('ნამდვილად გსურთ წაშლა?')) {
          const list = getExpenses().filter(e => e.id !== btn.dataset.id);
          saveExpenses(list);
          renderExpensesTable();
        }
      });
    });
  }
}

function renderDistributorsList() {
  const ul = document.getElementById('distributors-list');
  if (!ul) return;
  const fixed = distributors.map(d => `<li><strong>${d.name}</strong> — ${d.products.join(', ')} <em>(ფიქსირებული)</em></li>`).join('');
  const custom = getCustomDistributors().map(d => `<li><strong>${d.name}</strong> — ${(d.products || []).join(', ')}</li>`).join('');
  ul.innerHTML = fixed + custom || '<li>დისტრიბუტორები არ არის</li>';
}

// Edit Distribution Modal
function editDistribution(id) {
  const list = getDistributions();
  const item = list.find(d => d.id === id);
  if (!item) return;

  editingDistId = id;

  const allD = [...distributors, ...getCustomDistributors()];
  const select = document.getElementById('edit-dist-distributor');
  select.innerHTML = allD.map(d => `<option value="${d.id}" ${d.id === item.distributorId ? 'selected' : ''}>${d.name}</option>`).join('');

  document.getElementById('edit-dist-date').value = item.date;
  document.getElementById('edit-dist-time').value = item.time;
  document.getElementById('edit-dist-description').value = item.description;
  document.getElementById('edit-dist-amount').value = item.totalAmount;
  document.getElementById('edit-dist-status').value = item.status;

  document.getElementById('edit-dist-modal').classList.add('active');

  const saveBtn = document.getElementById('save-edit-dist-btn');
  const newBtn = saveBtn.cloneNode(true);
  saveBtn.parentNode.replaceChild(newBtn, saveBtn);

  newBtn.addEventListener('click', saveEditedDistribution);
}

function saveEditedDistribution() {
  if (!editingDistId) return;

  const list = getDistributions();
  const item = list.find(d => d.id === editingDistId);
  if (!item) return;

  item.distributorId = document.getElementById('edit-dist-distributor').value;
  item.date = document.getElementById('edit-dist-date').value;
  item.time = document.getElementById('edit-dist-time').value;
  item.description = document.getElementById('edit-dist-description').value;
  item.totalAmount = parseFloat(document.getElementById('edit-dist-amount').value);
  item.status = document.getElementById('edit-dist-status').value;

  saveDistributions(list);
  document.getElementById('edit-dist-modal').classList.remove('active');
  editingDistId = null;

  alert('მიწოდება განახლებულია');
  renderDistributionsTable();
}

// Edit Expense Modal
function editExpense(id) {
  const list = getExpenses();
  const item = list.find(e => e.id === id);
  if (!item) return;

  editingExpId = id;

  document.getElementById('edit-exp-description').value = item.description;
  document.getElementById('edit-exp-amount').value = item.amount;
  document.getElementById('edit-exp-date').value = item.date;

  document.getElementById('edit-exp-modal').classList.add('active');

  const saveBtn = document.getElementById('save-edit-exp-btn');
  const newBtn = saveBtn.cloneNode(true);
  saveBtn.parentNode.replaceChild(newBtn, saveBtn);

  newBtn.addEventListener('click', saveEditedExpense);
}

function saveEditedExpense() {
  if (!editingExpId) return;

  const list = getExpenses();
  const item = list.find(e => e.id === editingExpId);
  if (!item) return;

  item.description = document.getElementById('edit-exp-description').value;
  item.amount = parseFloat(document.getElementById('edit-exp-amount').value);
  item.date = document.getElementById('edit-exp-date').value;

  saveExpenses(list);
  document.getElementById('edit-exp-modal').classList.remove('active');
  editingExpId = null;

  alert('ხარჯი განახლებულია');
  renderExpensesTable();
}