// Global Değişkenler
let map;
let userMarker;
let infoWindow;
let markers = [];

// Kütüphaneler (Google'dan dinamik olarak çekilecek)
let MapLibrary, PlacesLibrary, AdvancedMarkerElement;

// Uygulamayı Başlat (HTML'deki loader otomatik tetikler)
async function initApp() {
    // 1. Gerekli Kütüphaneleri İçe Aktar (2025 Standardı)
    MapLibrary = await google.maps.importLibrary("maps");
    PlacesLibrary = await google.maps.importLibrary("places");
    const markerLib = await google.maps.importLibrary("marker");
    AdvancedMarkerElement = markerLib.AdvancedMarkerElement;

    // 2. Haritayı Kur
    const istanbul = { lat: 41.0082, lng: 28.9784 };
    
    map = new MapLibrary.Map(document.getElementById("map"), {
        center: istanbul,
        zoom: 12,
        mapId: "DEMO_MAP_ID", // Google yeni markerlar için bunu zorunlu kılıyor
        disableDefaultUI: true,
        zoomControl: false,
    });

    infoWindow = new MapLibrary.InfoWindow();

    // 3. Konum İste
    getUserLocation();
}

// Konum Alma
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

                // Kullanıcı için Marker
                new AdvancedMarkerElement({
                    map: map,
                    position: userPos,
                    title: "Siz",
                });

                statusBox.innerHTML = '<i class="fa-solid fa-check"></i> Konum bulundu! Taranıyor...';
                
                // Aramayı Başlat
                searchNearbyPlaces(['pharmacy', 'hospital'], userPos);
            },
            () => {
                statusBox.textContent = "Hata: Konum alınamadı.";
            }
        );
    } else {
        statusBox.textContent = "Tarayıcı desteklemiyor.";
    }
}

// YENİ Places API ile Arama (Kritik Değişiklik Burası)
async function searchNearbyPlaces(types, center) {
    // Eski markerları temizle
    markers.forEach(marker => marker.map = null);
    markers = [];

    const list = document.getElementById('resultsList');
    list.innerHTML = ''; // Listeyi temizle
    
    // API Çakışmasını önlemek için her tip için ayrı istek atalım (Google New Places kuralı)
    // "hospital" ve "pharmacy" Google'ın yeni tiplerinde bazen farklı geçebilir.
    // O yüzden genel bir text search yerine 'nearbySearch' kullanacağız ama YENİ versiyonuyla.

    const request = {
        fields: ["displayName", "location", "businessStatus", "openingHours"],
        locationRestriction: {
            center: center,
            radius: 2000, // 2 km
        },
        includedPrimaryTypes: types, // ['pharmacy', 'hospital']
        maxResultCount: 10,
    };

    try {
        // Yeni 'Place' sınıfı üzerinden arama
        const { places } = await PlacesLibrary.Place.searchNearby(request);

        const badge = document.querySelector('.badge');
        badge.textContent = `${places.length} Bulundu`;
        document.getElementById('statusbox').innerHTML = `<i class="fa-solid fa-check"></i> ${places.length} nokta bulundu.`;

        if (places.length === 0) {
            list.innerHTML = '<li class="result-item">Sonuç bulunamadı.</li>';
            return;
        }

        places.forEach((place) => {
            createMarker(place);
            addPlaceToList(place);
        });

    } catch (error) {
        console.error("Arama hatası:", error);
        document.getElementById('statusbox').textContent = "Veri çekilemedi (Konsola bak).";
    }
}

// Marker Oluşturma
function createMarker(place) {
    const marker = new AdvancedMarkerElement({
        map: map,
        position: place.location,
        title: place.displayName,
    });

    markers.push(marker);

    // Tıklama Olayı
    marker.addListener("click", () => {
        infoWindow.setContent(`
            <div style="color:black; padding:5px;">
                <strong>${place.displayName}</strong><br>
                ${place.businessStatus || ''}
            </div>
        `);
        infoWindow.open(map, marker);
    });
}

// Listeye Ekleme
function addPlaceToList(place) {
    const list = document.getElementById('resultsList');
    
    // Açık/Kapalı Kontrolü (Yeni API formatı farklıdır)
    let openStatus = '<span style="color:gray">Bilinmiyor</span>';
    if (place.openingHours) {
        openStatus = place.openingHours.isOpen 
            ? '<span style="color:green; font-weight:bold">● Açık</span>' 
            : '<span style="color:red">● Kapalı</span>';
    }

    const li = document.createElement('li');
    li.className = 'result-item';
    li.innerHTML = `
        <div class="place-icon"><i class="fa-solid fa-location-dot"></i></div>
        <div class="place-info">
            <h4>${place.displayName}</h4>
            <small>${openStatus}</small>
        </div>
    `;

    li.addEventListener('click', () => {
        map.setCenter(place.location);
        map.setZoom(17);
    });

    list.appendChild(li);
}

// Buton Kontrolü
function filterType(type) {
    // Buton stillerini güncelle
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('button').classList.add('active');

    // Harita merkezini al (kullanıcı o an nereye bakıyorsa)
    const center = { 
        lat: map.getCenter().lat(), 
        lng: map.getCenter().lng() 
    };

    if (type === 'all') {
        searchNearbyPlaces(['pharmacy', 'hospital'], center);
    } else {
        searchNearbyPlaces([type], center);
    }
}

// Sayfa yüklenince initApp'i çağır
