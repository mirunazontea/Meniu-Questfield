/**
 * QUESTFIELD MENU SCRIPT
 * Functionalitate: Date din Google Sheets + Mapare fixă pentru categoriile EN
 */

// --- 1. CONFIGURARE ---
const CONFIG = {
    SHEET_ID: '1RpPfd-5vti-R4TBKCusr1gok-O7eTSdC42be_YlwSkA',
    API_KEY: 'PUNE_AICI_CHEIA_TA_API_GOOGLE', // <--- PUNE CHEIA TA AICI
    RANGE: 'Sheet1!A:L' 
};

// --- 2. MAPARE CATEGORII (fixează denumirile în engleză) ---
const CATEGORY_MAPPING = {
    // Stânga: Exact ce scrie în coloana A (RO) -> Dreapta: Ce vrei să apară în EN
    "S1 Felul 1": "Main Course",
    "Felul 1": "Main Course", // Am pus si varianta fara S1 just in case
    "S1 Felul 2": "Second Course",
    "Felul 2": "Second Course",
    "Vegetarian": "Vegetarian",
    "Salată": "Salad",
    "Gustare": "Snack",
    "Desert": "Dessert",
    "Supa": "Soup",
    "Ciorbă": "Soup"
};

// --- 3. TEXTE UI ---
const TRANSLATIONS = {
    ro: {
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

// --- 4. STATE ---
let currentWeekOffset = 0;
let currentLanguage = 'ro'; 
let cachedMenuData = null; 

// --- 5. ELEMENTE DOM ---
const elements = {
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

// --- 6. LOGICĂ LIMBĂ & UI ---
function changeLanguage(lang) {
    if (currentLanguage === lang) return;
    currentLanguage = lang;
    
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`btn-${lang}`);
    if(activeBtn) activeBtn.classList.add('active');

    updateStaticTexts();
    updateWeekDisplay();
    
    if (cachedMenuData) {
        renderMenuTable(cachedMenuData);
    } else {
        loadMenuData();
    }
}

function updateStaticTexts() {
    const t = TRANSLATIONS[currentLanguage];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const map = {
            'loading': 'loading', 'error': 'error', 'prevWeek': 'prevWeek',
            'nextWeek': 'nextWeek', 'currentWeekBadge': 'currentBadge',
            'backToCurrent': 'backToCurrent'
        };
        if (map[key] && t[map[key]]) el.textContent = t[map[key]];
    });

    const ths = document.querySelectorAll('.menu-table thead th');
    t.headers.forEach((text, index) => {
        if (ths[index]) ths[index].textContent = text;
    });
}

// --- 7. DATE & TIMP ---
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

function showLoading() {
    elements.loading.style.display = 'block';
    elements.error.style.display = 'none';
    elements.menuTable.style.display = 'none';
}

function showError() {
    elements.loading.style.display = 'none';
    elements.error.style.display = 'block';
    elements.menuTable.style.display = 'none';
}

function showMenu() {
    elements.loading.style.display = 'none';
    elements.error.style.display = 'none';
    elements.menuTable.style.display = 'block';
}

// --- 8. ÎNCĂRCARE DATE ---
async function loadMenuData() {
    showLoading();

    if (CONFIG.API_KEY.includes('PUNE_AICI')) {
        console.error("API KEY LIPSEȘTE");
        elements.errorText.textContent = "Lipsește API Key din script.js";
        showError();
        return;
    }

    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${CONFIG.RANGE}?key=${CONFIG.API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        const rows = result.values;

        const roData = [];
        const enData = [];

        if (rows && rows.length > 0) {
            rows.forEach(row => {
                if (row.length > 0) {
                    // RO: Primele 6 coloane
                    const roRow = row.slice(0, 6);
                    
                    // EN: Următoarele 6 coloane
                    let enRow = row.slice(6, 12);

                    if (roRow[0]) {
                        roData.push(roRow);

                        // LOGICA DE FORȚARE A NUMELUI CATEGORIEI
                        // Verificăm dacă avem o traducere fixă pentru categoria din RO
                        const roCategoryName = roRow[0].trim(); // ex: "S1 Felul 1"
                        
                        if (CATEGORY_MAPPING[roCategoryName]) {
                            // Dacă există în mapping, suprascriem prima celulă din EN
                            if(enRow.length === 0) enRow = ["", "", "", "", "", ""]; // Inițializăm dacă e gol
                            enRow[0] = CATEGORY_MAPPING[roCategoryName]; 
                        } else if (!enRow[0]) {
                            // Fallback: Dacă nu e în mapping și nici în Excel, copiem din RO
                            if(enRow.length === 0) enRow = ["", "", "", "", "", ""];
                            enRow[0] = roRow[0];
                        }
                        
                        enData.push(enRow);
                    }
                }
            });
        }

        cachedMenuData = { ro: roData, en: enData };
        renderMenuTable(cachedMenuData);
        showMenu();
        
    } catch (err) {
        console.error('Error loading menu data:', err);
        elements.errorText.textContent = TRANSLATIONS[currentLanguage].error;
        showError();
    }
}

function renderMenuTable(data) {
    elements.menuTableBody.innerHTML = '';
    const activeData = (currentLanguage === 'ro') ? data.ro : data.en;
    
    if (!activeData || activeData.length === 0) {
        elements.menuTableBody.innerHTML = '<tr><td colspan="6">No data available</td></tr>';
        return;
    }

    activeData.forEach(row => {
        const tr = document.createElement('tr');
        
        // Categorie
        const th = document.createElement('th');
        th.textContent = row[0] || "";
        th.className = 'row-header';
        tr.appendChild(th);

        // Zile
        for (let i = 1; i < 6; i++) {
            const td = document.createElement('td');
            td.textContent = row[i] || "-";
            if(TRANSLATIONS[currentLanguage].headers[i]) {
                td.setAttribute('data-label', TRANSLATIONS[currentLanguage].headers[i]);
            }
            tr.appendChild(td);
        }
        elements.menuTableBody.appendChild(tr);
    });
}

// --- 9. INITIALIZARE ---
if(elements.prevWeek) elements.prevWeek.addEventListener('click', () => { currentWeekOffset--; updateWeekDisplay(); loadMenuData(); });
if(elements.nextWeek) elements.nextWeek.addEventListener('click', () => { currentWeekOffset++; updateWeekDisplay(); loadMenuData(); });
if(elements.goToCurrentWeek) elements.goToCurrentWeek.addEventListener('click', () => { currentWeekOffset = 0; updateWeekDisplay(); loadMenuData(); });

window.changeLanguage = changeLanguage;

document.addEventListener('DOMContentLoaded', () => {
    updateStaticTexts();
    updateWeekDisplay();
    loadMenuData();
});





