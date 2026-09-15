// --- Map Providers ---
let mapProviders = {};
let currentActiveLayers = [];
let mapConfig = null;

// --- Initialization ---
const map = L.map('map', {
    center: [20, 0], // Initial center
    zoom: 3
});

// Variables to store current state
let clickMarker = null;
let cityMarkers = [];
let connectionLines = [];
let currentData = [];

// DOM Elements
const kInput = document.getElementById('k-input');
const kValue = document.getElementById('k-value');
const unitSelect = document.getElementById('unit-select');
const mapStyleSelected = document.getElementById('map-style-selected');
const mapStyleOptions = document.getElementById('map-style-options');
const latVal = document.getElementById('lat-val');
const lonVal = document.getElementById('lon-val');
const loadingIndicator = document.getElementById('loading');
const resultsPanel = document.getElementById('results-panel');
const closeResultsBtn = document.getElementById('close-results');
const resultsBody = document.getElementById('results-body');
const tableUnitLabel = document.getElementById('table-unit-label');

// --- Event Listeners ---

// Update k value display
kInput.addEventListener('input', (e) => {
    kValue.textContent = e.target.value;
});



// Update distance unit label in table
unitSelect.addEventListener('change', (e) => {
    const unit = e.target.value;
    if (unit === 'km') tableUnitLabel.textContent = 'km';
    else if (unit === 'mi') tableUnitLabel.textContent = 'mi';
    else tableUnitLabel.textContent = 'nm';
    
    // Re-fetch data if there's an active click marker
    if (clickMarker) {
        fetchNearestCities(clickMarker.getLatLng().lat, clickMarker.getLatLng().lng);
    }
});

// Close results panel
closeResultsBtn.addEventListener('click', () => {
    resultsPanel.classList.add('hidden');
});

// Track mouse coordinates over map
map.on('mousemove', (e) => {
    const wrapped = e.latlng.wrap();
    latVal.textContent = wrapped.lat.toFixed(4);
    lonVal.textContent = wrapped.lng.toFixed(4);
});

// Handle map click
map.on('click', (e) => {
    const wrapped = e.latlng.wrap();
    fetchNearestCities(wrapped.lat, wrapped.lng);
});

// Sorting logic
let currentSortCol = null;
let currentSortDir = 'asc';

document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
        if (!currentData || currentData.length === 0) return;
        
        const sortCol = th.getAttribute('data-sort');
        
        if (currentSortCol === sortCol) {
            currentSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
        } else {
            currentSortCol = sortCol;
            currentSortDir = 'asc';
        }
        
        // Update icons
        document.querySelectorAll('th.sortable .sort-icon').forEach(icon => {
            icon.classList.add('hidden');
            icon.classList.remove('ph-caret-up', 'ph-caret-down');
        });
        const icon = th.querySelector('.sort-icon');
        icon.classList.remove('hidden');
        icon.classList.add(currentSortDir === 'asc' ? 'ph-caret-up' : 'ph-caret-down');
        
        // Sort data
        currentData.sort((a, b) => {
            let valA, valB;
            if (sortCol === 'name') { valA = a.city.name; valB = b.city.name; }
            else if (sortCol === 'country') { valA = a.city.adm0name; valB = b.city.adm0name; }
            else if (sortCol === 'population') { valA = a.city.pop_max || 0; valB = b.city.pop_max || 0; }
            else if (sortCol === 'distance') { valA = a.distance_nm; valB = b.distance_nm; }
            else if (sortCol === 'heading') { valA = a.heading; valB = b.heading; }
            
            if (valA < valB) return currentSortDir === 'asc' ? -1 : 1;
            if (valA > valB) return currentSortDir === 'asc' ? 1 : -1;
            return 0;
        });
        
        updateResultsTable(currentData);
    });
});


// --- Config Fetching ---
async function loadConfig() {
    try {
        const res = await fetch('/config');
        const config = await res.json();
        mapConfig = config;
        
        // Build mapProviders
        config.maps.forEach(m => {
            if (m.type === 'tile') {
                mapProviders[m.id] = L.tileLayer(m.url, m.options);
            } else if (m.type === 'wms') {
                mapProviders[m.id] = L.tileLayer.wms(m.url, m.options);
            }
        });
        
        // Populate custom dropdown
        mapStyleOptions.innerHTML = '';
        config.maps.forEach(m => {
            const opt = document.createElement('div');
            opt.className = 'custom-option';
            opt.dataset.value = m.id;
            
            // Icon based on type
            const icon = m.type === 'wms' ? '<i class="ph ph-globe"></i>' : '<i class="ph ph-map-trifold"></i>';
            opt.innerHTML = `${icon} <span>${m.name}</span>`;
            
            opt.addEventListener('click', () => {
                setMapLayer(m.id);
                mapStyleSelected.innerHTML = `${icon} <span>${m.name}</span> <i class="ph ph-caret-down"></i>`;
                mapStyleOptions.classList.add('hidden');
                
                // Highlight selected
                document.querySelectorAll('.custom-option').forEach(el => el.classList.remove('selected'));
                opt.classList.add('selected');
            });
            
            mapStyleOptions.appendChild(opt);
        });
        
        // Set defaults from config
        if (config.default_k) {
            kInput.value = config.default_k;
            kValue.textContent = config.default_k;
        }
        if (config.default_unit) {
            unitSelect.value = config.default_unit;
            if (config.default_unit === 'km') tableUnitLabel.textContent = 'km';
            else if (config.default_unit === 'mi') tableUnitLabel.textContent = 'mi';
            else tableUnitLabel.textContent = 'nm';
        }

        // Set default
        const defaultMap = config.maps.find(m => m.id === config.default_map) || config.maps[0];
        setMapLayer(defaultMap.id);
        const icon = defaultMap.type === 'wms' ? '<i class="ph ph-globe"></i>' : '<i class="ph ph-map-trifold"></i>';
        mapStyleSelected.innerHTML = `${icon} <span>${defaultMap.name}</span> <i class="ph ph-caret-down"></i>`;
        
        // Mark default selected
        const defaultOpt = Array.from(mapStyleOptions.children).find(el => el.dataset.value === defaultMap.id);
        if (defaultOpt) defaultOpt.classList.add('selected');
        
    } catch(err) {
        console.error("Failed to load config", err);
    }
}

function setMapLayer(id) {
    // Clear existing layers
    currentActiveLayers.forEach(layer => map.removeLayer(layer));
    currentActiveLayers = [];
    
    const selectedConfig = mapConfig.maps.find(m => m.id === id);
    
    // If the selected map is a transparent overlay, add a base map underneath
    if (selectedConfig && selectedConfig.options && selectedConfig.options.transparent) {
        const baseId = 'esri_topo'; // A nice default basemap for weather
        if (mapProviders[baseId]) {
            const baseLayer = mapProviders[baseId];
            baseLayer.addTo(map);
            currentActiveLayers.push(baseLayer);
        }
    }
    
    const mainLayer = mapProviders[id];
    mainLayer.addTo(map);
    currentActiveLayers.push(mainLayer);
    
    // Bring transparent overlay to front
    if (currentActiveLayers.length > 1 && typeof mainLayer.bringToFront === 'function') {
        mainLayer.bringToFront();
    }
}

// Toggle dropdown
mapStyleSelected.addEventListener('click', () => {
    mapStyleOptions.classList.toggle('hidden');
});
document.addEventListener('click', (e) => {
    if (!mapStyleSelected.contains(e.target) && !mapStyleOptions.contains(e.target)) {
        mapStyleOptions.classList.add('hidden');
    }
});

// Call on load
loadConfig();

// --- Main Logic ---

async function fetchNearestCities(lat, lng) {
    const k = kInput.value;
    
    // Show loading
    loadingIndicator.classList.remove('hidden');
    
    try {
        const response = await fetch(`/nearest_city?lat=${lat}&lon=${lng}&k=${k}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        currentData = data.cities;
        
        // Apply current sort if any
        if (currentSortCol) {
            currentData.sort((a, b) => {
                let valA, valB;
                if (currentSortCol === 'name') { valA = a.city.name; valB = b.city.name; }
                else if (currentSortCol === 'country') { valA = a.city.adm0name; valB = b.city.adm0name; }
                else if (currentSortCol === 'population') { valA = a.city.pop_max || 0; valB = b.city.pop_max || 0; }
                else if (currentSortCol === 'distance') { valA = a.distance_nm; valB = b.distance_nm; }
                else if (currentSortCol === 'heading') { valA = a.heading; valB = b.heading; }
                
                if (valA < valB) return currentSortDir === 'asc' ? -1 : 1;
                if (valA > valB) return currentSortDir === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        updateMapElements(lat, lng, currentData);
        updateResultsTable(currentData);
        
        // Show results panel
        resultsPanel.classList.remove('hidden');
        
    } catch (error) {
        console.error("Error fetching nearest cities:", error);
        alert("Error fetching cities. Check console for details.");
    } finally {
        loadingIndicator.classList.add('hidden');
    }
}

function updateMapElements(clickLat, clickLng, cities) {
    // Clear previous elements
    if (clickMarker) map.removeLayer(clickMarker);
    cityMarkers.forEach(m => map.removeLayer(m));
    connectionLines.forEach(l => map.removeLayer(l));
    cityMarkers = [];
    connectionLines = [];
    
    // Get styles from config with fallbacks
    const s = mapConfig.styling || {};
    const sm = s.markers || {};
    const sl = s.lines || {};
    
    const clickStyle = sm.click || { fillColor: "#ef4444", color: "#fff", radius: 9 };
    const cityStyle = sm.city || { fillColor: "#3b82f6", color: "#fff", radius: 8 };
    const haloStyle = sl.halo || { color: "#ffffff", weight: 5 };
    const dashStyle = sl.dash || { color: "#1e40af", weight: 2 };
    
    // Draw lines FIRST so they appear underneath markers
    cities.forEach(item => {
        const city = item.city;
        
        // Draw a solid white halo/casing
        const bgLine = L.polyline([[clickLat, clickLng], [city.lat, city.lon]], {
            color: haloStyle.color,
            weight: haloStyle.weight,
            opacity: 0.8,
            interactive: false
        }).addTo(map);
        connectionLines.push(bgLine);

        // Draw the inner dashed line
        const line = L.polyline([[clickLat, clickLng], [city.lat, city.lon]], {
            color: dashStyle.color, 
            weight: dashStyle.weight,
            dashArray: '6, 6',
            opacity: 1,
            interactive: false
        }).addTo(map);
        
        connectionLines.push(line);
    });

    // Add click marker
    clickMarker = L.circleMarker([clickLat, clickLng], {
        radius: clickStyle.radius,
        fillColor: clickStyle.fillColor,
        color: clickStyle.color,
        weight: 2,
        opacity: 1,
        fillOpacity: 1
    }).addTo(map);
    
    // Add city markers
    cities.forEach(item => {
        const city = item.city;
        
        // Create custom tooltip
        const tooltipContent = `
            <strong>${city.name}</strong><br>
            ${city.adm0name}<br>
            Pop: ${city.pop_max ? city.pop_max.toLocaleString() : 'N/A'}
        `;
        
        const marker = L.circleMarker([city.lat, city.lon], {
            radius: cityStyle.radius,
            fillColor: cityStyle.fillColor,
            color: cityStyle.color,
            weight: 1.5,
            opacity: 1,
            fillOpacity: 0.8
        }).bindTooltip(tooltipContent).addTo(map);
        
        cityMarkers.push(marker);
    });
    
    // Bring all markers to front
    cityMarkers.forEach(m => m.bringToFront());
    if (clickMarker) {
        clickMarker.bringToFront();
    }
}

function convertDistance(distNm, targetUnit) {
    if (targetUnit === 'nm') return distNm;
    if (targetUnit === 'km') return distNm * 1.852;
    if (targetUnit === 'mi') return distNm * 1.15078;
    return distNm;
}

function updateResultsTable(cities) {
    resultsBody.innerHTML = '';
    const unit = unitSelect.value;
    
    cities.forEach(item => {
        const city = item.city;
        const distNm = item.distance_nm;
        const convertedDist = convertDistance(distNm, unit);
        
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td><strong>${city.name}</strong></td>
            <td>${city.adm0name}</td>
            <td>${city.pop_max ? city.pop_max.toLocaleString() : '-'}</td>
            <td>${convertedDist.toFixed(2)}</td>
            <td>${item.heading}° (${item.compass})</td>
        `;
        
        // Add click event to pan map to city
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', () => {
            map.panTo([city.lat, city.lon]);
        });
        
        resultsBody.appendChild(tr);
    });
}

// --- Export Functionality ---
document.getElementById('export-csv').addEventListener('click', () => {
    if (!currentData || currentData.length === 0) return;
    
    const unit = unitSelect.value;
    const headers = ['City', 'Country', 'Population', `Distance (${unit})`, 'Heading'];
    const rows = currentData.map(item => {
        const convertedDist = convertDistance(item.distance_nm, unit).toFixed(2);
        return [
            `"${item.city.name || ''}"`,
            `"${item.city.adm0name || ''}"`,
            item.city.pop_max || '',
            convertedDist,
            `"${item.heading}° (${item.compass})"`
        ].join(',');
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "fastcity_results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

document.getElementById('export-json').addEventListener('click', () => {
    if (!currentData || currentData.length === 0) return;
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentData, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", "fastcity_results.json");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});
