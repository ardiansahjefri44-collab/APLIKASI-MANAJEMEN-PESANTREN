// ==== DATA SHEETS (sheets JS) ====
let santriSheet = []; // data santri
let alumniSheet = []; // santri alumni
let userSheet = [
  {id:1, username:"admin", password:"admin123", role:"Admin", status:"Aktif"},
  {id:2, username:"guru", password:"guru123", role:"Guru", status:"Aktif"},
  {id:3, username:"pengurus", password:"pengurus123", role:"Pengurus", status:"Aktif"},
];
let keuanganSheet = [];
let pelanggaranSheet = [];

// ==== USER SESSION ====
let currentUser = {username:"admin", role:"Admin"};

// ==== DASHBOARD ====
function updateDashboard() {
  const totalLaki = santriSheet.filter(s => s.gender === "L").length;
  const totalPerempuan = santriSheet.filter(s => s.gender === "P").length;
  // tampilkan chart gender
  document.getElementById("chartGender").innerHTML = `
    Laki-laki: ${totalLaki} | Perempuan: ${totalPerempuan} | Total: ${totalLaki+totalPerempuan}
  `;
  // bisa tambah grafik chart.js jika mau
}

// ==== TABEL SANTRI ====
function renderSantriTable() {
  const table = document.getElementById("santriTableBody");
  table.innerHTML = "";
  santriSheet.forEach((s,index)=>{
    table.innerHTML += `
      <tr>
        <td><input type="checkbox" class="santriCheckbox" data-id="${s.id}"></td>
        <td>${s.nama}</td>
        <td>${s.gender}</td>
        <td>${s.asrama}</td>
        <td>${s.kelas}</td>
        <td>
          <button onclick="editSantri(${s.id})">Edit</button>
        </td>
      </tr>
    `;
  });
}

// ==== EDIT SANTRI ====
function editSantri(id){
  const santri = santriSheet.find(s=>s.id===id);
  if(!santri) return alert("Santri tidak ditemukan");
  const namaBaru = prompt("Nama:", santri.nama);
  if(namaBaru) santri.nama = namaBaru;
  renderSantriTable();
  updateDashboard();
}

// ==== BULK ACTION ====
function bulkAction(action){
  const selectedIds = Array.from(document.querySelectorAll(".santriCheckbox:checked"))
    .map(cb=>parseInt(cb.dataset.id));
  if(selectedIds.length===0) return alert("Pilih minimal 1 santri");
  
  selectedIds.forEach(id=>{
    const s = santriSheet.find(s=>s.id===id);
    if(!s) return;
    switch(action){
      case "NaikKelas":
        // misal tambah 1 kelas
        s.kelas = parseInt(s.kelas)+1;
        break;
      case "Bertugas":
        s.statusBertugas = true;
        break;
      case "Khidmah":
        s.statusKhidmah = true;
        break;
      case "Alumni":
        // pindah ke alumni
        alumniSheet.push({...s, tanggalAlumni:new Date().toLocaleDateString()});
        santriSheet = santriSheet.filter(x=>x.id!==id);
        break;
      case "Export":
        exportSantri(selectedIds);
        break;
    }
  });
  renderSantriTable();
  updateDashboard();
}

// ==== EXPORT SANTRI ====
function exportSantri(ids){
  const data = santriSheet.filter(s=>ids.includes(s.id));
  const csv = [
    Object.keys(data[0]).join(","),
    ...data.map(s=>Object.values(s).join(","))
  ].join("\n");
  downloadCSV(csv,"santri_export.csv");
}

function downloadCSV(content, filename){
  const blob = new Blob([content],{type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url;
  a.download=filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ==== RENDER ALUMNI ====
function renderAlumni(){
  const table = document.getElementById("alumniTableBody");
  table.innerHTML = "";
  alumniSheet.forEach(a=>{
    table.innerHTML += `
      <tr>
        <td>${a.nama}</td>
        <td>${a.gender}</td>
        <td>${a.asrama}</td>
        <td>${a.kelas}</td>
        <td>${a.tanggalAlumni}</td>
      </tr>
    `;
  });
}

// ==== USER MANAGEMENT (Admin) ====
function renderUsers(){
  if(currentUser.role!=="Admin") return;
  const table = document.getElementById("userTableBody");
  table.innerHTML = "";
  userSheet.forEach(u=>{
    table.innerHTML += `
      <tr>
        <td>${u.username}</td>
        <td>${u.role}</td>
        <td>${u.status}</td>
      </tr>
    `;
  });
}

// ==== KEUANGAN ====
function renderKeuangan(){
  const table = document.getElementById("keuanganTableBody");
  table.innerHTML = "";
  keuanganSheet.forEach(k=>{
    table.innerHTML += `
      <tr>
        <td>${k.tanggal}</td>
        <td>${k.jenis}</td>
        <td>${k.kategori}</td>
        <td>${k.jumlah}</td>
        <td>${k.keterangan}</td>
        <td>${k.inputBy}</td>
      </tr>
    `;
  });
}

// ==== PELANGGARAN ====
function renderPelanggaran(){
  const table = document.getElementById("pelanggaranTableBody");
  table.innerHTML = "";
  pelanggaranSheet.forEach(p=>{
    table.innerHTML += `
      <tr>
        <td>${p.tanggal}</td>
        <td>${p.nama}</td>
        <td>${p.pelanggaran}</td>
        <td>${p.status}</td>
        <td>${p.inputBy}</td>
      </tr>
    `;
  });
}

// ==== INIT ====
function initApp(){
  updateDashboard();
  renderSantriTable();
  renderAlumni();
  renderUsers();
  renderKeuangan();
  renderPelanggaran();
}
window.onload = initApp;
