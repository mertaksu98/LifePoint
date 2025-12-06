// Global Değişkenler
let map;
let service;
let infowindow;
let userLatLng;
let markers = []; // Haritadaki pinleri temizlemek için tutuyoruz

// 1. Haritayı Başlatan Fonksiyon (Google API yüklendiğinde otomatik çalışır)
function initApp() {
    // Varsayılan Konum: İstanbul (Konum izni verilmezse burası açılır)
    const istanbul = new google.maps.LatLng(41.0082, 28.9784);
    
    map = new google.maps.Map(document.getElementById("map"), {
        center: istanbul,
        zoom: 12,
        disableDefaultUI: true, // Gereksiz butonları (Sokak görünümü vb.) gizle
        zoomControl: false,     // Mobilde daha temiz görünüm için
    });

    infowindow = new google.maps.InfoWindow();
}

// 2. Kullanıcı Konumunu Alan Fonksiyon
function getUserLocation() {
    const statusBox = document.getElementById('statusbox');
    
    // Status kutusunu güncelle
    statusBox.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Konum aranıyor...';

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Konum Başarıyla Alındı
                userLatLng = new google.maps.LatLng(
                    position.coords.latitude,
                    position.coords.longitude
                );

                // Haritayı kullanıcıya odakla
                map.setCenter(userLatLng);
                map.setZoom(15);

                // Mavi Nokta (Kullanıcı) Markeri
                new google.maps.Marker({
                    position: userLatLng,
                    map: map,
                    title: "Buradasınız",
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: "#4285F4",
                        fillOpacity: 1,
                        strokeColor: "white",
                        strokeWeight: 2,
                    },
                });

                statusBox.innerHTML = '<i class="fa-solid fa-check"></i> Konum bulundu! Taranıyor...';
                
                // Konum bulununca otomatik olarak çevredeki her şeyi getir
                searchNearbyPlaces(['pharmacy', 'hospital']);
            },
            () => {
                handleLocationError(true, statusBox);
            }
        );
    } else {
        // Tarayıcı desteklemiyorsa
        handleLocationError(false, statusBox);
    }
}

// 3. Google Places API ile Arama Yapan Fonksiyon
function searchNearbyPlaces(types) {
    // Önceki aramadan kalan markerları haritadan sil
    clearMarkers();

    const request = {
        location: userLatLng,
        radius: '2000', // 2 KM çapında ara
        type: types     // ['pharmacy'] veya ['hospital'] veya ikisi
    };

    service = new google.maps.places.PlacesService(map);
    
    service.nearbySearch(request, (results, status) => {
        const resultsList = document.getElementById('resultsList');
        const countBadge = document.querySelector('.badge');
        const statusBox = document.getElementById('statusbox');

        if (status === google.maps.places.PlacesServiceStatus.OK) {
            // Listeyi temizle
            resultsList.innerHTML = '';
            countBadge.textContent = `${results.length} Bulundu`;
            statusBox.innerHTML = `<i class="fa-solid fa-check"></i> ${results.length} nokta listelendi.`;

            // Sonuçları döngüye sok
            results.forEach((place) => {
                createMarker(place);
                addPlaceToList(place);
            });
        } else {
            statusBox.textContent = "Yakında sonuç bulunamadı.";
            resultsList.innerHTML = '<li class="result-item"><div class="place-info"><p>Bu konumda aradığınız kriterde yer yok.</p></div></li>';
        }
    });
}

// 4. Haritaya Pin (Marker) Ekleme
function createMarker(place) {
    const marker = new google.maps.Marker({
        map: map,
        position: place.geometry.location,
        title: place.name,
        animation: google.maps.Animation.DROP // Pinler yukarıdan düşerek gelsin
    });

    markers.push(marker); // Silmek için diziye kaydet

    // Pine tıklanınca isim çıksın
    google.maps.event.addListener(marker, "click", () => {
        infowindow.setContent(`
            <div style="padding:5px; color:black;">
                <strong>${place.name}</strong><br>
                ${place.vicinity}
            </div>
        `);
        infowindow.open(map, marker);
    });
}

// 5. Sol Menüye Sonuç Ekleme
function addPlaceToList(place) {
    const list = document.getElementById('resultsList');
    
    // İkon Belirleme
    let iconClass = 'fa-map-pin';
    if (place.types.includes('pharmacy')) iconClass = 'fa-staff-snake';
    if (place.types.includes('hospital')) iconClass = 'fa-hospital';

    // Açık mı Kapalı mı?
    let openStatus = '';
    if (place.opening_hours) {
        openStatus = place.opening_hours.open_now 
            ? '<span style="color: green; font-weight:bold;">● Açık</span>' 
            : '<span style="color: red;">● Kapalı</span>';
    }

    const li = document.createElement('li');
    li.className = 'result-item';
    li.innerHTML = `
        <div class="place-icon"><i class="fa-solid ${iconClass}"></i></div>
        <div class="place-info">
            <h4>${place.name}</h4>
            <p>${place.vicinity}</p>
            <small>${openStatus}</small>
        </div>
    `;
    
    // Listeye tıklayınca haritada o noktaya git
    li.addEventListener('click', () => {
        map.setCenter(place.geometry.location);
        map.setZoom(17);
        // Mobilde listeye tıklayınca haritaya odaklanmak için yukarı kaydırabiliriz (Opsiyonel)
        document.getElementById('map').scrollIntoView({behavior: 'smooth'});
    });

    list.appendChild(li);
}

// 6. Filtre Butonları Tıklanınca Çalışan Fonksiyon
function filterType(type) {
    // Aktif butonu güncelle
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    
    // Tıklanan butonu bul (İkona tıklanırsa parent button'ı al)
    const clickedBtn = event.target.closest('button');
    if(clickedBtn) clickedBtn.classList.add('active');

    // Aramayı başlat
    if (type === 'all') {
        searchNearbyPlaces(['pharmacy', 'hospital']);
    } else {
        searchNearbyPlaces([type]);
    }
}

// Yardımcı: Markerları Temizle
function clearMarkers() {
    for (let i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
    markers = [];
}

// Hata Yönetimi
function handleLocationError(browserHasGeolocation, element) {
    element.textContent = browserHasGeolocation
        ? "Hata: Konum servisine izin verilmedi."
        : "Hata: Tarayıcınız konum özelliğini desteklemiyor.";
    element.style.color = 'red';
}