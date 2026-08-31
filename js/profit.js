// profit.js - Admin Profit Calculation and Analytics Page

import { getCurrentUser, isAdmin } from './auth.js';
import { getSales, saveSales } from './history.js';
import { getAllProducts } from './products.js';

// Helper to remove accents/umlauts and make text lowercase for perfect matching
function normalizeName(str) {
  return (str || '')
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Turns 'ä' into 'a', etc.
}

function getLatestProductCatalog() {
  let catalog = [];
  
  try {
    const allProducts = getAllProducts() || [];
    const overrides = JSON.parse(localStorage.getItem('productOverrides') || '{}');
    
    allProducts.forEach(p => {
      if (overrides[p.id]) {
        catalog.push({
          id: p.id,
          name: overrides[p.id].name || p.name,
          costPrice: overrides[p.id].costPrice !== undefined ? overrides[p.id].costPrice : p.costPrice
        });
      } else {
        catalog.push(p);
      }
    });
  } catch (e) {
    console.error("Error loading base products:", e);
  }

  try {
    const customProducts = JSON.parse(localStorage.getItem('customProducts') || '[]');
    customProducts.forEach(cp => catalog.push(cp));
  } catch(e) {
    console.error("Error loading custom products:", e);
  }

  return catalog;
}

export function renderProfitPage() {
  const content = document.getElementById('main-content');
  if (!content) return;

  if (!isAdmin()) {
    content.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px;">
        <h2>წვდომა შეზღუდულია</h2>
        <p>ეს გვერდი განკუთვნილია მხოლოდ ადმინისტრატორისთვის.</p>
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <div class="page-header">
      <h1>მოგების ანალიტიკა (ფინანსები)</h1>
    </div>

    <div class="metrics-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px; margin-bottom: 20px;">
      <div class="card" style="padding: 20px; border-left: 4px solid #0275d8;">
        <h3 style="font-size: 14px; color: #666; margin-bottom: 8px;">სულ შემოსავალი</h3>
        <p id="total-revenue-val" style="font-size: 24px; font-weight: bold; color: #333;">0.00 ₾</p>
      </div>
      <div class="card" style="padding: 20px; border-left: 4px solid #d9534f;">
        <h3 style="font-size: 14px; color: #666; margin-bottom: 8px;">სულ თვითღირებულება</h3>
        <p id="total-cost-val" style="font-size: 24px; font-weight: bold; color: #d9534f;">0.00 ₾</p>
      </div>
      <div class="card" style="padding: 20px; border-left: 4px solid #5cb85c;">
        <h3 style="font-size: 14px; color: #666; margin-bottom: 8px;">სუფთა მოგება</h3>
        <p id="total-profit-val" style="font-size: 24px; font-weight: bold; color: #5cb85c;">0.00 ₾</p>
      </div>
    </div>

    <div class="card" style="margin-bottom: 20px;">
      <div class="filters" style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: space-between; align-items: center;">
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn btn-outline profit-filter active" data-filter="today">დღეს</button>
          <button class="btn btn-outline profit-filter" data-filter="week">ამ კვირაში</button>
          <button class="btn btn-outline profit-filter" data-filter="month">ამ თვეში</button>
          <button class="btn btn-outline profit-filter" data-filter="all">ყველა დროის</button>
        </div>
        <div style="flex-grow: 1; max-width: 300px;">
          <input type="text" id="profit-search" class="form-input" placeholder="🔍 პროდუქტის ძიება..." style="width: 100%;">
        </div>
      </div>
    </div>

    <div class="card">
      <h2>პროდუქტების მიხედვით მოგების განაწილება</h2>
      <div class="table-responsive mt-2" style="width: 100%; overflow-x: auto;">
        <table class="data-table" id="profit-table" style="width: 100%; min-width: 850px; border-collapse: collapse; white-space: nowrap;">
          <thead>
            <tr style="background-color: #f8f9fa; border-bottom: 2px solid #ddd;">
              <th style="text-align: left; padding: 12px 10px;">პროდუქტი</th>
              <th style="text-align: center; padding: 12px 10px;">რაოდენობა</th>
              <th style="text-align: right; padding: 12px 10px;">საშ. გასაყიდი ფასი</th>
              <th style="text-align: right; padding: 12px 10px;">თვითღირებულება</th>
              <th style="text-align: right; padding: 12px 10px;">ერთეულის მოგება</th>
              <th style="text-align: right; padding: 12px 10px;">ჯამური მოგება</th>
              <th style="text-align: center; padding: 12px 10px;">მოქმედება</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <!-- Edit Profit Modal -->
    <div class="modal" id="edit-profit-modal">
      <div class="modal-content modal-sm">
        <div class="modal-header">
          <h3>თვითღირებულების რედაქტირება</h3>
          <button class="modal-close" data-modal="edit-profit-modal">×</button>
        </div>
        <div class="modal-body">
          <p id="edit-profit-name-display" style="font-weight: bold; margin-bottom: 15px; font-size: 16px;"></p>
          <input type="hidden" id="edit-profit-original-name">
          <div class="form-group">
            <label>ახალი თვითღირებულება (₾)</label>
            <input type="number" id="edit-profit-cost" class="form-input" step="0.01" min="0" placeholder="მაგ: 2.50">
          </div>
          <div class="modal-actions mt-3">
            <button id="save-profit-edit-btn" class="btn btn-primary" style="width: 100%;">შენახვა და გადათვლა</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach Filter Listeners
  document.querySelectorAll('.profit-filter').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.profit-filter').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      calculateAndRenderProfits(e.target.dataset.filter);
    });
  });

  // Attach Search Listener
  const searchInput = document.getElementById('profit-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const activeFilter = document.querySelector('.profit-filter.active')?.dataset.filter || 'today';
      calculateAndRenderProfits(activeFilter);
    });
  }

  // Attach Modal Close Handlers
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.modal).classList.remove('active');
    });
  });

  // Attach Edit Save Handler
  document.getElementById('save-profit-edit-btn').addEventListener('click', () => {
    const targetName = document.getElementById('edit-profit-original-name').value;
    const newCost = parseFloat(document.getElementById('edit-profit-cost').value) || 0;
    
    const activeCatalog = getLatestProductCatalog();
    let overrides = JSON.parse(localStorage.getItem('productOverrides') || '{}');
    let customProducts = JSON.parse(localStorage.getItem('customProducts') || '[]');
    let updated = false;

    // Find and update the cost price in the catalog
    activeCatalog.forEach(p => {
      if (normalizeName(p.name) === normalizeName(targetName)) {
        updated = true;
        if (p.id && String(p.id).startsWith('custom_')) {
          const cIdx = customProducts.findIndex(cp => cp.id === p.id);
          if (cIdx !== -1) customProducts[cIdx].costPrice = newCost;
        } else if (p.id) {
          if (!overrides[p.id]) overrides[p.id] = { name: p.name };
          overrides[p.id].costPrice = newCost;
        }
      }
    });

    if (updated) {
      localStorage.setItem('productOverrides', JSON.stringify(overrides));
      localStorage.setItem('customProducts', JSON.stringify(customProducts));
      
      document.getElementById('edit-profit-modal').classList.remove('active');
      const activeFilter = document.querySelector('.profit-filter.active')?.dataset.filter || 'today';
      calculateAndRenderProfits(activeFilter);
      alert('თვითღირებულება განახლდა და მოგება გადაითვალა!');
    } else {
      alert('პროდუქტი კატალოგში ვერ მოიძებნა.');
    }
  });

  calculateAndRenderProfits('today');
}

function calculateAndRenderProfits(filter = 'today') {
  const tbody = document.querySelector('#profit-table tbody');
  const revenueEl = document.getElementById('total-revenue-val');
  const costEl = document.getElementById('total-cost-val');
  const profitEl = document.getElementById('total-profit-val');
  const searchQuery = (document.getElementById('profit-search')?.value || '').trim().toLowerCase();

  if (!tbody) return;

  const rawSales = getSales() || [];
  const sales = Array.isArray(rawSales) ? rawSales : Object.values(rawSales);
  const activeCatalog = getLatestProductCatalog();

  const costMap = {};
  activeCatalog.forEach(p => {
    const cleanName = normalizeName(p.name);
    const buyPrice = parseFloat(p.costPrice || 0);
    if (cleanName) {
      costMap[cleanName] = buyPrice;
    }
  });

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const filteredSales = sales.filter(s => {
    const d = new Date(s.timestamp || s.date);
    if (isNaN(d.getTime())) return true; 

    const saleTime = d.getTime();

    if (filter === 'today') {
      return saleTime >= startOfToday;
    } else if (filter === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return saleTime >= weekAgo.getTime();
    } else if (filter === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return true; 
  });

  let overallRevenue = 0;
  let overallCost = 0;
  const productProfitMap = {};

  filteredSales.forEach(sale => {
    const items = sale.items || sale.products || []; 
    items.forEach(item => {
      const name = item.name || 'უცნობი';
      const cleanKey = normalizeName(name);
      const qty = parseFloat(item.quantity || item.qty || item.count || 1);
      
      const lineTotal = parseFloat(item.total || item.totalPrice || (item.price * qty) || 0);
      const sellingPriceUnit = qty > 0 ? (lineTotal / qty) : 0;

      let unitCost = 0;
      if (costMap[cleanKey] !== undefined) {
        unitCost = costMap[cleanKey];
      } else {
        const matchedKey = Object.keys(costMap).find(k => k.includes(cleanKey) || cleanKey.includes(k));
        if (matchedKey) unitCost = costMap[matchedKey];
      }

      const lineCost = unitCost * qty;

      // Grouping
      if (!productProfitMap[name]) {
        productProfitMap[name] = {
          name: name,
          qty: 0,
          totalRevenue: 0,
          totalCost: 0,
          unitSellingPriceSum: 0,
          sellingPriceCount: 0,
          unitCost: unitCost 
        };
      }

      productProfitMap[name].qty += qty;
      productProfitMap[name].totalRevenue += lineTotal;
      productProfitMap[name].totalCost += lineCost;
      productProfitMap[name].unitSellingPriceSum += sellingPriceUnit;
      productProfitMap[name].sellingPriceCount += 1;
    });
  });

  // Calculate top-level overall totals BEFORE filtering by search
  Object.values(productProfitMap).forEach(p => {
    overallRevenue += p.totalRevenue;
    overallCost += p.totalCost;
  });

  const overallProfit = overallRevenue - overallCost;

  if (revenueEl) revenueEl.textContent = `${overallRevenue.toFixed(2)} ₾`;
  if (costEl) costEl.textContent = `${overallCost.toFixed(2)} ₾`;
  if (profitEl) profitEl.textContent = `${overallProfit.toFixed(2)} ₾`;

  // --- SMART SEARCH FILTER ---
  let displayList = Object.values(productProfitMap);
  if (searchQuery) {
    const searchTerms = searchQuery.split(' ').filter(t => t.length > 0);
    displayList = displayList.filter(p => {
      // Break the product name into words
      const nameWords = p.name.toLowerCase().split(/[\s\-()]+/);
      
      // Check if EVERY typed search word matches the START of any word in the product name
      return searchTerms.every(term => 
        nameWords.some(word => word.startsWith(term))
      );
    });
  }

  displayList.sort((a, b) => (b.totalRevenue - b.totalCost) - (a.totalRevenue - a.totalCost));

  tbody.innerHTML = displayList.map(p => {
    const avgSellingPrice = p.sellingPriceCount > 0 ? (p.unitSellingPriceSum / p.sellingPriceCount) : 0;
    const unitProfit = avgSellingPrice - p.unitCost;
    const totalItemProfit = p.totalRevenue - p.totalCost;

    return `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px;"><strong>${p.name}</strong></td>
        <td style="padding: 10px; text-align: center;">${p.qty}</td>
        <td style="padding: 10px; text-align: right;">${avgSellingPrice.toFixed(2)} ₾</td>
        <td style="padding: 10px; text-align: right; color: #d9534f;">${p.unitCost.toFixed(2)} ₾</td>
        <td style="padding: 10px; text-align: right; color: ${unitProfit >= 0 ? '#5cb85c' : '#d9534f'};">${unitProfit.toFixed(2)} ₾</td>
        <td style="padding: 10px; text-align: right;"><strong>${totalItemProfit.toFixed(2)} ₾</strong></td>
        <td style="padding: 10px; text-align: center;">
          <div style="display: inline-flex; gap: 5px; justify-content: center;">
            <button class="btn btn-outline btn-sm edit-profit-btn" data-name="${p.name}" data-cost="${p.unitCost}">რედაქტირება</button>
            <button class="btn btn-danger btn-sm delete-profit-btn" data-name="${p.name}">წაშლა</button>
          </div>
        </td>
      </tr>
    `;
  }).join('') || `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #777;">ამ პერიოდისთვის მონაცემები არ მოიძებნა.</td></tr>`;

  // Attach Action Button Listeners dynamically after render
  tbody.querySelectorAll('.edit-profit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const prodName = btn.dataset.name;
      const currentCost = btn.dataset.cost;
      
      document.getElementById('edit-profit-original-name').value = prodName;
      document.getElementById('edit-profit-name-display').textContent = prodName;
      document.getElementById('edit-profit-cost').value = currentCost;
      
      document.getElementById('edit-profit-modal').classList.add('active');
    });
  });

  tbody.querySelectorAll('.delete-profit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const prodName = btn.dataset.name;
      
      // Warn the admin about what deleting from an analytics page actually means
      if (confirm(`ყურადღება! ნამდვილად გსურთ წაშალოთ "${prodName}" მოგების ისტორიიდან?\n\nეს სამუდამოდ წაშლის ამ პროდუქტის ყველა გაყიდვას ისტორიიდან და შეცვლის თქვენს საერთო ფინანსურ მონაცემებს.`)) {
        
        let allSales = getSales();
        let changed = false;

        // Strip this specific product from all past receipts
        allSales = allSales.map(s => {
          if (s.items && s.items.length > 0) {
            const originalLength = s.items.length;
            s.items = s.items.filter(i => normalizeName(i.name) !== normalizeName(prodName));
            if (s.items.length !== originalLength) changed = true;
          }
          return s;
        });

        // Filter out completely empty sales (where they only bought this one product)
        allSales = allSales.filter(s => s.items && s.items.length > 0);

        if (changed) {
          saveSales(allSales); // Save updated history
          const activeFilter = document.querySelector('.profit-filter.active')?.dataset.filter || 'today';
          calculateAndRenderProfits(activeFilter);
          alert(`"${prodName}" ამოშლილია ისტორიიდან.`);
        }
      }
    });
  });
}