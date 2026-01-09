// --- 1. CONFIGURARE ---
const CONFIG = {
    // ID-ul Spreadsheet-ului tău
    SHEET_ID: '1RpPfd-5vti-R4TBKCusr1gok-O7eTSdC42be_YlwSkA',
    
    // !!! ATENȚIE: PUNE AICI API KEY-UL TĂU !!!
    API_KEY: 'PUNE_AICI_CHEIA_TA_API_GOOGLE', 
    
    // Intervalul: Luăm coloanele de la A la L (A-F = RO, G-L = EN)
    RANGE: 'Sheet1!A:L'
};

// --- 2. TEXTE UI (Interfață butoane/titluri) ---
const TRANSLATIONS = {
    ro: {
        title: "Meniu Săptămânal",
        loading: "Se încarcă meniul...",
        error: "Nu s-au putut încărca datele.",
        prevWeek: "Săpt. Anterioară",
        nextWeek: "Săpt. Următoare",
        currentBadge: "Săptămâna Curentă",
        backToCurrent: "Înapoi la Săptămâna Curentă",
        dateFormat: 'ro-RO',
        headers: ['Categorie', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri']
    },
    en: {
        title: "Weekly Menu",
        loading: "Loading menu...",
        error: "Could not load menu data.",
        prevWeek: "Previous Week",
        nextWeek: "Next Week",
        currentBadge: "Current Week",
        backToCurrent: "Back to Current Week",
        dateFormat: 'en-GB',
        headers: ['Category', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    }
};

// --- 3. STATE ---
let currentWeekOffset = 0;
let currentLanguage = 'ro'; 
let cachedMenuData = null; 

// --- 4. ELEMENTE DOM ---
const elements = {
    title: document.querySelector('h1'),
    prevWeek: document.getElementById('prevWeek'),
    nextWeek: document.getElementById('nextWeek'),
    goToCurrentWeek: document.getElementById('goToCurrentWeek'),
    weekDates: document.getElementById('weekDates'),
    currentWeekBadge: document.getElementById('currentWeekBadge'),
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    menuTable: document.getElementById('menuTable'),
    menuTableBody: document.getElementById('menuTableBody'),
    errorText: document.querySelector('#error p')
};

// --- 5. LOGICĂ SCHIMBARE LIMBĂ ---
function changeLanguage(lang) {
    if (currentLanguage === lang) return;
    currentLanguage = lang;
    
    // Actualizare butoane active
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-${lang}`).classList.add('active');

    // Actualizare texte statice
    updateStaticTexts();
    
    // Actualizare date calendaristice
    updateWeekDisplay();
    
    // Randare tabel (cu datele deja descărcate sau descărcare nouă)
    if (cachedMenuData) {
        renderMenuTable(cachedMenuData);
    } else {
        loadMenuData();
    }
}

function updateStaticTexts() {
    const t = TRANSLATIONS[currentLanguage];
    
    // Titlu principal
    if(elements.title) elements.title.textContent = t.title;

    // Texte butoane navigare
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const map = {
            'loading': 'loading', 'error': 'error', 'prevWeek': 'prevWeek',
            'nextWeek': 'nextWeek', 'currentWeekBadge': 'currentBadge',
            'backToCurrent': 'backToCurrent'
        };
        if (map[key] && t[map[key]]) el.textContent = t[map[key]];
    });

    // Header Tabel (Zilele săptămânii)
    const ths = document.querySelectorAll('.menu-table thead th');
    t.headers.forEach((text, index) => {
        if (ths[index]) ths[index].textContent = text;
    });
}

// --- 6. LOGICĂ DATE CALENDARISTICE ---
function getMondayOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function formatDate(date) {
    const locale = TRANSLATIONS[currentLanguage].dateFormat;
    return date.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
}

function getFridayOfWeek(monday) {
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    return friday;
}

function getCurrentWeekMonday() {
    const today = new Date();
    const monday = getMondayOfWeek(today);
    monday.setDate(monday.getDate() + (currentWeekOffset * 7));
    return monday;
}

function updateWeekDisplay() {
    const monday = getCurrentWeekMonday();
    const friday = getFridayOfWeek(monday);
    elements.weekDates.textContent = `${formatDate(monday)} - ${formatDate(friday)}`;
    
    if (currentWeekOffset === 0) {
        elements.currentWeekBadge.style.display = 'block';
        elements.goToCurrentWeek.style.display = 'none';
    } else {
        elements.currentWeekBadge.style.display = 'none';
        elements.goToCurrentWeek.style.display = 'block';
    }
}

// --- 7. ÎNCĂRCARE DATE DIN GOOGLE SHEETS ---
async function loadMenuData() {
    elements.loading.style.display = 'block';
    elements.error.style.display = 'none';
    elements.menuTable.style.display = 'none';

    // Verificare sumară cheie API
    if (CONFIG.API_KEY.includes('PUNE_AICI')) {
        elements.errorText.textContent = "Lipsește API Key din script.js!";
        elements.loading.style.display = 'none';
        elements.error.style.display = 'block';
        return;
    }

    try {
        // Cerem datele din range-ul A:L
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${CONFIG.RANGE}?key=${CONFIG.API_KEY}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        const rows = result.values;

        const roData = [];
        const enData = [];

        if (rows && rows.length > 0) {
            rows.forEach(row => {
                // IMPORTANT: Aici preluăm datele exact cum sunt, fără modificări.
                
                // --- ROMÂNĂ (Coloanele 0-5 / A-F) ---
                // Luăm primele 6 celule. Dacă rândul e mai scurt, completăm cu string gol.
                let roRow = [];
                for (let i = 0; i < 6; i++) {
                    roRow.push(row[i] || ""); // Dacă celula e undefined, punem ""
                }

                // --- ENGLEZĂ (Coloanele 6-11 / G-L) ---
                // Luăm următoarele 6 celule.
                let enRow = [];
                for (let i = 6; i < 12; i++) {
                    enRow.push(row[i] || ""); // Luăm fix ce e în sheet. Dacă e gol, apare gol.
                }

                // Adăugăm în liste doar dacă există ceva scris la Categorie (prima coloană din set)
                // Verificăm roRow[0] pentru că de obicei categoria e scrisă cel puțin la română
                if (roRow[0] || enRow[0]) {
                    roData.push(roRow);
                    enData.push(enRow);
                }
            });
        }

        // Salvăm datele
        cachedMenuData = { ro: roData, en: enData };
        
        renderMenuTable(cachedMenuData);
        elements.loading.style.display = 'none';
        elements.menuTable.style.display = 'block';
        
    } catch (err) {
        console.error('Error:', err);
        elements.errorText.textContent = TRANSLATIONS[currentLanguage].error;
        elements.loading.style.display = 'none';
        elements.error.style.display = 'block';
    }
}

// --- 8. RANDARE TABEL ---
function renderMenuTable(data) {
    elements.menuTableBody.innerHTML = '';
    
    // Alegem setul de date pe baza limbii curente
    const activeData = (currentLanguage === 'ro') ? data.ro : data.en;
    
    if (!activeData || activeData.length === 0) {
        elements.menuTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nu există date / No data</td></tr>';
        return;
    }

    activeData.forEach(row => {
        const tr = document.createElement('tr');
        
        // Prima celulă e Categoria (TH)
        const th = document.createElement('th');
        th.textContent = row[0]; // Exact textul din sheet
        tr.appendChild(th);

        // Următoarele 5 sunt zilele (TD)
        for (let i = 1; i < 6; i++) {
            const td = document.createElement('td');
            td.textContent = row[i]; // Exact textul din sheet
            
            // Etichetă pentru mobile (data-label)
            if(TRANSLATIONS[currentLanguage].headers[i]) {
                td.setAttribute('data-label', TRANSLATIONS[currentLanguage].headers[i]);
            }
            tr.appendChild(td);
        }
        
        elements.menuTableBody.appendChild(tr);
    });
}

// --- 9. EVENT LISTENERS ---
elements.prevWeek.addEventListener('click', () => { currentWeekOffset--; changeLanguage(currentLanguage); });
elements.nextWeek.addEventListener('click', () => { currentWeekOffset++; changeLanguage(currentLanguage); });
elements.goToCurrentWeek.addEventListener('click', () => { currentWeekOffset = 0; changeLanguage(currentLanguage); });

// Facem funcția globală pentru butoanele din HTML
window.changeLanguage = changeLanguage;

// Pornire
document.addEventListener('DOMContentLoaded', () => {
    updateStaticTexts();
    updateWeekDisplay();
    loadMenuData();
});
});






