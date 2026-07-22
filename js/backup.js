// backup.js - Background sync timers, cloud bridge, local disk backup, and smart-merge restore

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
    
    performCloudBackup();
    downloadLocalBackup(); 
  }
}

export function performCloudBackup() {
  console.log('[Backup] Starting cloud backup at', new Date().toISOString());
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
    console.log('[Backup] Payload sent successfully to cloud');
    localStorage.setItem('lastBackup', new Date().toISOString());
  }).catch(err => {
    console.error('[Backup] Failed to send to cloud:', err);
    localStorage.setItem('lastBackupPayload', JSON.stringify(payload));
  });
}

// Generates a JSON file of all data and downloads it to the PC (e.g., D Disk)
export function downloadLocalBackup() {
  console.log('[Backup] Generating local backup file...');
  const payload = compilePayload();
  
  // Convert payload to a readable JSON string
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
  
  // Create a hidden link and trigger download
  const dlAnchorElem = document.createElement('a');
  dlAnchorElem.setAttribute("href", dataStr);
  dlAnchorElem.setAttribute("download", `pos_მონაცემები_${new Date().toISOString().split('T')[0]}.json`);
  
  document.body.appendChild(dlAnchorElem);
  dlAnchorElem.click();
  document.body.removeChild(dlAnchorElem);
}

function compilePayload() {
  const now = new Date();
  return {
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
}

// Manual backup trigger for Admin UI
export function manualLocalBackup() {
  downloadLocalBackup();
  alert('ლოკალური ბექაპი გადმოიწერა თქვენს კომპიუტერში.');
}

// Function to smart-merge data from a backup JSON file without losing new transactions
export function restoreFromBackup(file) {
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const backupData = JSON.parse(e.target.result);
      
      // Check if it's a valid backup file
      if (!backupData.localStorageSnapshot) {
        alert('არასწორი ფაილი (Invalid backup file)');
        return;
      }

      const backupSnapshot = backupData.localStorageSnapshot;

      // 1. Smart Merge Sales (Combine current sales and file sales, avoiding duplicate IDs)
      const currentSales = JSON.parse(localStorage.getItem('sales') || '[]');
      const fileSales = backupSnapshot.sales ? JSON.parse(backupSnapshot.sales) : [];
      const salesMap = new Map();
      
      // Add current sales first
      currentSales.forEach(s => salesMap.set(s.id, s));
      // Add file sales if they don't already exist
      fileSales.forEach(s => {
        if (!salesMap.has(s.id)) {
          salesMap.set(s.id, s);
        }
      });
      localStorage.setItem('sales', JSON.stringify(Array.from(salesMap.values())));

      // 2. Smart Merge Shifts
      const currentShifts = JSON.parse(localStorage.getItem('shifts') || '[]');
      const fileShifts = backupSnapshot.shifts ? JSON.parse(backupSnapshot.shifts) : [];
      const shiftsMap = new Map();
      
      currentShifts.forEach(sh => shiftsMap.set(sh.id, sh));
      fileShifts.forEach(sh => {
        if (!shiftsMap.has(sh.id)) {
          shiftsMap.set(sh.id, sh);
        }
      });
      localStorage.setItem('shifts', JSON.stringify(Array.from(shiftsMap.values())));

      // 3. Smart Merge Expenses
      const currentExpenses = JSON.parse(localStorage.getItem('expenses') || '[]');
      const fileExpenses = backupSnapshot.expenses ? JSON.parse(backupSnapshot.expenses) : [];
      const expMap = new Map();
      
      currentExpenses.forEach(ex => expMap.set(ex.id, ex));
      fileExpenses.forEach(ex => {
        if (!expMap.has(ex.id)) {
          expMap.set(ex.id, ex);
        }
      });
      localStorage.setItem('expenses', JSON.stringify(Array.from(expMap.values())));

      // 4. Smart Merge Distributions
      const currentDist = JSON.parse(localStorage.getItem('distributions') || '[]');
      const fileDist = backupSnapshot.distributions ? JSON.parse(backupSnapshot.distributions) : [];
      const distMap = new Map();
      
      currentDist.forEach(d => distMap.set(d.id, d));
      fileDist.forEach(d => {
        if (!distMap.has(d.id)) {
          distMap.set(d.id, d);
        }
      });
      localStorage.setItem('distributions', JSON.stringify(Array.from(distMap.values())));

      // 5. Restore other settings safely if they don't exist locally yet
      const simpleKeys = ['customProducts', 'customDistributors', 'dailySummaries'];
      simpleKeys.forEach(key => {
        if (!localStorage.getItem(key) && backupSnapshot[key]) {
          localStorage.setItem(key, backupSnapshot[key]);
        }
      });

      alert('მონაცემები წარმატებით გაერთიანდა (Smart Merge)! სისტემა ახლა გადაიტვირთება.');
      window.location.reload(); // Refresh the page to load updated data
      
    } catch (err) {
      console.error('[Backup] Error reading file:', err);
      alert('შეცდომა ფაილის წაკითხვისას. დარწმუნდით, რომ სწორი ფაილი აირჩიეთ.');
    }
  };
  
  reader.readAsText(file);
}