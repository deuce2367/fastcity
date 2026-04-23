// --- Map Providers ---
const mapProviders = {
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
    }),
    dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }),
    light: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        attribution: '&copy; OSM &copy; CARTO'
    }),
    voyager: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        attribution: '&copy; OSM &copy; CARTO'
    }),
    satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri'
    }),
    esriTopo: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri'
    }),
    esriNatGeo: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16,
        attribution: 'Tiles &copy; Esri'
    }),
    openTopo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: '&copy; OpenTopoMap'
    }),
    osmHot: L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OSM Humanitarian'
    }),
    cyclosm: L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
        maxZoom: 20,
        attribution: '&copy; CyclOSM'
    })
};

// --- Initialization ---
const map = L.map('map', {
    center: [20, 0], // Initial center
    zoom: 3,
    layers: [mapProviders.dark] // Default layer
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
const mapStyleSelect = document.getElementById('map-style-select');
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

// Update map style
mapStyleSelect.addEventListener('change', (e) => {
    const selectedStyle = e.target.value;
    // Remove all current layers
    Object.values(mapProviders).forEach(layer => map.removeLayer(layer));
    // Add selected layer
    map.addLayer(mapProviders[selectedStyle]);
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
    latVal.textContent = e.latlng.lat.toFixed(4);
    lonVal.textContent = e.latlng.lng.toFixed(4);
});

// Handle map click
map.on('click', (e) => {
    const { lat, lng } = e.latlng;
    fetchNearestCities(lat, lng);
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
    
    // Add click marker
    clickMarker = L.circleMarker([clickLat, clickLng], {
        radius: 6,
        fillColor: "#ef4444", // Red
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 1
    }).addTo(map);
    
    // Add city markers and lines
    cities.forEach(item => {
        const city = item.city;
        
        // Create custom tooltip
        const tooltipContent = `
            <strong>${city.name}</strong><br>
            ${city.adm0name}<br>
            Pop: ${city.pop_max ? city.pop_max.toLocaleString() : 'N/A'}
        `;
        
        const marker = L.circleMarker([city.lat, city.lon], {
            radius: 5,
            fillColor: "#3b82f6", // Blue
            color: "#fff",
            weight: 1.5,
            opacity: 1,
            fillOpacity: 0.8
        }).bindTooltip(tooltipContent).addTo(map);
        
        cityMarkers.push(marker);
        
        // Draw line from click to city
        const line = L.polyline([[clickLat, clickLng], [city.lat, city.lon]], {
            color: 'rgba(59, 130, 246, 0.4)',
            weight: 2,
            dashArray: '5, 5'
        }).addTo(map);
        
        connectionLines.push(line);
    });
    
    // Bring click marker to the very front so it is above the dashed lines
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
