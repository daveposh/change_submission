// Simple Services Debug Script
console.log('🔍 === SERVICES DEBUG TEST ===');

// Test 1: Check if AssetAssociation module is available
if (window.AssetAssociation) {
    console.log('✅ AssetAssociation module is available');
    
    // Test 2: Check services state
    const state = window.AssetAssociation.state;
    console.log('📊 Services State:', {
        servicesCount: state.services?.length || 0,
        servicesLoaded: state.servicesLoaded,
        isLoadingServices: state.isLoadingServices,
        filteredServicesCount: state.filteredServices?.length || 0
    });
    
    // Test 3: Check if services DOM elements exist
    const servicesSearch = document.getElementById('services-search');
    const servicesList = document.getElementById('services-list');
    const servicesSection = document.querySelector('.services-selection-section');
    
    console.log('🔍 DOM Elements Check:', {
        servicesSearch: !!servicesSearch,
        servicesList: !!servicesList,
        servicesSection: !!servicesSection,
        servicesSearchVisible: servicesSearch ? servicesSearch.offsetParent !== null : false,
        servicesListVisible: servicesList ? servicesList.offsetParent !== null : false
    });
    
    // Test 4: Try to manually load services
    if (window.AssetAssociation.loadServices) {
        console.log('🔄 Attempting to manually load services...');
        window.AssetAssociation.loadServices().then(() => {
            console.log('✅ Manual services load completed');
            console.log('📊 Updated services count:', window.AssetAssociation.state.services?.length || 0);
            
            // Try to populate display
            if (window.AssetAssociation.populateServicesDisplay) {
                window.AssetAssociation.populateServicesDisplay();
                console.log('✅ Services display populated');
            }
        }).catch(error => {
            console.error('❌ Manual services load failed:', error);
        });
    }
    
    // Test 5: Check CacheManager
    if (window.CacheManager) {
        console.log('✅ CacheManager is available');
        if (window.CacheManager.getCachedServices) {
            window.CacheManager.getCachedServices().then(services => {
                console.log('📦 Cached services count:', services?.length || 0);
                if (services && services.length > 0) {
                    console.log('📋 Sample cached services:', services.slice(0, 3).map(s => s.name));
                }
            }).catch(error => {
                console.error('❌ Error getting cached services:', error);
            });
        }
    } else {
        console.error('❌ CacheManager not available');
    }
    
} else {
    console.error('❌ AssetAssociation module not available');
}

// Test 6: Check if services tab is visible
const servicesTab = document.querySelector('[data-bs-target="#asset-association"]');
if (servicesTab) {
    console.log('✅ Asset association tab found');
    
    // Check if tab is active
    const isActive = servicesTab.classList.contains('active');
    console.log('📋 Tab active:', isActive);
    
    if (!isActive) {
        console.log('💡 Try clicking the "Asset Association" tab to see services');
    }
} else {
    console.error('❌ Asset association tab not found');
}

console.log('🏁 === END SERVICES DEBUG TEST ==='); 