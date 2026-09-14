// main.js - Main entry point, screen navigation, and disk persistence sync

import { login, logout, getCurrentUser, getCurrentShift, isAdmin, requireAuth } from './auth.js';
import { renderCashierPage } from './cashier.js';
import { renderDistributionPage } from './distribution.js';
import { renderStockPage, getStock } from './stock.js';
import { renderHistoryPage } from './history.js';
import { renderShiftsPage } from './shifts.js';
import { renderProfitPage } from './profit.js';
import { renderUserManagementModal as renderUsersPage } from './userManagement.js';
import { initBackup } from './backup.js';
import { syncFromDiskOnLoad } from './dbSync.js';

let liveTimeInterval = null;

function showLogin() {
  const loginScreen = document.getElementById('login-screen');
  const appScreen = document.getElementById('app');

  if (loginScreen) loginScreen.classList.remove('hidden');
  if (appScreen) appScreen.classList.add('hidden');
  if (liveTimeInterval) clearInterval(liveTimeInterval);

  // Clear username and password fields upon logout/exit
  const usernameInput = document.getElementById('login-username');
  const passwordInput = document.getElementById('login-password');
  const errorEl = document.getElementById('login-error');

  if (usernameInput) usernameInput.value = '';
  if (passwordInput) passwordInput.value = '';
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.classList.add('hidden');
  }
}

function showApp() {
  const loginScreen = document.getElementById('login-screen');
  const appScreen = document.getElementById('app');

  if (loginScreen) loginScreen.classList.add('hidden');
  if (appScreen) appScreen.classList.remove('hidden');

  // Toggle visibility of the Users page link in the sidebar based on admin status
  const usersLink = document.getElementById('nav-users-link');
  if (usersLink) {
    usersLink.style.display = isAdmin() ? 'block' : 'none';
  }

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

export function updateHeader() {
  const user = getCurrentUser();
  const shift = getCurrentShift();
  
  const userEl = document.getElementById('header-user');
  const roleEl = document.getElementById('header-role');
  const shiftEl = document.getElementById('header-shift');

  if (!user) return;

  if (userEl) userEl.textContent = user.name || user.username;
  if (roleEl) roleEl.textContent = user.role === 'admin' ? 'ადმინი' : 'თანამშრომელი';
  
  if (shiftEl) {
    if (shift && !shift.closed) {
      shiftEl.textContent = shift.shiftBlock?.name || 'აქტიური ცვლა';
    } else {
      shiftEl.textContent = 'არ არის ცვლა';
    }
  }
}

export function navigateTo(page) {
  // Always keep shift status and user header fresh on page change
  updateHeader();

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  if (page === 'stock' && !isAdmin()) {
    alert('მარაგის გვერდი ხელმისაწვდომია მხოლოდ ადმინისთვის');
    navigateTo('cashier');
    return;
  }

  if (page === 'profit' && !isAdmin()) {
    alert('მოგების გვერდი ხელმისაწვდომია მხოლოდ ადმინისთვის');
    navigateTo('cashier');
    return;
  }

  if (page === 'users' && !isAdmin()) {
    alert('მომხმარებლების გვერდი ხელმისაწვდომია მხოლოდ ადმინისთვის');
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
    case 'profit':
      renderProfitPage();
      break;
    case 'users':
      renderUsersPage();
      break;
    default:
      renderCashierPage();
  }
}

async function init() {
  try {
    // 1. Pull data from D: drive disk sync immediately on startup
    await syncFromDiskOnLoad();
  } catch (err) {
    console.error('⚠️ Disk sync error during startup:', err);
  }

  try {
    // 2. Initialize stock state in memory
    getStock();
  } catch (err) {
    console.error('⚠️ Error loading stock state:', err);
  }

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
        const errorEl = document.getElementById('login-error');
        if (errorEl) {
          errorEl.textContent = result.message;
          errorEl.classList.remove('hidden');
        }
      }
    });
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('ნამდვილად გსურთ გასვლა?')) {
        logout();
        showLogin();
      }
    });
  }

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

// Global window mappings
window.navigateTo = navigateTo;
window.updateHeader = updateHeader;