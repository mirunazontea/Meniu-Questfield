// CONFIGURARE
let currentWeek = 'S1';
let currentLang = 'ro';
let generatedData = null; // Stochează datele noi până la salvare

// --- LOGICA DE AFIȘARE ---
function renderMenu() {
    // Folosim datele din variabila globală menuData (din data.js)
    // Sau din localStorage dacă am testat ceva local
    let dataToUse = menuData;
    
    // Verificăm datele
    if (!dataToUse[currentWeek] || !dataToUse[currentWeek][currentLang]) {
        console.error("Date lipsă pentru", currentWeek, currentLang);
        return;
    }

    const data = dataToUse[currentWeek][currentLang];
    
    // Actualizare Titluri
    document.getElementById('subTitle').textContent = currentLang === 'ro' 
        ? `Săptămâna ${currentWeek.replace('S', '')}` 
        : `Week ${currentWeek.replace('S', '')}`;

    document.getElementById('mainTitle').textContent = currentLang === 'ro' 
        ? "Meniu Questfield" 
        : "Questfield Menu";

    // Header Tabel
    const headers = document.getElementById('tableHeaders');
    headers.innerHTML = `<th>${currentLang === 'ro' ? 'Categorie' : 'Course'}</th>`;
    data.days.forEach(day => {
        const th = document.createElement('th');
        th.textContent = day;
        headers.appendChild(th);
    });

    // Body Tabel
    const body = document.getElementById('tableBody');
    body.innerHTML = '';
    
    data.rows.forEach(row => {
        const tr = document.createElement('tr');
        
        // Verificăm dacă e rândul de Salată pentru a-l colora (logică CSS)
        if(row.type.includes("Salat") || row.type.includes("Salad")) {
            tr.classList.add('row-salata');
        }

        const tdType = document.createElement('td');
        tdType.innerHTML = `<strong>${row.type}</strong>`;
        tr.appendChild(tdType);

        row.items.forEach(item => {
            const td = document.createElement('td');
            td.textContent = item || "-"; // Pune liniuță dacă e gol
            tr.appendChild(td);
        });
        body.appendChild(tr);
    });

    // Actualizare Butoane Active
    ['S1', 'S2', 'S3', 'S4'].forEach(w => {
        const btn = document.getElementById(`btn${w}`);
        if (btn) {
            if(w === currentWeek) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    });
}

function setWeek(week) {
    currentWeek = week;
    renderMenu();
}

function toggleLang() {
    currentLang = currentLang === 'ro' ? 'en' : 'ro';
    renderMenu();
}

// --- LOGICA DE ADMIN (UPLOAD EXCEL) ---

// 1. Deschidere Panou
function openAdminPanel() {
    const password = prompt("Introduceți parola de administrator:");
    if (password === "questfield") { // Parolă simplă
        document.getElementById('adminModal').style.display = "block";
    } else if (password !== null) {
        alert("Parolă incorectă!");
    }
}

function closeAdminPanel() {
    document.getElementById('adminModal').style.display = "none";
}

// 2. Gestionare Upload
document.getElementById('excelInput').addEventListener('change', handleFileSelect, false);

function handleFileSelect(evt) {
    const file = evt.target.files[0];
    if (!file) return;

    document.getElementById('fileName').textContent = file.name;
    document.getElementById('updateStatus').textContent = "Se procesează...";

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            
            // Procesăm Excel-ul și creăm noul obiect de date
            const newMenuData = processExcelData(workbook);
            
            if(newMenuData) {
                generatedData = newMenuData; // Salvăm temporar
                document.getElementById('updateStatus').innerHTML = "<span style='color:green'>Fișier valid! Structura a fost recunoscută.</span>";
                document.getElementById('saveInstruction').style.display = "block";
                
                // Opțional: Actualizăm vizualizarea curentă imediat pentru preview
                window.menuData = newMenuData; 
                renderMenu();
            }
        } catch (err) {
            console.error(err);
            document.getElementById('updateStatus').innerHTML = "<span style='color:red'>Eroare la citire. Asigurați-vă că folosiți formatul corect (S1, S2...).</span>";
        }
    };
    reader.readAsArrayBuffer(file);
}

// 3. Procesare date din Excel (Logica "grea")
function processExcelData(workbook) {
    const newData = {};
    const sheetNames = workbook.SheetNames; // Ar trebui să fie S1, S2, S3, S4

    sheetNames.forEach(sheetName => {
        if (!sheetName.startsWith("S")) return; // Ignorăm alte sheet-uri

        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, {header: 1, defval: ""});
        
        // Structura aproximativă:
        // Rândurile 0-X: Română
        // Rândurile X-Y: Engleză
        // Căutăm header-ul "Luni" pentru RO și "Monday" pentru EN
        
        let roStartIndex = -1;
        let enStartIndex = -1;

        for(let i=0; i<json.length; i++) {
            const rowStr = JSON.stringify(json[i]).toLowerCase();
            if(rowStr.includes("luni")) roStartIndex = i;
            if(rowStr.includes("monday")) enStartIndex = i;
        }

        if(roStartIndex === -1 || enStartIndex === -1) {
            console.warn(`Nu am găsit structura completă în ${sheetName}`);
            return;
        }

        // Extragem datele
        newData[sheetName] = {
            "ro": extractTableBlock(json, roStartIndex),
            "en": extractTableBlock(json, enStartIndex)
        };
    });

    return Object.keys(newData).length > 0 ? newData : null;
}

function extractTableBlock(json, headerIndex) {
    // Luăm zilele din header (col 1-5 presupunem)
    const headerRow = json[headerIndex];
    const days = headerRow.slice(1, 6).filter(d => d && d.length > 0); 
    
    // Luăm rândurile de sub header până dăm de gol sau alt header
    const rows = [];
    let i = headerIndex + 1;
    
    // Luăm fix 6 rânduri (Fel 1, Veg, Fel 2, Veg, Salata, Gustare) sau cât găsim
    while(i < json.length && rows.length < 6) {
        const rowData = json[i];
        if(rowData && rowData[0]) { // Dacă prima coloană (Tipul) are text
            const type = rowData[0];
            const items = rowData.slice(1, 6); // Următoarele 5 coloane
            rows.push({ type, items });
        }
        i++;
    }

    return { days, rows };
}

// 4. Funcția de Export (Salvare)
function downloadNewData() {
    if(!generatedData) return;

    const fileContent = "const menuData = " + JSON.stringify(generatedData, null, 2) + ";";
    const blob = new Blob([fileContent], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.js";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    alert("Fișierul data.js a fost descărcat!\n\nPASUL URMĂTOR: Intră pe GitHub și înlocuiește vechiul fișier data.js cu acesta nou.");
}

// Inițializare la pornire
document.addEventListener('DOMContentLoaded', renderMenu);
