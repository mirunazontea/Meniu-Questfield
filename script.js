let currentWeek = 'S1';
let currentLang = 'ro';
let generatedData = null;

// RENDER MENIU
function renderMenu() {
    const data = menuData[currentWeek][currentLang];
    const headers = document.getElementById('tableHeaders');
    const body = document.getElementById('tableBody');

    // Header
    headers.innerHTML = `<th>${currentLang === 'ro' ? 'Categorie' : 'Course'}</th>`;
    data.days.forEach(day => {
        const th = document.createElement('th');
        th.textContent = day;
        headers.appendChild(th);
    });

    // Body
    body.innerHTML = '';
    data.rows.forEach(row => {
        const tr = document.createElement('tr');
        
        // Verifică dacă e salată pentru stilizare
        if(row.type.toLowerCase().includes('salat') || row.type.toLowerCase().includes('salad')) {
            tr.classList.add('row-salata');
        }

        // Prima celulă (Categorie)
        const tdType = document.createElement('td');
        tdType.textContent = row.type;
        tr.appendChild(tdType);

        // Celulele de mâncare
        row.items.forEach(item => {
            const td = document.createElement('td');
            td.textContent = item || '-';
            tr.appendChild(td);
        });

        body.appendChild(tr);
    });

    // Actualizare Tab-uri Active
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`btn${currentWeek}`);
    if(activeBtn) activeBtn.classList.add('active');
}

function setWeek(week) {
    currentWeek = week;
    renderMenu();
}

function toggleLang() {
    currentLang = currentLang === 'ro' ? 'en' : 'ro';
    renderMenu();
}

// --- ADMIN & EXCEL LOGIC ---

function openAdminPanel() {
    const pwd = prompt("Parola Admin:");
    if(pwd === "questfield") {
        document.getElementById('adminModal').style.display = 'block';
    } else if(pwd) {
        alert("Parola greșită");
    }
}

function closeAdminPanel() {
    document.getElementById('adminModal').style.display = 'none';
}

document.getElementById('excelInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if(!file) return;

    document.getElementById('fileName').textContent = file.name;
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            
            // Procesare
            const newData = processWorkbook(workbook);
            if(newData) {
                generatedData = newData;
                document.getElementById('statusMsg').innerHTML = "<span style='color:green'>Fișier valid!</span>";
                document.getElementById('saveSection').style.display = 'block';
                
                // Preview instant
                window.menuData = newData;
                renderMenu();
            }
        } catch(err) {
            console.error(err);
            alert("Eroare la citirea fișierului. Verifică formatul.");
        }
    };
    reader.readAsArrayBuffer(file);
});

function processWorkbook(workbook) {
    const newData = {};
    const sheets = workbook.SheetNames;

    sheets.forEach(sheet => {
        if(!sheet.startsWith('S')) return; // Doar sheet-uri S1, S2 etc.
        
        const ws = workbook.Sheets[sheet];
        const json = XLSX.utils.sheet_to_json(ws, {header: 1, defval: ""});

        // Căutăm header-ul pentru RO ("Luni") și EN ("Monday")
        let roIdx = -1, enIdx = -1;
        
        json.forEach((row, idx) => {
            const rowStr = JSON.stringify(row).toLowerCase();
            if(rowStr.includes('luni')) roIdx = idx;
            if(rowStr.includes('monday')) enIdx = idx;
        });

        if(roIdx > -1 && enIdx > -1) {
            newData[sheet] = {
                ro: extractData(json, roIdx),
                en: extractData(json, enIdx)
            };
        }
    });

    return Object.keys(newData).length > 0 ? newData : null;
}

function extractData(json, startIdx) {
    const header = json[startIdx];
    // Zilele sunt de la col 1 la 5
    const days = header.slice(1, 6).filter(d => d);
    
    const rows = [];
    let i = startIdx + 1;
    // Luăm maxim 6 rânduri sau până la gol
    while(i < json.length && rows.length < 6) {
        const row = json[i];
        if(row && row[0]) {
            rows.push({
                type: row[0],
                items: row.slice(1, 6)
            });
        }
        i++;
    }
    return { days, rows };
}

function downloadNewData() {
    if(!generatedData) return;
    const content = "const menuData = " + JSON.stringify(generatedData, null, 2) + ";";
    const blob = new Blob([content], {type: "text/javascript"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "data.js";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    alert("Fișier descărcat! Înlocuiește 'data.js' pe GitHub.");
}

// Init
document.addEventListener('DOMContentLoaded', renderMenu);
