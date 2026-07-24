// stock.js - Inventory management, admin overrides, and responsive stock layout

import { categories, getAllProducts, initialStock } from './products.js';
import { isAdmin, getCurrentUser } from './auth.js';

export function getStock() {
  let savedStock = {};
  try {
    const raw = localStorage.getItem('stock');
    if (raw) {
      savedStock = JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error parsing stock from localStorage:', e);
  }

  // Merge initialStock with saved stock so new default items are automatically included
  const mergedStock = { ...initialStock, ...savedStock };

  // Ensure all products (including custom products) exist in the stock object
  let hasNewKeys = false;
  try {
    const allProducts = getAllProducts();
    allProducts.forEach(p => {
      if (mergedStock[p.id] === undefined) {
        mergedStock[p.id] = initialStock[p.id] !== undefined ? initialStock[p.id] : 0;
        hasNewKeys = true;
      }
    });
  } catch (e) {
    console.error('Error fetching products in getStock:', e);
  }

  // Auto-save merged stock back to localStorage if new keys were found or stock wasn't set yet
  if (hasNewKeys || !localStorage.getItem('stock')) {
    saveStock(mergedStock);
  }

  return mergedStock;
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

  const currentUser = getCurrentUser();

  content.innerHTML = `
    <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
      <div>
        <h1>მარაგი / ინვენტარი</h1>
        ${currentUser ? `<p style="font-size: 13px; color: #666; margin-top: 4px;">მომხმარებელი: <strong>${currentUser.name || currentUser.username}</strong></p>` : ''}
      </div>
      <button id="add-product-btn" class="btn btn-primary">ახალი პროდუქტის დამატება</button>
    </div>

    <div class="card" style="padding: 15px; width: 100%; max-width: 100%; box-sizing: border-box;">
      <div style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch;">
        <table class="data-table" id="stock-table" style="width: 100%; min-width: 650px; border-collapse: collapse; white-space: nowrap;">
          <thead>
            <tr>
              <th style="text-align: left; padding: 12px 10px;">კატეგორია</th>
              <th style="text-align: left; padding: 12px 10px;">პროდუქტი</th>
              <th style="text-align: left; padding: 12px 10px;">ფასი</th>
              <th style="text-align: left; padding: 12px 10px;">ერთეული</th>
              <th style="text-align: left; padding: 12px 10px;">მარაგი</th>
              <th style="text-align: left; padding: 12px 10px;">მოქმედება</th>
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
              <input type="number" id="prod-stock" class="form-input" min="0" step="0.001" value="0" required>
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
            <input type="number" id="adjust-qty" class="form-input" min="0" step="0.001">
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
    document.getElementById('prod-stock').disabled = false;
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

    let overrides = JSON.parse(localStorage.getItem('productOverrides') || '{}');
    let customProducts = JSON.parse(localStorage.getItem('customProducts') || '[]');

    if (editId) {
      let isCustom = customProducts.some(p => p.id === editId);
      if (isCustom) {
        customProducts = customProducts.map(p => p.id === editId ? {
          ...p,
          name, price, unit, type, categoryId: catId,
          categoryName: categories.find(c => c.id === catId)?.name || 'სხვა'
        } : p);
        localStorage.setItem('customProducts', JSON.stringify(customProducts));
      } else {
        overrides[editId] = { name, price, unit, type, categoryId: catId };
        localStorage.setItem('productOverrides', JSON.stringify(overrides));
      }

      const stock = getStock();
      if (!isNaN(stockQty)) {
        stock[editId] = stockQty;
        saveStock(stock);
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
      localStorage.setItem('customProducts', JSON.stringify(customProducts));
      const stock = getStock();
      stock[newId] = stockQty;
      saveStock(stock);
    }

    document.getElementById('product-modal').classList.remove('active');
    renderStockTable();
    alert('პროდუქტი შენახულია.');
  });
}

function renderStockTable() {
  const tbody = document.querySelector('#stock-table tbody');
  if (!tbody) return;

  const stock = getStock();
  const allProducts = getAllProducts();
  const overrides = JSON.parse(localStorage.getItem('productOverrides') || '{}');
  const deletedIds = JSON.parse(localStorage.getItem('deletedProducts') || '[]');

  const combined = allProducts
    .filter(p => !deletedIds.includes(p.id))
    .map(p => {
      if (overrides[p.id]) {
        const ov = overrides[p.id];
        return {
          ...p,
          name: ov.name,
          price: ov.price,
          unit: ov.unit,
          type: ov.type,
          categoryId: ov.categoryId,
          categoryName: categories.find(c => c.id === ov.categoryId)?.name || p.categoryName
        };
      }
      return p;
    });

  tbody.innerHTML = combined.map(p => {
    const qty = stock[p.id] !== undefined ? stock[p.id] : 0;
    const lowStock = qty < 5;
    return `
      <tr class="${lowStock ? 'low-stock' : ''}">
        <td style="padding: 10px;">${p.categoryName || '-'}</td>
        <td style="padding: 10px;">${p.name}</td>
        <td style="padding: 10px;">${p.price.toFixed(2)} ₾</td>
        <td style="padding: 10px;">${p.unit}</td>
        <td style="padding: 10px;"><strong>${typeof qty === 'number' ? qty.toFixed(3) : qty}</strong></td>
        <td style="padding: 10px;">
          <div style="display: inline-flex; gap: 6px; align-items: center;">
            <button class="btn btn-secondary btn-sm adjust-btn" data-id="${p.id}" data-name="${p.name}" data-qty="${qty}">რაოდენობა</button>
            <button class="btn btn-outline btn-sm edit-prod-btn" data-id="${p.id}">რედაქტირება</button>
            <button class="btn btn-danger btn-sm delete-prod-btn" data-id="${p.id}">წაშლა</button>
          </div>
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

  tbody.querySelectorAll('.edit-prod-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const prodId = btn.dataset.id;
      const allP = combined.find(p => p.id === prodId);
      if (!allP) return;

      document.getElementById('product-modal-title').textContent = 'პროდუქტის რედაქტირება';
      document.getElementById('edit-product-id').value = allP.id;
      document.getElementById('prod-category').value = allP.categoryId || 'other';
      document.getElementById('prod-name').value = allP.name;
      document.getElementById('prod-price').value = allP.price;
      document.getElementById('prod-unit').value = allP.unit;
      document.getElementById('prod-type').value = allP.type || 'piece';
      document.getElementById('prod-stock').value = stock[prodId] !== undefined ? stock[prodId] : 0;
      
      document.getElementById('product-modal').classList.add('active');
    });
  });

  tbody.querySelectorAll('.delete-prod-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('ნამდვილად გსურთ ამ პროდუქტის ხაზის წაშლა?')) {
        const prodId = btn.dataset.id;
        
        if (prodId.startsWith('custom_')) {
          let custom = JSON.parse(localStorage.getItem('customProducts') || '[]');
          custom = custom.filter(p => p.id !== prodId);
          localStorage.setItem('customProducts', JSON.stringify(custom));
        } else {
          let deletedIds = JSON.parse(localStorage.getItem('deletedProducts') || '[]');
          if (!deletedIds.includes(prodId)) {
            deletedIds.push(prodId);
            localStorage.setItem('deletedProducts', JSON.stringify(deletedIds));
          }
        }

        const stock = getStock();
        delete stock[prodId];
        saveStock(stock);
        renderStockTable();
      }
    });
  });
}