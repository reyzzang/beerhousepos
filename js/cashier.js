// cashier.js - POS calculator, cart, weight vs. liter math, and dynamic weight (kg)/price calculation

import { getCategoriesWithCustom, getProductById } from './products.js';
import { getCurrentUser, getCurrentShift } from './auth.js';
import { determineShiftBlock, getShifts, saveShifts } from './auth.js';

let cart = [];

export function getCart() {
  return cart;
}

export function clearCart() {
  cart = [];
  renderCart();
}

export function addToCart(productId, quantity = 1, customPrice = null, multiplier = 1, customWeightKg = null) {
  const product = getProductById(productId);
  if (!product) return;

  let finalPrice = customPrice !== null ? customPrice : product.price;
  let finalQty = quantity;
  let displayName = product.name;
  let unitLabel = product.unit;

  if (product.type === 'liter') {
    finalQty = multiplier;
    finalPrice = product.price * multiplier;
    displayName = `${product.name} x${multiplier}`;
    unitLabel = `${multiplier} ლიტრი`;
  } else if (product.type === 'weight') {
    finalPrice = customPrice;
    // Store weight in kilograms inside quantity for proper stock deduction
    finalQty = customWeightKg !== null ? customWeightKg : (customPrice / product.price);
    displayName = `${product.name} (${finalQty.toFixed(3)} კგ - ${customPrice.toFixed(2)} ₾)`;
    unitLabel = `${finalQty.toFixed(3)} კგ`;
  }

  const existingIdx = cart.findIndex(item => 
    item.productId === productId && 
    item.type === product.type && 
    (product.type !== 'weight') &&
    item.multiplier === multiplier
  );

  if (existingIdx !== -1 && product.type !== 'weight') {
    cart[existingIdx].quantity += finalQty;
    if (product.type === 'liter') {
      cart[existingIdx].multiplier = cart[existingIdx].quantity;
      cart[existingIdx].name = `${product.name} x${cart[existingIdx].quantity}`;
      cart[existingIdx].unit = `${cart[existingIdx].quantity} ლიტრი`;
      cart[existingIdx].price = product.price * cart[existingIdx].quantity;
      cart[existingIdx].total = cart[existingIdx].price;
    } else {
      cart[existingIdx].total = cart[existingIdx].quantity * product.price;
    }
  } else {
    cart.push({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      productId: product.id,
      name: displayName,
      price: product.type === 'weight' ? finalPrice : (product.type === 'liter' ? product.price * multiplier : product.price),
      quantity: finalQty,
      unit: unitLabel,
      type: product.type,
      multiplier: multiplier,
      total: product.type === 'liter' ? (product.price * multiplier) : finalPrice,
      categoryName: product.categoryName
    });
  }

  renderCart();
}

export function removeFromCart(cartItemId) {
  cart = cart.filter(item => item.id !== cartItemId);
  renderCart();
}

export function updateCartQuantity(cartItemId, newQty) {
  const item = cart.find(i => i.id === cartItemId);
  if (!item || item.type === 'weight') return;
  if (newQty <= 0) {
    removeFromCart(cartItemId);
    return;
  }
  
  item.quantity = newQty;
  const product = getProductById(item.productId);

  if (item.type === 'liter' && product) {
    item.multiplier = newQty;
    item.name = `${product.name} x${newQty}`;
    item.unit = `${newQty} ლიტრი`;
    item.price = product.price * newQty;
    item.total = item.price;
  } else {
    item.total = item.price * newQty;
  }
  renderCart();
}

export function getCartTotal() {
  return cart.reduce((sum, item) => sum + item.total, 0);
}

export function renderCart() {
  const container = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  if (!container || !totalEl) return;

  if (cart.length === 0) {
    container.innerHTML = '<div class="cart-empty">კალათა ცარიელია</div>';
    totalEl.textContent = '0.00 ₾';
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-meta">${item.unit} • ${item.type === 'liter' ? (item.price / (item.quantity || 1)).toFixed(2) : item.price.toFixed(2)} ₾</div>
      </div>
      <div class="cart-item-qty">
        ${item.type !== 'weight' ? `
          <button class="qty-btn" data-action="minus" data-id="${item.id}">−</button>
          <span>${item.quantity}</span>
          <button class="qty-btn" data-action="plus" data-id="${item.id}">+</button>
        ` : `<span>1</span>`}
      </div>
      <div class="cart-item-total">${item.total.toFixed(2)} ₾</div>
      <button class="cart-item-remove" data-id="${item.id}" title="წაშლა">×</button>
    </div>
  `).join('');

  totalEl.textContent = getCartTotal().toFixed(2) + ' ₾';

  container.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      const action = e.target.dataset.action;
      const item = cart.find(i => i.id === id);
      if (!item) return;
      if (action === 'plus') updateCartQuantity(id, item.quantity + 1);
      else updateCartQuantity(id, item.quantity - 1);
    });
  });

  container.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      removeFromCart(e.target.dataset.id);
    });
  });
}

export function processPayment(method) {
  if (cart.length === 0) {
    alert('კალათა ცარიელია');
    return false;
  }

  const user = getCurrentUser();
  let shift = getCurrentShift();

  if (!shift && user) {
    const now = new Date();
    const shiftBlock = determineShiftBlock(now);

    shift = {
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
      closed: false,
      expensesDuringShift: [],
      distributionsDuringShift: []
    };

    localStorage.setItem('currentShift', JSON.stringify(shift));

    const shifts = getShifts();
    shifts.push(shift);
    saveShifts(shifts);
  }

  if (!user || !shift) {
    alert('გთხოვთ შეხვიდეთ სისტემაში და დაიწყეთ ცვლა ცვლების გვერდზე');
    return false;
  }

  const total = getCartTotal();
  const sale = {
    id: Date.now().toString(),
    shiftId: shift.id,
    username: user.username,
    userName: user.name,
    items: [...cart],
    total: total,
    paymentMethod: method,
    paymentMethodLabel: method === 'cash' ? 'ნაღდი' : 'ბარათი',
    cashAmount: method === 'cash' ? total : 0,
    cardAmount: method === 'card' ? total : 0,
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0]
  };

  saveSale(sale);
  return true;
}

export function processSplitPayment(cashAmount, cardAmount) {
  if (cart.length === 0) {
    alert('კალათა ცარიელია');
    return false;
  }

  const user = getCurrentUser();
  let shift = getCurrentShift();

  if (!shift && user) {
    const now = new Date();
    const shiftBlock = determineShiftBlock(now);

    shift = {
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
      closed: false,
      expensesDuringShift: [],
      distributionsDuringShift: []
    };

    localStorage.setItem('currentShift', JSON.stringify(shift));

    const shifts = getShifts();
    shifts.push(shift);
    saveShifts(shifts);
  }

  if (!user || !shift) {
    alert('გთხოვთ შეხვიდეთ სისტემაში და დაიწყეთ ცვლა ცვლების გვერდზე');
    return false;
  }

  const total = getCartTotal();
  if (Math.abs((cashAmount + cardAmount) - total) > 0.01) {
    alert('ნაღდი + ბარათი უნდა უდრიდეს ჯამურ თანხას');
    return false;
  }

  const sale = {
    id: Date.now().toString(),
    shiftId: shift.id,
    username: user.username,
    userName: user.name,
    items: [...cart],
    total: total,
    paymentMethod: 'split',
    paymentMethodLabel: 'ნაღდი + ბარათი',
    cashAmount: cashAmount,
    cardAmount: cardAmount,
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0]
  };

  saveSale(sale);
  return true;
}

function saveSale(sale) {
  const sales = JSON.parse(localStorage.getItem('sales') || '[]');
  sales.push(sale);
  localStorage.setItem('sales', JSON.stringify(sales));

  updateStockFromSale(cart);
  clearCart();
  showPaymentSuccess(sale);
}

function updateStockFromSale(items) {
  const stock = JSON.parse(localStorage.getItem('stock') || '{}');
  items.forEach(item => {
    if (stock[item.productId] !== undefined) {
      let reduceBy = 0;
      if (item.type === 'weight') {
        // item.quantity stores direct kilograms for weight items
        reduceBy = item.quantity || 0;
      } else {
        reduceBy = item.quantity;
      }
      stock[item.productId] = Math.max(0, (stock[item.productId] || 0) - reduceBy);
    }
  });
  localStorage.setItem('stock', JSON.stringify(stock));
}

function openSplitPaymentModal() {
  if (cart.length === 0) {
    alert('კალათა ცარიელია');
    return;
  }

  const total = getCartTotal();
  document.getElementById('split-total').textContent = total.toFixed(2) + ' ₾';
  document.getElementById('split-cash').value = '';
  document.getElementById('split-card').value = '';

  const modal = document.getElementById('split-payment-modal');
  modal.classList.add('active');

  const confirmBtn = document.getElementById('split-confirm-btn');
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

  newBtn.addEventListener('click', () => {
    const cash = parseFloat(document.getElementById('split-cash').value) || 0;
    const card = parseFloat(document.getElementById('split-card').value) || 0;
    modal.classList.remove('active');
    processSplitPayment(cash, card);
  });
}

function showPaymentSuccess(sale) {
  const modal = document.getElementById('payment-success-modal');
  if (!modal) return;
  document.getElementById('success-total').textContent = sale.total.toFixed(2) + ' ₾';
  document.getElementById('success-method').textContent = sale.paymentMethodLabel;
  modal.classList.add('active');
}

export function renderCashierPage() {
  const content = document.getElementById('main-content');
  if (!content) return;

  content.innerHTML = `
    <div class="cashier-layout">
      <div class="cashier-products">
        <div class="category-tabs" id="category-tabs"></div>
        <div class="products-grid" id="products-grid"></div>
      </div>
      <div class="cashier-cart">
        <div class="cart-header">
          <h2>კალათა</h2>
          <button id="clear-cart-btn" class="btn btn-secondary btn-sm">გასუფთავება</button>
        </div>
        <div class="cart-items" id="cart-items">
          <div class="cart-empty">კალათა ცარიელია</div>
        </div>
        <div class="cart-footer">
          <div class="cart-total-row">
            <span>ჯამი:</span>
            <span id="cart-total" class="cart-total-value">0.00 ₾</span>
          </div>
          <div class="payment-buttons">
            <button id="pay-cash-btn" class="btn btn-success btn-lg">ნაღდი</button>
            <button id="pay-card-btn" class="btn btn-primary btn-lg">ბარათი</button>
            <button id="pay-split-btn" class="btn btn-warning btn-lg">ნაღდი + ბარათი</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Multiplier Modal for Beers (with manual liter input) -->
    <div class="modal" id="multiplier-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="multiplier-product-name"></h3>
          <button class="modal-close" data-modal="multiplier-modal">×</button>
        </div>
        <div class="modal-body">
          <p>აირჩიეთ ან შეიყვანეთ რაოდენობა (ლიტრი):</p>
          <div class="multiplier-buttons" id="multiplier-buttons"></div>
          
          <div class="form-group mt-3" style="border-top: 1px solid #eee; padding-top: 15px;">
            <label>ან ჩაწერეთ ლიტრები ხელით:</label>
            <div style="display: flex; gap: 10px;">
              <input type="number" id="manual-liter-input" class="form-input" step="0.1" min="0.1" placeholder="მაგ: 1.5">
              <button id="manual-liter-confirm-btn" class="btn btn-primary">დამატება</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Weight & Price Two-Way Calculator Modal (KG) -->
    <div class="modal" id="weight-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="weight-product-name"></h3>
          <button class="modal-close" data-modal="weight-modal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>ფასი (₾):</label>
            <input type="number" id="weight-price-input" class="form-input" step="0.01" min="0" placeholder="0.00">
          </div>
          <div class="form-group mt-3">
            <label>წონა (კგ):</label>
            <input type="number" id="weight-kg-input" class="form-input" step="0.001" min="0" placeholder="0.000">
          </div>
          <div class="modal-actions mt-3">
            <button id="weight-confirm-btn" class="btn btn-primary">დამატება</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Payment Success Modal -->
    <div class="modal" id="payment-success-modal">
      <div class="modal-content modal-sm">
        <div class="modal-header">
          <h3>გადახდა წარმატებით შესრულდა</h3>
        </div>
        <div class="modal-body text-center">
          <div class="success-icon">✓</div>
          <p>ჯამი: <strong id="success-total">0.00 ₾</strong></p>
          <p>გადახდის მეთოდი: <strong id="success-method"></strong></p>
          <button id="success-close-btn" class="btn btn-primary">დახურვა</button>
        </div>
      </div>
    </div>

    <!-- Split Payment Modal -->
    <div class="modal" id="split-payment-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>გაყოფილი გადახდა</h3>
          <button class="modal-close" data-modal="split-payment-modal">×</button>
        </div>
        <div class="modal-body">
          <div class="cart-total-row mb-3">
            <span>ჯამური თანხა:</span>
            <span id="split-total" class="cart-total-value">0.00 ₾</span>
          </div>
          <div class="form-group">
            <label>ნაღდი თანხა (₾)</label>
            <input type="number" id="split-cash" class="form-input" step="0.01" min="0" placeholder="0.00">
          </div>
          <div class="form-group">
            <label>ბარათის თანხა (₾)</label>
            <input type="number" id="split-card" class="form-input" step="0.01" min="0" placeholder="0.00">
          </div>
          <div class="modal-actions">
            <button id="split-confirm-btn" class="btn btn-primary">გადახდის დადასტურება</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const categories = getCategoriesWithCustom();
  const tabsContainer = document.getElementById('category-tabs');
  tabsContainer.innerHTML = categories.map((cat, idx) => `
    <button class="category-tab ${idx === 0 ? 'active' : ''}" data-category="${cat.id}">${cat.name}</button>
  `).join('');

  if (categories.length > 0) {
    renderProducts(categories[0].id);
  }

  tabsContainer.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      tabsContainer.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderProducts(tab.dataset.category);
    });
  });

  document.getElementById('clear-cart-btn').addEventListener('click', clearCart);

  document.getElementById('pay-cash-btn').addEventListener('click', () => processPayment('cash'));
  document.getElementById('pay-card-btn').addEventListener('click', () => processPayment('card'));
  document.getElementById('pay-split-btn').addEventListener('click', () => {
    openSplitPaymentModal();
  });

  document.getElementById('success-close-btn').addEventListener('click', () => {
    document.getElementById('payment-success-modal').classList.remove('active');
  });

  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modal;
      document.getElementById(modalId).classList.remove('active');
    });
  });

  renderCart();
}

function renderProducts(categoryId) {
  const categories = getCategoriesWithCustom();
  const cat = categories.find(c => c.id === categoryId);
  if (!cat) return;

  const grid = document.getElementById('products-grid');
  grid.innerHTML = cat.items.map(item => `
    <button class="product-card" data-id="${item.id}" data-type="${item.type}">
      <div class="product-name">${item.name}</div>
      <div class="product-price">${item.price.toFixed(2)} ₾ / ${item.unit}</div>
    </button>
  `).join('');

  grid.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const type = card.dataset.type;
      const product = getProductById(id);

      if (type === 'liter') {
        openMultiplierModal(product);
      } else if (type === 'weight') {
        openWeightModal(product);
      } else {
        addToCart(id, 1);
      }
    });
  });
}

function openMultiplierModal(product) {
  document.getElementById('multiplier-product-name').textContent = product.name;
  const buttons = document.getElementById('multiplier-buttons');
  buttons.innerHTML = product.multipliers.map(m => `
    <button class="btn btn-outline multiplier-btn" data-mult="${m}">x${m} (${(product.price * m).toFixed(2)} ₾)</button>
  `).join('');

  buttons.querySelectorAll('.multiplier-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      addToCart(product.id, 1, null, parseFloat(btn.dataset.mult));
      document.getElementById('multiplier-modal').classList.remove('active');
    });
  });

  const manualInput = document.getElementById('manual-liter-input');
  manualInput.value = '';
  
  const confirmManualBtn = document.getElementById('manual-liter-confirm-btn');
  const newManualBtn = confirmManualBtn.cloneNode(true);
  confirmManualBtn.parentNode.replaceChild(newManualBtn, confirmManualBtn);

  newManualBtn.addEventListener('click', () => {
    const val = parseFloat(manualInput.value);
    if (isNaN(val) || val <= 0) {
      alert('გთხოვთ შეიყვანოთ ლიტრების სწორი რაოდენობა');
      return;
    }
    addToCart(product.id, 1, null, val);
    document.getElementById('multiplier-modal').classList.remove('active');
  });

  document.getElementById('multiplier-modal').classList.add('active');
}

function openWeightModal(product) {
  document.getElementById('weight-product-name').textContent = product.name + ` (${product.price.toFixed(2)} ₾/კგ)`;
  
  const priceInput = document.getElementById('weight-price-input');
  const kgInput = document.getElementById('weight-kg-input');
  priceInput.value = '';
  kgInput.value = '';

  // Two-way interactive sync handlers (KG based)
  const handlePriceInput = () => {
    const price = parseFloat(priceInput.value);
    if (!isNaN(price) && product.price > 0) {
      const kg = price / product.price;
      kgInput.value = kg.toFixed(3);
    } else {
      kgInput.value = '';
    }
  };

  const handleKgInput = () => {
    const kg = parseFloat(kgInput.value);
    if (!isNaN(kg)) {
      const price = kg * product.price;
      priceInput.value = price.toFixed(2);
    } else {
      priceInput.value = '';
    }
  };

  priceInput.oninput = handlePriceInput;
  kgInput.oninput = handleKgInput;

  const modal = document.getElementById('weight-modal');
  modal.classList.add('active');

  const confirmBtn = document.getElementById('weight-confirm-btn');
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

  newBtn.addEventListener('click', () => {
    const price = parseFloat(priceInput.value);
    const kg = parseFloat(kgInput.value);

    if (isNaN(price) || price <= 0 || isNaN(kg) || kg <= 0) {
      alert('გთხოვთ შეიყვანოთ სწორი ფასი ან წონა');
      return;
    }

    addToCart(product.id, 1, price, 1, kg);
    modal.classList.remove('active');
  });
}