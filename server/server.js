const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Target storage directories on your D: drive
const DATA_DIR = 'D:\\BeerHouseData';
const SHIFTS_DIR = path.join(DATA_DIR, 'Shifts');
const MAIN_DB_PATH = path.join(DATA_DIR, 'pos_db.json');

// Automatically create folders on D: drive if they don't exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(SHIFTS_DIR)) fs.mkdirSync(SHIFTS_DIR, { recursive: true });

// Endpoint 1: Restore data on app launch
app.get('/api/data', (req, res) => {
  if (!fs.existsSync(MAIN_DB_PATH)) return res.json({});
  try {
    const fileContent = fs.readFileSync(MAIN_DB_PATH, 'utf8');
    res.json(JSON.parse(fileContent || '{}'));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read data from D drive' });
  }
});

// Endpoint 2: Continuous live sync
app.post('/api/data', (req, res) => {
  try {
    fs.writeFileSync(MAIN_DB_PATH, JSON.stringify(req.body, null, 2), 'utf8');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to write live data' });
  }
});

// Endpoint 3: End of Shift archiving
app.post('/api/shift/end', (req, res) => {
  try {
    const { shiftNumber, date, shiftData, currentAppData } = req.body;

    // File format: YYYY-MM-DD_Shift_1.json
    const fileName = `${date}_Shift_${shiftNumber}.json`;
    const shiftFilePath = path.join(SHIFTS_DIR, fileName);

    // Save individual shift report file
    fs.writeFileSync(shiftFilePath, JSON.stringify(shiftData, null, 2), 'utf8');

    // Also update the primary application state file
    if (currentAppData) {
      fs.writeFileSync(MAIN_DB_PATH, JSON.stringify(currentAppData, null, 2), 'utf8');
    }

    console.log(`[SUCCESS] Saved shift report: ${fileName}`);
    res.json({ success: true, file: fileName });
  } catch (err) {
    console.error('Error archiving shift:', err);
    res.status(500).json({ error: 'Failed to save shift record' });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Local POS Server running on http://localhost:${PORT}`);
  console.log(`Shift files will be archived to: ${SHIFTS_DIR}`);
});