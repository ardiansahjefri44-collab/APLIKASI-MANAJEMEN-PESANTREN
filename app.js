// ================= CONFIG ===================
const GS_URL = "https://script.google.com/macros/s/AKfycbzYMZYGPeVr6975fYECwtfwmZNei1Duz7M-1GhTrh9zzsaECQS1mJTeDK9Aiuia8sABFg/exec";

const SHEETS = {
    santri: "santri",
    izin: "izin",
    users: "users",
    settings: "settings",
    asrama: "asrama"
};

let db = {
    santri: [],
    izin: [],
    users: [],
    settings: {},
    asrama: [],
    pendingSync: []
};

let currentUser = null;
let selectedIds = new Set();
let html5QrCode = null;

// ================== HELPERS =================
async function fetchGS(params) {
    const url = new URL(GS_URL);
    Object.keys(params).forEach(k => url.searchParams.append(k, params[k]));
    const res = await fetch(url);
    return res.json();
}

async function loadDB() {
    // Load semua sheets
    db.santri = await fetchGS({ sheet: SHEETS.santri, action: 'read' });
    db.izin = await fetchGS({ sheet: SHEETS.izin, action: 'read' });
    db.users = await fetchGS({ sheet: SHEETS.users, action: 'read' });
    db.settings = (await fetchGS({ sheet: SHEETS.settings, action: 'read' }))[0] || { pondok: "E-Santri", izinMode: "biasa" };
    db.asrama = (await fetchGS({ sheet: SHEETS.asrama, action: 'read' })).map(a => a.nama);
}

// ================== LOGIN ===================
function handleLogin() {
    const u = document.getElementById('login-user').value;
    const p = document.getElementById('login-pass').value;
    const user = db.users.find(x => x.user === u && x.pass === p);
    if(user) {
        if(user.status !== 'Aktif') return alert("Akun Anda dinonaktifkan!");
        sessionStorage.setItem('esantri_session', JSON.stringify(user));
        currentUser = user;
        loadApp();
    } else alert("Login gagal! Periksa username & password.");
}

// ================== APP INIT =================
async function initApp() {
    await loadDB();
    const session = sessionStorage.getItem('esantri_session');
    if(session) currentUser = JSON.parse(session);
    if(currentUser) loadApp();
    else document.getElementById('login-overlay').classList.remove('hidden');
}

// ================== LOAD UI =================
function loadApp() {
    document.getElementById('login-overlay').classList.add('hidden');
    document.getElementById('app-content').classList.remove('hidden');

    document.getElementById('user-display-name').innerText = currentUser.user;
    document.getElementById('user-display-role').innerText = currentUser.role;
    document.getElementById('display-pondok').innerText = db.settings.pondok;
    document.getElementById('login-pondok-name').innerText = db.settings.pondok;

    renderSidebar();
    renderAsramaList();
    initFilters();
    showPage('dashboard');
    renderStats();
}

// =============== SIDEBAR =================
function renderSidebar() {
    const nav = document.getElementById('sidebar-nav');
    const items = [
        { id: 'dashboard', icon: 'fa-th-large', label: 'Dashboard', roles: ['Admin', 'Guru', 'Pengurus'] },
        { id: 'santri', icon: 'fa-user-graduate', label: 'Data Santri', roles: ['Admin', 'Guru'] },
        { id: 'perizinan', icon: 'fa-id-badge', label: 'Perizinan', roles: ['Admin', 'Pengurus'] },
        { id: 'pengaturan', icon: 'fa-cog', label: 'Pengaturan', roles: ['Admin'] }
    ];
    nav.innerHTML = items.filter(i => i.roles.includes(currentUser.role))
        .map(i => `<button onclick="showPage('${i.id}')" id="nav-${i.id}" class="nav-btn w-full flex items-center gap-4 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-all"><i class="fas ${i.icon} w-5"></i> <span>${i.label}</span></button>`).join('');
}

// =============== SHOW PAGE =================
function showPage(id) {
    document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
    document.getElementById('page-' + id)?.classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('nav-active'));
    document.getElementById('nav-' + id)?.classList.add('nav-active');
    document.getElementById('page-title').innerText = id === 'dashboard' ? 'Dashboard' : id.charAt(0).toUpperCase() + id.slice(1);

    if(id==='santri') renderTableSantri();
    if(id==='pengaturan') renderAsramaList();
    if(id==='perizinan') renderIzinLog();
}

// =============== SANTRI ===================
function generateAutoId() {
    const ids = db.santri.map(s => parseInt(s.id));
    const max = ids.length>0?Math.max(...ids):999;
    return max+1;
}

async function saveSantri(editId=null) {
    const nama = document.getElementById('s-nama').value;
    const gender = document.getElementById('s-gender').value;
    const asrama = document.getElementById('s-asrama').value;
    const sekolah = document.getElementById('s-sekolah').value;
    const kelas = document.getElementById('s-kelas').value;

    if(!nama||!asrama||!sekolah||!kelas) return alert("Isi semua field wajib!");

    const santriObj = {
        id: editId || generateAutoId(),
        nama, gender, asrama, sekolah, kelas,
        wali: document.getElementById('s-wali').value||"-",
        alamat: document.getElementById('s-alamat').value||"-",
        telp: document.getElementById('s-telp').value||"-",
        status: 'Santri',
        createdAt: new Date().toISOString()
    };

    if(editId) {
        await fetchGS({ sheet: SHEETS.santri, action:'update', data: JSON.stringify(santriObj) });
        db.santri = db.santri.map(s=>s.id==editId?santriObj:s);
    } else {
        await fetchGS({ sheet: SHEETS.santri, action:'create', data: JSON.stringify(santriObj) });
        db.santri.push(santriObj);
    }

    closeModal('modal-santri');
    renderTableSantri();
    renderStats();
}

// =============== EDIT & DELETE =================
function editSantri(id) {
    const s = db.santri.find(x=>x.id==id);
    if(!s) return;
    document.getElementById('s-nama').value = s.nama;
    document.getElementById('s-gender').value = s.gender;
    document.getElementById('s-asrama').value = s.asrama;
    document.getElementById('s-sekolah').value = s.sekolah;
    updateKelasSelect('s-kelas', s.sekolah);
    document.getElementById('s-kelas').value = s.kelas;
    document.getElementById('s-wali').value = s.wali;
    document.getElementById('s-alamat').value = s.alamat;
    document.getElementById('s-telp').value = s.telp;
    openModal('modal-santri');

    document.getElementById('modal-santri').querySelector('button.bg-green-600').onclick = ()=>saveSantri(id);
}

async function deleteSantri(id) {
    if(!confirm("Hapus data santri ini?")) return;
    await fetchGS({ sheet:SHEETS.santri, action:'delete', id });
    db.santri = db.santri.filter(x=>x.id!=id);
    renderTableSantri();
    renderStats();
}

// =============== RENDER TABLE =================
function renderTableSantri() {
    const tbody = document.getElementById('table-santri-body');
    const s = document.getElementById('f-search').value.toLowerCase();
    const a = document.getElementById('f-asrama').value;
    const sk = document.getElementById('f-sekolah').value;
    const kl = document.getElementById('f-kelas').value;
    const gn = document.getElementById('f-gender').value;

    const filtered = db.santri.filter(x =>
        (x.nama.toLowerCase().includes(s)||x.id.toString().includes(s)) &&
        (a==""||x.asrama===a) &&
        (sk==""||x.sekolah===sk) &&
        (kl==""||x.kelas===kl) &&
        (gn==""||x.gender===gn)
    );

    tbody.innerHTML = filtered.map(x => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4"><input type="checkbox" value="${x.id}" class="row-check" onchange="updateSelected(this)"></td>
            <td class="px-6 py-4 font-mono text-xs">${x.id}</td>
            <td class="px-6 py-4">
                <div>${x.nama}</div>
                <div class="text-[10px] text-gray-400">${x.gender}</div>
            </td>
            <td class="px-6 py-4">
                <span class="text-[10px] font-bold px-2 py-1 rounded-full ${x.status==='Santri'?'bg-blue-50 text-blue-600':'bg-purple-50 text-purple-600'}">
                    ${x.status}
                </span>
            </td>
            <td class="px-6 py-4 text-xs">${x.asrama}</td>
            <td class="px-6 py-4 text-xs">${x.sekolah} - Kelas ${x.kelas}</td>
            <td class="px-6 py-4 text-right">
                <button onclick="editSantri(${x.id})" class="text-green-400 action-admin"><i class="fas fa-edit"></i></button>
                <button onclick="deleteSantri(${x.id})" class="text-red-400 action-admin"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');

    if(currentUser.role!=='Admin') document.querySelectorAll('.action-admin').forEach(el=>el.classList.add('hidden'));
}

// ================== INIT ===================
window.onload = initApp;
