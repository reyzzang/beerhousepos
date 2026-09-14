// auth.js - Login and shift tracking (shift continues even if user logs out)

const DEFAULT_USERS = {
  admin: { password: 'admin123', role: 'admin', name: 'ადმინი' },
  Mate: { password: 'mate1', role: 'employee', name: 'მათე' },
  Luka: { password: 'luka1', role: 'employee', name: 'ლუკა' },
  Bakari: { password: 'bakari1', role: 'employee', name: 'ბაქარი' }
};

export function getUsers() {
  try {
    const stored = localStorage.getItem('appUsers');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error loading users:", e);
  }
  localStorage.setItem('appUsers', JSON.stringify(DEFAULT_USERS));
  return DEFAULT_USERS;
}

export function saveUsers(users) {
  localStorage.setItem('appUsers', JSON.stringify(users));
}

export function updateUserCredentials(targetUsername, newUsername, newPassword, newName) {
  let users = getUsers();
  
  const actualKey = Object.keys(users).find(
    k => k.toLowerCase() === targetUsername.trim().toLowerCase()
  );

  if (!actualKey) {
    return { success: false, message: 'მომხმარებელი ვერ მოიძებნა' };
  }

  const trimmedNewUser = newUsername.trim();
  
  if (trimmedNewUser.toLowerCase() !== actualKey.toLowerCase() && users[trimmedNewUser]) {
    return { success: false, message: 'ეს სახელი დაკავებულია' };
  }

  const userData = users[actualKey];
  
  if (trimmedNewUser !== actualKey) {
    delete users[actualKey];
  }

  users[trimmedNewUser] = {
    password: newPassword || userData.password,
    role: userData.role,
    name: newName || userData.name
  };

  saveUsers(users);

  const currentUser = getCurrentUser();
  if (currentUser && currentUser.username.toLowerCase() === actualKey.toLowerCase()) {
    localStorage.setItem('currentUser', JSON.stringify({
      username: trimmedNewUser,
      name: users[trimmedNewUser].name,
      role: users[trimmedNewUser].role
    }));
  }

  return { success: true, message: 'მონაცემები განახლდა' };
}

export function getCurrentUser() {
  const data = localStorage.getItem('currentUser');
  return data ? JSON.parse(data) : null;
}

export function getCurrentShift() {
  const data = localStorage.getItem('currentShift');
  return data ? JSON.parse(data) : null;
}

export function getShifts() {
  const data = localStorage.getItem('shifts');
  return data ? JSON.parse(data) : [];
}

export function saveShifts(shifts) {
  localStorage.setItem('shifts', JSON.stringify(shifts));
}

export function determineShiftBlock(date = new Date()) {
  const hours = date.getHours();
  if (hours >= 10 && hours < 16) {
    return { id: 1, name: 'I ცვლა', startHour: 10, endHour: 16 };
  } else {
    return { id: 2, name: 'II ცვლა', startHour: 16, endHour: 0 };
  }
}

export function login(username, password) {
  const enteredUsername = username.trim().toLowerCase();
  const users = getUsers();

  const actualUsername = Object.keys(users).find(
    key => key.toLowerCase() === enteredUsername
  );

  if (!actualUsername) {
    return { success: false, message: 'არასწორი მომხმარებელი ან პაროლი' };
  }

  const user = users[actualUsername];

  if (user.password !== password) {
    return { success: false, message: 'არასწორი მომხმარებელი ან პაროლი' };
  }

  localStorage.setItem('currentUser', JSON.stringify({
    username: actualUsername,
    name: user.name,
    role: user.role
  }));

  return {
    success: true,
    user: {
      username: actualUsername,
      name: user.name,
      role: user.role
    }
  };
}

export function logout() {
  localStorage.removeItem('currentUser');
}

function closeCurrentShift() {
  const current = getCurrentShift();
  if (!current || current.closed) return;

  const now = new Date();
  current.logoutTime = now.toISOString();
  current.closed = true;

  calculateShiftFinancials(current);

  const shifts = getShifts();
  const idx = shifts.findIndex(s => s.id === current.id);
  if (idx !== -1) {
    shifts[idx] = current;
    saveShifts(shifts);
  }

  if (current.shiftBlock.id === 2) {
    generateDailySummary(current.date);
  }

  localStorage.removeItem('currentShift');
}

export function calculateShiftFinancials(shift) {
  let totalSales = 0;
  let cardTotal = 0;
  let cashTotal = 0;

  const sales = getSalesForShift(shift.id);
  sales.forEach(sale => {
    totalSales += sale.total || 0;
    if (sale.paymentMethod === 'split') {
      cardTotal += (sale.cardAmount || 0);
      cashTotal += (sale.cashAmount || 0);
    } else if (sale.paymentMethod === 'card') {
      cardTotal += sale.total || 0;
    } else {
      cashTotal += sale.total || 0;
    }
  });

  let deductions = 0;
  const distributions = getDistributions().filter(d => d.shiftId === shift.id && d.status === 'გადახდილია');
  distributions.forEach(d => deductions += d.totalAmount || 0);

  const expenses = getExpenses().filter(e => e.shiftId === shift.id);
  expenses.forEach(e => deductions += e.amount || 0);

  deductions += shift.salary || 0;

  const netCash = cashTotal - deductions;

  shift.totalSales = totalSales;
  shift.cardTotal = cardTotal;
  shift.cashTotal = cashTotal;
  shift.deductions = deductions;
  shift.netCash = netCash;
  shift.sales = sales;
  shift.distributionsDuringShift = distributions;
  shift.expensesDuringShift = expenses;

  return shift;
}

function getSalesForShift(shiftId) {
  const allSales = JSON.parse(localStorage.getItem('sales') || '[]');
  return allSales.filter(s => s.shiftId === shiftId);
}

function getDistributions() {
  return JSON.parse(localStorage.getItem('distributions') || '[]');
}

function getExpenses() {
  return JSON.parse(localStorage.getItem('expenses') || '[]');
}

export function generateDailySummary(dateStr) {
  const shifts = getShifts().filter(s => s.date === dateStr && s.closed);
  if (shifts.length === 0) return null;

  let totalSales = 0;
  let totalCard = 0;
  let totalCash = 0;
  let totalDeductions = 0;
  let totalSalary = 0;

  shifts.forEach(s => {
    totalSales += s.totalSales || 0;
    totalCard += s.cardTotal || 0;
    totalCash += s.cashTotal || 0;
    totalDeductions += (s.deductions || 0) - (s.salary || 0);
    totalSalary += s.salary || 0;
  });

  totalDeductions += totalSalary;

  const summary = {
    date: dateStr,
    totalSales,
    totalCard,
    totalCash,
    totalDeductions,
    totalSalary,
    netCash: totalCash - totalDeductions,
    shifts: shifts.map(s => ({
      id: s.id,
      user: s.userName,
      shiftBlock: s.shiftBlock.name,
      totalSales: s.totalSales,
      netCash: s.netCash
    })),
    generatedAt: new Date().toISOString()
  };

  const summaries = JSON.parse(localStorage.getItem('dailySummaries') || '[]');
  const existingIdx = summaries.findIndex(s => s.date === dateStr);
  if (existingIdx !== -1) {
    summaries[existingIdx] = summary;
  } else {
    summaries.push(summary);
  }
  localStorage.setItem('dailySummaries', JSON.stringify(summaries));

  return summary;
}

export function isAdmin() {
  const user = getCurrentUser();
  return user && user.role === 'admin';
}

export function requireAuth() {
  return !!getCurrentUser();
}

export function checkAndCloseShiftsByTime() {
  // Optional
}