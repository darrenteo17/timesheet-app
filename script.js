// =====================
// Constants
// =====================
const HOURLY_RATE = 11;
const CPF_DEDUCTION = 0.20; // Employee deduction
const CPF_EMPLOYER = 0.37;   // Employer CPF

// =====================
// State
// =====================
let editIndex = null;
let editNoteIndex = null;
let entries = JSON.parse(localStorage.getItem("timesheetEntries")) || [];
let notes = JSON.parse(localStorage.getItem("notes")) || [];

// =====================
// Helpers
// =====================
function formatDate(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date)) return { display: "Unknown Date", day: "" };
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  return {
    display: `${day} ${month} ${year}`,
    day: weekday
  };
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function calculateTotalTime(timeIn, timeOut) {
  const diff = timeToMinutes(timeOut) - timeToMinutes(timeIn);
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  return { text: `${hours}hrs ${minutes}mins`, decimal: hours + minutes / 60 };
}

function calculateEarnings(decimalHours) {
  const gross = decimalHours * HOURLY_RATE;
  return { gross, net: gross - gross * CPF_DEDUCTION, cpf: gross * CPF_EMPLOYER };
}

function saveEntries() { localStorage.setItem("timesheetEntries", JSON.stringify(entries)); }
function saveNotes() { localStorage.setItem("notes", JSON.stringify(notes)); }

// =====================
// Render Dashboard
// =====================
function updateDashboard() {
  let totalHours = 0, totalGross = 0, totalNet = 0, totalCPF = 0;
  entries.forEach(e => {
    const h = parseFloat(e.hours.split("hrs")[0]) + parseFloat(e.hours.split(" ")[1].replace("mins",""))/60;
    totalHours += h;
    totalGross += parseFloat(e.gross);
    totalNet += parseFloat(e.net);
    totalCPF += parseFloat(e.cpf);
  });
  document.getElementById("totalHours").textContent = totalHours.toFixed(2);
  document.getElementById("totalGross").textContent = totalGross.toFixed(2);
  document.getElementById("totalNet").textContent = totalNet.toFixed(2);
  document.getElementById("totalCPF").textContent = totalCPF.toFixed(2);
}

// =====================
// Render Entries
// =====================
function renderEntries() {
  const container = document.getElementById("entries");
  container.innerHTML = "";

  if (entries.length === 0) {
    container.innerHTML = "<p>No timesheet entries yet.</p>";
    return;
  }

  entries.forEach((e, idx) => {
    const div = document.createElement("div");
    div.className = "entry-card";
    div.innerHTML = `
      <p><strong>${e.displayDate}</strong> (${e.day})</p>
      <p><strong>Branch:</strong> ${e.branch}</p>
      <p><strong>Time:</strong> ${e.timeIn} – ${e.timeOut}</p>
      <p><strong>Total Hours:</strong> ${e.hours}</p>
      <p><strong>Gross:</strong> $${e.gross} | <strong>Net:</strong> $${e.net} | <strong>CPF:</strong> $${e.cpf}</p>
      <div class="entry-buttons">
        <button onclick="editEntry(${idx})">Edit</button>
        <button onclick="deleteEntry(${idx})">Delete</button>
      </div>
    `;
    container.appendChild(div);
  });
}

// =====================
// Render Notes
// =====================
function renderNotes() {
  const container = document.getElementById("notes");
  container.innerHTML = "";

  if (notes.length === 0) {
    container.innerHTML = "<p>No notes yet.</p>";
    return;
  }

  notes.forEach((n, idx) => {
    const div = document.createElement("div");
    div.className = "note-card";
    div.innerHTML = `
      <p>${n.text.replace(/\n/g,"<br>")}</p>
      <div class="note-buttons">
        <button onclick="editNote(${idx})">Edit</button>
        <button onclick="deleteNote(${idx})">Delete</button>
      </div>
    `;
    container.appendChild(div);
  });
}

// =====================
// Edit / Delete Timesheet
// =====================
function editEntry(idx) {
  const e = entries[idx];
  document.getElementById("dateWorked").value = e.rawDate;
  document.getElementById("branch").value = e.branch;
  document.getElementById("timeIn").value = e.timeIn;
  document.getElementById("timeOut").value = e.timeOut;
  editIndex = idx;
  openModal("entry");
}

function deleteEntry(idx) {
  if (confirm("Delete this entry?")) {
    entries.splice(idx,1);
    saveEntries();
    updateDashboard();
    renderEntries();
  }
}

// =====================
// Edit / Delete Notes
// =====================
function editNote(idx) {
  const n = notes[idx];
  document.getElementById("noteText").value = n.text;
  editNoteIndex = idx;
  openModal("note");
}

function deleteNote(idx) {
  if (confirm("Delete this note?")) {
    notes.splice(idx,1);
    saveNotes();
    renderNotes();
  }
}

// =====================
// Modals
// =====================
function openModal(type) {
  document.getElementById(type+"Modal").style.display = "block";
}
function closeModal(type) {
  document.getElementById(type+"Modal").style.display = "none";
}

// =====================
// Event Listeners
// =====================

// Timesheet FAB
document.getElementById("addEntryBtn").addEventListener("click",()=>openModal("entry"));
document.getElementById("closeEntry").addEventListener("click",()=>closeModal("entry"));

// Notes FAB
document.getElementById("addNoteBtn").addEventListener("click",()=>openModal("note"));
document.getElementById("closeNote").addEventListener("click",()=>closeModal("note"));

// Timesheet Form
document.getElementById("timesheetForm").addEventListener("submit", e=>{
  e.preventDefault();
  const date = document.getElementById("dateWorked").value;
  const branch = document.getElementById("branch").value;
  const timeIn = document.getElementById("timeIn").value;
  const timeOut = document.getElementById("timeOut").value;

  const total = calculateTotalTime(timeIn,timeOut);
  const pay = calculateEarnings(total.decimal);
  const formatted = formatDate(date);

  const entry = {
    rawDate: date,
    displayDate: formatted.display,
    day: formatted.day,
    branch,
    timeIn,
    timeOut,
    hours: total.text,
    gross: pay.gross.toFixed(2),
    net: pay.net.toFixed(2),
    cpf: pay.cpf.toFixed(2)
  };

  if(editIndex!==null){
    entries[editIndex] = entry;
    editIndex=null;
  } else {
    entries.push(entry);
  }

  saveEntries();
  updateDashboard();
  renderEntries();
  closeModal("entry");
  e.target.reset();
});

// Notes Form
document.getElementById("noteForm").addEventListener("submit", e=>{
  e.preventDefault();
  const text = document.getElementById("noteText").value;
  if(editNoteIndex!==null){
    notes[editNoteIndex].text = text;
    editNoteIndex=null;
  } else {
    notes.push({ text });
  }
  saveNotes();
  renderNotes();
  closeModal("note");
  e.target.reset();
});

// Clear all timesheets
document.getElementById("clearAll").addEventListener("click",()=>{
  if(confirm("Delete all timesheet entries?")){
    entries=[];
    saveEntries();
    updateDashboard();
    renderEntries();
  }
});

// Bottom Navigation
document.getElementById("tabTimesheet").addEventListener("click",()=>{
  document.getElementById("entries").style.display = "block";
  document.getElementById("notes").style.display = "none";
  document.getElementById("tabTimesheet").classList.add("active");
  document.getElementById("tabNotes").classList.remove("active");
});

document.getElementById("tabNotes").addEventListener("click",()=>{
  document.getElementById("entries").style.display = "none";
  document.getElementById("notes").style.display = "block";
  document.getElementById("tabNotes").classList.add("active");
  document.getElementById("tabTimesheet").classList.remove("active");
});

// Close modal on outside click
window.addEventListener("click", e=>{
  if(e.target.classList.contains("modal")){
    e.target.style.display="none";
  }
});

// =====================
// Initial Render
// =====================
updateDashboard();
renderEntries();
renderNotes();
