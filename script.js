// =====================
// TIMESHEET APP
// =====================
const HOURLY_RATE = 11;
const CPF_DEDUCTION = 0.20;
const CPF_EMPLOYER = 0.37;
let editIndex = null;
let entries = JSON.parse(localStorage.getItem("timesheetEntries")) || [];

function formatDate(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date)) return { display: "Unknown Date", day: "" };
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

function calculateTotalTime(timeIn, timeOut) {
  const diff = timeToMinutes(timeOut) - timeToMinutes(timeIn);
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  return { text: `${hours}hrs ${minutes}mins`, decimal: hours + minutes / 60 };
}

function calculateEarnings(decimalHours) {
  const gross = decimalHours * HOURLY_RATE;
  return { gross, net: gross - gross*CPF_DEDUCTION, cpf: gross*CPF_EMPLOYER };
}

function saveEntries() {
  localStorage.setItem("timesheetEntries", JSON.stringify(entries));
}

function updateDashboard(entriesToUse = entries) {
  let totalHours = 0, totalGross = 0, totalNet = 0, totalCPF = 0;
  entriesToUse.forEach(e => {
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

function renderEntries() {
  const container = document.getElementById("entries");
  container.innerHTML = "";
  if (entries.length === 0) { updateDashboard(); return; }
  entries.forEach((e, idx) => {
    const card = document.createElement("div");
    card.className = "entry-card";
    card.innerHTML = `
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
    container.appendChild(card);
  });
  updateDashboard();
}

function deleteEntry(index) {
  if (confirm("Delete this entry?")) { entries.splice(index,1); saveEntries(); renderEntries(); }
}

function editEntry(index) {
  const e = entries[index];
  document.getElementById("dateWorked").value = e.rawDate;
  document.getElementById("branch").value = e.branch;
  document.getElementById("timeIn").value = e.timeIn;
  document.getElementById("timeOut").value = e.timeOut;
  editIndex = index;
  document.querySelector("#timesheetForm button").textContent = "Update Entry";
}

document.getElementById("timesheetForm").addEventListener("submit", e => {
  e.preventDefault();
  const date = document.getElementById("dateWorked").value;
  const branch = document.getElementById("branch").value;
  const timeIn = document.getElementById("timeIn").value;
  const timeOut = document.getElementById("timeOut").value;
  const total = calculateTotalTime(timeIn, timeOut);
  const pay = calculateEarnings(total.decimal);
  const formatted = formatDate(date);
  const entry = {
    rawDate: date,
    displayDate: formatted.display,
    day: formatted.day,
    branch, timeIn, timeOut,
    hours: total.text,
    gross: pay.gross.toFixed(2),
    net: pay.net.toFixed(2),
    cpf: pay.cpf.toFixed(2)
  };
  if (editIndex === null) entries.push(entry);
  else { entries[editIndex] = entry; editIndex = null; document.querySelector("#timesheetForm button").textContent = "Add Entry"; }
  saveEntries(); renderEntries(); e.target.reset();
});

document.getElementById("clearAll").addEventListener("click", () => {
  if (confirm("Clear all timesheet entries?")) { entries = []; saveEntries(); renderEntries(); }
});

// =====================
// NOTES APP
// =====================
let editNoteIndex = null;
let notes = JSON.parse(localStorage.getItem("notes")) || [];

function renderNotes() {
  const container = document.getElementById("notesContainer");
  container.innerHTML = "";
  if (notes.length === 0) { container.innerHTML="<p>No notes yet.</p>"; return; }
  notes.forEach((note, idx) => {
    const card = document.createElement("div");
    card.className = "note-card";
    card.innerHTML = `
      <h3>${note.title}</h3>
      <p>${note.content}</p>
      <div class="note-buttons">
        <button onclick="editNote(${idx})">Edit</button>
        <button onclick="deleteNote(${idx})">Delete</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function saveNotes() { localStorage.setItem("notes", JSON.stringify(notes)); }

document.getElementById("noteForm").addEventListener("submit", e => {
  e.preventDefault();
  const title = document.getElementById("noteTitle").value;
  const content = document.getElementById("noteContent").value;
  const note = { title, content };
  if (editNoteIndex === null) notes.push(note);
  else { notes[editNoteIndex] = note; editNoteIndex = null; document.getElementById("modalTitle").textContent="Add Note"; }
  saveNotes(); renderNotes(); closeNoteModal(); e.target.reset();
});

function deleteNote(index) { if(confirm("Delete this note?")) { notes.splice(index,1); saveNotes(); renderNotes(); } }

function editNote(index) {
  const note = notes[index];
  document.getElementById("noteTitle").value = note.title;
  document.getElementById("noteContent").value = note.content;
  editNoteIndex = index;
  document.getElementById("modalTitle").textContent="Edit Note";
  showNoteModal();
}

// =====================
// NOTES MODAL
// =====================
const fabNotes = document.getElementById("fabNotes");
const noteModal = document.getElementById("noteModal");
const noteClose = noteModal.querySelector(".close");
function showNoteModal(){ noteModal.classList.add("show"); }
function closeNoteModal(){ noteModal.classList.remove("show"); editNoteIndex=null; document.getElementById("modalTitle").textContent="Add Note"; document.getElementById("noteForm").reset(); }
fabNotes.addEventListener("click",showNoteModal);
noteClose.addEventListener("click",closeNoteModal);
window.addEventListener("click",(e)=>{if(e.target===noteModal) closeNoteModal();});

// =====================
// TAB NAVIGATION
// =====================
const tabTimesheet = document.getElementById("tabTimesheet");
const tabNotes = document.getElementById("tabNotes");
const timesheetSection = document.getElementById("timesheetSection");
const notesSection = document.getElementById("notesSection");

tabTimesheet.addEventListener("click",()=>{
  timesheetSection.style.display="block";
  notesSection.style.display="none";
  tabTimesheet.classList.add("active");
  tabNotes.classList.remove("active");
});

tabNotes.addEventListener("click",()=>{
  timesheetSection.style.display="none";
  notesSection.style.display="block";
  tabNotes.classList.add("active");
  tabTimesheet.classList.remove("active");
});

// =====================
// INITIAL RENDER
// =====================
renderEntries();
renderNotes();
