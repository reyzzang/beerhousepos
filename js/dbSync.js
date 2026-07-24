const API_URL = 'http://localhost:5000/api';

// Call on app boot to restore state from D: drive if browser history was cleared
export async function syncFromDiskOnLoad() {
  try {
    const res = await fetch(`${API_URL}/data`);
    if (!res.ok) return;
    const diskData = await res.json();
    if (Object.keys(diskData).length > 0) {
      Object.entries(diskData).forEach(([key, val]) => {
        localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
      });
      console.log('Restored state successfully from D: drive.');
    }
  } catch (err) {
    console.warn('Local server offline. Running on browser storage only.');
  }
}

// Call whenever general app updates occur
export async function saveToDisk() {
  try {
    const currentData = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const val = localStorage.getItem(key);
      try { currentData[key] = JSON.parse(val); } catch { currentData[key] = val; }
    }

    await fetch(`${API_URL}/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentData)
    });
  } catch (err) {
    console.error('Failed live save to D drive:', err);
  }
}

// Call when ending a shift
export async function endShiftToDisk(shiftNumber, date, shiftData) {
  try {
    const currentAppData = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const val = localStorage.getItem(key);
      try { currentAppData[key] = JSON.parse(val); } catch { currentAppData[key] = val; }
    }

    const payload = {
      shiftNumber,
      date,
      shiftData,
      currentAppData
    };

    const res = await fetch(`${API_URL}/shift/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert(`Shift ${shiftNumber} saved successfully to D:\\BeerHouseData\\Shifts!`);
    }
  } catch (err) {
    console.error('Error sending shift data to backend:', err);
  }
}