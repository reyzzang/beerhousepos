// stock.js - Inventory management and admin overrides

import { categories, getAllProducts, initialStock } from './products.js';
import { isAdmin } from './auth.js';

export function getStock() {
  let stock = localStorage.getItem('stock');
  if (!stock) {
    localStorage.setItem('stock', JSON.stringify(initialStock));
    return { ...initialStock };
  }
  return JSON.parse(stock);
}

export function saveStock(stock) {
  localStorage.setItem('stock', JSON.stringify(stock));
}

export function renderStockPage() {
  const content = document.getElementById('main-content');
  if (!content) return;

  if (!isAdmin()) {
    content.innerHTML = `
      <div class="page-header">
        <h1>მარაგი</h1>
      </div>
      <div class="card">
        <p class="text-center">მარაგის მართვა ხელმისაწვდომია მხოლოდ ადმინისთვის.</p>
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <div class="page-header">
      <h1>მარაგი / ინვენტარი</h1>
      <button id="add-product-btn" class="btn btn-primary">ახალი პროდუქტის დამატება</button>
    </div>

    <div class="card">
      <div class="table-responsive">
        <table class="data-table" id="stock-table">
          <thead>
            <tr>
              <th>კატეგორია</th>
              <th>პროდუქტი</th>
              <th>ფასი</th>
              <th>ერთეული</th>
              <th>მარაგი</th>
              <th>მოქმედება</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <!-- Add/Edit Product Modal -->
    <div class="modal" id="product-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="product-modal-title">ახალი პროდუქტი</h3>
          <button class="modal-close" data-modal="product-modal">×</button>
        </div>
        <div class="modal-body">
          <form id="product-form" class="form-grid">
            <input type="hidden" id="edit-product-id">
            <div class="form-group">
              <label>კატეგორია</label>
              <select id="prod-category" class="form-input" required>
                ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                <option value="other">სხვა</option>
              </select>
            </div>
            <div class="form-group">
              <label>სახელი</label>
              <input type="text" id="prod-name" class="form-input" required>
            </div>
            <div class="form-group">
              <label>ფასი (₾)</label>
              <input type="number" id="prod-price" class="form-input" step="0.01" min="0" required>
            </div>
            <div class="form-group">
              <label>ერთეული</label>
              <select id="prod-unit" class="form-input" required>
                <option value="ცალი">ცალი</option>
                <option value="ლიტრი">ლიტრი</option>
                <option value="კგ">კგ</option>
              </select>
            </div>
            <div class="form-group">
              <label>ტიპი</label>
              <select id="prod-type" class="form-input" required>
                <option value="piece">ცალი</option>
                <option value="liter">ლიტრი (მულტიპლიკატორებით)</option>
                <option value="weight">წონითი (ხელით ფასი)</option>
              </select>
            </div>
            <div class="form-group">
              <label>საწყისი მარაგი</label>
              <input type="number" id="prod-stock" class="form-input" min="0" value="0" required>
            </div>
            <div class="form-group full-width">
              <button type="submit" class="btn btn-primary">შენახვა</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Adjust Stock Modal -->
    <div class="modal" id="adjust-modal">
      <div class="modal-content modal-sm">
        <div class="modal-header">
          <h3>მარაგის კორექტირება</h3>
          <button class="modal-close" data-modal="adjust-modal">×</button>
        </div>
        <div class="modal-body">
          <p id="adjust-product-name"></p>
          <div class="form-group">
            <label>ახალი რაოდენობა</label>
            <input type="number" id="adjust-qty" class="form-input" min="0" step="0.1">
          </div>
          <div class="modal-actions">
            <button id="adjust-confirm-btn" class="btn btn-primary">შენახვა</button>
          </div>
        </div>
      </div>
    </div>
  `;

  renderStockTable();

  document.getElementById('add-product-btn').addEventListener('click', () => {
    document.getElementById('product-modal-title').textContent = 'ახალი პროდუქტი';
    document.getElementById('edit-product-id').value = '';
    document.getElementById('product-form').reset();
    document.getElementById('product-modal').classList.add('active');
  });

  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.modal).classList.remove('active');
    });
  });

  document.getElementById('product-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('edit-product-id').value;
    const name = document.getElementById('prod-name').value.trim();
    const price = parseFloat(document.getElementById('prod-price').value);
    const unit = document.getElementById('prod-unit').value;
    const type = document.getElementById('prod-type').value;
    const stockQty = parseFloat(document.getElementById('prod-stock').value);
    const catId = document.getElementById('prod-category').value;

    // Custom products stored separately
    let customProducts = JSON.parse(localStorage.getItem('customProducts') || '[]');

    if (editId) {
      // Edit existing custom
      const idx = customProducts.findIndex(p => p.id === editId);
      if (idx !== -1) {
        customProducts[idx] = {
          ...customProducts[idx],
          name, price, unit, type, categoryId: catId
        };
      }
    } else {
      const newId = 'custom_' + Date.now();
      customProducts.push({
        id: newId,
        name,
        price,
        unit,
        type,
        categoryId: catId,
        categoryName: categories.find(c => c.id === catId)?.name || 'სხვა',
        multipliers: type === 'liter' ? [1, 2, 3, 6] : undefined
      });
      // Add to stock
      const stock = getStock();
      stock[newId] = stockQty;
      saveStock(stock);
    }

    localStorage.setItem('customProducts', JSON.stringify(customProducts));
    document.getElementById('product-modal').classList.remove('active');
    renderStockTable();
    alert('პროდუქტი შენახულია. გვერდის განახლება საჭიროა სრულად გამოსაჩენად.');
  });
}

function renderStockTable() {
  const tbody = document.querySelector('#stock-table tbody');
  if (!tbody) return;

  const stock = getStock();
  const allProducts = getAllProducts();
  const customProducts = JSON.parse(localStorage.getItem('customProducts') || '[]');

  // Merge
  const combined = [...allProducts];
  customProducts.forEach(cp => {
    if (!combined.find(p => p.id === cp.id)) {
      combined.push(cp);
    }
  });

  tbody.innerHTML = combined.map(p => {
    const qty = stock[p.id] !== undefined ? stock[p.id] : 0;
    const lowStock = qty < 10;
    return `
      <tr class="${lowStock ? 'low-stock' : ''}">
        <td>${p.categoryName || '-'}</td>
        <td>${p.name}</td>
        <td>${p.price.toFixed(2)} ₾</td>
        <td>${p.unit}</td>
        <td><strong>${typeof qty === 'number' ? qty.toFixed(1) : qty}</strong></td>
        <td>
          <button class="btn btn-secondary btn-sm adjust-btn" data-id="${p.id}" data-name="${p.name}" data-qty="${qty}">კორექტირება</button>
          ${p.id.startsWith('custom_') ? `<button class="btn btn-danger btn-sm delete-prod-btn" data-id="${p.id}">წაშლა</button>` : ''}
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.adjust-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('adjust-product-name').textContent = btn.dataset.name;
      document.getElementById('adjust-qty').value = btn.dataset.qty;
      document.getElementById('adjust-modal').classList.add('active');

      const confirmBtn = document.getElementById('adjust-confirm-btn');
      const newBtn = confirmBtn.cloneNode(true);
      confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

      newBtn.addEventListener('click', () => {
        const newQty = parseFloat(document.getElementById('adjust-qty').value);
        if (isNaN(newQty) || newQty < 0) {
          alert('არასწორი რაოდენობა');
          return;
        }
        const stock = getStock();
        stock[btn.dataset.id] = newQty;
        saveStock(stock);
        document.getElementById('adjust-modal').classList.remove('active');
        renderStockTable();
      });
    });
  });

  tbody.querySelectorAll('.delete-prod-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('ნამდვილად გსურთ ამ პროდუქტის წაშლა?')) {
        let custom = JSON.parse(localStorage.getItem('customProducts') || '[]');
        custom = custom.filter(p => p.id !== btn.dataset.id);
        localStorage.setItem('customProducts', JSON.stringify(custom));
        const stock = getStock();
        delete stock[btn.dataset.id];
        saveStock(stock);
        renderStockTable();
      }
    });
  });
}