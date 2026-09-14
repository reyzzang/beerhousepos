// userManagement.js - Admin User and Employee Management Page (Professional UI)

import { getUsers, updateUserCredentials, saveUsers, isAdmin } from './auth.js';
import { saveToDisk } from './dbSync.js';

export function renderUserManagementModal() {
  const content = document.getElementById('main-content');
  if (!content) return;

  if (!isAdmin()) {
    content.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px; max-width: 500px; margin: 40px auto; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        <h2>წვდომა შეზღუდულია</h2>
        <p style="color: #666; margin-top: 10px;">ეს გვერდი განკუთვნილია მხოლოდ ადმინისტრატორისთვის.</p>
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <div class="page-header" style="margin-bottom: 25px;">
      <h1>თანამშრომლების და მომხმარებლების მართვა</h1>
    </div>

    <div class="card" style="max-width: 900px; margin: 0 auto 25px auto; padding: 25px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
      <h2 style="margin-bottom: 15px; font-size: 18px; color: #333;">ახალი თანამშრომლის დამატება</h2>
      <form id="add-user-form" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) 140px; gap: 15px; align-items: end;">
        <div class="form-group" style="margin: 0;">
          <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: bold; color: #555;">იუზერნეიმი (Username)</label>
          <input type="text" id="new-username" class="form-input" placeholder="მაგ: gega" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px;">
        </div>
        <div class="form-group" style="margin: 0;">
          <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: bold; color: #555;">სრული სახელი</label>
          <input type="text" id="new-name" class="form-input" placeholder="მაგ: გეგა" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px;">
        </div>
        <div class="form-group" style="margin: 0;">
          <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: bold; color: #555;">პაროლი</label>
          <input type="password" id="new-password" class="form-input" placeholder="••••••••" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px;">
        </div>
        <div style="margin: 0;">
          <button type="submit" class="btn btn-primary" style="width: 100%; padding: 10px; background: #0275d8; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">დამატება</button>
        </div>
      </form>
    </div>

    <div class="card" style="max-width: 900px; margin: 0 auto; padding: 25px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
      <h2 style="margin-bottom: 20px; font-size: 18px; color: #333;">არსებული მომხმარებლები</h2>
      <div class="table-responsive">
        <table class="data-table" id="users-admin-table" style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background-color: #f8f9fa; border-bottom: 2px solid #e9ecef;">
              <th style="padding: 14px 12px; font-size: 13px; color: #495057;">იუზერნეიმი</th>
              <th style="padding: 14px 12px; font-size: 13px; color: #495057;">სახელი</th>
              <th style="padding: 14px 12px; font-size: 13px; color: #495057;">როლი</th>
              <th style="padding: 14px 12px; font-size: 13px; color: #495057;">ახალი პაროლი</th>
              <th style="padding: 14px 12px; text-align: center; font-size: 13px; color: #495057;">მოქმედება</th>
            </tr>
          </thead>
          <tbody id="users-table-body"></tbody>
        </table>
      </div>
    </div>
  `;

  loadUsersIntoTable();

  document.getElementById('add-user-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('new-username').value.trim();
    const name = document.getElementById('new-name').value.trim();
    const p = document.getElementById('new-password').value;

    let users = getUsers();
    if (users[u]) {
      alert('მომხმარებელი ამ სახელით უკვე არსებობს!');
      return;
    }

    users[u] = { password: p, role: 'employee', name: name };
    saveUsers(users);
    try { saveToDisk(); } catch(err) {}

    e.target.reset();
    loadUsersIntoTable();
    alert('თანამშრომელი წარმატებით დაემატა!');
  });
}

function loadUsersIntoTable() {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;

  const users = getUsers();
  tbody.innerHTML = Object.keys(users).map(username => {
    const uData = users[username];
    return `
      <tr style="border-bottom: 1px solid #edf2f7; transition: background 0.2s;">
        <td style="padding: 14px 12px;">
          <input type="text" value="${username}" id="edit-user-${username}" class="form-input" style="padding: 8px; width: 130px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 14px;">
        </td>
        <td style="padding: 14px 12px;">
          <input type="text" value="${uData.name}" id="edit-name-${username}" class="form-input" style="padding: 8px; width: 140px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 14px;">
        </td>
        <td style="padding: 14px 12px; font-size: 14px; color: #4a5568;">
          <span style="padding: 4px 8px; background: ${uData.role === 'admin' ? '#ebf8ff' : '#f7fafc'}; color: ${uData.role === 'admin' ? '#2b6cb0' : '#4a5568'}; border-radius: 4px; font-size: 12px; font-weight: bold;">
            ${uData.role === 'admin' ? 'ადმინი' : 'თანამშრომელი'}
          </span>
        </td>
        <td style="padding: 14px 12px;">
          <input type="password" placeholder="შეცვლა..." id="edit-pass-${username}" class="form-input" style="padding: 8px; width: 130px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 14px;">
        </td>
        <td style="padding: 14px 12px; text-align: center;">
          <div style="display: inline-flex; gap: 8px; justify-content: center; align-items: center;">
            <button class="btn btn-outline btn-sm save-user-row" data-user="${username}" style="padding: 8px 14px; background: #0275d8; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold;">შენახვა</button>
            ${uData.role !== 'admin' ? `<button class="btn btn-danger btn-sm delete-user-row" data-user="${username}" style="padding: 8px 14px; background: #d9534f; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold;">წაშლა</button>` : '<span style="display:inline-block; width: 62px;"></span>'}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Handle Save Row
  tbody.querySelectorAll('.save-user-row').forEach(btn => {
    btn.addEventListener('click', () => {
      const oldUsername = btn.dataset.user;
      const newUsername = document.getElementById(`edit-user-${oldUsername}`).value.trim();
      const newName = document.getElementById(`edit-name-${oldUsername}`).value.trim();
      const newPass = document.getElementById(`edit-pass-${oldUsername}`).value;

      if (!newUsername || !newName) {
        alert('იუზერნეიმი და სახელი სავალდებულოა!');
        return;
      }

      const res = updateUserCredentials(oldUsername, newUsername, newPass, newName);
      if (res.success) {
        try { saveToDisk(); } catch(e) {}
        alert('მონაცემები წარმატებით განახლდა!');
        loadUsersIntoTable();
      } else {
        alert(res.message);
      }
    });
  });

  // Handle Delete Row
  tbody.querySelectorAll('.delete-user-row').forEach(btn => {
    btn.addEventListener('click', () => {
      const uname = btn.dataset.user;
      if (confirm(`ნამდვილად გსურთ სამუდამოდ წაშალოთ თანამშრომელი (${uname})?`)) {
        let users = getUsers();
        delete users[uname];
        saveUsers(users);
        try { saveToDisk(); } catch(e) {}
        loadUsersIntoTable();
        alert('თანამშრომელი წაიშალა.');
      }
    });
  });
}