// profit.js - Admin Profit Calculation and Analytics Page

import { getCurrentUser, isAdmin, getShifts, saveShifts } from './auth.js';
import { getSales, saveSales } from './history.js';
import { getAllProducts } from './products.js';
import { getDistributions, getExpenses } from './distribution.js';
import { saveToDisk } from './dbSync.js';

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
      <h1>მოგების ანალიტიკა (ტრანზაქციები)</h1>
    </div>

    <div class="metrics-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 15px; margin-bottom: 20px;">
      <div class="card" style="padding: 15px; border-left: 4px solid #0275d8;">
        <h3 style="font-size: 13px; color: #666; margin-bottom: 8px;">შემოსავალი</h3>
        <p id="total-revenue-val" style="font-size: 18px; font-weight: bold; color: #333;">0.00 ₾</p>
      </div>
      <div class="card" style="padding: 15px; border-left: 4px solid #f0ad4e;">
        <h3 style="font-size: 13px; color: #666; margin-bottom: 8px;">ნაღდი</h3>
        <p id="total-cash-val" style="font-size: 18px; font-weight: bold; color: #f0ad4e;">0.00 ₾</p>
      </div>
      <div class="card" style="padding: 15px; border-left: 4px solid #5bc0de;">
        <h3 style="font-size: 13px; color: #666; margin-bottom: 8px;">ბარათი</h3>
        <p id="total-card-val" style="font-size: 18px; font-weight: bold; color: #5bc0de;">0.00 ₾</p>
      </div>
      <div class="card" style="padding: 15px; border-left: 4px solid #d9534f;">
        <h3 style="font-size: 13px; color: #666; margin-bottom: 8px;">თვითღირებულება</h3>
        <p id="total-cost-val" style="font-size: 18px; font-weight: bold; color: #d9534f;">0.00 ₾</p>
      </div>
      <div class="card" style="padding: 15px; border-left: 4px solid #d9534f;">
        <h3 style="font-size: 13px; color: #666; margin-bottom: 8px;">ხარჯი და დისტრიბუცია</h3>
        <p id="total-expenses-val" style="font-size: 18px; font-weight: bold; color: #d9534f;">0.00 ₾</p>
      </div>
      <div class="card" style="padding: 15px; border-left: 4px solid #d9534f;">
        <h3 style="font-size: 13px; color: #666; margin-bottom: 8px;">ხელფასები</h3>
        <p id="total-salaries-val" style="font-size: 18px; font-weight: bold; color: #d9534f;">0.00 ₾</p>
      </div>
      <div class="card" style="padding: 15px; border-left: 4px solid #5cb85c; background-color: #f4fdf5;">
        <h3 style="font-size: 13px; color: #2e7d32; margin-bottom: 8px;">სუფთა მოგება</h3>
        <p id="total-net-profit-val" style="font-size: 18px; font-weight: bold; color: #2e7d32;">0.00 ₾</p>
      </div>
    </div>

    <div class="card" style="margin-bottom: 20px;">
      <div class="filters" style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: space-between; align-items: center;">
        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
          <button class="btn btn-outline profit-filter active" data-filter="year">ამ წელში</button>
          <button class="btn btn-outline profit-filter" data-filter="all">ყველა დროის</button>
          
          <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center; border-left: 2px solid #eee; padding-left: 10px; margin-left: 5px;">
            <span style="color: #666; font-size: 13px;">ზუსტი დღე:</span>
            <input type="date" id="exact-date-input" class="form-input" style="padding: 6px; font-size: 13px;">
            <button class="btn btn-primary btn-sm profit-filter" data-filter="exact" id="exact-date-btn">ძიება</button>
            <button class="btn btn-danger btn-sm" id="delete-exact-day-btn" title="დღის წაშლა">წაშლა</button>
          </div>

          <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center; border-left: 2px solid #eee; padding-left: 10px; margin-left: 5px;">
            <span style="color: #666; font-size: 13px;">პერიოდი:</span>
            <input type="datetime-local" id="custom-start-date" class="form-input" style="padding: 6px; font-size: 13px;">
            <span style="color: #666; font-size: 13px;">-დან</span>
            <input type="datetime-local" id="custom-end-date" class="form-input" style="padding: 6px; font-size: 13px;">
            <button class="btn btn-primary btn-sm profit-filter" data-filter="custom" id="custom-date-btn">ძიება</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>გაყიდვების ტრანზაქციები</h2>
      <div class="table-responsive mt-2" style="width: 100%; overflow-x: auto;">
        <table class="data-table" id="profit-table" style="width: 100%; min-width: 850px; border-collapse: collapse; white-space: nowrap;">
          <thead>
            <tr style="background-color: #f8f9fa; border-bottom: 2px solid #ddd;">
              <th style="text-align: left; padding: 12px 10px;">დრო</th>
              <th style="text-align: left; padding: 12px 10px;">თანამშრომელი</th>
              <th style="text-align: left; padding: 12px 10px;">პროდუქტები</th>
              <th style="text-align: right; padding: 12px 10px;">ჯამი</th>
              <th style="text-align: center; padding: 12px 10px;">გადახდის მეთოდი</th>
              <th style="text-align: right; padding: 12px 10px;">მოგება</th>
              <th style="text-align: center; padding: 12px 10px;">მოქმედება</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <!-- Centered & Modern Edit Transaction Modal -->
    <div class="modal" id="edit-transaction-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); justify-content: center; align-items: center; z-index: 9999;">
      <div class="modal-content" style="background: #fff; padding: 25px; border-radius: 8px; width: 100%; max-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
          <h3 style="margin: 0; font-size: 18px;">ტრანზაქციის რედაქტირება</h3>
          <button class="modal-close" data-modal="edit-transaction-modal" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #666;">×</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="edit-sale-id">
          <input type="hidden" id="edit-sale-total">
          
          <div class="form-group" style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px;">ტრანზაქციის ჯამი:</label>
            <p id="edit-modal-total-display" style="font-size: 16px; color: #0275d8; font-weight: bold; margin: 0;"></p>
          </div>

          <div class="form-group" style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px;">გადახდის მეთოდი</label>
            <select id="edit-payment-method" class="form-input" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
              <option value="cash">ნაღდი</option>
              <option value="card">ბარათი</option>
              <option value="split">ნაღდი + ბარათი</option>
            </select>
          </div>

          <div class="form-group mt-2" id="split-amounts-group" style="display:none; background: #f8f9fa; padding: 12px; border-radius: 6px; border: 1px solid #eee; margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 4px; font-size: 13px;">ნაღდი თანხა (₾)</label>
            <input type="number" id="edit-cash-amount" class="form-input" step="0.01" min="0" style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 10px;">
            
            <label style="display: block; margin-bottom: 4px; font-size: 13px;">ბარათის თანხა (₾)</label>
            <input type="number" id="edit-card-amount" class="form-input" step="0.01" min="0" style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px;">
          </div>

          <div class="modal-actions mt-3">
            <button id="save-transaction-edit-btn" class="btn btn-primary" style="width: 100%; padding: 10px; background: #0275d8; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">შენახვა</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Preset Filters (Year / All Time) clear out exact/custom dates
  document.querySelectorAll('.profit-filter').forEach(btn => {
    if (btn.dataset.filter === 'year' || btn.dataset.filter === 'all') {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.profit-filter').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        // Clear date inputs and storage memory when switching to presets
        document.getElementById('exact-date-input').value = '';
        document.getElementById('custom-start-date').value = '';
        document.getElementById('custom-end-date').value = '';
        sessionStorage.removeItem('profitExactDate');
        sessionStorage.removeItem('profitCustomStart');
        sessionStorage.removeItem('profitCustomEnd');

        calculateAndRenderProfits(e.target.dataset.filter);
      });
    }
  });

  document.getElementById('exact-date-btn').addEventListener('click', () => {
    document.querySelectorAll('.profit-filter').forEach(b => b.classList.remove('active'));
    document.getElementById('exact-date-btn').classList.add('active');
    calculateAndRenderProfits('exact');
  });

  document.getElementById('custom-date-btn').addEventListener('click', () => {
    document.querySelectorAll('.profit-filter').forEach(b => b.classList.remove('active'));
    document.getElementById('custom-date-btn').classList.add('active');
    calculateAndRenderProfits('custom');
  });

  document.getElementById('delete-exact-day-btn').addEventListener('click', async () => {
    const targetDate = document.getElementById('exact-date-input').value;
    if (!targetDate) {
      alert("გთხოვთ, ჯერ აირჩიოთ ზუსტი დღე კალენდარში წასაშლელად.");
      return;
    }

    if (confirm(`ნამდვილად გსურთ სრულად წაშალოთ ${targetDate} თარიღის ყველა მონაცემი?`)) {
      const isTargetDay = (timestamp) => {
        if (!timestamp) return false;
        const d = new Date(timestamp);
        if (isNaN(d.getTime())) return false;
        return (d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')) === targetDate;
      };

      let sales = getSales() || [];
      sales = sales.filter(s => !isTargetDay(s.timestamp || s.date));
      saveSales(sales);

      let shifts = getShifts() || [];
      shifts = shifts.filter(s => !isTargetDay(s.loginTime || s.date));
      saveShifts(shifts);

      let distributions = getDistributions() || [];
      distributions = distributions.filter(d => !isTargetDay(d.timestamp || d.date));
      localStorage.setItem('distributions', JSON.stringify(distributions));

      let expenses = getExpenses() || [];
      expenses = expenses.filter(e => !isTargetDay(e.timestamp || e.date));
      localStorage.setItem('expenses', JSON.stringify(expenses));

      await saveToDisk();
      alert('მონაცემები წარმატებით წაიშალა.');
      calculateAndRenderProfits('year');
    }
  });

  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.modal).style.display = 'none';
    });
  });

  const paymentSelect = document.getElementById('edit-payment-method');
  const cashInput = document.getElementById('edit-cash-amount');
  const cardInput = document.getElementById('edit-card-amount');

  paymentSelect.addEventListener('change', () => {
    const splitGroup = document.getElementById('split-amounts-group');
    const totalSaleAmount = parseFloat(document.getElementById('edit-sale-total').value) || 0;
    
    if (paymentSelect.value === 'split') {
      splitGroup.style.display = 'block';
      if (!cashInput.value) {
        cashInput.value = totalSaleAmount.toFixed(2);
        cardInput.value = (0).toFixed(2);
      }
    } else {
      splitGroup.style.display = 'none';
    }
  });

  cashInput.addEventListener('input', () => {
    const totalSaleAmount = parseFloat(document.getElementById('edit-sale-total').value) || 0;
    const cashVal = parseFloat(cashInput.value);
    if (!isNaN(cashVal)) {
      const remainingCard = Math.max(0, totalSaleAmount - cashVal);
      cardInput.value = remainingCard.toFixed(2);
    } else {
      cardInput.value = totalSaleAmount.toFixed(2);
    }
  });

  cardInput.addEventListener('input', () => {
    const totalSaleAmount = parseFloat(document.getElementById('edit-sale-total').value) || 0;
    const cardVal = parseFloat(cardInput.value);
    if (!isNaN(cardVal)) {
      const remainingCash = Math.max(0, totalSaleAmount - cardVal);
      cashInput.value = remainingCash.toFixed(2);
    } else {
      cashInput.value = totalSaleAmount.toFixed(2);
    }
  });

  document.getElementById('save-transaction-edit-btn').addEventListener('click', async () => {
    const saleId = document.getElementById('edit-sale-id').value;
    const method = document.getElementById('edit-payment-method').value;
    const totalSaleAmount = parseFloat(document.getElementById('edit-sale-total').value) || 0;
    
    let sales = getSales() || [];
    const sale = sales.find(s => String(s.id) === String(saleId));
    if (!sale) {
      alert('ტრანზაქცია ვერ მოიძებნა.');
      return;
    }

    sale.paymentMethod = method;
    if (method === 'cash') {
      sale.paymentMethodLabel = 'ნაღდი';
      sale.cashAmount = totalSaleAmount;
      sale.cardAmount = 0;
    } else if (method === 'card') {
      sale.paymentMethodLabel = 'ბარათი';
      sale.cashAmount = 0;
      sale.cardAmount = totalSaleAmount;
    } else if (method === 'split') {
      sale.paymentMethodLabel = 'ნაღდი + ბარათი';
      sale.cashAmount = parseFloat(cashInput.value) || 0;
      sale.cardAmount = parseFloat(cardInput.value) || 0;
    }

    saveSales(sales);
    await saveToDisk();

    document.getElementById('edit-transaction-modal').style.display = 'none';
    const activePreset = sessionStorage.getItem('profitActiveFilter') || 'year';
    calculateAndRenderProfits(activePreset);
    alert('ტრანზაქცია განახლდა!');
  });

  // Restore state from sessionStorage
  const savedFilter = sessionStorage.getItem('profitActiveFilter') || 'year';
  const savedExactDate = sessionStorage.getItem('profitExactDate') || '';
  const savedCustomStart = sessionStorage.getItem('profitCustomStart') || '';
  const savedCustomEnd = sessionStorage.getItem('profitCustomEnd') || '';

  document.getElementById('exact-date-input').value = savedExactDate;
  document.getElementById('custom-start-date').value = savedCustomStart;
  document.getElementById('custom-end-date').value = savedCustomEnd;
  
  document.querySelectorAll('.profit-filter').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.profit-filter[data-filter="${savedFilter}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  calculateAndRenderProfits(savedFilter);
}

function calculateAndRenderProfits(filter = 'year') {
  sessionStorage.setItem('profitActiveFilter', filter);
  if (filter === 'exact') {
    sessionStorage.setItem('profitExactDate', document.getElementById('exact-date-input').value);
    sessionStorage.removeItem('profitCustomStart');
    sessionStorage.removeItem('profitCustomEnd');
  } else if (filter === 'custom') {
    sessionStorage.setItem('profitCustomStart', document.getElementById('custom-start-date').value);
    sessionStorage.setItem('profitCustomEnd', document.getElementById('custom-end-date').value);
    sessionStorage.removeItem('profitExactDate');
  } else {
    sessionStorage.removeItem('profitExactDate');
    sessionStorage.removeItem('profitCustomStart');
    sessionStorage.removeItem('profitCustomEnd');
  }

  const tbody = document.querySelector('#profit-table tbody');
  const revenueEl = document.getElementById('total-revenue-val');
  const costEl = document.getElementById('total-cost-val');
  const expEl = document.getElementById('total-expenses-val');
  const salEl = document.getElementById('total-salaries-val');
  const netProfitEl = document.getElementById('total-net-profit-val');
  const cashEl = document.getElementById('total-cash-val');
  const cardEl = document.getElementById('total-card-val');

  if (!tbody) return;

  const rawSales = getSales() || [];
  const sales = Array.isArray(rawSales) ? rawSales : Object.values(rawSales);
  const activeCatalog = getLatestProductCatalog();

  const costMap = {};
  activeCatalog.forEach(p => {
    const cleanName = (p.name || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    costMap[cleanName] = parseFloat(p.costPrice || 0);
  });

  const now = new Date();
  let exactDateVal = document.getElementById('exact-date-input').value;
  let customStartTime = document.getElementById('custom-start-date').value ? new Date(document.getElementById('custom-start-date').value).getTime() : null;
  let customEndTime = document.getElementById('custom-end-date').value ? new Date(document.getElementById('custom-end-date').value).getTime() : null;

  const isMatch = (timestamp) => {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return false; 
    const timeMs = d.getTime();

    if (filter === 'year') {
      return d.getFullYear() === now.getFullYear();
    } else if (filter === 'all') {
      return true;
    } else if (filter === 'exact') {
      if (!exactDateVal) return true;
      return (d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')) === exactDateVal;
    } else if (filter === 'custom') {
      if (customStartTime && timeMs < customStartTime) return false;
      if (customEndTime && timeMs > customEndTime) return false;
      return true;
    }
    return true; 
  };

  let overallRevenue = 0;
  let overallCost = 0;
  let overallCash = 0;
  let overallCard = 0;
  let overallExpenses = 0;
  let overallSalaries = 0;

  const filteredSales = sales.filter(s => isMatch(s.timestamp || s.date));

  const transactionList = filteredSales.map(sale => {
    const saleTotal = parseFloat(sale.total || sale.totalAmount || 0);
    const cAmount = parseFloat(sale.cashAmount || (sale.paymentMethod === 'cash' ? saleTotal : 0));
    const cdAmount = parseFloat(sale.cardAmount || (sale.paymentMethod === 'card' ? saleTotal : 0));

    overallRevenue += saleTotal;
    overallCash += cAmount;
    overallCard += cdAmount;

    let saleCost = 0;
    const items = sale.items || sale.products || [];
    items.forEach(item => {
      const name = item.name || 'უცნობი';
      const cleanKey = name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const qty = parseFloat(item.quantity || item.qty || item.count || 1);
      
      let unitCost = costMap[cleanKey] !== undefined ? costMap[cleanKey] : 0;
      if (unitCost === 0) {
        const matchedKey = Object.keys(costMap).find(k => k.includes(cleanKey) || cleanKey.includes(k));
        if (matchedKey) unitCost = costMap[matchedKey];
      }
      saleCost += unitCost * qty;
    });

    overallCost += saleCost;
    const saleProfit = saleTotal - saleCost;

    return {
      id: sale.id,
      timestamp: new Date(sale.timestamp || sale.date).toLocaleString('ka-GE'),
      userName: sale.userName || sale.username || 'ადმინი',
      itemsText: items.map(i => `${i.name} (x${i.quantity || i.qty || 1})`).join(', '),
      total: saleTotal,
      profit: saleProfit,
      methodLabel: sale.paymentMethodLabel || (sale.paymentMethod === 'cash' ? 'ნაღდი' : sale.paymentMethod === 'card' ? 'ბარათი' : 'ნაღდი + ბარათი'),
      method: sale.paymentMethod || 'cash',
      cashAmount: cAmount,
      cardAmount: cdAmount
    };
  });

  // Process Shifts for Salaries
  try {
    const allShifts = getShifts() || [];
    const filteredShifts = allShifts.filter(s => isMatch(s.loginTime || s.date));
    filteredShifts.forEach(s => {
      let shiftSal = 0;
      if (s.shiftBlock && s.shiftBlock.id !== undefined) {
        shiftSal = String(s.shiftBlock.id) === "1" ? 30 : 40;
      } else {
        const loginHour = new Date(s.loginTime || s.date).getHours();
        shiftSal = (loginHour >= 9 && loginHour < 16) ? 30 : 40;
      }
      overallSalaries += shiftSal;
    });
  } catch(e) {
    console.error("Error calculating salaries:", e);
  }

  // Process Distributions & Expenses
  try {
    const allDistributions = getDistributions() || [];
    allDistributions.filter(d => isMatch(d.timestamp || d.date)).forEach(d => {
      overallExpenses += parseFloat(d.totalAmount || d.amount || 0);
    });

    const allExpenses = getExpenses() || [];
    allExpenses.filter(e => isMatch(e.timestamp || e.date)).forEach(e => {
      overallExpenses += parseFloat(e.amount || 0);
    });
  } catch(e) {
    console.error("Error calculating expenses:", e);
  }

  const finalNetProfit = overallRevenue - overallCost - overallExpenses - overallSalaries;

  if (revenueEl) revenueEl.textContent = `${overallRevenue.toFixed(2)} ₾`;
  if (costEl) costEl.textContent = `${overallCost.toFixed(2)} ₾`;
  if (cashEl) cashEl.textContent = `${overallCash.toFixed(2)} ₾`;
  if (cardEl) cardEl.textContent = `${overallCard.toFixed(2)} ₾`;
  if (expEl) expEl.textContent = `${overallExpenses.toFixed(2)} ₾`;
  if (salEl) salEl.textContent = `${overallSalaries.toFixed(2)} ₾`;
  if (netProfitEl) {
    netProfitEl.textContent = `${finalNetProfit.toFixed(2)} ₾`;
    netProfitEl.style.color = finalNetProfit >= 0 ? '#2e7d32' : '#d9534f';
  }

  transactionList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  tbody.innerHTML = transactionList.map(tx => `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 10px; font-size: 13px; color: #555;">${tx.timestamp}</td>
      <td style="padding: 10px;">${tx.userName}</td>
      <td style="padding: 10px; max-width: 300px; overflow: hidden; text-overflow: ellipsis;" title="${tx.itemsText}">${tx.itemsText}</td>
      <td style="padding: 10px; text-align: right;"><strong>${tx.total.toFixed(2)} ₾</strong></td>
      <td style="padding: 10px; text-align: center;"><span class="badge" style="background:#e9ecef; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${tx.methodLabel}</span></td>
      <td style="padding: 10px; text-align: right; color: #2e7d32;"><strong>${tx.profit.toFixed(2)} ₾</strong></td>
      <td style="padding: 10px; text-align: center;">
        <button class="btn btn-outline btn-sm edit-tx-btn" data-id="${tx.id}" data-total="${tx.total}" data-method="${tx.method}" data-cash="${tx.cashAmount}" data-card="${tx.cardAmount}">რედაქტირება</button>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #777;">ამ პერიოდისთვის ტრანზაქციები არ მოიძებნა.</td></tr>`;

  tbody.querySelectorAll('.edit-tx-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const saleId = btn.dataset.id;
      const total = parseFloat(btn.dataset.total);
      const method = btn.dataset.method;
      const cash = btn.dataset.cash;
      const card = btn.dataset.card;

      document.getElementById('edit-sale-id').value = saleId;
      document.getElementById('edit-sale-total').value = total;
      document.getElementById('edit-modal-total-display').textContent = total.toFixed(2) + ' ₾';
      document.getElementById('edit-payment-method').value = method;
      document.getElementById('edit-cash-amount').value = cash;
      document.getElementById('edit-card-amount').value = card;

      

      const splitGroup = document.getElementById('split-amounts-group');
      if (method === 'split') {
        splitGroup.style.display = 'block';
      } else {
        splitGroup.style.display = 'none';
      }

      document.getElementById('edit-transaction-modal').style.display = 'flex';
    });
  });
}