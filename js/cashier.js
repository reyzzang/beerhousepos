// cashier.js - POS calculator, cart, weight vs. liter math, dynamic weight (kg)/price calculation, and cash change calculator

import { getCategoriesWithCustom, getProductById } from './products.js';
import { getCurrentUser, getCurrentShift } from './auth.js';

let cart = [];

export function getCart() {
  return cart;
}

export function clearCart() {
  cart = [];
  renderCart();
}

export function addToCart(productId, quantity = 1, customPrice = null, multiplier = 1, customWeightKg = null) {
  const shift = getCurrentShift();
  if (!shift || shift.closed) {
    alert('⚠️ გაყიდვის განსახორციელებლად აუცილებელია ცვლის დაწყება!\nგთხოვთ, გადახვიდეთ "ცვლები"-ს გვერდზე.');
    return;
  }

  const product = getProductById(productId);
  if (!product) return;

  let finalPrice = product.price;
  let finalQty = quantity;
  let displayName = product.name;
  let unitLabel = product.unit || 'ცალი';
  let totalAmount = 0;

  if (product.type === 'liter') {
    finalQty = multiplier;
    finalPrice = product.price;
    totalAmount = product.price * multiplier;
    displayName = `${product.name} x${multiplier}`;
    unitLabel = `${multiplier} ლიტრი`;
  } else if (product.type === 'weight') {
    finalQty = customWeightKg !== null ? customWeightKg : (product.price > 0 ? customPrice / product.price : 0);
    finalPrice = customPrice !== null ? customPrice : (product.price * finalQty);
    totalAmount = finalPrice;
    displayName = `${product.name} (${finalQty.toFixed(3)} კგ - ${totalAmount.toFixed(2)} ₾)`;
    unitLabel = `${finalQty.toFixed(3)} კგ`;
  } else {
    // Standard piece item
    finalPrice = customPrice !== null ? customPrice : product.price;
    totalAmount = finalPrice * finalQty;
  }

  const existingIdx = cart.findIndex(item => 
    item.productId === productId && 
    item.type === product.type && 
    product.type !== 'weight' &&
    item.multiplier === multiplier
  );

  if (existingIdx !== -1 && product.type !== 'weight') {
    cart[existingIdx].quantity += finalQty;
    if (product.type === 'liter') {
      cart[existingIdx].multiplier = cart[existingIdx].quantity;
      cart[existingIdx].name = `${product.name} x${cart[existingIdx].quantity}`;
      cart[existingIdx].unit = `${cart[existingIdx].quantity} ლიტრი`;
      cart[existingIdx].total = product.price * cart[existingIdx].quantity;
    } else {
      cart[existingIdx].total = cart[existingIdx].quantity * cart[existingIdx].price;
    }
  } else {
    cart.push({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      productId: product.id,
      name: displayName,
      price: finalPrice,
      quantity: finalQty,
      unit: unitLabel,
      type: product.type,
      multiplier: multiplier,
      total: totalAmount,
      categoryName: product.categoryName || ''
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
    item.total = product.price * newQty;
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

  container.innerHTML = cart.map(item => {
    let unitMeta = `${item.unit} • ${item.price.toFixed(2)} ₾`;
    if (item.type === 'liter') {
      const product = getProductById(item.productId);
      const unitPrice = product ? product.price : (item.total / (item.quantity || 1));
      unitMeta = `${item.unit} • ${unitPrice.toFixed(2)} ₾/ლ`;
    } else if (item.type === 'weight') {
      unitMeta = item.unit;
    }

    return `
      <div class="cart-item" data-id="${item.id}">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-meta">${unitMeta}</div>
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
    `;
  }).join('');

  totalEl.textContent = getCartTotal().toFixed(2) + ' ₾';

  container.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      const item = cart.find(i => i.id === id);
      if (!item) return;
      if (action === 'plus') updateCartQuantity(id, item.quantity + 1);
      else updateCartQuantity(id, item.quantity - 1);
    });
  });

  container.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      removeFromCart(btn.dataset.id);
    });
  });
}

export function processPayment(method, cashTendered = null, changeAmount = 0) {
  const shift = getCurrentShift();
  const user = getCurrentUser();

  if (!user || !shift || shift.closed) {
    alert('⚠️ გაყიდვის განსახორციელებლად აუცილებელია ცვლის დაწყება!\nგთხოვთ, გადახვიდეთ "ცვლები"-ს გვერდზე.');
    return false;
  }

  if (cart.length === 0) {
    alert('კალათა ცარიელია');
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
    paymentMethodLabel: method === 'cash' ? 'ნაღდი' : (method === 'card' ? 'ბარათი' : 'ნაღდი + ბარათი'),
    cashAmount: method === 'cash' ? total : 0,
    cashTendered: method === 'cash' ? (cashTendered !== null ? cashTendered : total) : 0,
    changeAmount: method === 'cash' ? changeAmount : 0,
    cardAmount: method === 'card' ? total : 0,
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0]
  };

  saveSale(sale);
  return true;
}

export function processSplitPayment(cashAmount, cardAmount) {
  const shift = getCurrentShift();
  const user = getCurrentUser();

  if (!user || !shift || shift.closed) {
    alert('⚠️ გაყიდვის განსახორციელებლად აუცილებელია ცვლის დაწყება!\nგთხოვთ, გადახვიდეთ "ცვლები"-ს გვერდზე.');
    return false;
  }

  if (cart.length === 0) {
    alert('კალათა ცარიელია');
    return false;
  }

  const total = getCartTotal();
  const sum = Math.round((cashAmount + cardAmount) * 100) / 100;
  const roundedTotal = Math.round(total * 100) / 100;

  if (Math.abs(sum - roundedTotal) > 0.01) {
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
    cashTendered: cashAmount,
    changeAmount: 0,
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
      let reduceBy = item.quantity || 0;
      const currentStock = stock[item.productId] || 0;
      const updatedStock = Math.max(0, currentStock - reduceBy);
      stock[item.productId] = Math.round(updatedStock * 1000) / 1000;
    }
  });
  localStorage.setItem('stock', JSON.stringify(stock));
}

function openCashPaymentModal() {
  const shift = getCurrentShift();
  if (!shift || shift.closed) {
    alert('⚠️ გაყიდვის განსახორციელებლად აუცილებელია ცვლის დაწყება!\nგთხოვთ, გადახვიდეთ "ცვლები"-ს გვერდზე.');
    return;
  }

  if (cart.length === 0) {
    alert('კალათა ცარიელია');
    return;
  }

  const total = getCartTotal();
  const modal = document.getElementById('cash-payment-modal');
  const totalEl = document.getElementById('cash-modal-total');
  const inputEl = document.getElementById('cash-tendered-input');
  const changeEl = document.getElementById('cash-change-amount');
  const quickBtnsContainer = document.getElementById('quick-cash-buttons');

  totalEl.textContent = total.toFixed(2) + ' ₾';
  inputEl.value = '';
  changeEl.textContent = '0.00 ₾';
  changeEl.style.color = '#2e7d32';

  // Build quick cash buttons (Exact amount + standard bill denominations)
  const quickAmounts = [total];
  [10, 20, 50, 100].forEach(amt => {
    if (amt > total && !quickAmounts.includes(amt)) quickAmounts.push(amt);
  });

  quickBtnsContainer.innerHTML = quickAmounts.map((amt, idx) => `
    <button class="btn btn-outline quick-cash-btn" data-amt="${amt}">
      ${idx === 0 ? 'ზუსტი (' + amt.toFixed(2) + ' ₾)' : amt + ' ₾'}
    </button>
  `).join('');

  const updateChangeDisplay = (tendered) => {
    if (isNaN(tendered)) {
      changeEl.textContent = '0.00 ₾';
      changeEl.style.color = '#2e7d32';
      return;
    }
    const change = tendered - total;
    if (change < -0.01) {
      changeEl.textContent = 'ნაკლებია (' + Math.abs(change).toFixed(2) + ' ₾)';
      changeEl.style.color = '#d32f2f';
    } else {
      changeEl.textContent = Math.max(0, change).toFixed(2) + ' ₾';
      changeEl.style.color = '#2e7d32';
    }
  };

  quickBtnsContainer.querySelectorAll('.quick-cash-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const amt = parseFloat(btn.dataset.amt);
      inputEl.value = amt.toFixed(2);
      updateChangeDisplay(amt);
    });
  });

  inputEl.oninput = () => {
    const val = parseFloat(inputEl.value);
    updateChangeDisplay(val);
  };

  modal.classList.add('active');
  setTimeout(() => inputEl.focus(), 100);

  const confirmBtn = document.getElementById('cash-confirm-btn');
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

  const handleCashSubmit = () => {
    let tendered = parseFloat(inputEl.value);
    if (isNaN(tendered) || inputEl.value.trim() === '') {
      tendered = total; // If left blank, treat as exact payment
    }

    if (tendered < total - 0.01) {
      alert('მიღებული თანხა ნაკლებია ჯამურ თანხაზე!');
      return;
    }

    const change = Math.max(0, tendered - total);
    if (processPayment('cash', tendered, change)) {
      modal.classList.remove('active');
    }
  };

  newBtn.addEventListener('click', handleCashSubmit);
  inputEl.onkeydown = (e) => {
    if (e.key === 'Enter') handleCashSubmit();
  };
}

function openSplitPaymentModal() {
  const shift = getCurrentShift();
  if (!shift || shift.closed) {
    alert('⚠️ გაყიდვის განსახორციელებლად აუცილებელია ცვლის დაწყება!\nგთხოვთ, გადახვიდეთ "ცვლები"-ს გვერდზე.');
    return;
  }

  if (cart.length === 0) {
    alert('კალათა ცარიელია');
    return;
  }

  const total = getCartTotal();
  const splitTotalEl = document.getElementById('split-total');
  const cashInput = document.getElementById('split-cash');
  const cardInput = document.getElementById('split-card');

  splitTotalEl.textContent = total.toFixed(2) + ' ₾';
  cashInput.value = '';
  cardInput.value = '';

  cashInput.oninput = () => {
    const cashVal = parseFloat(cashInput.value);
    if (!isNaN(cashVal) && cashVal <= total) {
      cardInput.value = (total - cashVal).toFixed(2);
    } else if (cashInput.value === '') {
      cardInput.value = '';
    }
  };

  cardInput.oninput = () => {
    const cardVal = parseFloat(cardInput.value);
    if (!isNaN(cardVal) && cardVal <= total) {
      cashInput.value = (total - cardVal).toFixed(2);
    } else if (cardInput.value === '') {
      cashInput.value = '';
    }
  };

  const modal = document.getElementById('split-payment-modal');
  modal.classList.add('active');

  const confirmBtn = document.getElementById('split-confirm-btn');
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

  const handleSplitSubmit = () => {
    const cash = parseFloat(cashInput.value) || 0;
    const card = parseFloat(cardInput.value) || 0;
    if (processSplitPayment(cash, card)) {
      modal.classList.remove('active');
    }
  };

  newBtn.addEventListener('click', handleSplitSubmit);

  const handleKeydown = (e) => {
    if (e.key === 'Enter') {
      handleSplitSubmit();
    }
  };
  cashInput.onkeydown = handleKeydown;
  cardInput.onkeydown = handleKeydown;
}

function showPaymentSuccess(sale) {
  const modal = document.getElementById('payment-success-modal');
  if (!modal) return;
  document.getElementById('success-total').textContent = sale.total.toFixed(2) + ' ₾';
  document.getElementById('success-method').textContent = sale.paymentMethodLabel;

  const changeRow = document.getElementById('success-change-row');
  if (changeRow) {
    if (sale.paymentMethod === 'cash' && sale.changeAmount > 0) {
      changeRow.style.display = 'block';
      document.getElementById('success-change').textContent = sale.changeAmount.toFixed(2) + ' ₾';
    } else {
      changeRow.style.display = 'none';
    }
  }

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

    <!-- Cash Payment Calculator Modal -->
    <div class="modal" id="cash-payment-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>ნაღდი ანგარიშსწორება</h3>
          <button class="modal-close" data-modal="cash-payment-modal">×</button>
        </div>
        <div class="modal-body">
          <div class="cart-total-row mb-3">
            <span>ჯამური თანხა:</span>
            <span id="cash-modal-total" class="cart-total-value">0.00 ₾</span>
          </div>
          <div class="form-group">
            <label>მიღებული თანხა (₾):</label>
            <input type="number" id="cash-tendered-input" class="form-input" step="0.01" min="0" placeholder="0.00">
          </div>
          <div class="quick-cash-buttons mt-2 mb-3" id="quick-cash-buttons" style="display: flex; gap: 8px; flex-wrap: wrap;"></div>
          <div class="cart-total-row mb-3" style="font-size: 1.2rem;">
            <span>ხურდა:</span>
            <span id="cash-change-amount" style="font-weight: bold; color: #2e7d32;">0.00 ₾</span>
          </div>
          <div class="modal-actions">
            <button id="cash-confirm-btn" class="btn btn-success btn-lg" style="width: 100%;">გადახდის დადასტურება</button>
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
          <p id="success-change-row" style="display:none; color: #2e7d32; font-size: 1.1rem; margin-top: 5px;">
            ხურდა: <strong id="success-change">0.00 ₾</strong>
          </p>
          <button id="success-close-btn" class="btn btn-primary mt-3">დახურვა</button>
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
          <div class="modal-actions mt-3">
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

  document.getElementById('pay-cash-btn').addEventListener('click', openCashPaymentModal);
  document.getElementById('pay-card-btn').addEventListener('click', () => processPayment('card'));
  document.getElementById('pay-split-btn').addEventListener('click', openSplitPaymentModal);

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
      const shift = getCurrentShift();
      if (!shift || shift.closed) {
        alert('⚠️ გაყიდვის განსახორციელებლად აუცილებელია ცვლის დაწყება!\nგთხოვთ, გადახვიდეთ "ცვლები"-ს გვერდზე.');
        return;
      }

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
  buttons.innerHTML = (product.multipliers || [0.5, 1, 1.5, 2, 2.5, 3]).map(m => `
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
  const newBtn = confirmManualBtn.cloneNode(true);
  confirmManualBtn.parentNode.replaceChild(newBtn, confirmManualBtn);

  const handleManualAdd = () => {
    const val = parseFloat(manualInput.value);
    if (isNaN(val) || val <= 0) {
      alert('გთხოვთ შეიყვანოთ ლიტრების სწორი რაოდენობა');
      return;
    }
    addToCart(product.id, 1, null, val);
    document.getElementById('multiplier-modal').classList.remove('active');
  };

  newBtn.addEventListener('click', handleManualAdd);
  manualInput.onkeydown = (e) => {
    if (e.key === 'Enter') handleManualAdd();
  };

  document.getElementById('multiplier-modal').classList.add('active');
}

function openWeightModal(product) {
  document.getElementById('weight-product-name').textContent = product.name + ` (${product.price.toFixed(2)} ₾/კგ)`;
  
  const priceInput = document.getElementById('weight-price-input');
  const kgInput = document.getElementById('weight-kg-input');
  priceInput.value = '';
  kgInput.value = '';

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

  const handleWeightSubmit = () => {
    const price = parseFloat(priceInput.value);
    const kg = parseFloat(kgInput.value);

    if (isNaN(price) || price <= 0 || isNaN(kg) || kg <= 0) {
      alert('გთხოვთ შეიყვანოთ სწორი ფასი ან წონა');
      return;
    }

    addToCart(product.id, 1, price, 1, kg);
    modal.classList.remove('active');
  };

  newBtn.addEventListener('click', handleWeightSubmit);

  const handleKeydown = (e) => {
    if (e.key === 'Enter') handleWeightSubmit();
  };
  priceInput.onkeydown = handleKeydown;
  kgInput.onkeydown = handleKeydown;
}