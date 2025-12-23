// =====================
// Constants
// =====================
const HOURLY_RATE = 11;
const CPF_DEDUCTION = 0.20; // Employee deduction
const CPF_EMPLOYER = 0.37;   // Employer CPF

let editIndex = null;

// =====================
// Load saved entries
// =====================
let entries = JSON.parse(localStorage.getItem("timesheetEntries")) || [];
let notes = JSON.parse(localStorage.getItem("notesEntries")) || [];

// =====================
// Helpers
// =====================
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2,'0');
  const month = date.toLocaleString('en-US',{month:'short'});
  const year = date.getFullYear();
  const weekday = date.toLocaleDateString('en-US',{weekday:'long'});
  return { display:`${day} ${month} ${year}`, day:weekday };
}

function timeToMinutes(timeStr) {
  const [h,m]=timeStr.split(":").map(Number);
  return h*60+m;
}

function calculateTotalTime(timeIn,timeOut) {
  const diff=timeToMinutes(timeOut)-timeToMinutes(timeIn);
  const hours=Math.floor(diff/60);
  const minutes=diff%60;
  return { text:`${hours}hrs ${minutes}mins`, decimal:hours+minutes/60 };
}

function calculateEarnings(decimalHours){
  const gross=decimalHours*HOURLY_RATE;
  return { gross, net:gross*(1-CPF_DEDUCTION), cpf:gross*CPF_EMPLOYER };
}

// =====================
// DASHBOARD
// =====================
function updateDashboard(entriesToUse=entries){
  let totalHours=0,totalGross=0,totalNet=0,totalCPF=0;
  entriesToUse.forEach(e=>{
    const h=parseFloat(e.hours.split("hrs")[0])+parseFloat(e.hours.split(" ")[1].replace("mins",""))/60;
    totalHours+=h;
    totalGross+=parseFloat(e.gross);
    totalNet+=parseFloat(e.net);
    totalCPF+=parseFloat(e.cpf);
  });
  document.getElementById("totalHours").textContent=totalHours.toFixed(2);
  document.getElementById("totalGross").textContent=totalGross.toFixed(2);
  document.getElementById("totalNet").textContent=totalNet.toFixed(2);
  document.getElementById("totalCPF").textContent=totalCPF.toFixed(2);
}

// =====================
// Render Entries
// =====================
function renderEntries(){
  const container=document.getElementById("entries");
  container.innerHTML="";
  if(entries.length===0){
    container.innerHTML="<p>No entries yet.</p>";
    updateDashboard([]);
    return;
  }
  const months={};
  entries.forEach(e=>{
    if(!months[e.month]) months[e.month]=[];
    months[e.month].push(e);
  });

  for(let month in months){
    let monthHours=0,monthGross=0,monthNet=0,monthCPF=0;
    months[month].forEach(e=>{
      const h=parseFloat(e.hours.split("hrs")[0])+parseFloat(e.hours.split(" ")[1].replace("mins",""))/60;
      monthHours+=h;
      monthGross+=parseFloat(e.gross);
      monthNet+=parseFloat(e.net);
      monthCPF+=parseFloat(e.cpf);
    });

    container.innerHTML+=`<h3>${month} — Hours: ${monthHours.toFixed(2)}, Gross: $${monthGross.toFixed(2)}, Net: $${monthNet.toFixed(2)}, CPF: $${monthCPF.toFixed(2)}</h3>`;

    months[month].forEach(e=>{
      container.innerHTML+=`
      <div class="entry-card">
        <p><strong>${e.displayDate}</strong> (${e.day})</p>
        <p><strong>Branch:</strong> ${e.branch}</p>
        <p><strong>Time:</strong> ${e.timeIn} – ${e.timeOut}</p>
        <p><strong>Total Hours:</strong> ${e.hours}</p>
        <p><strong>Gross:</strong> $${e.gross} | <strong>Net:</strong> $${e.net} | <strong>CPF:</strong> $${e.cpf}</p>
        <div class="entry-buttons">
          <button onclick="editEntry(${entries.indexOf(e)})">Edit</button>
          <button onclick="deleteEntry(${entries.indexOf(e)})">Delete</button>
        </div>
      </div>`;
    });
  }
  updateDashboard(entries);
}

// =====================
// Render Notes
// =====================
function renderNotes(){
  const container=document.getElementById("notesList");
  container.innerHTML="";
  if(notes.length===0){
    container.innerHTML="<p>No notes yet.</p>";
    return;
  }
  notes.forEach((n,i)=>{
    container.innerHTML+=`
    <div class="note-card">
      <p>${n.content.replace(/\n/g,'<br>')}</p>
      <div class="note-buttons">
        <button onclick="editNote(${i})">Edit</button>
        <button onclick="deleteNote(${i})">Delete</button>
      </div>
    </div>`;
  });
}

// =====================
// Add/Edit/Delete Entries
// =====================
function deleteEntry(index){
  if(confirm("Delete this entry?")){
    entries.splice(index,1);
    localStorage.setItem("timesheetEntries",JSON.stringify(entries));
    renderEntries();
  }
}
function editEntry(index){
  const e=entries[index];
  document.getElementById("dateWorked").value=e.rawDate;
  document.getElementById("branch").value=e.branch;
  document.getElementById("timeIn").value=e.timeIn;
  document.getElementById("timeOut").value=e.timeOut;
  editIndex=index;
  document.getElementById("timesheetForm").querySelector("button").textContent="Update Entry";
}

// =====================
// Add/Edit/Delete Notes
// =====================
function deleteNote(index){
  if(confirm("Delete this note?")){
    notes.splice(index,1);
    localStorage.setItem("notesEntries",JSON.stringify(notes));
    renderNotes();
  }
}
function editNote(index){
  const n=notes[index];
  document.getElementById("noteContent").value=n.content;
  editNoteIndex=index;
  document.getElementById("noteForm").querySelector("button").textContent="Update Note";
}

// =====================
// Event Listeners
// =====================
document.getElementById("timesheetForm").addEventListener("submit",e=>{
  e.preventDefault();
  const date=document.getElementById("dateWorked").value;
  const branch=document.getElementById("branch").value;
  const timeIn=document.getElementById("timeIn").value;
  const timeOut=document.getElementById("timeOut").value;
  const total=calculateTotalTime(timeIn,timeOut);
  const pay=calculateEarnings(total.decimal);
  const formatted=formatDate(date);
  const entry={
    rawDate: date,
    displayDate: formatted.display,
    day: formatted.day,
    month: new Date(date).toLocaleDateString("en-US",{month:"long",year:"numeric"}),
    branch,
    timeIn,
    timeOut,
    hours: total.text,
    gross: pay.gross.toFixed(2),
    net: pay.net.toFixed(2),
    cpf: pay.cpf.toFixed(2)
  };
  if(editIndex===null){
    entries.push(entry);
  }else{
    entries[editIndex]=entry;
    editIndex=null;
    document.getElementById("timesheetForm").querySelector("button").textContent="Add Entry";
  }
  localStorage.setItem("timesheetEntries",JSON.stringify(entries));
  renderEntries();
  e.target.reset();
});

document.getElementById("noteForm").addEventListener("submit",e=>{
  e.preventDefault();
  const content=document.getElementById("noteContent").value;
  if(window.editNoteIndex!=null){
    notes[editNoteIndex].content=content;
    editNoteIndex=null;
    document.getElementById("noteForm").querySelector("button").textContent="Save Note";
  }else{
    notes.push({content});
  }
  localStorage.setItem("notesEntries",JSON.stringify(notes));
  renderNotes();
  e.target.reset();
});

document.getElementById("clearAll").addEventListener("click",()=>{
  if(confirm("Delete all entries?")){
    entries=[];
    localStorage.setItem("timesheetEntries",JSON.stringify(entries));
    renderEntries();
  }
});

// =====================
// Tab Switching
// =====================
const tabTimesheet=document.getElementById("tabTimesheet");
const tabNotes=document.getElementById("tabNotes");
const timesheetSection=document.getElementById("timesheetSection");
const notesSection=document.getElementById("notesSection");

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
// Auto-resize textarea
// =====================
document.querySelectorAll(".auto-resize").forEach(area=>{
  area.addEventListener("input",()=>{area.style.height="auto";area.style.height=area.scrollHeight+"px";});
});

// =====================
// Floating buttons & modals
// =====================
const fab=document.getElementById("fab");
const fabNotes=document.getElementById("fabNotes");
const entryModal=document.getElementById("entryModal");
const noteModal=document.getElementById("noteModal");
document.querySelectorAll(".modal .close").forEach(el=>el.addEventListener("click",()=>el.parentElement.parentElement.style.display="none"));

fab.addEventListener("click",()=>{entryModal.style.display="block";});
fabNotes.addEventListener("click",()=>{noteModal.style.display="block";});

let editNoteIndex=null;

// =====================
// Initial render
// =====================
renderEntries();
renderNotes();
