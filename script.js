/**
 * PRINTOPIA - Solusi Cetak Digital Terpercaya
 * Main JavaScript Application
 * Author: Printopia Team
 * Version: 1.0.0
 */

// ========================================
// GLOBAL VARIABLES & CONFIGURATION
// ========================================

const APP_CONFIG = {
    // Telegram Bot Configuration
    TELEGRAM_BOT_TOKEN: '8419107888:AAELMvlciiWq0yQ8YzuIns-x_oy5v9gFJWw',
    TELEGRAM_CHAT_ID: '6132139122',
    
    // WhatsApp Configuration
    WHATSAPP_NUMBER: '6281234567890',
    
    // Google Maps Configuration
    GOOGLE_MAPS_API_KEY: 'AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbVKartNGg',
    DEFAULT_LOCATION: { lat: -2.5, lng: 118 },
    JAKARTA_LOCATION: { lat: -6.2088, lng: 106.8456 },
    
    // File Upload Configuration
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    SUPPORTED_FILE_TYPES: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.bmp', '.tiff'],
    
    // Price Configuration
    PRICES: {
        PAPER_SIZES: {
            'A4': 500,
            'A3': 1000,
            'F4': 600,
            'A5': 300
        },
        PHOTO_SIZES: {
            '2R': 2000,
            '3R': 3000,
            '4R': 5000,
            '5R': 8000,
            '6R': 12000,
            '8R': 20000
        },
        ADDITIONAL_SERVICES: {
            'binding': 5000,
            'laminating': 3000,
            'frame': 25000,
            'editing': 10000
        },
        DELIVERY_COST: 10000,
        COLOR_MULTIPLIER: 3,
        MATTE_MULTIPLIER: 1.2
    }
};

// Application State
let appState = {
    currentStep: 1,
    map: null,
    marker: null,
    geocoder: null,
    placesService: null,
    mapInitialized: false,
    mapApiLoaded: false,
    orderData: {
        service: '',
        customerName: '',
        customerPhone: '',
        paperSize: '',
        photoSize: '',
        printType: '',
        paperType: '',
        quantity: 1,
        delivery: '',
        address: '',
        coordinates: null,
        additional: [],
        files: [],
        basePrice: 0,
        totalPrice: 0,
        orderId: null,
        timestamp: null
    }
};

// ========================================
// INITIALIZATION
// ========================================

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Printopia Application Starting...");
    
    // Initialize all components
    initializeApp();
});

/**
 * Main initialization function
 */
function initializeApp() {
    try {
        // Initialize UI components
        initializeParticles();
        setupEventListeners();
        setupScrollEffects();
        loadOrderHistory();
        
        // Setup Google Maps
        setupGoogleMapsIntegration();
        
        // Check Google Maps status
        checkGoogleMapsStatus();
        
        console.log("✅ Application initialized successfully");
    } catch (error) {
        console.error("❌ Error initializing application:", error);
        showToast('Error', 'Gagal menginisialisasi aplikasi', 'error');
    }
}

/**
 * Setup Google Maps integration
 */
function setupGoogleMapsIntegration() {
    // Global callback for Google Maps API
    window.initMap = function() {
        console.log("🗺️ Google Maps API loaded successfully");
        appState.mapApiLoaded = true;
        // Trigger custom event
        window.dispatchEvent(new Event('googleMapsLoaded'));
    };

    // Error handling for authentication
    window.gm_authFailure = function() {
        console.error("❌ Google Maps API authentication failed");
        showMapFallback();
        showToast('Error', 'Google Maps tidak dapat dimuat. Silakan masukkan alamat manual.', 'error');
    };

    // Timeout detection
    setTimeout(function() {
        if (!window.google || !window.google.maps) {
            console.error("❌ Google Maps API timeout - not loaded within 10 seconds");
            showMapFallback();
            showToast('Error', 'Google Maps tidak dapat dimuat. Silakan masukkan alamat manual.', 'error');
        }
    }, 10000);

    // Event listener for Google Maps loaded
    window.addEventListener('googleMapsLoaded', function() {
        console.log("📍 Google Maps loaded event received");
        appState.mapApiLoaded = true;
        
        // Try to initialize map if container is ready
        const mapContainer = document.getElementById('map');
        if (mapContainer && mapContainer.offsetParent !== null) {
            initializeMap();
        }
    });
}

/**
 * Check Google Maps status
 */
function checkGoogleMapsStatus() {
    if (window.google && window.google.maps) {
        console.log("🗺️ Google Maps already available");
        appState.mapApiLoaded = true;
        initializeMap();
    } else {
        console.log("⏳ Waiting for Google Maps API to load...");
        // API will call initMap when ready
    }
}

// ========================================
// GOOGLE MAPS FUNCTIONALITY
// ========================================

/**
 * Initialize Google Map
 */
function initializeMap() {
    try {
        // Ensure API is loaded
        if (!window.google || !window.google.maps) {
            console.log("⏳ Google Maps API not available yet, waiting...");
            return;
        }

        // Check map container
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            console.error("❌ Map container not found");
            return;
        }

        // Ensure container is visible
        if (mapContainer.offsetParent === null) {
            console.log("⏳ Map container not visible, waiting...");
            setTimeout(initializeMap, 500);
            return;
        }

        console.log("🗺️ Initializing Google Maps...");
        
        // Create map
        appState.map = new google.maps.Map(mapContainer, {
            center: APP_CONFIG.DEFAULT_LOCATION,
            zoom: 5,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            styles: getMapStyles()
        });

        // Initialize services
        appState.geocoder = new google.maps.Geocoder();
        appState.placesService = new google.maps.places.PlacesService(appState.map);

        // Setup event listeners
        setupMapEventListeners();

        // Try to get user location
        getUserLocation();

        appState.mapInitialized = true;
        console.log("✅ Google Maps initialized successfully");
        
    } catch (error) {
        console.error("❌ Error initializing Google Maps:", error);
        showMapFallback();
        showToast('Error', 'Tidak dapat menginisialisasi peta: ' + error.message, 'error');
    }
}

/**
 * Get map styles
 */
function getMapStyles() {
    return [
        {
            "featureType": "all",
            "elementType": "geometry",
            "stylers": [{"color": "#1e293b"}]
        },
        {
            "featureType": "all",
            "elementType": "labels.text.fill",
            "stylers": [{"color": "#94a3b8"}]
        },
        {
            "featureType": "all",
            "elementType": "labels.text.stroke",
            "stylers": [{"color": "#0f172a"}]
        },
        {
            "featureType": "administrative",
            "elementType": "geometry",
            "stylers": [{"color": "#1e293b"}]
        },
        {
            "featureType": "poi",
            "elementType": "geometry",
            "stylers": [{"color": "#1e293b"}]
        },
        {
            "featureType": "road",
            "elementType": "geometry",
            "stylers": [{"color": "#334155"}]
        },
        {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [{"color": "#0f172a"}]
        }
    ];
}

/**
 * Setup map event listeners
 */
function setupMapEventListeners() {
    // Click event for map
    appState.map.addListener('click', function(e) {
        setMapLocation(e.latLng);
    });
}

/**
 * Get user location
 */
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const userLocation = { lat, lng };
                
                appState.map.setCenter(userLocation);
                appState.map.setZoom(13);
                setMapLocation(userLocation);
            },
            function(error) {
                console.log("⚠️ Geolocation failed:", error);
                // Default to Jakarta
                appState.map.setCenter(APP_CONFIG.JAKARTA_LOCATION);
                appState.map.setZoom(13);
            }
        );
    }
}

/**
 * Set location on map
 */
function setMapLocation(latLng) {
    try {
        if (!appState.map || !appState.mapInitialized) {
            console.error("❌ Map not initialized");
            return;
        }
        
        // Remove old marker
        if (appState.marker) {
            appState.marker.setMap(null);
        }
        
        // Create new marker
        appState.marker = new google.maps.Marker({
            position: latLng,
            map: appState.map,
            draggable: true,
            animation: google.maps.Animation.DROP
        });
        
        // Add drag event
        appState.marker.addListener('dragend', function(e) {
            setMapLocation(e.latLng);
        });
        
        // Save coordinates
        appState.orderData.coordinates = {
            lat: latLng.lat(),
            lng: latLng.lng()
        };
        
        // Reverse geocoding
        getAddressFromCoordinates(latLng);
        
    } catch (error) {
        console.error("❌ Error setting map location:", error);
        showToast('Error', 'Tidak dapat mengatur lokasi: ' + error.message, 'error');
    }
}

/**
 * Get address from coordinates
 */
function getAddressFromCoordinates(latLng) {
    if (!appState.geocoder) {
        console.error("❌ Geocoder not available");
        return;
    }
    
    appState.geocoder.geocode({ location: latLng }, function(results, status) {
        if (status === 'OK' && results[0]) {
            appState.orderData.address = results[0].formatted_address;
            document.getElementById('selectedAddress').textContent = results[0].formatted_address;
            showToast('Lokasi Dipilih', 'Alamat berhasil disimpan', 'success');
        } else {
            document.getElementById('selectedAddress').textContent = 
                'Lat: ' + latLng.lat().toFixed(6) + ', Lng: ' + latLng.lng().toFixed(6);
        }
    });
}

/**
 * Search address
 */
function searchAddress() {
    const query = document.getElementById('mapSearch').value;
    if (!query) return;
    
    if (!appState.placesService) {
        console.error("❌ Places service not available");
        showToast('Error', 'Layanan pencarian tidak tersedia', 'error');
        return;
    }
    
    const request = {
        query: query,
        fields: ['name', 'geometry'],
    };
    
    appState.placesService.findPlaceFromQuery(request, function(results, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
            const place = results[0];
            
            if (place.geometry && place.geometry.location) {
                appState.map.setCenter(place.geometry.location);
                appState.map.setZoom(15);
                setMapLocation(place.geometry.location);
            }
        } else {
            showToast('Error', 'Alamat tidak ditemukan', 'error');
        }
    });
}

/**
 * Show map fallback
 */
function showMapFallback() {
    console.log("🗺️ Showing map fallback");
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        mapContainer.innerHTML = `
            <div style="height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #1e293b; color: #e2e8f0; padding: 2rem; text-align: center;">
                <i class="fas fa-map-marked-alt" style="font-size: 3rem; margin-bottom: 1rem; color: var(--primary);"></i>
                <h3>Peta tidak tersedia</h3>
                <p>Silakan masukkan alamat lengkap Anda di bawah</p>
                <div style="width: 100%; margin-top: 1.5rem;">
                    <textarea id="fallbackAddress" class="form-control" rows="4" placeholder="Masukkan alamat lengkap Anda, termasuk jalan, kota, provinsi, dan kode pos"></textarea>
                    <button class="btn btn-primary" style="margin-top: 1rem; width: 100%;" onclick="setFallbackAddress()">
                        <i class="fas fa-check"></i> Atur Alamat
                    </button>
                </div>
            </div>
        `;
    }
}

/**
 * Set fallback address
 */
function setFallbackAddress() {
    const address = document.getElementById('fallbackAddress').value;
    if (address) {
        appState.orderData.address = address;
        appState.orderData.coordinates = { lat: 0, lng: 0 };
        document.getElementById('selectedAddress').textContent = address;
        showToast('Berhasil', 'Alamat telah diatur', 'success');
    } else {
        showToast('Error', 'Silakan masukkan alamat Anda', 'error');
    }
}

// ========================================
// UI COMPONENTS & EFFECTS
// ========================================

/**
 * Initialize animated particles
 */
function initializeParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;
    
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (15 + Math.random() * 10) + 's';
        particlesContainer.appendChild(particle);
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Upload area click
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.addEventListener('click', function() {
            document.getElementById('fileInput').click();
        });
    }

    // Menu toggle
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            this.classList.toggle('active');
        });
    }

    // Map search enter key
    const mapSearch = document.getElementById('mapSearch');
    if (mapSearch) {
        mapSearch.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchAddress();
            }
        });
    }

    // Quantity change
    const quantityInput = document.getElementById('quantity');
    if (quantityInput) {
        quantityInput.addEventListener('change', updatePrice);
    }
}

/**
 * Setup scroll effects
 */
function setupScrollEffects() {
    window.addEventListener('scroll', function() {
        const header = document.getElementById('header');
        if (header) {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        }
    });
}

// ========================================
// WIZARD FUNCTIONALITY
// ========================================

/**
 * Select service
 */
function selectService(service) {
    appState.orderData.service = service;
    
    // Update UI
    document.querySelectorAll('.service-option').forEach(option => {
        option.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    // Show/hide relevant options
    const printOptions = document.getElementById('printOptions');
    const photoOptions = document.getElementById('photoOptions');
    
    if (service === 'photo') {
        if (printOptions) printOptions.style.display = 'none';
        if (photoOptions) photoOptions.style.display = 'block';
    } else {
        if (printOptions) printOptions.style.display = 'block';
        if (photoOptions) photoOptions.style.display = 'none';
    }
    
    showToast('Layanan Dipilih', `Anda memilih layanan ${getServiceName(service)}`, 'success');
}

/**
 * Get service name
 */
function getServiceName(service) {
    const names = {
        'print': 'Print Dokumen',
        'copy': 'Fotokopi',
        'photo': 'Cetak Foto'
    };
    return names[service] || service;
}

/**
 * Select option
 */
function selectOption(type, value, price) {
    appState.orderData[type] = value;
    
    if (type === 'paperSize' || type === 'photoSize') {
        appState.orderData.basePrice = price;
    }
    
    // Update UI
    document.querySelectorAll('.option-card').forEach(card => {
        card.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    updatePrice();
}

/**
 * Toggle additional services
 */
function toggleAdditional(service, price) {
    const index = appState.orderData.additional.findIndex(item => item.service === service);
    
    if (index > -1) {
        appState.orderData.additional.splice(index, 1);
        event.currentTarget.classList.remove('selected');
    } else {
        appState.orderData.additional.push({ service, price });
        event.currentTarget.classList.add('selected');
    }
    
    updatePrice();
}

/**
 * Select delivery method
 */
function selectDelivery(type, price) {
    appState.orderData.delivery = type;
    
    if (type === 'delivery') {
        const mapContainer = document.getElementById('mapContainer');
        if (mapContainer) {
            mapContainer.style.display = 'block';
            
            // Trigger resize to ensure map renders correctly
            setTimeout(function() {
                if (appState.mapInitialized && appState.map) {
                    google.maps.event.trigger(appState.map, 'resize');
                } else if (appState.mapApiLoaded && !appState.mapInitialized) {
                    initializeMap();
                } else if (!appState.mapApiLoaded) {
                    console.log("⏳ Waiting for Google Maps API...");
                    showMapFallback();
                }
            }, 300);
        }
    } else {
        const mapContainer = document.getElementById('mapContainer');
        if (mapContainer) {
            mapContainer.style.display = 'none';
        }
    }
    
    // Update UI
    document.querySelectorAll('.option-card').forEach(card => {
        if (card.textContent.includes('Ambil') || card.textContent.includes('Antar')) {
            card.classList.remove('selected');
        }
    });
    event.currentTarget.classList.add('selected');
    
    updatePrice();
}

/**
 * Update price calculation
 */
function updatePrice() {
    let price = appState.orderData.basePrice || 0;
    
    // Apply quantity
    const quantity = parseInt(document.getElementById('quantity')?.value || 1);
    appState.orderData.quantity = quantity;
    price *= quantity;
    
    // Apply print type multiplier
    if (appState.orderData.printType === 'color') {
        price *= APP_CONFIG.PRICES.COLOR_MULTIPLIER;
    }
    
    // Apply paper type multiplier
    if (appState.orderData.paperType === 'matte') {
        price *= APP_CONFIG.PRICES.MATTE_MULTIPLIER;
    }
    
    // Add additional services
    appState.orderData.additional.forEach(item => {
        price += item.price;
    });
    
    // Add delivery cost
    if (appState.orderData.delivery === 'delivery') {
        price += APP_CONFIG.PRICES.DELIVERY_COST;
    }
    
    appState.orderData.totalPrice = Math.round(price);
}

/**
 * Navigate to next step
 */
function nextStep() {
    if (validateCurrentStep()) {
        if (appState.currentStep < 4) {
            appState.currentStep++;
            updateWizard();
        }
    }
}

/**
 * Navigate to previous step
 */
function previousStep() {
    if (appState.currentStep > 1) {
        appState.currentStep--;
        updateWizard();
    }
}

/**
 * Update wizard UI
 */
function updateWizard() {
    // Update steps
    document.querySelectorAll('.wizard-step').forEach(step => {
        step.classList.remove('active');
    });
    const currentStepElement = document.getElementById(`wizardStep${appState.currentStep}`);
    if (currentStepElement) {
        currentStepElement.classList.add('active');
    }
    
    // Update progress
    document.querySelectorAll('.step').forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index < appState.currentStep - 1) {
            step.classList.add('completed');
        } else if (index === appState.currentStep - 1) {
            step.classList.add('active');
        }
    });
    
    // Update progress line
    const progressLine = document.getElementById('progressLine');
    if (progressLine) {
        const progressWidth = ((appState.currentStep - 1) / 3) * 100;
        progressLine.style.width = progressWidth + '%';
    }
    
    // Update navigation buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    
    if (prevBtn) {
        prevBtn.style.display = appState.currentStep > 1 ? 'flex' : 'none';
    }
    if (nextBtn) {
        nextBtn.style.display = appState.currentStep < 4 ? 'flex' : 'none';
    }
    if (submitBtn) {
        submitBtn.style.display = appState.currentStep === 4 ? 'flex' : 'none';
    }
    
    // Update summary if on last step
    if (appState.currentStep === 4) {
        updateSummary();
    }
}

/**
 * Validate current step
 */
function validateCurrentStep() {
    switch(appState.currentStep) {
        case 1:
            if (!appState.orderData.service) {
                showToast('Error', 'Silakan pilih layanan terlebih dahulu', 'error');
                return false;
            }
            break;
            
        case 2:
            const customerName = document.getElementById('customerName')?.value;
            const customerPhone = document.getElementById('customerPhone')?.value;
            
            appState.orderData.customerName = customerName;
            appState.orderData.customerPhone = customerPhone;
            
            if (!customerName || !customerPhone) {
                showToast('Error', 'Silakan lengkapi data diri Anda', 'error');
                return false;
            }
            
            if (appState.orderData.service === 'print' || appState.orderData.service === 'copy') {
                if (!appState.orderData.paperSize) {
                    showToast('Error', 'Silakan pilih ukuran kertas', 'error');
                    return false;
                }
            } else if (appState.orderData.service === 'photo') {
                if (!appState.orderData.photoSize) {
                    showToast('Error', 'Silakan pilih ukuran foto', 'error');
                    return false;
                }
            }
            
            if (appState.orderData.delivery === 'delivery') {
                if (!appState.orderData.address || !appState.orderData.coordinates) {
                    showToast('Error', 'Silakan pilih lokasi pengiriman pada peta', 'error');
                    return false;
                }
            }
            break;
            
        case 3:
            if (appState.orderData.files.length === 0) {
                showToast('Error', 'Silakan upload file terlebih dahulu', 'error');
                return false;
            }
            break;
    }
    
    return true;
}

/**
 * Update summary
 */
function updateSummary() {
    const elements = {
        summaryService: document.getElementById('summaryService'),
        summaryName: document.getElementById('summaryName'),
        summaryPhone: document.getElementById('summaryPhone'),
        summaryQuantity: document.getElementById('summaryQuantity'),
        summaryFiles: document.getElementById('summaryFiles'),
        summaryTotal: document.getElementById('summaryTotal'),
        summaryPaperSizeItem: document.getElementById('summaryPaperSizeItem'),
        summaryPaperSize: document.getElementById('summaryPaperSize'),
        summaryPhotoSizeItem: document.getElementById('summaryPhotoSizeItem'),
        summaryPhotoSize: document.getElementById('summaryPhotoSize'),
        summaryAdditionalItem: document.getElementById('summaryAdditionalItem'),
        summaryAdditional: document.getElementById('summaryAdditional'),
        summaryAddressItem: document.getElementById('summaryAddressItem'),
        summaryAddress: document.getElementById('summaryAddress')
    };
    
    // Update basic info
    if (elements.summaryService) elements.summaryService.textContent = getServiceName(appState.orderData.service);
    if (elements.summaryName) elements.summaryName.textContent = appState.orderData.customerName;
    if (elements.summaryPhone) elements.summaryPhone.textContent = appState.orderData.customerPhone;
    if (elements.summaryQuantity) elements.summaryQuantity.textContent = appState.orderData.quantity;
    if (elements.summaryFiles) elements.summaryFiles.textContent = appState.orderData.files.length + ' file';
    if (elements.summaryTotal) elements.summaryTotal.textContent = 'Rp ' + appState.orderData.totalPrice.toLocaleString('id-ID');
    
    // Show/hide relevant fields
    if (appState.orderData.service === 'print' || appState.orderData.service === 'copy') {
        if (elements.summaryPaperSizeItem) elements.summaryPaperSizeItem.style.display = 'flex';
        if (elements.summaryPhotoSizeItem) elements.summaryPhotoSizeItem.style.display = 'none';
        if (elements.summaryPaperSize) elements.summaryPaperSize.textContent = appState.orderData.paperSize;
    } else {
        if (elements.summaryPaperSizeItem) elements.summaryPaperSizeItem.style.display = 'none';
        if (elements.summaryPhotoSizeItem) elements.summaryPhotoSizeItem.style.display = 'flex';
        if (elements.summaryPhotoSize) elements.summaryPhotoSize.textContent = appState.orderData.photoSize;
    }
    
    // Show additional services
    if (appState.orderData.additional.length > 0) {
        if (elements.summaryAdditionalItem) elements.summaryAdditionalItem.style.display = 'flex';
        const additionalNames = appState.orderData.additional.map(item => item.service).join(', ');
        if (elements.summaryAdditional) elements.summaryAdditional.textContent = additionalNames;
    } else {
        if (elements.summaryAdditionalItem) elements.summaryAdditionalItem.style.display = 'none';
    }
    
    // Show address if delivery
    if (appState.orderData.delivery === 'delivery' && appState.orderData.address) {
        if (elements.summaryAddressItem) elements.summaryAddressItem.style.display = 'flex';
        if (elements.summaryAddress) elements.summaryAddress.textContent = appState.orderData.address;
    } else {
        if (elements.summaryAddressItem) elements.summaryAddressItem.style.display = 'none';
    }
}

// ========================================
// FILE UPLOAD FUNCTIONALITY
// ========================================

/**
 * Handle drag over
 */
function handleDragOver(e) {
    e.preventDefault();
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.classList.add('dragover');
    }
}

/**
 * Handle drag leave
 */
function handleDragLeave(e) {
    e.preventDefault();
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.classList.remove('dragover');
    }
}

/**
 * Handle file drop
 */
function handleDrop(e) {
    e.preventDefault();
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.classList.remove('dragover');
    }
    const files = e.dataTransfer.files;
    processFiles(files);
}

/**
 * Handle file select
 */
function handleFileSelect(e) {
    const files = e.target.files;
    processFiles(files);
}

/**
 * Process uploaded files
 */
function processFiles(files) {
    for (let file of files) {
        if (file.size > APP_CONFIG.MAX_FILE_SIZE) {
            showToast('Error', `File ${file.name} terlalu besar (maks 50MB)`, 'error');
            continue;
        }
        
        appState.orderData.files.push(file);
        addFileToList(file);
    }
    
    showToast('Berhasil', `${files.length} file berhasil diupload`, 'success');
}

/**
 * Add file to list
 */
function addFileToList(file) {
    const fileList = document.getElementById('fileList');
    if (!fileList) return;
    
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.id = `file-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}`;
    
    fileItem.innerHTML = `
        <div class="file-info">
            <i class="fas fa-file file-icon"></i>
            <div>
                <div class="file-name">${file.name}</div>
                <div class="file-size">${formatFileSize(file.size)}</div>
            </div>
        </div>
        <button class="file-remove" onclick="removeFile('${file.name}')">
            <i class="fas fa-times"></i>
        </button>
        <div class="file-progress">
            <div class="file-progress-bar" id="progress-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}"></div>
        </div>
    `;
    fileList.appendChild(fileItem);
}

/**
 * Remove file
 */
function removeFile(fileName) {
    appState.orderData.files = appState.orderData.files.filter(file => file.name !== fileName);
    updateFileList();
    showToast('Info', 'File dihapus', 'success');
}

/**
 * Update file list
 */
function updateFileList() {
    const fileList = document.getElementById('fileList');
    if (!fileList) return;
    
    fileList.innerHTML = '';
    appState.orderData.files.forEach(file => addFileToList(file));
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ========================================
// ORDER SUBMISSION & TELEGRAM INTEGRATION
// ========================================

/**
 * Submit order
 */
function submitOrder() {
    // Generate order ID
    appState.orderData.orderId = 'ORD' + Date.now();
    appState.orderData.timestamp = new Date().toISOString();
    
    showLoading();
    
    // Send to Telegram
    sendOrderToTelegram()
        .then(() => {
            // Save to localStorage
            saveOrderToLocalStorage();
            
            hideLoading();
            showPaymentModal();
        })
        .catch(error => {
            console.error('❌ Error sending to Telegram:', error);
            hideLoading();
            showToast('Error', 'Gagal mengirim pesanan. Silakan coba lagi.', 'error');
        });
}

/**
 * Send order to Telegram Bot
 */
async function sendOrderToTelegram() {
    // First send order details message
    const message = formatOrderMessage();
    
    try {
        const response = await fetch(`https://api.telegram.org/bot${APP_CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: APP_CONFIG.TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML',
            })
        });
        
        if (!response.ok) {
            throw new Error('Gagal mengirim pesan');
        }
        
        const data = await response.json();
        console.log('📨 Telegram response:', data);
        
        // Now send each file
        if (appState.orderData.files.length > 0) {
            await sendFilesToTelegram();
        }
        
        showToast('Berhasil', 'Pesanan berhasil dikirim ke Telegram!', 'success');
    } catch (error) {
        console.error('❌ Telegram API Error:', error);
        
        // Fallback: Save to localStorage only
        saveOrderToLocalStorage();
        showToast('Info', 'Pesanan tersimpan secara lokal. Admin akan segera memproses.', 'info');
    }
}

/**
 * Send files to Telegram Bot
 */
async function sendFilesToTelegram() {
    const filePromises = appState.orderData.files.map(async (file, index) => {
        try {
            // Update progress bar
            const progressBar = document.getElementById(`progress-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}`);
            if (progressBar) {
                progressBar.style.width = '10%';
            }
            
            // Create FormData for file upload
            const formData = new FormData();
            formData.append('chat_id', APP_CONFIG.TELEGRAM_CHAT_ID);
            formData.append('document', file);
            formData.append('caption', `File ${index + 1} dari ${appState.orderData.files.length} untuk pesanan ${appState.orderData.orderId}`);
            
            // Update progress
            if (progressBar) {
                progressBar.style.width = '50%';
            }
            
            // Send file to Telegram
            const response = await fetch(`https://api.telegram.org/bot${APP_CONFIG.TELEGRAM_BOT_TOKEN}/sendDocument`, {
                method: 'POST',
                body: formData
            });
            
            // Update progress
            if (progressBar) {
                progressBar.style.width = '100%';
            }
            
            if (!response.ok) {
                throw new Error(`Gagal mengirim file ${file.name}`);
            }
            
            const data = await response.json();
            console.log(`📎 File ${file.name} sent successfully:`, data);
            
            // Remove progress bar after short delay
            setTimeout(() => {
                const fileItem = document.getElementById(`file-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}`);
                if (fileItem) {
                    const progressContainer = fileItem.querySelector('.file-progress');
                    if (progressContainer) {
                        progressContainer.style.display = 'none';
                    }
                }
            }, 1000);
            
            return data;
        } catch (error) {
            console.error(`❌ Error sending file ${file.name}:`, error);
            throw error;
        }
    });
    
    // Wait for all files to be sent
    await Promise.all(filePromises);
}

/**
 * Format order message for Telegram
 */
function formatOrderMessage() {
    let message = `<b>📋 PESANAN BARU - PRINTOPIA</b>\n\n`;
    message += `<b>🆔 ID Pesanan:</b> ${appState.orderData.orderId}\n`;
    message += `<b>📅 Tanggal:</b> ${new Date(appState.orderData.timestamp).toLocaleString('id-ID')}\n\n`;
    
    message += `<b>👤 Data Pelanggan:</b>\n`;
    message += `Nama: ${appState.orderData.customerName}\n`;
    message += `WhatsApp: ${appState.orderData.customerPhone}\n\n`;
    
    message += `<b>🖨️ Detail Pesanan:</b>\n`;
    message += `Layanan: ${getServiceName(appState.orderData.service)}\n`;
    
    if (appState.orderData.paperSize) {
        message += `Ukuran Kertas: ${appState.orderData.paperSize}\n`;
    }
    if (appState.orderData.photoSize) {
        message += `Ukuran Foto: ${appState.orderData.photoSize}\n`;
    }
    if (appState.orderData.printType) {
        message += `Jenis Cetak: ${appState.orderData.printType === 'color' ? 'Berwarna' : 'Hitam Putih'}\n`;
    }
    if (appState.orderData.paperType) {
        message += `Jenis Kertas: ${appState.orderData.paperType === 'glossy' ? 'Glossy' : 'Matte'}\n`;
    }
    
    message += `Jumlah: ${appState.orderData.quantity}\n`;
    message += `File: ${appState.orderData.files.length} file\n`;
    
    if (appState.orderData.additional.length > 0) {
        message += `Tambahan: ${appState.orderData.additional.map(item => item.service).join(', ')}\n`;
    }
    
    message += `Metode: ${appState.orderData.delivery === 'pickup' ? 'Ambil di Toko' : 'Antar ke Alamat'}\n`;
    
    if (appState.orderData.delivery === 'delivery' && appState.orderData.address) {
        message += `Alamat: ${appState.orderData.address}\n`;
        message += `Koordinat: ${appState.orderData.coordinates.lat}, ${appState.orderData.coordinates.lng}\n`;
    }
    
    message += `\n<b>💰 Total Pembayaran:</b> Rp ${appState.orderData.totalPrice.toLocaleString('id-ID')}`;
    
    return message;
}

/**
 * Save order to localStorage
 */
function saveOrderToLocalStorage() {
    const orders = JSON.parse(localStorage.getItem('printopia_orders') || '[]');
    orders.push(appState.orderData);
    localStorage.setItem('printopia_orders', JSON.stringify(orders));
}

// ========================================
// ORDER HISTORY
// ========================================

/**
 * Load order history
 */
function loadOrderHistory() {
    const orders = JSON.parse(localStorage.getItem('printopia_orders') || '[]');
    displayOrderHistory(orders);
}

/**
 * Display order history
 */
function displayOrderHistory(orders) {
    const orderList = document.getElementById('orderList');
    if (!orderList) return;
    
    if (orders.length === 0) {
        orderList.innerHTML = '<p style="text-align: center; color: #94a3b8;">Belum ada pesanan</p>';
        return;
    }
    
    orderList.innerHTML = orders.map(order => `
        <div class="order-item">
            <div class="order-number">#${order.orderId}</div>
            <div class="order-details">
                <div class="order-customer">${order.customerName}</div>
                <div class="order-service">${getServiceName(order.service)} - ${order.quantity}x</div>
                <div class="order-time">${new Date(order.timestamp).toLocaleString('id-ID')}</div>
            </div>
            <div class="order-status ${getOrderStatus(order)}">${getOrderStatus(order)}</div>
        </div>
    `).join('');
}

/**
 * Get order status
 */
function getOrderStatus(order) {
    const now = new Date();
    const orderTime = new Date(order.timestamp);
    const hoursDiff = (now - orderTime) / (1000 * 60 * 60);
    
    if (hoursDiff < 1) return 'pending';
    if (hoursDiff < 24) return 'processing';
    return 'completed';
}

/**
 * Show order history
 */
function showOrderHistory() {
    const historySection = document.getElementById('orderHistory');
    if (historySection) {
        historySection.classList.add('show');
        historySection.scrollIntoView({ behavior: 'smooth' });
    }
}

// ========================================
// PAYMENT MODAL
// ========================================

/**
 * Show payment modal
 */
function showPaymentModal() {
    const modal = document.getElementById('paymentModal');
    const modalPrice = document.getElementById('modalPrice');
    
    if (modal) {
        modal.style.display = 'block';
    }
    if (modalPrice) {
        modalPrice.textContent = 'Rp ' + appState.orderData.totalPrice.toLocaleString('id-ID');
    }
}

/**
 * Close payment modal
 */
function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Send payment proof
 */
function sendPaymentProof() {
    let message = `Halo Printopia,\n\nSaya sudah melakukan pembayaran untuk pesanan:\n\n`;
    message += `ID Pesanan: ${appState.orderData.orderId}\n`;
    message += `Layanan: ${getServiceName(appState.orderData.service)}\n`;
    message += `Nama: ${appState.orderData.customerName}\n`;
    message += `No. HP: ${appState.orderData.customerPhone}\n`;
    message += `Total Pembayaran: Rp ${appState.orderData.totalPrice.toLocaleString('id-ID')}\n`;
    message += `Jumlah File: ${appState.orderData.files.length} file\n`;
    
    if (appState.orderData.delivery === 'delivery' && appState.orderData.address) {
        message += `Alamat: ${appState.orderData.address}\n`;
        message += `Koordinat: ${appState.orderData.coordinates.lat}, ${appState.orderData.coordinates.lng}\n`;
    }
    
    message += `\nMohon konfirmasi pesanan saya. Terima kasih!`;
    
    window.open(`https://wa.me/${APP_CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
    
    showToast('Berhasil', 'Membuka WhatsApp untuk mengirim bukti pembayaran...', 'success');
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Show loading overlay
 */
function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('show');
    }
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('show');
    }
}

/**
 * Show toast notification
 */
function showToast(title, message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    const icon = toast?.querySelector('i');
    
    if (!toast || !toastTitle || !toastMessage) return;
    
    toast.className = `toast ${type}`;
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    
    if (icon) {
        if (type === 'success') {
            icon.className = 'fas fa-check-circle';
        } else if (type === 'error') {
            icon.className = 'fas fa-exclamation-circle';
        } else if (type === 'info') {
            icon.className = 'fas fa-info-circle';
        }
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * Scroll to order section
 */
function scrollToOrder() {
    const orderSection = document.getElementById('order');
    if (orderSection) {
        orderSection.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * Scroll to features section
 */
function scrollToFeatures() {
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
        featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * Open WhatsApp
 */
function openWhatsApp() {
    const message = 'Halo Printopia, saya ingin bertanya tentang layanan Anda.';
    window.open(`https://wa.me/${APP_CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
}

// ========================================
// GLOBAL EVENT HANDLERS
// ========================================

/**
 * Close modal when clicking outside
 */
window.onclick = function(event) {
    const modal = document.getElementById('paymentModal');
    if (event.target === modal) {
        closePaymentModal();
    }
}

/**
 * Handle keyboard shortcuts
 */
document.addEventListener('keydown', function(e) {
    // ESC key to close modals
    if (e.key === 'Escape') {
        closePaymentModal();
    }
    
    // Ctrl+Enter to submit form
    if (e.ctrlKey && e.key === 'Enter') {
        if (appState.currentStep === 4) {
            submitOrder();
        } else {
            nextStep();
        }
    }
});

// ========================================
// DEBUG & TESTING
// ========================================

/**
 * Test function for development (remove in production)
 */
function testMapIntegration() {
    console.log("=== Testing Map Integration ===");
    console.log("Google Maps API loaded:", !!window.google);
    console.log("Google Maps object:", !!window.google?.maps);
    console.log("Map initialized:", appState.mapInitialized);
    console.log("Map object:", !!appState.map);
    console.log("Map container exists:", !!document.getElementById('map'));
    console.log("Map container visible:", document.getElementById('map')?.offsetParent !== null);
    
    if (window.google && window.google.maps) {
        console.log("✅ API Key status: Valid");
    } else {
        console.log("❌ API Key status: Invalid or not loaded");
    }
}

// Call test function after 3 seconds (remove in production)
// setTimeout(testMapIntegration, 3000);

console.log("🎉 Printopia JavaScript loaded successfully!");