// profit.js - Admin Profit Calculation and Analytics Page

import { getCurrentUser, isAdmin } from './auth.js';
import { getSales } from './history.js';

// Helper to fetch current inventory stock items (where purchase prices/costs are stored)
function getStockProducts() {
  return JSON.parse(localStorage.getItem('stock') || localStorage.getItem('products') || '[]');
}

export function renderProfitPage() {
  const content = document.getElementById('main-content');
  if (!content) return;

  // Strict check: if not admin, block access or show warning
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
      <h1>მოგების ანალიტიკა (Admin Profit)</h1>
    </div>

    <!-- Summary Metrics Cards -->
    <div class="metrics-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px; margin-bottom: 20px;">
      <div class="card" style="padding: 20px;">
        <h3 style="font-size: 14px; color: #666; margin-bottom: 8px;">სულ შემოსავალი</h3>
        <p id="total-revenue-val" style="font-size: 24px; font-weight: bold; color: #333;">0.00 ₾</p>
      </div>
      <div class="card" style="padding: 20px;">
        <h3 style="font-size: 14px; color: #666; margin-bottom: 8px;">სულ თვითღირებულება</h3>
        <p id="total-cost-val" style="font-size: 24px; font-weight: bold; color: #d9534f;">0.00 ₾</p>
      </div>
      <div class="card" style="padding: 20px;">
        <h3 style="font-size: 14px; color: #666; margin-bottom: 8px;">სუფთა მოგება (Total Profit)</h3>
        <p id="total-profit-val" style="font-size: 24px; font-weight: bold; color: #5cb85c;">0.00 ₾</p>
      </div>
    </div>

    <!-- Filters & Controls -->
    <div class="card" style="margin-bottom: 20px;">
      <div class="filters" style="display: flex; gap: 10px; flex-wrap: wrap;">
        <button class="btn btn-outline profit-filter active" data-filter="today">დღეს</button>
        <button class="btn btn-outline profit-filter" data-filter="week">ამ კვირაში</button>
        <button class="btn btn-outline profit-filter" data-filter="month">ამ თვეში</button>
        <button class="btn btn-outline profit-filter" data-filter="all">ყველა დროის</button>
      </div>
    </div>

    <!-- Detailed Profit Table per Product/Transaction -->
    <div class="card">
      <h2>პროდუქტების მიხედვით მოგების განაწილება</h2>
      <div class="table-responsive mt-2" style="width: 100%; overflow-x: auto;">
        <table class="data-table" id="profit-table" style="width: 100%; min-width: 750px; border-collapse: collapse; white-space: nowrap;">
          <thead>
            <tr>
              <th style="text-align: left; padding: 12px 10px;">პროდუქტი</th>
              <th style="text-align: left; padding: 12px 10px;">გაყიდული რაოდენობა</th>
              <th style="text-align: left; padding: 12px 10px;">საშ. გაყიდვის ფასი (y)</th>
              <th style="text-align: left; padding: 12px 10px;">თვითღირებულება (x)</th>
              <th style="text-align: left; padding: 12px 10px;">ერთეულის მოგება (y - x)</th>
              <th style="text-align: left; padding: 12px 10px;">ჯამური მოგება (Z)</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `;

  // Attach filter event listeners
  document.querySelectorAll('.profit-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.profit-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      calculateAndRenderProfits(btn.dataset.filter);
    });
  });

  // Initial calculation and render
  calculateAndRenderProfits('today');
}

function calculateAndRenderProfits(filter = 'today') {
  const tbody = document.querySelector('#profit-table tbody');
  const revenueEl = document.getElementById('total-revenue-val');
  const costEl = document.getElementById('total-cost-val');
  const profitEl = document.getElementById('total-profit-val');

  if (!tbody) return;

  const sales = getSales();
  const stockProducts = getStockProducts();

  // Build a flexible lookup map for stock item purchase prices (x)
  const costMap = {};
  stockProducts.forEach(p => {
    const rawName = (p.name || '').trim().toLowerCase();
    const buyPrice = parseFloat(p.costPrice || p.purchasePrice || p.buyPrice || p.priceX || p.cost || 0);
    if (rawName) {
      costMap[rawName] = buyPrice;
    }
  });

  const now = new Date();

  // Filter sales based on selected timeline
  const filteredSales = sales.filter(s => {
    const d = new Date(s.timestamp || s.date);
    if (isNaN(d.getTime())) return true; // Include if date format is tricky

    if (filter === 'today') {
      return d.toDateString() === now.toDateString();
    } else if (filter === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    } else if (filter === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return true; // 'all'
  });

  let overallRevenue = 0;
  let overallCost = 0;
  const productProfitMap = {};

  filteredSales.forEach(sale => {
    const items = sale.items || [];
    items.forEach(item => {
      const name = item.name || 'უცნობი';
      const key = name.trim().toLowerCase();
      const qty = parseFloat(item.quantity || item.qty || 1);
      
      // Calculate or extract line revenue (y)
      const lineTotal = parseFloat(item.total || (item.price * qty) || 0);
      const sellingPriceUnit = qty > 0 ? (lineTotal / qty) : 0;

      // Find purchase cost (x) from stock map or fall back to item properties
      let unitCost = 0;
      if (costMap[key] !== undefined) {
        unitCost = costMap[key];
      } else if (item.cost !== undefined || item.purchasePrice !== undefined) {
        unitCost = parseFloat(item.cost || item.purchasePrice || 0);
      } else {
        // Try partial match if exact match fails
        const matchedKey = Object.keys(costMap).find(k => k.includes(key) || key.includes(k));
        if (matchedKey) {
          unitCost = costMap[matchedKey];
        }
      }

      const lineCost = unitCost * qty;
      const lineProfit = lineTotal - lineCost;

      overallRevenue += lineTotal;
      overallCost += lineCost;

      if (!productProfitMap[key]) {
        productProfitMap[key] = {
          name: name,
          qty: 0,
          totalRevenue: 0,
          totalCost: 0,
          unitSellingPriceSum: 0,
          sellingPriceCount: 0,
          unitCost: unitCost
        };
      }

      productProfitMap[key].qty += qty;
      productProfitMap[key].totalRevenue += lineTotal;
      productProfitMap[key].totalCost += lineCost;
      productProfitMap[key].unitSellingPriceSum += sellingPriceUnit;
      productProfitMap[key].sellingPriceCount += 1;
    });
  });

  const overallProfit = overallRevenue - overallCost;

  // Update top metric cards
  if (revenueEl) revenueEl.textContent = `${overallRevenue.toFixed(2)} ₾`;
  if (costEl) costEl.textContent = `${overallCost.toFixed(2)} ₾`;
  if (profitEl) profitEl.textContent = `${overallProfit.toFixed(2)} ₾`;

  // Build rows for the table
  const aggregatedList = Object.values(productProfitMap);
  aggregatedList.sort((a, b) => (b.totalRevenue - b.totalCost) - (a.totalRevenue - a.totalCost));

  tbody.innerHTML = aggregatedList.map(p => {
    const avgSellingPrice = p.sellingPriceCount > 0 ? (p.unitSellingPriceSum / p.sellingPriceCount) : 0;
    const unitProfit = avgSellingPrice - p.unitCost;
    const totalItemProfit = p.totalRevenue - p.totalCost;

    return `
      <tr>
        <td style="padding: 10px;"><strong>${p.name}</strong></td>
        <td style="padding: 10px;">${p.qty}</td>
        <td style="padding: 10px;">${avgSellingPrice.toFixed(2)} ₾</td>
        <td style="padding: 10px; color: #d9534f;">${p.unitCost.toFixed(2)} ₾</td>
        <td style="padding: 10px; color: ${unitProfit >= 0 ? '#5cb85c' : '#d9534f'};">${unitProfit.toFixed(2)} ₾</td>
        <td style="padding: 10px;"><strong>${totalItemProfit.toFixed(2)} ₾</strong></td>
      </tr>
    `;
  }).join('') || `<tr><td colspan="6" class="text-center" style="padding: 20px;">მონაცემები არ არის მოცემული პერიოდისთვის (ან გაყიდვები არ ფიქსირდება დღევანდელ დღეს)</td></tr>`;
}