// =====================
// Toast Notification
// =====================
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// =====================
// Dark Mode Management
// =====================
const darkModeToggle = document.getElementById("toggleDarkMode");
const isDarkMode = localStorage.getItem("darkMode") === "true";
if (isDarkMode) document.body.classList.add("dark-mode");

darkModeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
});

// =====================
// Settings Management
// =====================
const SETTINGS_KEY = "timesheetSettings";

const defaultSettings = {
  hourlyRate: 11,
  employeeCpf: 20,
  employerCpf: 37,
  branches: ["Buangkok", "Ang Mo Kio", "Fernvale"]
};

let savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
let appSettings = { ...defaultSettings, ...savedSettings };

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  appSettings = settings;
  populateBranchDropdown();
}

function populateBranchDropdown() {
  const branchSelect = document.getElementById("branch");
  branchSelect.innerHTML = '<option value="" disabled selected hidden></option>';
  appSettings.branches.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b.trim();
    opt.textContent = b.trim();
    branchSelect.appendChild(opt);
  });
}

// =====================
// Global State & Data
// =====================
let editIndex = null;
const STORAGE_KEY = "timesheetEntries";
let entries = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

// =====================
// CPF & Earnings Logic (Low-Wage Rules using Block Pay)
// =====================
function recalculateAllMonths() {
  const months = [...new Set(entries.map(e => e.month))];
  
  months.forEach(month => {
    const monthEntries = entries.filter(e => e.month === month);
    const totalMonthlyGross = monthEntries.reduce((sum, e) => sum + parseFloat(e.gross), 0);

    let applyEmployeeCpf = false;
    let applyEmployerCpf = false;

    // CPF Contribution Rules for Low Wages
    if (totalMonthlyGross > 50 && totalMonthlyGross <= 500) {
      applyEmployerCpf = true; // Only employer's share is payable
    } else if (totalMonthlyGross > 500) {
      applyEmployeeCpf = true; // Both shares are mandatory
      applyEmployerCpf = true;
    }

    monthEntries.forEach(e => {
      const grossNum = parseFloat(e.gross);
      const empDeduction = applyEmployeeCpf ? grossNum * (appSettings.employeeCpf / 100) : 0;
      const emprContrib = applyEmployerCpf ? grossNum * (appSettings.employerCpf / 100) : 0;

      e.net = (grossNum - empDeduction).toFixed(2);
      e.cpf = emprContrib.toFixed(2);
    });
  });
}

// Initial calculation and sort on load (ascending date order so earlier dates appear on top within months)
recalculateAllMonths();
entries.sort((a, b) => {
  if (a.rawDate !== b.rawDate) return a.rawDate.localeCompare(b.rawDate);
  return a.timeIn.localeCompare(b.timeIn);
});

// =====================
// Helper Functions
// =====================
function formatDate(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date)) return { display: "Invalid Date", day: "" };
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  return { display: `${day} ${month} ${year}`, day: weekday };
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

// Exact time for display and total hour tracking
function calculateExactTime(timeIn, timeOut) {
  const diff = timeToMinutes(timeOut) - timeToMinutes(timeIn);
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  return { 
    text: `${hours}hrs ${minutes}mins`, 
    decimal: hours + minutes / 60 
  };
}

// 15-minute block calculation strictly for pay calculation
function calculateBlockDecimal(timeIn, timeOut) {
  const diff = timeToMinutes(timeOut) - timeToMinutes(timeIn);
  const blockMinutes = Math.floor(diff / 15) * 15;
  const hours = Math.floor(blockMinutes / 60);
  const minutes = blockMinutes % 60;
  return hours + minutes / 60;
}

function formatHours(decimalHours) {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours}hrs ${minutes}mins`;
}

// =====================
// UI Rendering
// =====================
function populateMonthFilter() {
  const filter = document.getElementById("monthFilter");
  const currentValue = filter.value; 
  const monthsArr = [...new Set(entries.map(e => e.month))];
  
  // Sort months descending using rawDate comparison (most recent months on top)
  monthsArr.sort((a, b) => {
    const dateA = entries.find(e => e.month === a)?.rawDate || "";
    const dateB = entries.find(e => e.month === b)?.rawDate || "";
    return dateB.localeCompare(dateA);
  });
  
  filter.innerHTML = '<option value="all">All Months</option>';
  monthsArr.forEach(month => {
    const option = document.createElement("option");
    option.value = month;
    option.textContent = month;
    filter.appendChild(option);
  });
  if (currentValue && monthsArr.includes(currentValue)) filter.value = currentValue;
}

function updateDashboard(entriesToUse = entries) {
  let totalHours = 0, totalGross = 0, totalNet = 0, totalCPF = 0;
  entriesToUse.forEach(e => {
    totalHours += parseFloat(e.decimalHours);
    totalGross += parseFloat(e.gross);
    totalNet += parseFloat(e.net);
    totalCPF += parseFloat(e.cpf);
  });
  document.getElementById("totalHours").textContent = formatHours(totalHours);
  document.getElementById("totalGross").textContent = totalGross.toFixed(2);
  document.getElementById("totalNet").textContent = totalNet.toFixed(2);
  document.getElementById("totalCPF").textContent = totalCPF.toFixed(2);
}

function renderEntries(filterMonth = "all", searchQuery = "") {
  const container = document.getElementById("entries");
  container.innerHTML = "";
  let filteredEntries = entries;

  if (filterMonth !== "all") filteredEntries = filteredEntries.filter(e => e.month === filterMonth);
  if (searchQuery) {
    const lowerQuery = searchQuery.toLowerCase();
    filteredEntries = filteredEntries.filter(e => 
      e.branch.toLowerCase().includes(lowerQuery) ||
      e.displayDate.toLowerCase().includes(lowerQuery) ||
      e.day.toLowerCase().includes(lowerQuery) ||
      e.timeIn.includes(lowerQuery) || e.timeOut.includes(lowerQuery)
    );
  }

  if (filteredEntries.length === 0) {
    container.innerHTML = "<p>No entries found.</p>";
    updateDashboard(filteredEntries);
    return;
  }

  const months = {};
  filteredEntries.forEach(e => {
    if (!months[e.month]) months[e.month] = [];
    months[e.month].push(e);
  });

  const sortedMonths = Object.keys(months).sort((a, b) => {
    const dateA = months[a][0]?.rawDate || "";
    const dateB = months[b][0]?.rawDate || "";
    return dateB.localeCompare(dateA);
  });

  sortedMonths.forEach(month => {
    let monthHours = 0, monthGross = 0, monthNet = 0, monthCPF = 0;
    months[month].forEach(e => {
      monthHours += parseFloat(e.decimalHours);
      monthGross += parseFloat(e.gross);
      monthNet += parseFloat(e.net);
      monthCPF += parseFloat(e.cpf);
    });

    const monthCard = document.createElement("div");
    monthCard.className = "month-card";
    monthCard.innerHTML = `
      <div class="month-header" style="font-size: 0.75rem; flex-wrap: wrap;">
        ${month} — Hrs: ${formatHours(monthHours)} | Gross: $${monthGross.toFixed(2)} | Net: $${monthNet.toFixed(2)} | CPF: $${monthCPF.toFixed(2)}
      </div>
      <div class="entry-container"></div>
    `;

    const entryContainer = monthCard.querySelector(".entry-container");
    months[month].forEach((e) => {
      const entryCard = document.createElement("div");
      entryCard.className = "entry-card";
      entryCard.innerHTML = `
        <p><strong>${e.displayDate}</strong> (${e.day})</p>
        <p><strong>Branch:</strong> ${e.branch}</p>
        <p><strong>Time:</strong> ${e.timeIn} – ${e.timeOut}</p>
        <p><strong>Total Hours:</strong> ${e.hours}</p>
        <p><strong>Gross:</strong> $${e.gross} | <strong>Net:</strong> $${e.net} | <strong>CPF:</strong> $${e.cpf}</p>
        <div class="entry-buttons">
          <button onclick="editEntry(${entries.indexOf(e)})">Edit</button>
          <button onclick="deleteEntry(${entries.indexOf(e)})">Delete</button>
        </div>
      `;
      entryContainer.appendChild(entryCard);
    });

    monthCard.querySelector(".month-header").addEventListener("click", () => {
      entryContainer.classList.toggle("show");
    });
    container.appendChild(monthCard);
  });
  updateDashboard(filteredEntries);
}

// =====================
// Edit / Delete / Save
// =====================
function deleteEntry(index) {
  if (confirm("Are you sure you want to delete this entry?")) {
    entries.splice(index, 1);
    recalculateAllMonths();
    saveEntries(); 
    populateMonthFilter();
    renderEntries(document.getElementById("monthFilter").value, document.getElementById("searchInput").value);
    showToast("Entry deleted!");
  }
}

function editEntry(index) {
  const entry = entries[index];
  document.getElementById("dateWorked").value = entry.rawDate; 
  document.getElementById("branch").value = entry.branch;
  document.getElementById("timeIn").value = entry.timeIn;
  document.getElementById("timeOut").value = entry.timeOut;
  editIndex = index;
  document.getElementById("modalTitle").textContent = "Edit Entry";
  document.getElementById("entryModal").classList.add("show");
}

function saveEntries() {
    recalculateAllMonths();
    entries.sort((a, b) => {
      if (a.rawDate !== b.rawDate) return a.rawDate.localeCompare(b.rawDate);
      return a.timeIn.localeCompare(b.timeIn);
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
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

  const isDuplicate = entries.some((entry, index) => {
    if (editIndex !== null && index === editIndex) return false;
    return entry.rawDate === date && entry.timeIn === timeIn && entry.timeOut === timeOut;
  });

  if (isDuplicate) {
    alert("A shift with this exact date and time already exists!");
    return;
  }

  const exactTotal = calculateExactTime(timeIn, timeOut);
  const blockDecimal = calculateBlockDecimal(timeIn, timeOut);
  const gross = blockDecimal * appSettings.hourlyRate;
  const formatted = formatDate(date);

  const entry = {
    rawDate: date, 
    displayDate: formatted.display, 
    day: formatted.day,
    month: new Date(date).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    branch, 
    timeIn, 
    timeOut, 
    hours: exactTotal.text, 
    decimalHours: exactTotal.decimal, 
    gross: gross.toFixed(2), 
    net: gross.toFixed(2), 
    cpf: "0.00"
  };

  if (editIndex === null) {
    entries.push(entry);
    showToast("Entry added successfully!");
  } else {
    entries[editIndex] = entry; 
    editIndex = null;
    document.getElementById("modalTitle").textContent = "Add Entry";
    showToast("Entry updated successfully!");
  }

  saveEntries(); 
  populateMonthFilter();
  renderEntries(document.getElementById("monthFilter").value, document.getElementById("searchInput").value);
  document.getElementById("entryModal").classList.remove("show");
  e.target.reset();
});

document.getElementById("clearAll").addEventListener("click", () => {
  if (confirm("Are you sure you want to delete all entries?")) {
    entries = []; 
    saveEntries(); 
    populateMonthFilter(); 
    renderEntries();
  }
});

// =====================
// Filters & Search Change
// =====================
document.getElementById("monthFilter").addEventListener("change", (e) => {
  renderEntries(e.target.value, document.getElementById("searchInput").value);
});

document.getElementById("searchInput").addEventListener("input", (e) => {
  renderEntries(document.getElementById("monthFilter").value, e.target.value);
});

// =====================
// Modal Controls
// =====================
const entryModal = document.getElementById("entryModal");
const settingsModal = document.getElementById("settingsModal");
const statsModal = document.getElementById("statsModal");

document.getElementById("fab").addEventListener("click", () => entryModal.classList.add("show"));
document.getElementById("closeEntry").addEventListener("click", () => {
  entryModal.classList.remove("show"); 
  editIndex = null;
  document.getElementById("timesheetForm").reset();
});

document.getElementById("openSettings").addEventListener("click", () => {
  document.getElementById("setHourlyRate").value = appSettings.hourlyRate;
  document.getElementById("setEmployeeCpf").value = appSettings.employeeCpf;
  document.getElementById("setEmployerCpf").value = appSettings.employerCpf;
  document.getElementById("setBranches").value = appSettings.branches.join(", ");
  settingsModal.classList.add("show");
});
document.getElementById("closeSettings").addEventListener("click", () => settingsModal.classList.remove("show"));

document.getElementById("settingsForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const branchesInput = document.getElementById("setBranches").value;
  saveSettings({
    hourlyRate: parseFloat(document.getElementById("setHourlyRate").value),
    employeeCpf: parseFloat(document.getElementById("setEmployeeCpf").value),
    employerCpf: parseFloat(document.getElementById("setEmployerCpf").value),
    branches: branchesInput.split(",").map(b => b.trim()).filter(b => b !== "")
  });
  settingsModal.classList.remove("show");
  renderEntries(document.getElementById("monthFilter").value, document.getElementById("searchInput").value); 
});

window.addEventListener("click", (e) => {
  if (e.target === entryModal) entryModal.classList.remove("show");
  if (e.target === settingsModal) settingsModal.classList.remove("show");
  if (e.target === statsModal) statsModal.classList.remove("show");
});

// =====================
// Statistics Logic
// =====================
document.getElementById("openStats").addEventListener("click", () => {
  generateStats(); 
  statsModal.classList.add("show");
});
document.getElementById("closeStats").addEventListener("click", () => statsModal.classList.remove("show"));

function generateStats() {
  const container = document.getElementById("statsContainer");
  if (entries.length === 0) return container.innerHTML = "<p>No data to analyze.</p>";

  const branchTotals = {}; 
  let totalDecimalHours = 0; 
  const monthEarnings = {};
  
  entries.forEach(e => {
    const hrs = parseFloat(e.decimalHours);
    totalDecimalHours += hrs;
    branchTotals[e.branch] = (branchTotals[e.branch] || 0) + hrs;
    monthEarnings[e.month] = (monthEarnings[e.month] || 0) + parseFloat(e.gross);
  });

  let highestMonth = ""; 
  let highestGross = 0;
  for (const [month, gross] of Object.entries(monthEarnings)) {
    if (gross > highestGross) { 
      highestGross = gross; 
      highestMonth = month; 
    }
  }

  let html = `
    <div class="stat-box">
      <h3>Average Hours / Shift</h3>
      <p>${formatHours(totalDecimalHours / entries.length)}</p>
    </div>
    <div class="stat-box">
      <h3>Highest Earning Month</h3>
      <p>${highestMonth} ($${highestGross.toFixed(2)})</p>
    </div>
    <h3>Hours by Branch</h3><ul class="stat-list">
  `;
  for (const [branch, hrs] of Object.entries(branchTotals)) html += `<li><strong>${branch}:</strong> ${formatHours(hrs)}</li>`;
  html += `</ul><h3>Monthly Earnings Graph</h3><div class="chart-container">`;
  for (const [month, gross] of Object.entries(monthEarnings)) {
    html += `
      <div class="chart-bar-wrap">
        <div class="chart-bar" style="height: ${(gross / highestGross) * 100}%;" title="$${gross.toFixed(2)}"></div>
        <div class="chart-label">${month.split(" ")[0]}</div>
      </div>`;
  }
  container.innerHTML = html + `</div>`;
}

// =====================
// Backup & Export Logic
// =====================
function triggerJSONBackup(isAuto = false) {
    const data = JSON.stringify(entries, null, 2);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    a.download = `Timesheet-${isAuto ? "AutoBackup-" : "Backup-"}${new Date().toISOString().split("T")[0]}.json`;
    a.click();
}

document.getElementById("exportData").addEventListener("click", () => triggerJSONBackup(false));
document.getElementById("importData").addEventListener("click", () => document.getElementById("importFile").click());
document.getElementById("importFile").addEventListener("change", (e) => {
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const imported = JSON.parse(event.target.result);
            if (!Array.isArray(imported)) return alert("Invalid backup file.");
            if (confirm("Replace all current entries with this backup?")) {
                entries = imported; 
                saveEntries(); 
                populateMonthFilter(); 
                renderEntries(); 
                alert("Backup restored!");
            }
        } catch { alert("Unable to read backup."); }
    };
    if (e.target.files[0]) reader.readAsText(e.target.files[0]);
});

document.getElementById("exportCSV").addEventListener("click", () => {
  if (entries.length === 0) return alert("No entries to export.");
  let csvContent = "data:text/csv;charset=utf-8,\nDate,Day,Month,Branch,Time In,Time Out,Total Hours,Gross ($),Net ($),CPF ($)\n";
  entries.forEach(e => csvContent += [e.displayDate, e.day, e.month, `"${e.branch}"`, e.timeIn, e.timeOut, e.decimalHours, e.gross, e.net, e.cpf].join(",") + "\n");
  const a = document.createElement("a");
  a.href = encodeURI(csvContent);
  a.download = `Timesheet_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
});

// =====================
// Automatic Daily Backup
// =====================
function checkAutoBackup() {
  if (entries.length === 0) return;
  const today = new Date().toISOString().split("T")[0];
  if (localStorage.getItem("lastBackupDate") !== today) {
    triggerJSONBackup(true);
    localStorage.setItem("lastBackupDate", today);
  }
}

// =====================
// Initial render
// =====================
populateBranchDropdown();
populateMonthFilter();
renderEntries();
checkAutoBackup();
