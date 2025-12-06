// Global Değişkenler
let map;
let userMarker;
let userLocation = { lat: 0, lng: 0 };

// Sayfa Yüklendiğinde Başlat
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    getUserLocation();
});

// 1. Haritayı Başlatma Fonksiyonu
function initMap() {
    // Koordinatları İstanbul (41.0082, 28.9784) yaptık
    // Zoom seviyesini de 6'dan 10'a çıkardık ki daha yakından başlasın
    map = L.map('map').setView([41.0082, 28.9784], 10); 

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

// 2. Kullanıcı Konumunu Alma
function getUserLocation() {
    const statusBox = document.getElementById('statusbox');

    if (!navigator.geolocation) {
        statusBox.textContent = "Tarayıcınız konum özelliğini desteklemiyor.";
        return;
    }

    statusBox.textContent = "Konum alınıyor...";

    navigator.geolocation.getCurrentPosition(
        // Başarılı olursa
        (position) => {
            userLocation.lat = position.coords.latitude;
            userLocation.lng = position.coords.longitude;

            // Haritayı kullanıcı konumuna odakla (Zoom seviyesi: 15)
            map.setView([userLocation.lat, userLocation.lng], 15);

            // Kullanıcı için bir işaretçi (Marker) ekle
            addMarker(userLocation.lat, userLocation.lng, "Konumunuz", "blue");
            
            statusBox.textContent = "Konum bulundu! Yakındaki noktalar aranıyor...";
            
            // Buradan sonra API çağrısı yapacağız (İleride eklenecek)
            // fetchNearbyPlaces(); 
        },
        // Hata olursa
        (error) => {
            console.error(error);
            statusBox.textContent = "Konum alınamadı. Lütfen konum izni verin.";
            // İzin verilmezse varsayılan bir konumu (Örn: İstanbul) gösterebiliriz.
        }
    );
}

// Yardımcı Fonksiyon: Marker Ekleme
function addMarker(lat, lng, popupText) {
    // Leaflet varsayılan marker'ı kullanır
    const marker = L.marker([lat, lng]).addTo(map);
    
    if (popupText) {
        marker.bindPopup(popupText).openPopup();
    }
    
    return marker;
}