// Configuration
const CONFIG = {
    SHEET_ID: '1RpPfd-5vti-R4TBKCusr1gok-O7eTSdC42be_YlwSkA',
    API_KEY: 'YOUR_API_KEY_HERE', 
    RANGE: 'Sheet1!A:L' // NOTĂ: Am extins range-ul (A:F era doar RO, A:L prinde și EN)
};

// Translations Dictionary
const TRANSLATIONS = {
    ro: {
        loading: "Se încarcă meniul...",
        error: "Nu s-au putut încărca datele meniului.",
        prevWeek: "Săpt. Anterioară",
        nextWeek: "Săpt. Următoare",
        currentBadge: "Săptămâna Curentă",
        backToCurrent: "Înapoi la Săptămâna Curentă",
        dateFormat: 'ro-RO',
        // Header-ele tabelului
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
        // Header-ele tabelului
        headers: ['Category', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    }
};

// State
let currentWeekOffset = 0;
let currentLanguage = 'ro'; // 'ro' sau 'en'
let cachedMenuData = null; // Stocăm datele ca să nu le cerem de 2 ori când schimbăm limba

// DOM Elements
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
    // Texte care trebuie traduse direct
    loadingText: document.querySelector('#loading p'),
    errorText: document.querySelector('#error p'),
    prevWeekText: document.querySelector('#prevWeek .nav-text'),
    nextWeekText: document.querySelector('#nextWeek .nav-text')
};

// --- Language Utilities ---

function changeLanguage(lang) {
    if (currentLanguage === lang) return;
    
    currentLanguage = lang;
    
    // 1. Actualizăm starea vizuală a butoanelor
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`btn-${lang}`);
    if(activeBtn) activeBtn.classList.add('active');

    // 2. Actualizăm textele statice din UI
    updateStaticTexts();

    // 3. Re-randăm datele (data, tabelul)
    updateWeekDisplay();
    
    // Dacă avem deja datele încărcate, doar reconstruim tabelul
    if (cachedMenuData) {
        renderMenuTable(cachedMenuData);
    } else {
        loadMenuData();
    }
}

function updateStaticTexts() {
    const t = TRANSLATIONS[currentLanguage];
    
    // Update texte folosind data-i18n (din HTML-ul nou)
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        // Mapăm cheile din HTML la structura noastră de traduceri
        const map = {
            'subtitle': 'subtitle', // Trebuie adăugat în TRANSLATIONS dacă e cazul
            'loading': 'loading',
            'error': 'error',
            'prevWeek': 'prevWeek',
            'nextWeek': 'nextWeek',
            'currentWeekBadge': 'currentBadge',
            'backToCurrent': 'backToCurrent'
        };
        
        if (map[key] && t[map[key]]) {
            el.textContent = t[map[key]];
        }
    });

    // Update headers tabel
    const ths = document.querySelectorAll('.menu-table thead th');
    t.headers.forEach((text, index) => {
        if (ths[index]) ths[index].textContent = text;
    });
}

// --- Date Utilities ---

function getMondayOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function formatDate(date) {
    const locale = TRANSLATIONS[currentLanguage].dateFormat;
    return date.toLocaleDateString(locale, {
        day: '2-digit',
        month: 'short' // "Ian" vs "Jan"
    });
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

// --- UI Updates ---

function updateWeekDisplay() {
    const monday = getCurrentWeekMonday();
    const friday = getFridayOfWeek(monday);
    const isCurrentWeek = currentWeekOffset === 0;

    elements.weekDates.textContent = `${formatDate(monday)} - ${formatDate(friday)}`;
    
    if (isCurrentWeek) {
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

// --- Data Loading ---

async function loadMenuData() {
    showLoading();
    
    try {
        // --- SIMULARE DATA ---
        // Aici presupunem că Sheet-ul are coloanele A-F pentru RO și G-L pentru EN
        
        // Mock data cu structură dublă (imaginează-ți că asta vine din sheet)
        const mockResponse = {
            // Structura: Categorie, Luni, Marti, Miercuri, Joi, Vineri
            ro: [
                ['Supă', 'Supă cremă de legume', 'Ciorbă de burtă', 'Supă cremă de ciuperci', 'Ciorbă țărănească', 'Supă cremă de roșii'],
                ['Fel Principal', 'Pui la grătar', 'Mușchi file', 'Somon la cuptor', 'Cotlet de porc', 'Paste carbonara'],
                ['Vegetarian', 'Salată Caesar', 'Tocăniță legume', 'Chiftele quinoa', 'Schnițel soia', 'Pizza Margherita'],
                ['Desert', 'Prăjitură', 'Clătite', 'Fructe', 'Tiramisu', 'Papanași']
            ],
            en: [
                ['Soup', 'Vegetable Cream Soup', 'Tripe Soup', 'Mushroom Cream Soup', 'Peasant Soup', 'Tomato Cream Soup'],
                ['Main Course', 'Grilled Chicken', 'Pork Fillet', 'Baked Salmon', 'Pork Chop', 'Carbonara Pasta'],
                ['Vegetarian', 'Caesar Salad', 'Veggie Stew', 'Quinoa Meatballs', 'Soy Schnitzel', 'Margherita Pizza'],
                ['Dessert', 'Cake', 'Pancakes', 'Fruits', 'Tiramisu', 'Donuts']
            ]
        };
        
        // Simulare delay rețea
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Salvăm datele
        cachedMenuData = mockResponse;
        
        renderMenuTable(cachedMenuData);
        showMenu();
        
    } catch (err) {
        console.error('Error loading menu data:', err);
        showError();
    }
}

function renderMenuTable(data) {
    elements.menuTableBody.innerHTML = '';
    
    // Alegem setul de date corect pe baza limbii
    const activeData = (currentLanguage === 'ro') ? data.ro : data.en;
    
    if (!activeData || activeData.length === 0) {
        elements.menuTableBody.innerHTML = '<tr><td colspan="6">No data available</td></tr>';
        return;
    }

    activeData.forEach(row => {
        const tr = document.createElement('tr');
        
        // Prima celulă este Categoria (header de rând)
        const th = document.createElement('th'); // Folosim TH pentru prima coloană (categorie)
        th.textContent = row[0]; // Categoria
        th.className = 'row-header';
        tr.appendChild(th);

        // Restul celulelor (Zilele săptămânii)
        for (let i = 1; i < row.length; i++) {
            const td = document.createElement('td');
            td.textContent = row[i];
            // Putem adăuga logica pentru data attributes aici (pentru mobile view cu CSS content)
            td.setAttribute('data-label', TRANSLATIONS[currentLanguage].headers[i]);
            tr.appendChild(td);
        }
        
        elements.menuTableBody.appendChild(tr);
    });
}

// --- Event Listeners ---

elements.prevWeek.addEventListener('click', () => {
    currentWeekOffset--;
    updateWeekDisplay();
    loadMenuData(); // În realitate aici ai reîncărca din API cu altă dată
});

elements.nextWeek.addEventListener('click', () => {
    currentWeekOffset++;
    updateWeekDisplay();
    loadMenuData();
});

elements.goToCurrentWeek.addEventListener('click', () => {
    currentWeekOffset = 0;
    updateWeekDisplay();
    loadMenuData();
});

// --- Initialize ---
// Facem funcția changeLanguage globală pentru a putea fi apelată din HTML onclick="..."
window.changeLanguage = changeLanguage;

// Pornire inițială
updateStaticTexts();
updateWeekDisplay();
loadMenuData();



