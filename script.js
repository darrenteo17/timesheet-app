// =====================
// Constants
// =====================
const HOURLY_RATE = 11;
const CPF_DEDUCTION = 0.20; // Employee deduction
const CPF_EMPLOYER = 0.37;   // Employer CPF

// =====================
// Track edit state
// =====================
let editIndex = null; // null = adding new entry, number = editing

// =====================
// Load saved entries
// =====================
let entries = JSON.parse(localStorage.getItem("timesheetEntries")) || [];

// =====================
// Helper Functions
// =====================
function getDayWorked(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "long" });
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function calculateTotalTime(timeIn, timeOut) {
  const diff = timeToMinutes(timeOut) - timeToMinutes(timeIn);
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  return {
    text: `${hours}hrs ${minutes}mins`,
    decimal: hours + minutes / 60
  };
}

function calculateEarnings(decimalHours) {
  const gross = decimalHours * HOURLY_RATE;
  return {
    gross,
    net: gross - gross * CPF_DEDUCTION,
    cpf: gross * CPF_EMPLOYER
  };
}

// =====================
// Save + Render
// =====================
function saveEntries() {
  localStorage.setItem("timesheetEntries", JSON.stringify(entries));
}

function renderEntries() {
  const container = document.getElementById("entries");
  container.innerHTML = "";

  if (entries.length === 0) {
    container.innerHTML = "<p>No entries yet.</p>";
    return;
  }

  entries.forEach((e, i) => {
    container.innerHTML += `
      <div class="entry-card">
        <p><strong>${e.date}</strong> (${e.day})</p>
        <p><strong>Branch:</strong> ${e.branch}</p>
        <p><strong>Time:</strong> ${e.timeIn} – ${e.timeOut}</p>
        <p><strong>Total Hours:</strong> ${e.hours}</p>
        <p><strong>Gross:</strong> $${e.gross} | <strong>Net:</strong> $${e.net} | <strong>CPF:</strong> $${e.cpf}</p>
        <div class="entry-buttons">
          <button onclick="editEntry(${i})">Edit</button>
          <button onclick="deleteEntry(${i})">Delete</button>
        </div>
      </div>
    `;
  });
}

function deleteEntry(index) {
  if (confirm("Are you sure you want to delete this entry?")) {
    entries.splice(index, 1);
    saveEntries();
    renderEntries();
  }
}

function editEntry(index) {
  const entry = entries[index];
  document.getElementById("dateWorked").value = entry.date;
  document.getElementById("branch").value = entry.branch;
  document.getElementById("timeIn").value = entry.timeIn;
  document.getElementById("timeOut").value = entry.timeOut;

  editIndex = index;
  document.getElementById("timesheetForm").querySelector("button").textContent = "Update Entry";
}

// =====================
// Form submit
// =====================
document.getElementById("timesheetForm").addEventListener("submit", e => {
  e.preventDefault();

  const date = document.getElementById("dateWorked").value;
  const branch = document.getElementById("branch").value;
  const timeIn = document.getElementById("timeIn").value;
  const timeOut = document.getElementById("timeOut").value;

  const total = calculateTotalTime(timeIn, timeOut);
  const pay = calculateEarnings(total.decimal);

  const entry = {
    date,
    day: getDayWorked(date),
    branch,
    timeIn,
    timeOut,
    hours: total.text,
    gross: pay.gross.toFixed(2),
    net: pay.net.toFixed(2),
    cpf: pay.cpf.toFixed(2)
  };

  if (editIndex === null) {
    // Add new entry
    entries.push(entry);
  } else {
    // Update existing entry
    entries[editIndex] = entry;
    editIndex = null;
    document.getElementById("timesheetForm").querySelector("button").textContent = "Add Entry";
  }

  saveEntries();
  renderEntries();
  e.target.reset();
});

// =====================
// Clear all entries
// =====================
document.getElementById("clearAll").addEventListener("click", () => {
  if (confirm("Are you sure you want to delete all entries?")) {
    entries = [];
    saveEntries();
    renderEntries();
  }
});

// =====================
// Register Service Worker (PWA)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./sw.js")
    .then(() => console.log("Service Worker registered"))
    .catch(err => console.log("Service Worker failed:", err));
}

// =====================
// Initial render
// =====================
renderEntries();
