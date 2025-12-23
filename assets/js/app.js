let map;
let userMarker;
let infoWindow;
let markers = [];

let MapLibrary, PlacesLibrary, AdvancedMarkerElement;

// STATİK ACİL TOPLANMA ALANLARI VERİSİ
const emergencyGatheringPoints = [
    {
        name: "Yenikapı Etkinlik Alanı",
        type: "gathering",
        lat: 41.0062,
        lng: 28.9568,
        description: "Büyük kapasiteli toplanma ve çadır kurma alanı.",
    },
    {
        name: "Maltepe Sahil Parkı",
        type: "gathering",
        lat: 40.9234,
        lng: 29.1384,
        description: "Anadolu yakasındaki en büyük acil toplanma noktası.",
    },
    {
        name: "Taksim Meydanı",
        type: "gathering",
        lat: 41.0371,
        lng: 28.9856,
        description: "Kısıtlı kapasiteli, merkezi konumda ilk toplanma noktası.",
    },
    {
        name: "Kadıköy İskele Meydanı",
        type: "gathering",
        lat: 40.9839,
        lng: 29.0270,
        description: "Deniz ulaşımına yakın, küçük çaplı toplanma alanı.",
    }
];


async function initApp() {
    try {
        MapLibrary = await google.maps.importLibrary("maps");
        PlacesLibrary = await google.maps.importLibrary("places");
        const markerLib = await google.maps.importLibrary("marker");
        AdvancedMarkerElement = markerLib.AdvancedMarkerElement;

        const istanbul = { lat: 41.0082, lng: 28.9784 };

        map = new MapLibrary.Map(document.getElementById("map"), {
            center: istanbul,
            zoom: 12,
            mapId: "DEMO_MAP_ID",
            disableDefaultUI: true,
            zoomControl: false,
        });

        infoWindow = new MapLibrary.InfoWindow();

        // Arama Kutusu
        setupSearchBox();

        // "Konumuma Git" Butonu
        const recenterBtn = document.getElementById('recenterBtn');
        if (recenterBtn) {
            recenterBtn.addEventListener('click', () => getUserLocation());
        }

        // MOBİL PANEL KONTROLÜ 
        const handle = document.getElementById('mobile-handle');
        const sidebar = document.querySelector('.sidebar');
        
        if(handle && sidebar) {
            handle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });

            // Ekstra: Filtrelere tıklayınca da aç
            const filters = document.querySelector('.filters');
            if(filters) {
                filters.addEventListener('click', () => {
                    sidebar.classList.add('open');
                });
            }
        }

        // Konum İste
        getUserLocation();
        
    } catch (error) {
        console.error("Harita yüklenirken hata oluştu:", error);
    }
}


function getSafeLat(place) {
    if (place.location && typeof place.location.lat === 'function') return place.location.lat();
    return place.location?.lat || 0;
}
function getSafeLng(place) {
    if (place.location && typeof place.location.lng === 'function') return place.location.lng();
    return place.location?.lng || 0;
}

function getPlaceName(place) {
    if (!place.displayName) return "İsimsiz";
    return typeof place.displayName === 'string' ? place.displayName : place.displayName.text;
}


function setupSearchBox() {
    const input = document.getElementById('searchInput');
    input.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            const query = input.value.trim();
            if (query.length > 0) searchByKeyword(query);
        }
    });
    document.querySelector('.search-icon').addEventListener('click', () => {
        const query = input.value.trim();
        if (query.length > 0) searchByKeyword(query);
    });
}

function getUserLocation() {
    const statusBox = document.getElementById('statusbox');
    statusBox.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Konum aranıyor...';

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userPos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                map.setCenter(userPos);
                map.setZoom(15);

                if (userMarker) userMarker.map = null;
                userMarker = new AdvancedMarkerElement({
                    map: map,
                    position: userPos,
                    title: "Siz",
                    content: createPinElement("#4285F4")
                });
                statusBox.innerHTML = '<i class="fa-solid fa-check"></i> Konum bulundu!';
                
                // OTOMATİK ARAMA 
                searchNearbyPlaces(['hospital'], userPos);
            },
            () => {
                statusBox.textContent = "Hata: Konum alınamadı. Varsayılan konum gösteriliyor.";
                searchNearbyPlaces(['hospital'], map.getCenter());
            }
        );
    } else {
        statusBox.textContent = "Tarayıcı desteklemiyor.";
    }
}

async function searchByKeyword(keyword) {
    clearMap();
    const statusBox = document.getElementById('statusbox');
    statusBox.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> "${keyword}" aranıyor...`;

    const request = {
        textQuery: keyword,
        fields: ["displayName", "location", "formattedAddress", "businessStatus"],
        locationBias: { center: map.getCenter(), radius: 2000 },
        maxResultCount: 10,
    };

    try {
        const { places } = await PlacesLibrary.Place.searchByText(request);
        handleResults(places);
    } catch (error) {
        console.error("Metin arama hatası:", error);
        statusBox.textContent = "Sonuç bulunamadı.";
    }
}

async function searchNearbyPlaces(types, center) {
    clearMap();
    const request = {
        fields: ["displayName", "location", "formattedAddress", "businessStatus"],
        locationRestriction: { center: center, radius: 2000 },
        includedPrimaryTypes: types, 
        maxResultCount: 10,
    };

    try {
        const { places } = await PlacesLibrary.Place.searchNearby(request);
        handleResults(places);
    } catch (error) {
        console.error("Kategori arama hatası:", error);
    }
}

function handleResults(places) {
    const badge = document.querySelector('.badge');
    const statusBox = document.getElementById('statusbox');
    
    if (places && places.length > 0) {
        badge.textContent = `${places.length} Bulundu`;
        statusBox.innerHTML = `<i class="fa-solid fa-check"></i> ${places.length} sonuç listelendi.`;
        
        places.forEach((place) => {
            createMarker(place);
            addPlaceToList(place);
        });
    } else {
        badge.textContent = "0 Bulundu";
        statusBox.textContent = "Yakında sonuç yok.";
        document.getElementById('resultsList').innerHTML = '<li class="result-item">Sonuç bulunamadı.</li>';
    }
}

function clearMap() {
    markers.forEach(marker => marker.map = null);
    markers = [];
    document.getElementById('resultsList').innerHTML = '';
}

function displayGatheringPoints() {
    clearMap();
    const badge = document.querySelector('.badge');
    badge.textContent = `${emergencyGatheringPoints.length} Bulundu`;
    document.getElementById('statusbox').innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Toplanma Alanları.`;

    emergencyGatheringPoints.forEach(point => {
        const marker = new AdvancedMarkerElement({
            map: map,
            position: { lat: point.lat, lng: point.lng },
            title: point.name,
            content: createPinElement("#008000") 
        });
        markers.push(marker);

        marker.addListener("click", () => {
            infoWindow.setContent(`
                <div style="color:black; padding:10px; font-family: sans-serif; max-width: 200px;">
                    <strong style="color: #008000;">${point.name}</strong><br>
                    <small>ACİL TOPLANMA ALANI</small><br>
                    <p style="font-size:12px; margin:5px 0;">${point.description}</p>
                    <button class="directions-btn" onclick="getDirections(${point.lat}, ${point.lng})">
                        <i class="fa-solid fa-route"></i> Yol Tarifi
                    </button>
                </div>
            `);
            infoWindow.open(map, marker);
        });

        addGatheringPointToList(point);
    });
}

function addGatheringPointToList(point) {
    const list = document.getElementById('resultsList');
    const li = document.createElement('li');
    li.className = 'result-item';
    li.innerHTML = `
        <div class="place-icon" style="background: #e6ffe6; color: #008000;"><i class="fa-solid fa-person-shelter"></i></div>
        <div class="place-info">
            <h4>${point.name}</h4>
            <p style="font-size:11px; color:#666;">${point.description}</p>
            <button class="directions-btn" onclick="getDirections(${point.lat}, ${point.lng})">
                <i class="fa-solid fa-route"></i> Yol Tarifi Al
            </button>
        </div>
    `;
    li.addEventListener('click', () => {
        map.setCenter({ lat: point.lat, lng: point.lng });
        map.setZoom(17);
    });
    list.appendChild(li);
}

function createMarker(place) {
    const name = getPlaceName(place);
    const lat = getSafeLat(place);
    const lng = getSafeLng(place);

    const marker = new AdvancedMarkerElement({
        map: map,
        position: { lat: lat, lng: lng },
        title: name,
        content: createPinElement("#E63946") 
    });
    markers.push(marker);

    marker.addListener("click", () => {
        const address = place.formattedAddress || "Adres yok";
        infoWindow.setContent(`
            <div style="color:black; padding:10px; font-family: sans-serif; max-width:200px;">
                <strong>${name}</strong><br>
                <p style="font-size:11px; margin:5px 0;">${address}</p>
                <button class="directions-btn" onclick="getDirections(${lat}, ${lng})">
                    <i class="fa-solid fa-route"></i> Yol Tarifi
                </button>
            </div>
        `);
        infoWindow.open(map, marker);
    });
}

function addPlaceToList(place) {
    const list = document.getElementById('resultsList');
    const name = getPlaceName(place);
    const address = place.formattedAddress || "Adres bilgisi yok";
    const lat = getSafeLat(place);
    const lng = getSafeLng(place);

    const li = document.createElement('li');
    li.className = 'result-item';
    li.innerHTML = `
        <div class="place-icon"><i class="fa-solid fa-location-dot"></i></div>
        <div class="place-info">
            <h4>${name}</h4>
            <p style="font-size:11px; color:#666;">${address}</p>
            <button class="directions-btn" onclick="getDirections(${lat}, ${lng})">
                <i class="fa-solid fa-route"></i> Yol Tarifi Al
            </button>
        </div>
    `;
    li.addEventListener('click', () => {
        map.setCenter({ lat: lat, lng: lng });
        map.setZoom(17);
    });
    list.appendChild(li);
}

function filterType(type) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    const btn = event.target.closest('button');
    if(btn) btn.classList.add('active');

    if (type === 'gathering') {
        displayGatheringPoints();
        return;
    }
    if(map) {
        const center = { lat: map.getCenter().lat(), lng: map.getCenter().lng() };
        if (type === 'all') {
            searchNearbyPlaces(['pharmacy', 'hospital'], center);
        } else {
            searchNearbyPlaces([type], center);
        }
    }
}


function getDirections(lat, lng) {
    
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    
    if (navigator.geolocation) {
         navigator.geolocation.getCurrentPosition((pos) => {
            const origin = `${pos.coords.latitude},${pos.coords.longitude}`;
            
            window.open(url + `&origin=${origin}`, '_blank');
         }, () => {
            
             window.open(url, '_blank');
         });
    } else {
        window.open(url, '_blank');
    }
}

function createPinElement(color) {
    const pin = document.createElement("div");
    pin.style.backgroundColor = color;
    pin.style.width = "18px";
    pin.style.height = "18px";
    pin.style.borderRadius = "50%";
    pin.style.border = "2px solid white";
    pin.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
    return pin;
}