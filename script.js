// =====================
// Constants
// =====================
const HOURLY_RATE = 11;
const CPF_DEDUCTION = 0.20;
const CPF_EMPLOYER = 0.37;

// =====================
// State
// =====================
let entries = JSON.parse(localStorage.getItem("timesheetEntries")) || [];
let notes = JSON.parse(localStorage.getItem("timesheetNotes")) || [];
let editIndex = null;
let editNoteIndex = null;

// =====================
// Format helpers
// =====================
function formatDate(dateStr){
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2,"0");
  const month = date.toLocaleString("en-US",{month:"short"});
  const year = date.getFullYear();
  const weekday = date.toLocaleDateString("en-US",{weekday:"long"});
  return {display:`${day} ${month} ${year}`, day:weekday};
}

function timeToMinutes(timeStr){
  const [h,m] = timeStr.split(":").map(Number);
  return h*60 + m;
}

function calculateTotalTime(timeIn,timeOut){
  const diff = timeToMinutes(timeOut) - timeToMinutes(timeIn);
  const hours = Math.floor(diff/60);
  const minutes = diff%60;
  return {text:`${hours}hrs ${minutes}mins`, decimal: hours + minutes/60};
}

function calculateEarnings(decimalHours){
  const gross = decimalHours * HOURLY_RATE;
  return {gross, net: gross - gross*CPF_DEDUCTION, cpf: gross*CPF_EMPLOYER};
}

// =====================
// STORAGE
// =====================
function saveEntries(){ localStorage.setItem("timesheetEntries", JSON.stringify(entries)); }
function saveNotes(){ localStorage.setItem("timesheetNotes", JSON.stringify(notes)); }

// =====================
// RENDER TIMESHEET
// =====================
function updateDashboard(){
  let totalHours=0,totalGross=0,totalNet=0,totalCPF=0;
  entries.forEach(e=>{
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

function renderEntries(){
  const container = document.getElementById("entries");
  container.innerHTML="";
  if(entries.length===0){ container.innerHTML="<p>No entries yet.</p>"; updateDashboard(); return; }
  entries.forEach((e,i)=>{
    container.innerHTML+=`
      <div class="entry-card">
        <p><strong>${e.displayDate}</strong> (${e.day})</p>
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
  updateDashboard();
}

// =====================
// TIMESHEET MODAL
// =====================
const fab = document.getElementById("fab");
const entryModal = document.getElementById("entryModal");
const modalClose = entryModal.querySelector(".close");
fab.addEventListener("click",()=>{entryModal.classList.add("show");});
modalClose.addEventListener("click",()=>{entryModal.classList.remove("show"); editIndex=null; document.getElementById("timesheetForm").reset();});
window.addEventListener("click",e=>{if(e.target===entryModal) entryModal.classList.remove("show"); editIndex=null; document.getElementById("timesheetForm").reset();});

document.getElementById("timesheetForm").addEventListener("submit",e=>{
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
    branch, timeIn, timeOut,
    hours: total.text,
    gross: pay.gross.toFixed(2),
    net: pay.net.toFixed(2),
    cpf: pay.cpf.toFixed(2)
  };

  if(editIndex===null){ entries.push(entry); }
  else{ entries[editIndex]=entry; editIndex=null; }

  saveEntries();
  renderEntries();
  entryModal.classList.remove("show");
  e.target.reset();
});

function deleteEntry(i){ if(confirm("Delete this entry?")){ entries.splice(i,1); saveEntries(); renderEntries(); } }
function editEntry(i){
  const e = entries[i];
  document.getElementById("dateWorked").value=e.rawDate;
  document.getElementById("branch").value=e.branch;
  document.getElementById("timeIn").value=e.timeIn;
  document.getElementById("timeOut").value=e.timeOut;
  editIndex=i;
  entryModal.classList.add("show");
}

// =====================
// CLEAR ALL
// =====================
document.getElementById("clearAll").addEventListener("click",()=>{if(confirm("Delete all entries?")){entries=[]; saveEntries(); renderEntries();}});

// =====================
// NOTES MODAL
// =====================
const fabNotes = document.getElementById("fabNotes");
const noteModal = document.getElementById("noteModal");
const noteClose = noteModal.querySelector(".close");

fabNotes.addEventListener("click",()=>{noteModal.classList.add("show");});
noteClose.addEventListener("click",()=>{noteModal.classList.remove("show"); editNoteIndex=null; document.getElementById("noteForm").reset();});
window.addEventListener("click",(e)=>{if(e.target===noteModal){noteModal.classList.remove("show"); editNoteIndex=null; document.getElementById("noteForm").reset();}});

document.getElementById("noteForm").addEventListener("submit",e=>{
  e.preventDefault();
  const content = document.getElementById("noteContent").value;
  const date = new Date().toISOString();
  const note = {content,date};
  if(editNoteIndex===null){ notes.push(note); }
  else{ notes[editNoteIndex]=note; editNoteIndex=null; }
  saveNotes();
  renderNotes();
  noteModal.classList.remove("show");
  e.target.reset();
});

function renderNotes(){
  const container = document.getElementById("notesList");
  container.innerHTML="";
  if(notes.length===0){ container.innerHTML="<p>No notes yet.</p>"; return; }
  notes.forEach((n,i)=>{
    container.innerHTML+=`
      <div class="note-card">
        <p>${n.content}</p>
        <div class="note-buttons">
          <button onclick="editNote(${i})">Edit</button>
          <button onclick="deleteNote(${i})">Delete</button>
        </div>
      </div>
    `;
  });
}

function editNote(i){
  const n = notes[i];
  document.getElementById("noteContent").value = n.content;
  editNoteIndex = i;
  noteModal.classList.add("show");
}

function deleteNote(i){ if(confirm("Delete this note?")){ notes.splice(i,1); saveNotes(); renderNotes(); }}

// =====================
// TAB NAVIGATION
// =====================
const tabTimesheet = document.getElementById("tabTimesheet");
const tabNotes = document.getElementById("tabNotes");
const timesheetSection = document.getElementById("timesheetSection");
const notesSection = document.getElementById("notesSection");

tabTimesheet.addEventListener("click",()=>{
  tabTimesheet.classList.add("active");
  tabNotes.classList.remove("active");
  timesheetSection.style.display="block";
  notesSection.style.display="none";
});

tabNotes.addEventListener("click",()=>{
  tabNotes.classList.add("active");
  tabTimesheet.classList.remove("active");
  notesSection.style.display="block";
  timesheetSection.style.display="none";
});

// =====================
// AUTO RESIZE TEXTAREA
// =====================
const autoResizeTextareas = document.querySelectorAll(".auto-resize");
autoResizeTextareas.forEach(textarea=>{
  textarea.addEventListener("input",()=>{
    textarea.style.height="auto";
    textarea.style.height=textarea.scrollHeight + "px";
  });
});

// =====================
// INITIAL RENDER
// =====================
renderEntries();
renderNotes();
