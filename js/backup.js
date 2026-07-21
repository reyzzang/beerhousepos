// backup.js - Background sync timers and cloud bridge payload

import { getShifts, checkAndCloseShiftsByTime, generateDailySummary } from './auth.js';

const BACKUP_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID_HERE/exec'; // Placeholder Google Apps Script URL

let lastBackupCheck = null;

export function initBackup() {
  // Check every 30 seconds for exact 12:00 and 00:00
  setInterval(() => {
    checkBackupTime();
    checkAndCloseShiftsByTime();
  }, 30000);

  // Also run once on load
  checkBackupTime();
}

function checkBackupTime() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();

  // Trigger at exactly 12:00 and 00:00
  if ((hours === 12 || hours === 0) && minutes === 0) {
    const key = `${now.toISOString().split('T')[0]}_${hours}`;
    if (lastBackupCheck === key) return; // prevent double in same minute
    lastBackupCheck = key;
    performBackup();
  }
}

export function performBackup() {
  console.log('[Backup] Starting backup at', new Date().toISOString());

  const payload = compilePayload();

  // Send via fetch (no-cors for Google Apps Script often needed, but we try)
  fetch(BACKUP_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  }).then(() => {
    console.log('[Backup] Payload sent successfully');
    // Log local backup time
    localStorage.setItem('lastBackup', new Date().toISOString());
  }).catch(err => {
    console.error('[Backup] Failed to send:', err);
    // Still save local copy of payload for manual recovery
    localStorage.setItem('lastBackupPayload', JSON.stringify(payload));
  });
}

function compilePayload() {
  const now = new Date();
  const data = {
    timestamp: now.toISOString(),
    businessName: 'ლუდის სახლი ჯაჭვის ხიდთან',
    localStorageSnapshot: {
      currentUser: localStorage.getItem('currentUser'),
      currentShift: localStorage.getItem('currentShift'),
      shifts: localStorage.getItem('shifts'),
      sales: localStorage.getItem('sales'),
      distributions: localStorage.getItem('distributions'),
      expenses: localStorage.getItem('expenses'),
      stock: localStorage.getItem('stock'),
      customProducts: localStorage.getItem('customProducts'),
      customDistributors: localStorage.getItem('customDistributors'),
      dailySummaries: localStorage.getItem('dailySummaries'),
      lastBackup: localStorage.getItem('lastBackup')
    },
    // Also provide parsed for easier Excel conversion on GAS side
    parsed: {
      shifts: getShifts(),
      sales: JSON.parse(localStorage.getItem('sales') || '[]'),
      distributions: JSON.parse(localStorage.getItem('distributions') || '[]'),
      expenses: JSON.parse(localStorage.getItem('expenses') || '[]'),
      stock: JSON.parse(localStorage.getItem('stock') || '{}'),
      dailySummaries: JSON.parse(localStorage.getItem('dailySummaries') || '[]')
    },
    // Shift calculations summary
    shiftCalculations: getShifts().filter(s => s.closed).map(s => ({
      id: s.id,
      date: s.date,
      shift: s.shiftBlock?.name,
      user: s.userName,
      totalSales: s.totalSales,
      cardTotal: s.cardTotal,
      cashTotal: s.cashTotal,
      deductions: s.deductions,
      salary: s.salary,
      netCash: s.netCash
    }))
  };

  return data;
}

// Manual backup trigger (for admin if needed)
export function manualBackup() {
  performBackup();
  alert('ბექაპი გაიგზავნა (შეამოწმეთ კონსოლი)');
}