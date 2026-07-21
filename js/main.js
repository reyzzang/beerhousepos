// main.js - Entry point and routing
import { login, logout, getCurrentUser, getCurrentShift, isAdmin, requireAuth } from './auth.js';
import { renderCashierPage } from './cashier.js';
import { renderDistributionPage } from './distribution.js';
import { renderStockPage } from './stock.js';
import { renderHistoryPage } from './history.js';
import { renderShiftsPage } from './shifts.js';
import { initBackup } from './backup.js';
import { getStock, saveStock } from './stock.js';
import { initialStock } from './products.js';

// Ensure initial stock exists
if (!localStorage.getItem('stock')) {
  saveStock(initialStock);
}

let liveTimeInterval = null;

function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  if (liveTimeInterval) clearInterval(liveTimeInterval);
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  updateHeader();
  navigateTo('cashier');
  startLiveTime();
}

function startLiveTime() {
  if (liveTimeInterval) clearInterval(liveTimeInterval);
  
  liveTimeInterval = setInterval(() => {
    const timeEl = document.getElementById('live-time');
    if (timeEl) {
      timeEl.textContent = new Date().toLocaleTimeString('ka-GE', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
    }
  }, 1000);
}

function updateHeader() {
  const user = getCurrentUser();
  const shift = getCurrentShift();
  if (!user) return;

  document.getElementById('header-user').textContent = user.name;
  document.getElementById('header-role').textContent = user.role === 'admin' ? 'ადმინი' : 'თანამშრომელი';
  
  if (shift) {
    document.getElementById('header-shift').textContent = shift.shiftBlock?.name || 'აქტიური';
  } else {
    document.getElementById('header-shift').textContent = 'არ არის ცვლა';
  }
}

function navigateTo(page) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  if (page === 'stock' && !isAdmin()) {
    alert('მარაგის გვერდი ხელმისაწვდომია მხოლოდ ადმინისთვის');
    navigateTo('cashier');
    return;
  }

  switch (page) {
    case 'cashier':
      renderCashierPage();
      break;
    case 'distribution':
      renderDistributionPage();
      break;
    case 'stock':
      renderStockPage();
      break;
    case 'history':
      renderHistoryPage();
      break;
    case 'shifts':
      renderShiftsPage();
      break;
    default:
      renderCashierPage();
  }
}

function init() {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;

      const result = login(username, password);
      if (result.success) {
        showApp();
      } else {
        document.getElementById('login-error').textContent = result.message;
        document.getElementById('login-error').classList.remove('hidden');
      }
    });
  }

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    if (confirm('ნამდვილად გსურთ გასვლა?')) {
      logout();
      showLogin();
    }
  });

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(item.dataset.page);
    });
  });

  if (requireAuth()) {
    showApp();
  } else {
    showLogin();
  }

  initBackup();
}

document.addEventListener('DOMContentLoaded', init);

window.navigateTo = navigateTo;