/**
 * Freshservice Change Request App
 * Version: 7.2.4
 */

console.log('🔧 Change Request App Loading - Version 7.2.4');
console.log('🔧 This version includes app.initialized() fix for Freshworks apps');
console.log('⚡ This version has user/agent search caching features enabled');
console.log('🔍 User/Agent search caching: Enabled with configurable timeout');
console.log('📧 Debug mode: Check console for detailed logs');
console.log('🗑️ Asset search functionality removed - blank slate provided');

/**
 * Change Request App
 * Full page application for managing change requests in Freshservice
 */

// Live search state management
const liveSearchState = {
  requester: {
    timer: null,
    isActive: false,
    minLength: 3,
    delay: 500
  },
  agent: {
    timer: null,
    isActive: false,
    minLength: 3,
    delay: 500
  }
};

// Utility functions
/**
 * Debounce function to limit API calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
  let timeoutId;
  return function executedFunction(...args) {
    const context = this;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(context, args), wait);
  };
}

// Cache structures
const CACHE = {
  KEYS: {
    ASSET_TYPES: 'asset_types_cache'
  },
  TIMEOUTS: {
    ASSET_TYPES: 20 * 60 * 1000 // 20 minutes
  }
};

// Cache storage
const cache = {
  asset_types: {
    data: {},
    timestamp: 0
  }
};

/**
 * Fetch and cache all asset types
 * @returns {Promise<Object>} Cached asset types
 */
async function fetchAndCacheAssetTypes() {
  try {
    console.log('Fetching and caching asset types...');
    const assetTypes = await fetchAllAssetTypes();
    await cacheAssetTypes(assetTypes);
    console.log(`Cached ${assetTypes.length} asset types`);
    return assetTypes;
  } catch (error) {
    console.error('Error fetching and caching asset types:', error);
    throw error;
  }
}

/**
 * Get asset types (from cache or fetch if needed)
 * @returns {Promise<Object>} - Asset types object
 */
async function getAssetTypes() {
  try {
    // Try to get cached asset types first
    const cachedTypes = await getCachedAssetTypes();
    
    // Check if cache is valid and not expired
    if (Object.keys(cachedTypes).length > 0) {
      // Check if any cached item is not expired (5 minute timeout)
      const now = Date.now();
      const hasValidCache = Object.values(cachedTypes).some(type => 
        type.timestamp && (now - type.timestamp) < CACHE_TIMEOUT
      );
      
      if (hasValidCache) {
        console.log(`✅ Using cached asset types (${Object.keys(cachedTypes).length} types)`);
        return cachedTypes;
      }
    }
    
    // Cache is empty or expired, fetch fresh data
    console.log('🔄 Asset types cache expired or empty, fetching fresh data...');
    return await fetchAllAssetTypes();
  } catch (error) {
    console.error('❌ Error getting asset types:', error);
    return {};
  }
}

/**
 * Find asset type IDs by names from iparams config
 * @returns {Promise<number[]>} Array of matching asset type IDs
 */
async function getConfiguredAssetTypeIds() {
  try {
    // Get configured names from iparams
    const params = await getInstallationParams();
    const configuredNames = (params.assetTypeNames || '').split(',').map(n => n.trim().toLowerCase());

    if (configuredNames.length === 0) {
      console.warn('No asset type names configured');
      return [];
    }

    // Get asset types from cache
    const assetTypes = await getAssetTypes();

    // Find matching IDs
    const matchingIds = [];
    Object.entries(assetTypes).forEach(([id, type]) => {
      const typeName = type.name.toLowerCase();
      if (configuredNames.some(name => typeName.includes(name))) {
        matchingIds.push(parseInt(id));
      }
    });

    return matchingIds;
  } catch (error) {
    console.error('Error getting configured asset type IDs:', error);
    return [];
  }
}

/**
 * Fetch and cache services based on configured asset types
 * @returns {Array} Empty array - services functionality removed
 */
function fetchAndCacheServices() {
  // Services functionality removed - blank slate provided
  console.log('Services functionality removed');
  return [];
}

/**
 * Get services (filtered from assets by specific service asset type IDs)
 */
function getServices() {
  // Services functionality removed - blank slate provided
  console.log('Services functionality removed');
  return [];
}

/**
 * Fetch assets by asset type ID
 */
function fetchAssetsByType(assetTypeId) {
  return new Promise((resolve, reject) => {
    if (!window.client || !window.client.request) {
      reject(new Error('Client not available'));
      return;
    }

    // Use the asset search API with asset type filter
    const requestUrl = `?asset_type_id=${assetTypeId}&per_page=100`;
    
    window.client.request.invokeTemplate("getAssets", {
      path_suffix: requestUrl
    })
    .then(function(data) {
      try {
        if (!data || !data.response) {
          resolve([]);
          return;
        }
        
        const response = JSON.parse(data.response);
        const assets = response.assets || [];
        
        resolve(assets);
      } catch (error) {
        console.error(`Error parsing assets for type ${assetTypeId}:`, error);
        resolve([]);
      }
    })
    .catch(function(error) {
      console.error(`API request failed for asset type ${assetTypeId}:`, error);
      resolve([]);
    });
  });
}

/**
 * Fetch all assets (fallback function)
 */
function fetchAllAssets() {
  return new Promise((resolve, reject) => {
    if (!window.client || !window.client.request) {
      reject(new Error('Client not available'));
      return;
    }

    window.client.request.invokeTemplate("getAssets", {
      path_suffix: "?per_page=100"
    })
    .then(function(data) {
      try {
        if (!data || !data.response) {
          resolve([]);
          return;
        }
        
        const response = JSON.parse(data.response);
        const assets = response.assets || [];
        
        resolve(assets);
      } catch (error) {
        console.error('Error parsing all assets:', error);
        resolve([]);
      }
    })
    .catch(function(error) {
      console.error('API request failed for all assets:', error);
      resolve([]);
    });
  });
}

/**
 * Get cached services
 */
function getCachedServices() {
  // Services functionality removed - blank slate provided
  console.log('Services cache functionality removed');
  return null;
}

/**
 * Cache services data
 */
function cacheServices() {
  // Services functionality removed - blank slate provided
  console.log('Services cache functionality removed');
}

/**
 * Clear services cache (useful when changing service logic)
 */
function clearServicesCache() {
  // Services functionality removed - blank slate provided
  console.log('Services cache functionality removed');
}

const changeRequestData = {
  requester: null,
  agent: null,
  changeType: 'normal',
  reasonForChange: '',
  leadTime: '2 business days',
  plannedStart: '',
  plannedEnd: '',
  implementationPlan: '',
  backoutPlan: '',
  validationPlan: '',
  selectedAssets: [],
  riskAssessment: {
    businessImpact: 0,
    affectedUsers: 0,
    complexity: 0,
    testing: 0,
    rollback: 0,
    totalScore: 0,
    riskLevel: ''
  },
  // Asset association data
  assetAssociations: [],
  
  // Impacted services data
  impactedServices: {
    directAssets: [],
    relatedAssets: [],
    approvers: [],
    stakeholders: [],
    analysisComplete: false
  },
  
  // Risk assessment data
  riskAssessment: {
    businessImpact: '',
    likelihood: '',
    riskMitigation: '',
    totalScore: 0,
    riskLevel: 'Low'
  }
};

// Make changeRequestData available globally
window.changeRequestData = changeRequestData;

// Data storage keys
const STORAGE_KEYS = {
  CHANGE_REQUEST_DATA: 'change_request_data',
  DRAFT_ID: 'change_request_draft_id',
  USER_CACHE: 'user_cache',
  ASSET_TYPE_CACHE: 'asset_type_cache',
  LOCATION_CACHE: 'location_cache'
};

// Cache timeout in milliseconds (24 hours)
const CACHE_TIMEOUT = 24 * 60 * 60 * 1000;

// Default search cache timeout in milliseconds (7 seconds)
const DEFAULT_SEARCH_CACHE_TIMEOUT = 7000;

// Pagination delay in milliseconds (500ms between requests)
const DEFAULT_PAGINATION_DELAY = 500;

// In-memory cache for search results
const searchCache = {
  requesters: {}, // Map of search term -> { results, timestamp }
  agents: {}      // Map of search term -> { results, timestamp }
};

// Asset type cache
const assetTypeCache = {
  byId: {}, // Map of asset_type_id -> { name, description, timestamp }
  list: [],  // List of all asset types
  timestamp: 0, // Last update timestamp
  types: {} // Legacy support for older code
};

// Default safety margin for API rate limiting (70%)
const DEFAULT_SAFETY_MARGIN = 70;

// Default inventory software/services type IDs (can be multiple)
// Based on your asset types: 37000374726 has software like Active Directory
const DEFAULT_INVENTORY_TYPE_IDS = [37000374726, 37000374859]; // Include both software and server types

// Default asset type timeout (24 hours)
const ASSET_TYPE_CACHE_TIMEOUT = 24 * 60 * 60 * 1000;

// Default rate limits if not configured during installation
const DEFAULT_RATE_LIMITS = {
  starter: {
    overall: 100,
    listTickets: 40,
    viewTicket: 50,
    createTicket: 50,
    updateTicket: 50,
    listAssets: 40,
    updateAsset: 50,
    listAgents: 40,
    listRequesters: 40
  },
  growth: {
    overall: 200,
    listTickets: 70,
    viewTicket: 80,
    createTicket: 80,
    updateTicket: 80,
    listAssets: 70,
    updateAsset: 80,
    listAgents: 70,
    listRequesters: 70
  },
  pro: {
    overall: 400,
    listTickets: 120,
    viewTicket: 140,
    createTicket: 140,
    updateTicket: 140,
    listAssets: 120,
    updateAsset: 140,
    listAgents: 120,
    listRequesters: 120
  },
  enterprise: {
    overall: 500,
    listTickets: 140,
    viewTicket: 160,
    createTicket: 160,
    updateTicket: 160,
    listAssets: 140,
    updateAsset: 160,
    listAgents: 140,
    listRequesters: 140
  }
};

const changeTypeTooltips = {
  'normal': 'Normal Change: All Changes to systems that are managed by CXI IT in the production environment and go through peer and approval process',
  'emergency': 'Emergency Changes: Changes arise from an unexpected error/issue and need to be addressed immediately to restore service for customers or employees, or to secure a system against a threat'
};

const leadTimeText = {
  'normal': '2 business days',
  'emergency': 'No lead time required'
};

// Load FontAwesome if not already loaded
function loadFontAwesome() {
  try {
    // Check if Font Awesome is already loaded
    if (!document.querySelector('link[href*="fontawesome"]')) {
      console.log('Loading FontAwesome...');
      
      // Use FDK-friendly approach to load external resources
      // First create the link element
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
      
      // Add it to the head
      document.head.appendChild(link);
      
      console.log('FontAwesome loaded');
    } else {
      console.log('FontAwesome already loaded');
    }
  } catch (error) {
    // If there's an error loading Font Awesome, we'll provide fallback icons
    console.error('Error loading FontAwesome:', error);
    
    // Add basic fallback icons using CSS
    const style = document.createElement('style');
    style.textContent = `
      /* Fallback icons using CSS */
      .icon-fallback-user:before { content: "👤"; }
      .icon-fallback-email:before { content: "✉"; }
      .icon-fallback-building:before { content: "🏢"; }
      .icon-fallback-location:before { content: "📍"; }
      .icon-fallback-desktop:before { content: "💻"; }
      .icon-fallback-times:before { content: "✕"; }
    `;
    document.head.appendChild(style);
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM ready, initializing Freshworks app...');
  
  // Use Freshworks standard initialization
  app.initialized().then(function(client) {
    console.log('Freshworks app initialized successfully');
    window.client = client;
    
    // Start the app initialization with progress tracking
    initializeAppWithProgress();
    
    // Expose global debug functions
    console.log('🔧 Setting up global debug functions...');
    
    // Make sure functions are available in console
    if (typeof window.clearAllCache === 'undefined') {
      console.warn('clearAllCache not found, will be defined after initialization');
    }
    
    // Expose essential debug functions only
    console.log('🔧 Setting up essential debug functions...');
    
    // Simple, reliable cache clearing function
    window.forceClearServices = function() {
      console.log('🧹 Force clearing services cache...');
      
      // Clear localStorage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('services_cache')) {
          localStorage.removeItem(key);
          console.log(`✅ Removed: ${key}`);
        }
      });
      
      // Reload the page to force fresh data
      console.log('🔄 Reloading page to force fresh data...');
      location.reload();
    };
    
    // Essential debug functions
    window.clearAssetCache = async function() {
      try {
        console.log('🧹 Clearing asset caches and forcing refresh...');
        
        // Clear asset type cache
        await window.client.db.set(STORAGE_KEYS.ASSET_TYPE_CACHE, {});
        console.log('✅ Cleared asset type cache');
        
        // Clear in-memory caches for users/agents only
        delete searchCache.assets;
        delete searchCache.assetsByType;
        
        console.log('✅ Cleared in-memory user/agent caches');
        
        // Force refresh asset types
        console.log('🔄 Fetching fresh asset types...');
        await fetchAllAssetTypes();
        
        console.log('✅ Cache cleared and refresh triggered!');
        
      } catch (error) {
        console.error('❌ Error clearing cache:', error);
      }
    };
    
    // Test function to verify console access
    window.testConsole = function() {
      console.log('✅ Console access working! Available functions:');
      console.log('- clearAllCache() - Clear all caches and refresh');
      console.log('- refreshServices() - Refresh just services');
      console.log('- debugServiceFilter() - Debug service filtering');
      console.log('- refreshServicesWithDebug() - Refresh with detailed logs');
      console.log('- forceClearServices() - Simple cache clear (always works)');
      console.log('- showApiLimits() - Show API limits and constraints');
      console.log('- testEfficientServicesLoading() - Test new efficient services loading');
      console.log('- compareLoadingStrategies() - Compare old vs new loading approaches');
      console.log('- debugAssetTypes() - Debug asset type configuration');
      console.log('- showConfiguredAssetTypes() - Show configured asset types');
      console.log('- findSoftwareServicesAssetTypeIds() - Find asset type IDs');
      console.log('- checkAvailableAssetTypes() - Check available asset types');
      console.log('- testAssetTypeCaching() - Test asset type caching system');
      console.log('- fetchLaptopAssetType() - Specifically fetch laptop asset type');
      console.log('- testLocationCaching() - Test location caching system');
      console.log('- testLocationsAPI() - Test locations API endpoint');
      console.log('- testAvailableAPIs() - Test all available API endpoints');
      console.log('- testAssetTypePagination() - Test asset type pagination');
      console.log('- testLocationPagination() - Test location pagination');
      console.log('🗑️ Asset search test functions removed - see blank slate comment');
    };
    
    console.log('💡 Type testConsole() in the console to verify access');
    
    // Simple validation test function
    window.testValidation = function() {
      console.log('🧪 Testing validation functions...');
      
      console.log('changeRequestData:', changeRequestData);
      console.log('window.changeRequestData:', window.changeRequestData);
      
      // Test risk inputs
      const riskInputs = document.querySelectorAll('input[name="business-impact"], input[name="affected-users"], input[name="complexity"], input[name="testing"], input[name="rollback"]');
      console.log('Risk inputs found:', riskInputs.length);
      
      // Test form fields
      const formFields = ['requester-search', 'agent-search', 'planned-start', 'planned-end', 'implementation-plan', 'backout-plan', 'validation-plan'];
      formFields.forEach(id => {
        const field = document.getElementById(id);
        console.log(`Field ${id}:`, field ? 'Found' : 'Missing');
      });
      
      // Test functions
      const functions = ['validateDetailsAndNext', 'validateAssetsAndNext', 'validateRiskAndNext', 'updateRiskSelection', 'calculateRisk'];
      functions.forEach(funcName => {
        console.log(`Function ${funcName}:`, typeof window[funcName] === 'function' ? 'Available' : 'Missing');
      });
      
      // Test event listeners on risk inputs
      console.log('Testing risk input event listeners...');
      riskInputs.forEach((input, index) => {
        console.log(`Risk input ${index}: name="${input.name}", value="${input.value}", listeners attached: ${input.onchange ? 'Yes' : 'No'}`);
      });
    };
    
    console.log('✅ Debug functions setup complete');
    
    // Test asset type resolution function
    window.testAssetTypeResolution = async function() {
      console.log('🔧 === TESTING ASSET TYPE RESOLUTION ===');
      
      // Clear cache first to force fresh fetch
      await window.client.db.set(STORAGE_KEYS.ASSET_TYPE_CACHE, {
        timestamp: Date.now(),
        data: {}
      });
      console.log('🧹 Cleared asset type cache');
      
      // Test the specific problematic asset type
      console.log('🔍 Testing asset type ID 37000374826 (ORLIT20-LT laptop)...');
      console.log('🎯 Expected result: Should show "Laptop" or similar, NOT "Software/Services"');
      
      // First, test the broken individual endpoint
      console.log('\n1️⃣ Testing individual asset type endpoint (known to be broken):');
      try {
        const response = await window.client.request.invokeTemplate("getAssetTypes", {
          path_suffix: `/37000374826`
        });
        
        if (response && response.response) {
          const data = JSON.parse(response.response);
          console.log(`   📦 Individual endpoint returned: ${data.asset_types?.length || 0} asset types`);
          if (data.asset_types && data.asset_types.length > 0) {
            const firstType = data.asset_types[0];
            console.log(`   ❌ Individual endpoint incorrectly returns: "${firstType.name}" (ID: ${firstType.id})`);
            console.log(`   ⚠️ This is why laptop shows as "Software/Services"`);
          }
        }
      } catch (error) {
        console.log(`   ❌ Individual endpoint failed: ${error.message}`);
      }
      
      // Now test the pagination approach
      console.log('\n2️⃣ Testing pagination approach to find the correct asset type:');
      const laptopTypeName = await getAssetTypeName(37000374826);
      console.log(`🎯 Result via pagination: "${laptopTypeName}"`);
      
      // Show what's in cache now
      const cache = await getCachedAssetTypes();
      if (cache[37000374826]) {
        console.log(`✅ Cache entry: "${cache[37000374826].name}"`);
        if (cache[37000374826].name !== 'Software/Services') {
          console.log('🎉 SUCCESS: Asset type resolution fixed!');
        } else {
          console.log('❌ STILL BROKEN: Still showing as Software/Services');
        }
      } else {
        console.log('❌ Asset type not found in cache');
      }
    };
    
    console.log('💡 Type testAssetTypeResolution() to test the laptop asset type fix');
    
    // Test pagination specifically for asset types
    window.testAssetTypePagination = async function() {
      console.log('🔧 === TESTING ASSET TYPE PAGINATION ===');
      
      // Clear cache first
      await window.client.db.set(STORAGE_KEYS.ASSET_TYPE_CACHE, {
        timestamp: Date.now(),
        data: {}
      });
      console.log('🧹 Cleared asset type cache');
      
      console.log('🔍 Testing pagination to find laptop asset type (ID: 37000374826)...');
      
      let foundLaptopType = null;
      let totalTypes = 0;
      let page = 1;
      const maxPages = 15; // Test more pages
      
      while (page <= maxPages && !foundLaptopType) {
        console.log(`📄 Testing page ${page}...`);
        
        try {
          const response = await window.client.request.invokeTemplate("getAssetTypes", {
            context: {
              page: page.toString(),
              per_page: '30'
            }
          });
          
          if (!response || !response.response) {
            console.log(`❌ No response from page ${page}`);
            break;
          }
          
          const data = JSON.parse(response.response);
          const assetTypes = data.asset_types || [];
          
          console.log(`   📦 Page ${page}: ${assetTypes.length} asset types`);
          totalTypes += assetTypes.length;
          
          // Check if laptop type is on this page
          const laptopType = assetTypes.find(type => type.id === 37000374826);
          if (laptopType) {
            foundLaptopType = laptopType;
            console.log(`🎯 FOUND LAPTOP TYPE on page ${page}!`);
            console.log(`   Name: "${laptopType.name}"`);
            console.log(`   ID: ${laptopType.id}`);
            console.log(`   Description: ${laptopType.description || 'N/A'}`);
            break;
          }
          
          // If no results, we've reached the end
          if (assetTypes.length === 0) {
            console.log(`📄 No more results on page ${page}, stopping`);
            break;
          }
          
        } catch (error) {
          console.log(`❌ Error on page ${page}: ${error.message}`);
          break;
        }
        
        page++;
      }
      
      console.log(`\n📊 Summary:`);
      console.log(`   Total pages tested: ${page - 1}`);
      console.log(`   Total asset types found: ${totalTypes}`);
      
      if (foundLaptopType) {
        console.log(`✅ SUCCESS: Found laptop asset type "${foundLaptopType.name}" on page ${page - 1}`);
        console.log(`🔧 Recommendation: Increase maxPages to at least ${page} in fetchAllAssetTypes()`);
      } else {
        console.log(`❌ FAILED: Laptop asset type (37000374826) not found in ${page - 1} pages`);
        console.log(`🔧 Recommendation: Check if asset type exists or increase pagination further`);
      }
    };
    
    console.log('💡 Type testAssetTypePagination() to test pagination and find the laptop asset type');
    
    // Test pagination specifically for locations
    window.testLocationPagination = async function() {
      console.log('🔧 === TESTING LOCATION PAGINATION ===');
      
      // Clear cache first
      await window.client.db.set(STORAGE_KEYS.LOCATION_CACHE, {
        timestamp: Date.now(),
        data: {}
      });
      console.log('🧹 Cleared location cache');
      
      console.log('🔍 Testing pagination to find target location (ID: 37000074320)...');
      
      let foundTargetLocation = null;
      let totalLocations = 0;
      let page = 1;
      const maxPages = 15; // Test more pages
      
      while (page <= maxPages && !foundTargetLocation) {
        console.log(`📄 Testing page ${page}...`);
        
        try {
          const response = await window.client.request.invokeTemplate("getLocations", {
            context: {
              page: page.toString(),
              per_page: '30'
            }
          });
          
          if (!response || !response.response) {
            console.log(`❌ No response from page ${page}`);
            break;
          }
          
          const data = JSON.parse(response.response);
          const locations = data.locations || [];
          
          console.log(`   📦 Page ${page}: ${locations.length} locations`);
          totalLocations += locations.length;
          
          // Check if target location is on this page
          const targetLocation = locations.find(loc => loc.id === 37000074320);
          if (targetLocation) {
            foundTargetLocation = targetLocation;
            console.log(`🎯 FOUND TARGET LOCATION on page ${page}!`);
            console.log(`   Name: "${targetLocation.name}"`);
            console.log(`   ID: ${targetLocation.id}`);
            break;
          }
          
          // If no results, we've reached the end
          if (locations.length === 0) {
            console.log(`📄 No more results on page ${page}, stopping`);
            break;
          }
          
        } catch (error) {
          console.log(`❌ Error on page ${page}: ${error.message}`);
          break;
        }
        
        page++;
      }
      
      console.log(`\n📊 Summary:`);
      console.log(`   Total pages tested: ${page - 1}`);
      console.log(`   Total locations found: ${totalLocations}`);
      
      if (foundTargetLocation) {
        console.log(`✅ SUCCESS: Found target location "${foundTargetLocation.name}" on page ${page - 1}`);
      } else {
        console.log(`❌ FAILED: Target location (37000074320) not found in ${page - 1} pages`);
        console.log(`🔧 This location may not exist in the system`);
      }
    };
    
    console.log('💡 Type testLocationPagination() to test location pagination');
    
    // Initialization is now handled by initializeAppWithProgress() called earlier
    
  }).catch(function(error) {
    console.error('Freshworks app initialization failed:', error);
    displayInitError('Failed to initialize Freshworks client. Please refresh the page and try again.');
  });
});

/**
 * Fetch all locations from the API and store them in the cache
 * @returns {Promise<Object>} - Cached locations
 */
async function fetchAllLocations() {
  console.log('🔄 Fetching all locations from API');
  
  // Check for client availability
  if (!window.client || !window.client.request || !window.client.request.invokeTemplate) {
    console.log('⚠️ Client or invokeTemplate not available for locations fetch - using graceful degradation');
    return {};
  }

  // Test if locations API is available first
  try {
    console.log('🔬 Testing if locations API is available...');
    const testResponse = await window.client.request.invokeTemplate("getLocations", {
      context: {
        page: 1,
        per_page: 1
      }
    });
    
    if (!testResponse || !testResponse.response) {
      console.log('⚠️ Locations API test failed - API may not be available in this instance');
      return {};
    }
    
    console.log('✅ Locations API is available, proceeding with pagination fetch');
  } catch (testError) {
    console.log('⚠️ Locations API is not available in this Freshservice instance:', testError);
    console.log('ℹ️ Location resolution will fall back to displaying Location IDs');
    return {};
  }

  try {
    const allLocations = {};
    let page = 1;
    let totalFetched = 0;
    const maxPages = 10; // Use same limit as asset types initially
    
    console.log(`📡 Starting location pagination fetch (max ${maxPages} pages)`);
    console.log(`📋 Will fetch pages until: (1) 0 results returned, OR (2) max pages reached`);
    
    // Continue fetching pages until we get no more results
    while (page <= maxPages) {
      console.log(`📄 Fetching locations page ${page}...`);
      
      try {
        // Use invokeTemplate to access locations API with proper pagination
        const response = await window.client.request.invokeTemplate("getLocations", {
          context: {
            page: page.toString(),
            per_page: '30'
          }
        });
        
        if (!response || !response.response) {
          console.log(`⚠️ No response for locations page ${page}, stopping pagination`);
          break;
        }
        
        let parsedData;
        try {
          parsedData = JSON.parse(response.response);
        } catch (parseError) {
          console.log(`⚠️ Error parsing locations page ${page}:`, parseError);
          break;
        }
        
        const locations = parsedData.locations || [];
        console.log(`✅ Page ${page}: Retrieved ${locations.length} locations`);
        
        // If we got no results, we've reached the end
        if (locations.length === 0) {
          console.log(`📄 No more locations found, stopping at page ${page}`);
          break;
        }
        
        // Process and cache the locations from this page
        locations.forEach(location => {
          if (location && location.id && location.name) {
            allLocations[location.id] = {
              name: location.name,
              description: location.description || '',
              timestamp: Date.now()
            };
            totalFetched++;
            
            // Log specific locations we're looking for
            if (location.id === 37000074320) {
              console.log(`🎯 Found target location: "${location.name}" (ID: ${location.id})`);
            }
          }
        });
        
        // Check if we found the target location on this page
        const foundTargetLocation = locations.find(loc => loc.id === 37000074320);
        if (foundTargetLocation) {
          console.log(`🎉 SUCCESS: Found target location on page ${page}: "${foundTargetLocation.name}"`);
        }
        
        page++;
        
        // Add a small delay between pages to be API-friendly
        if (page <= maxPages) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (pageError) {
        console.log(`⚠️ Error fetching locations page ${page}:`, pageError);
        // Don't break on individual page errors, try next page
        page++;
        continue;
      }
    }
    
    // Save all locations to cache
    if (totalFetched > 0) {
      console.log(`✅ Successfully cached ${totalFetched} locations from ${page - 1} pages`);
      await cacheLocations(allLocations);
      
      // Specifically check if we got the target location
      if (allLocations[37000074320]) {
        console.log(`🎯 ✅ Target location cached: "${allLocations[37000074320].name}"`);
      } else {
        console.log('🎯 ⚠️ Target location (ID: 37000074320) not found in fetched data');
        console.log(`🔍 Available location IDs: ${Object.keys(allLocations).slice(0, 10).join(', ')}${Object.keys(allLocations).length > 10 ? '...' : ''}`);
      }
      
      // Log sample of cached locations for debugging
      const sampleLocations = Object.entries(allLocations).slice(0, 5);
      console.log('📋 Sample cached locations:');
      sampleLocations.forEach(([id, location]) => {
        console.log(`   ${id}: "${location.name}"`);
      });
    } else {
      console.log('⚠️ No locations found to cache - locations API may not be available');
    }
    
    return allLocations;
  } catch (error) {
    console.error('❌ Error in fetchAllLocations:', error);
    return {};
  }
}

/**
 * Fetch all asset types from the API and store them in the cache
 * @returns {Promise<Object>} - Cached asset types
 */
async function fetchAllAssetTypes() {
  console.log('🔄 Fetching all asset types from API...');
  
  // Check for client availability
  if (!window.client || !window.client.request || !window.client.request.invokeTemplate) {
    console.log('⚠️ Client or invokeTemplate not available for asset types fetch');
    return {};
  }

  try {
    const allAssetTypes = {};
    let page = 1;
    let totalFetched = 0;
    const maxPages = 20; // Increase to 20 pages since laptop type is on later pages
    
    console.log(`📡 Starting asset type pagination fetch (max ${maxPages} pages)`);
    console.log(`📋 Will fetch pages until: (1) 0 results returned, OR (2) max pages reached`);
    console.log(`🎯 Looking for laptop asset type ID: 37000374826`);
    
    // Continue fetching pages until we get no more results
    while (page <= maxPages) {
      console.log(`📄 Fetching asset types page ${page}...`);
      
      try {
        // Use invokeTemplate to access asset types API with proper pagination
        const response = await window.client.request.invokeTemplate("getAssetTypes", {
          context: {
            page: page.toString(),
            per_page: '30'
          }
        });
        
        if (!response || !response.response) {
          console.log(`⚠️ No response for asset types page ${page}, stopping pagination`);
          break;
        }
        
        let parsedData;
        try {
          parsedData = JSON.parse(response.response);
        } catch (parseError) {
          console.log(`⚠️ Error parsing asset types page ${page}:`, parseError);
          break;
        }
        
        const assetTypes = parsedData.asset_types || [];
        console.log(`✅ Page ${page}: Retrieved ${assetTypes.length} asset types`);
        
        // Show the ID range on this page for debugging
        if (assetTypes.length > 0) {
          const firstId = assetTypes[0].id;
          const lastId = assetTypes[assetTypes.length - 1].id;
          console.log(`   📋 ID range on page ${page}: ${firstId} to ${lastId}`);
        }
        
        // If we got no results, we've reached the end
        if (assetTypes.length === 0) {
          console.log(`📄 No more asset types found, stopping at page ${page}`);
          break;
        }
        
        // Process and cache the asset types from this page
        assetTypes.forEach(assetType => {
          if (assetType && assetType.id && assetType.name) {
            allAssetTypes[assetType.id] = {
              name: assetType.name,
              description: assetType.description || '',
              visible: assetType.visible !== false,
              timestamp: Date.now()
            };
            totalFetched++;
            
            // Log specific asset types we're looking for
            if (assetType.id === 37000374826 || assetType.name.toLowerCase().includes('laptop')) {
              console.log(`🎯 Found laptop asset type: "${assetType.name}" (ID: ${assetType.id})`);
            }
          }
        });
        
        // Check if we found the laptop asset type on this page
        const foundLaptopType = assetTypes.find(type => type.id === 37000374826);
        if (foundLaptopType) {
          console.log(`🎉 SUCCESS: Found laptop asset type on page ${page}: "${foundLaptopType.name}"`);
        }
        
        page++;
        
        // Add a small delay between pages to be API-friendly
        if (page <= maxPages) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (pageError) {
        console.log(`⚠️ Error fetching asset types page ${page}:`, pageError);
        // Don't break on individual page errors, try next page
        page++;
        continue;
      }
    }
    
    // Save all asset types to cache
    if (totalFetched > 0) {
      console.log(`✅ Successfully cached ${totalFetched} asset types from ${page - 1} pages`);
      await cacheAssetTypes(allAssetTypes);
      
      // Specifically check if we got the laptop asset type
      if (allAssetTypes[37000374826]) {
        console.log(`🎯 ✅ Laptop asset type cached: "${allAssetTypes[37000374826].name}"`);
      } else {
        console.log('🎯 ⚠️ Laptop asset type (ID: 37000374826) not found in fetched data');
        console.log(`🔍 Available asset type IDs: ${Object.keys(allAssetTypes).slice(0, 10).join(', ')}...`);
      }
      
      // Log sample of cached asset types for debugging
      const sampleTypes = Object.entries(allAssetTypes).slice(0, 5);
      console.log('📋 Sample cached asset types:');
      sampleTypes.forEach(([id, type]) => {
        console.log(`   ${id}: "${type.name}"`);
      });
    } else {
      console.log('⚠️ No asset types were fetched');
    }
    
    return allAssetTypes;
  } catch (error) {
    console.error('❌ Error in fetchAllAssetTypes:', error);
    return {};
  }
}

/**
 * Get cached asset types from storage
 * @returns {Promise<Object>} - Cached asset types
 */
async function getCachedAssetTypes() {
  try {
    // Try to get cached asset types
    const result = await window.client.db.get(STORAGE_KEYS.ASSET_TYPE_CACHE);
    return result || {};
  } catch (error) {
    // If error or not found, return empty cache
    console.log('No asset type cache found or error:', error);
    return {};
  }
}

/**
 * Save asset types to cache
 * @param {Object} assetTypes - Asset types to cache
 * @returns {Promise<boolean>} - Success status
 */
async function cacheAssetTypes(assetTypes) {
  try {
    await window.client.db.set(STORAGE_KEYS.ASSET_TYPE_CACHE, assetTypes);
    console.log('Asset type cache updated');
    return true;
  } catch (error) {
    console.error('Failed to save asset type cache:', error);
    return false;
  }
}

/**
 * Get asset type name by ID with caching
 * @param {number} assetTypeId - Asset type ID 
 * @returns {Promise<string>} - Asset type name
 */
async function getAssetTypeName(assetTypeId) {
  if (!assetTypeId) return 'Unknown';
  
  // Check if CacheManager is available and use it
  if (window.CacheManager && window.CacheManager.getAssetTypeName) {
    console.log(`🔍 Using CacheManager to lookup asset type name for ID: ${assetTypeId}`);
    return await window.CacheManager.getAssetTypeName(assetTypeId);
  }
  
  // Fallback to original logic if CacheManager is not available
  console.log(`🔍 CacheManager not available, using fallback logic for asset type ID: ${assetTypeId}`);
  
  // Check for client availability
  if (!window.client || !window.client.db) {
    console.error('Client not available for asset type lookup');
    return 'Unknown';
  }

  try {
    // Check cache first
    const cachedAssetTypes = await getCachedAssetTypes();
    
    // If asset type is in cache and not expired, use it
    if (cachedAssetTypes[assetTypeId] && 
        cachedAssetTypes[assetTypeId].timestamp > Date.now() - CACHE_TIMEOUT) {
      console.log(`✅ Using cached asset type: "${cachedAssetTypes[assetTypeId].name}" for ID ${assetTypeId}`);
      return cachedAssetTypes[assetTypeId].name;
    }
    
    console.log(`🔄 Asset type ${assetTypeId} not in cache or expired, refreshing cache...`);
    
    // Refresh cache and try again
    const freshAssetTypes = await fetchAllAssetTypes();
    if (freshAssetTypes[assetTypeId]) {
      console.log(`✅ Found asset type after refresh: "${freshAssetTypes[assetTypeId].name}"`);
      return freshAssetTypes[assetTypeId].name;
    }
    
    console.log(`❌ Asset type ${assetTypeId} not found even after refresh`);
    return `Asset Type ${assetTypeId}`;
    
  } catch (error) {
    console.error(`❌ Error fetching asset type ${assetTypeId}:`, error);
    return `Asset Type ${assetTypeId}`;
  }
}

// Expose the getAssetTypeName function globally for use by other modules
window.getAssetTypeName = getAssetTypeName;

/**
 * Debug function to show configured asset type names and their resolved IDs
 */
async function showConfiguredAssetTypes() {
  try {
    console.log('🔧 Checking configured asset type names...');
    
    const params = await getInstallationParams();
    const configuredNames = params.assetTypeNames;
    
    console.log(`📝 Configured asset type names: "${configuredNames}"`);
    
    if (!configuredNames || configuredNames.trim() === '') {
      console.log('⚠️ No asset type names configured, will use keyword search');
      return;
    }
    
    // Parse the configured names
    const targetNames = configuredNames.split(',').map(name => name.trim()).filter(name => name);
    console.log(`🎯 Parsed target names: ${targetNames.join(', ')}`);
    
    // Get asset type IDs
    const assetTypeIds = await findSoftwareServicesAssetTypeIds();
    console.log(`🔢 Resolved asset type IDs: ${assetTypeIds.join(', ')}`);
    
    // Show which names matched which IDs
    const cachedAssetTypes = await getCachedAssetTypes();
    assetTypeIds.forEach(id => {
      if (cachedAssetTypes[id]) {
        console.log(`✅ ID ${id} = "${cachedAssetTypes[id].name}"`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error checking configured asset types:', error);
  }
}

/**
 * Search for a specific asset by name across ALL asset types
 * @param {string} assetName - Name to search for
 */
async function findAssetByName(assetName) {
  try {
    console.log(`🔍 Searching for asset named "${assetName}" across ALL asset types...`);
    
    // Get all assets without any type filtering
    const data = await window.client.request.invokeTemplate("getAssets", {
      path_suffix: `?page=1&per_page=100`
    });
    
    if (!data || !data.response) {
      console.log('❌ Could not fetch assets for name search');
      return;
    }
    
    const response = JSON.parse(data.response);
    const assets = response && response.assets ? response.assets : [];
    
    console.log(`📋 Searching through ${assets.length} assets for "${assetName}"...`);
    
    // Search for assets containing the name (case-insensitive)
    const matchingAssets = assets.filter(asset => {
      const assetName_lower = (asset.name || asset.display_name || '').toLowerCase();
      return assetName_lower.includes(assetName.toLowerCase());
    });
    
    if (matchingAssets.length > 0) {
      console.log(`✅ Found ${matchingAssets.length} asset(s) matching "${assetName}":`);
      matchingAssets.forEach(asset => {
        console.log(`   - "${asset.name || asset.display_name}" (ID: ${asset.id}, Type: ${asset.asset_type_id})`);
      });
      
      // Show what asset types these belong to
      const uniqueTypeIds = [...new Set(matchingAssets.map(a => a.asset_type_id))];
      console.log(`🏷️ Asset type(s) for "${assetName}": ${uniqueTypeIds.join(', ')}`);
      
      // Check if any of these types are in your configuration
      const configuredTypes = [37000374722, 37000374723, 37000374726, 37000374730];
      const matchingTypes = uniqueTypeIds.filter(typeId => configuredTypes.includes(typeId));
      const missingTypes = uniqueTypeIds.filter(typeId => !configuredTypes.includes(typeId));
      
      if (matchingTypes.length > 0) {
        console.log(`✅ Asset types already in your config: ${matchingTypes.join(', ')}`);
      }
      if (missingTypes.length > 0) {
        console.log(`❌ Asset types NOT in your config: ${missingTypes.join(', ')}`);
        console.log(`💡 To include "${assetName}", add these asset type IDs to your configuration`);
      }
    } else {
      console.log(`❌ No assets found matching "${assetName}"`);
      console.log(`💡 Try searching for a partial name or check if the asset exists in Freshservice`);
    }
  } catch (error) {
    console.error('❌ Error searching for asset by name:', error);
  }
}

/**
 * Debug function to check what asset types actually have assets
 */
async function checkAvailableAssetTypes() {
  try {
    console.log('🔍 Checking what asset types have assets...');
    
    // Get a sample of all assets without filtering
    const data = await window.client.request.invokeTemplate("getAssets", {
      path_suffix: `?page=1&per_page=50`
    });
    
    if (!data || !data.response) {
      console.log('❌ Could not fetch sample assets');
      return;
    }
    
    const response = JSON.parse(data.response);
    const assets = response && response.assets ? response.assets : [];
    
    if (assets.length === 0) {
      console.log('❌ No assets found in your Freshservice instance');
      return;
    }
    
    // Group assets by type (both asset_type_id and parent_asset_type_id)
    const assetsByType = {};
    assets.forEach(asset => {
      // Check asset_type_id
      const typeId = asset.asset_type_id;
      if (typeId && !assetsByType[typeId]) {
        assetsByType[typeId] = {
          count: 0,
          typeName: asset.asset_type_name || 'Unknown',
          samples: [],
          isParentType: false
        };
      }
      if (typeId) {
        assetsByType[typeId].count++;
        if (assetsByType[typeId].samples.length < 3) {
          assetsByType[typeId].samples.push(asset.name);
        }
      }
      
      // Check parent_asset_type_id
      const parentTypeId = asset.parent_asset_type_id;
      if (parentTypeId && !assetsByType[parentTypeId]) {
        assetsByType[parentTypeId] = {
          count: 0,
          typeName: `Parent Type ${parentTypeId}`,
          samples: [],
          isParentType: true
        };
      }
      if (parentTypeId) {
        assetsByType[parentTypeId].count++;
        if (assetsByType[parentTypeId].samples.length < 3) {
          assetsByType[parentTypeId].samples.push(asset.name);
        }
      }
    });
    
    console.log('📊 Available asset types with assets:');
    Object.entries(assetsByType).forEach(([typeId, info]) => {
      const typeLabel = info.isParentType ? '(Parent Type)' : '(Direct Type)';
      console.log(`   Type ID: ${typeId} ${typeLabel} | Name: "${info.typeName}" | Count: ${info.count} | Examples: ${info.samples.join(', ')}`);
    });
    
    console.log('💡 To use a different asset type, update the asset_type_names in your app configuration');
    console.log('💡 Current configuration includes: "Software, IT Software, ISP"');
    console.log('💡 To include servers or workstations, you could try names like: "Server, Infrastructure, Hardware, Workstation"');
    
  } catch (error) {
    console.error('❌ Error checking available asset types:', error);
  }
}

/**
 * Global debug function that can be called from browser console
 * Shows asset type configuration and suggests alternatives
 */
window.debugAssetTypes = async function() {
  console.log('🔧 === ASSET TYPE DEBUG INFORMATION ===');
  
  // Show current configuration
  try {
    const params = await getInstallationParams();
    console.log(`📝 Current configuration: "${params.assetTypeNames}"`);
  } catch (error) {
    console.log('❌ Could not get current configuration');
  }
  
  // Show available asset types
  await checkAvailableAssetTypes();
  
  // Show current results
  const assetTypeIds = await findSoftwareServicesAssetTypeIds();
  console.log(`🎯 Currently configured asset type IDs: ${assetTypeIds.join(', ')}`);
  
  console.log('');
  console.log('🛠️ === HOW TO INCLUDE MORE ASSETS ===');
  console.log('1. Go to Admin → Asset Management → Asset Types in Freshservice');
  console.log('2. Note the names of asset types you want to include');
  console.log('3. Update your app configuration with those names');
  console.log('4. Examples:');
  console.log('   - For servers: "Software, IT Software, Server, Infrastructure"');
  console.log('   - For all assets: "Software, Hardware, Server, Infrastructure, Workstation"');
  console.log('   - For specific types: "IT Software, Network Equipment, Database"');
  console.log('');
  console.log('💡 Call this function anytime by typing: debugAssetTypes()');
};

/**
 * Global function to clear all asset-related caches and force refresh
 * Call this after changing installation configuration
 */
window.clearAssetCache = async function() {
  try {
    console.log('🧹 Clearing asset caches and forcing refresh...');
    
    // Clear asset type cache
    await window.client.db.set(STORAGE_KEYS.ASSET_TYPE_CACHE, {});
    console.log('✅ Cleared asset type cache');
    
    // Clear asset search cache (removed functionality)
    console.log('ℹ️ Asset search cache clearing skipped - functionality removed');
    
    // Clear in-memory caches for users/agents only
    delete searchCache.assets;
    delete searchCache.assetsByType;
    
    console.log('✅ Cleared in-memory user/agent caches');
    
    // Force refresh asset types
    console.log('🔄 Fetching fresh asset types...');
    await fetchAllAssetTypes();
    
    // Force refresh asset listing with new configuration
    console.log('🔄 Refreshing asset listing with new configuration...');
    
    // Clear the current results display
    const resultsContainer = document.getElementById('asset-results');
    if (resultsContainer) {
      resultsContainer.innerHTML = '';
      resultsContainer.style.display = 'none';
    }
    
    // Trigger fresh asset search
    performInitialAssetListing();
    
    console.log('✅ Cache cleared and refresh triggered!');
    console.log('💡 You should now see assets based on your updated configuration');
    
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
  }
};

/**
 * Global function to show current configuration status
 */
window.showConfigStatus = async function() {
  try {
    console.log('📋 === CURRENT CONFIGURATION STATUS ===');
    
    // Show installation params
    const params = await getInstallationParams();
    console.log(`📝 Configured asset type names: "${params.assetTypeNames}"`);
    
    // Show resolved asset type IDs
    const assetTypeIds = await findSoftwareServicesAssetTypeIds();
    console.log(`🔢 Resolved asset type IDs: ${assetTypeIds.join(', ')}`);
    
    // Show cached asset types
    const cachedAssetTypes = await getCachedAssetTypes();
    console.log(`💾 Cached asset types: ${Object.keys(cachedAssetTypes).length} types`);
    
    assetTypeIds.forEach(id => {
      if (cachedAssetTypes[id]) {
        console.log(`   - ID ${id}: "${cachedAssetTypes[id].name}"`);
      } else {
        console.log(`   - ID ${id}: Not in cache`);
      }
    });
    
    // Show cache keys
    console.log(`🔑 Current cache key: "${generateAssetTypeCacheKey(assetTypeIds)}"`);
    
  } catch (error) {
    console.error('❌ Error showing config status:', error);
  }
};

/**
 * Get software/services asset type IDs 
 * Uses known working asset type IDs with optional dynamic discovery as fallback
 * @returns {Promise<Array>} - Array of asset type IDs for software/services
 */
async function findSoftwareServicesAssetTypeIds() {
  console.log('🔍 Finding software/services asset type IDs...');
  
  try {
    // Get installation parameters to check for configured asset type names
    const params = await getInstallationParams();
    const configuredNames = params.assetTypeNames;
    
    // Known working asset type IDs from user testing and logs
    const KNOWN_SOFTWARE_TYPE_IDS = [
      37000374722, // From user's Middleware asset
      37000374726  // IT Software - has assets according to logs
    ];
    const assetTypeIds = [...KNOWN_SOFTWARE_TYPE_IDS];
    
    console.log(`✅ Using known software/services asset type IDs: ${KNOWN_SOFTWARE_TYPE_IDS.join(', ')}`);
    
    // If specific asset type names are configured, try to find their IDs as well
    if (configuredNames && configuredNames.trim() !== '') {
      console.log(`🔧 Attempting to discover additional asset types for: "${configuredNames}"`);
      
      try {
        // Try to get cached asset types for additional discovery
        const cachedAssetTypes = await getCachedAssetTypes();
        
        // If cache is empty or old, try to refresh it (but don't fail if this doesn't work)
        if (Object.keys(cachedAssetTypes).length === 0) {
          console.log('🔄 Attempting to fetch asset types for additional discovery...');
          await fetchAllAssetTypes(); // This might work or might fail, but we don't depend on it
        }
        
        // Get refreshed cache
        const refreshedCache = await getCachedAssetTypes();
        
        if (Object.keys(refreshedCache).length > 0) {
          // Parse configured names and find additional types
          const targetNames = configuredNames.split(',').map(name => name.trim()).filter(name => name);
          const additionalIds = findAssetTypesByKeywords(refreshedCache, targetNames);
          
          // Add any additional types we found (avoiding duplicates)
          additionalIds.forEach(id => {
            if (!assetTypeIds.includes(id)) {
              assetTypeIds.push(id);
              console.log(`✅ Added additional asset type ID: ${id}`);
            }
          });
        } else {
          console.log('⚠️ Could not fetch asset types for additional discovery, using known types only');
        }
      } catch (error) {
        console.log('⚠️ Asset type discovery failed, using known types only:', error.message);
      }
    }
    
    console.log(`🎯 Final asset type IDs: ${assetTypeIds.join(', ')}`);
    return assetTypeIds;
    
  } catch (error) {
    console.error('❌ Error in findSoftwareServicesAssetTypeIds:', error);
    // Fallback to known working IDs
    const fallbackIds = [37000374722, 37000374726];
    console.log(`🔄 Falling back to known asset type IDs: ${fallbackIds.join(', ')}`);
    return fallbackIds;
  }
}

/**
 * Find asset types by searching for keywords in their names
 * @param {Object} cachedAssetTypes - Cached asset types object
 * @param {Array} customNames - Optional array of custom names to search for
 * @returns {Array} - Array of asset type IDs that match the keywords
 */
function findAssetTypesByKeywords(cachedAssetTypes, customNames = null) {
  console.log('🔍 Searching asset types by keywords');
  
  // Default software/service keywords
  const defaultKeywords = [
    'software', 'service', 'application', 'app', 'system', 'platform',
    'tool', 'program', 'saas', 'cloud', 'web', 'api', 'database', 'server',
    'middleware', 'infrastructure', 'it', 'technology', 'digital'
  ];
  
  // Use custom names if provided, otherwise use default keywords
  const searchTerms = customNames && customNames.length > 0 ? 
    customNames.map(name => name.toLowerCase().trim()) : 
    defaultKeywords;
  
  console.log(`🎯 Searching for asset types containing: ${searchTerms.join(', ')}`);
  
  const matchingIds = [];
  
  Object.entries(cachedAssetTypes).forEach(([id, assetType]) => {
    const assetTypeName = (assetType.name || '').toLowerCase();
    const assetTypeDesc = (assetType.description || '').toLowerCase();
    
    // Check if any search term matches the name or description
    const isMatch = searchTerms.some(term => {
      const nameMatch = assetTypeName.includes(term);
      const descMatch = assetTypeDesc.includes(term);
      
      if (nameMatch || descMatch) {
        console.log(`✅ Match found: "${assetType.name}" (ID: ${id}) - matched "${term}"`);
        return true;
      }
      return false;
    });
    
    if (isMatch) {
      matchingIds.push(parseInt(id));
    }
  });
  
  console.log(`🎉 Found ${matchingIds.length} matching asset type IDs: ${matchingIds.join(', ')}`);
  return matchingIds;
}

/**
 * Fetch all users from the API and store them in the cache
 * This will fetch multiple pages to get comprehensive user coverage
 * @returns {Promise<Object>} - Cached users
 */
async function fetchUsers() {
  console.log('🔄 Fetching users from API with enhanced pagination...');
  
  // Check for client availability
  if (!window.client || !window.client.request) {
    console.error('Client not available for users fetch');
    return {};
  }

  try {
    // Get safe API limits based on plan settings
    const apiLimits = getSafeApiLimits();
    const requesterPageLimit = apiLimits.listRequestersPageLimit || 10;
    const agentPageLimit = apiLimits.listAgentsPageLimit || 10;
    const delayBetweenRequests = apiLimits.delayBetweenRequests || 100;
    
    console.log(`📊 Using enhanced pagination limits: ${requesterPageLimit} requester pages, ${agentPageLimit} agent pages`);
    console.log(`⏱️ Delay between requests: ${delayBetweenRequests}ms`);
    
    const allUsers = {};
    let totalRequesters = 0;
    let totalAgents = 0;
    
    // Function to add delay between requests
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Function to load requesters from a specific page
    async function loadRequestersPage(pageNum) {
      console.log(`📥 Loading requesters page ${pageNum}...`);
      
      try {
        // Use invokeTemplate which is more reliable in Freshservice
        const response = await window.client.request.invokeTemplate("getRequesters", {
          context: {
            page: pageNum.toString(),
            per_page: '100'
          }
        });
        
        if (!response || !response.response) {
          console.error('Invalid requesters response:', response);
          return { users: [], more: false };
        }
        
        try {
          const parsedData = JSON.parse(response.response || '{"requesters":[]}');
          const users = parsedData.requesters || [];
          
          console.log(`✅ Loaded ${users.length} requesters from page ${pageNum}`);
          
          // Check if we might have more pages (received full page of results)
          const hasMore = users.length === 100;
          
          return { users, more: hasMore };
        } catch (parseError) {
          console.error('Error parsing requesters response:', parseError);
          return { users: [], more: false };
        }
      } catch (error) {
        console.error(`Error fetching requesters page ${pageNum}:`, error);
        return { users: [], more: false };
      }
    }
    
    // Function to load agents from a specific page
    async function loadAgentsPage(pageNum) {
      console.log(`📥 Loading agents page ${pageNum}...`);
      
      try {
        // Use invokeTemplate to access agents API
        const response = await window.client.request.invokeTemplate("getAgents", {
          context: {
            page: pageNum.toString(),
            per_page: '100'
          }
        });
        
        if (!response || !response.response) {
          console.error('Invalid agents response:', response);
          return { users: [], more: false };
        }
        
        try {
          const parsedData = JSON.parse(response.response || '{"agents":[]}');
          const users = parsedData.agents || [];
          
          console.log(`✅ Loaded ${users.length} agents from page ${pageNum}`);
          
          // Check if we might have more pages (received full page of results)
          const hasMore = users.length === 100;
          
          return { users, more: hasMore };
        } catch (parseError) {
          console.error('Error parsing agents response:', parseError);
          return { users: [], more: false };
        }
      } catch (error) {
        console.error(`Error fetching agents page ${pageNum}:`, error);
        return { users: [], more: false };
      }
    }
    
    // Fetch requesters with enhanced pagination
    console.log('👤 === FETCHING REQUESTERS ===');
    let requesterPage = 1;
    let hasMoreRequesters = true;
    
    while (hasMoreRequesters && requesterPage <= requesterPageLimit) {
      const { users, more } = await loadRequestersPage(requesterPage);
      
      // Process requesters and add to cache
      users.forEach(user => {
        if (user && user.id) {
          const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown';
          allUsers[user.id] = {
            name: displayName,
            data: user,
            timestamp: Date.now(),
            type: 'requester'
          };
          totalRequesters++;
        }
      });
      
      hasMoreRequesters = more;
      requesterPage++;
      
      // Add delay between requests to avoid rate limiting
      if (hasMoreRequesters && requesterPage <= requesterPageLimit) {
        await delay(delayBetweenRequests);
      }
    }
    
    console.log(`✅ Completed requester fetch: ${totalRequesters} requesters from ${requesterPage - 1} pages`);
    
    // Add delay before switching to agents
    await delay(delayBetweenRequests);
    
    // Fetch agents with enhanced pagination
    console.log('🛠️ === FETCHING AGENTS ===');
    let agentPage = 1;
    let hasMoreAgents = true;
    
    while (hasMoreAgents && agentPage <= agentPageLimit) {
      const { users, more } = await loadAgentsPage(agentPage);
      
      // Process agents and add to cache
      users.forEach(user => {
        if (user && user.id) {
          const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown';
          allUsers[user.id] = {
            name: displayName,
            data: user,
            timestamp: Date.now(),
            type: 'agent'
          };
          totalAgents++;
        }
      });
      
      hasMoreAgents = more;
      agentPage++;
      
      // Add delay between requests to avoid rate limiting
      if (hasMoreAgents && agentPage <= agentPageLimit) {
        await delay(delayBetweenRequests);
      }
    }
    
    console.log(`✅ Completed agent fetch: ${totalAgents} agents from ${agentPage - 1} pages`);
    
    // Save all users to cache
    if (Object.keys(allUsers).length > 0) {
      const totalUsers = Object.keys(allUsers).length;
      console.log(`💾 Caching ${totalUsers} users (${totalRequesters} requesters + ${totalAgents} agents)`);
      await cacheUsers(allUsers);
      
      // Also populate the search cache for consistency
      if (!window.userCache) window.userCache = {};
      Object.entries(allUsers).forEach(([userId, userInfo]) => {
        window.userCache[userId] = {
          ...userInfo.data,
          type: userInfo.type,
          timestamp: userInfo.timestamp
        };
      });
      
      console.log(`✅ Users cached to both primary cache and search cache`);
      console.log(`📊 Final user cache statistics:`);
      console.log(`   👤 Requesters: ${totalRequesters}`);
      console.log(`   🛠️ Agents: ${totalAgents}`);
      console.log(`   📦 Total: ${totalUsers}`);
    } else {
      console.warn('⚠️ No users found to cache');
    }
    
    return allUsers;
  } catch (error) {
    console.error('❌ Error in fetchUsers:', error);
    return {};
  }
}

/**
 * Get cached users from storage
 * @returns {Promise<Object>} - Cached users
 */
async function getCachedUsers() {
  try {
    // Try to get cached users
    const result = await window.client.db.get(STORAGE_KEYS.USER_CACHE);
    return result || {};
  } catch (error) {
    // If error or not found, return empty cache
    console.log('No user cache found or error:', error);
    return {};
  }
}

/**
 * Save users to cache with size optimization
 * @param {Object} users - Users to cache
 * @returns {Promise<boolean>} - Success status
 */
async function cacheUsers(users) {
  try {
    // Optimize cache by storing only essential fields
    const optimizedCache = {};
    
    for (const [userId, userData] of Object.entries(users)) {
      if (userData && userData.data) {
        // Store only essential fields to reduce cache size
        optimizedCache[userId] = {
          name: userData.name,
          timestamp: userData.timestamp,
          type: userData.type,
          data: {
            id: userData.data.id,
            first_name: userData.data.first_name,
            last_name: userData.data.last_name,
            email: userData.data.email,
            job_title: userData.data.job_title,
            department_names: userData.data.department_names,
            location_name: userData.data.location_name,
            reporting_manager_id: userData.data.reporting_manager_id
          }
        };
      } else {
        // Handle legacy format
        optimizedCache[userId] = userData;
      }
    }
    
    // Check cache size before saving
    const cacheSize = JSON.stringify(optimizedCache).length;
    console.log(`💾 User cache size: ${(cacheSize / 1024).toFixed(2)}KB`);
    
    if (cacheSize > 35000) { // Leave some buffer below 40KB limit
      console.warn('⚠️ User cache approaching size limit, trimming oldest entries...');
      
      // Sort by timestamp and keep only the most recent entries
      const sortedEntries = Object.entries(optimizedCache)
        .sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0))
        .slice(0, 30); // Keep only 30 most recent users
      
      const trimmedCache = Object.fromEntries(sortedEntries);
      const trimmedSize = JSON.stringify(trimmedCache).length;
      console.log(`✂️ Trimmed cache to ${sortedEntries.length} users, size: ${(trimmedSize / 1024).toFixed(2)}KB`);
      
      await window.client.db.set(STORAGE_KEYS.USER_CACHE, trimmedCache);
    } else {
      await window.client.db.set(STORAGE_KEYS.USER_CACHE, optimizedCache);
    }
    
    console.log('✅ User cache updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to save user cache:', error);
    
    // If still failing, try with even smaller cache
    if (error.message && error.message.includes('40KB')) {
      console.log('🔄 Attempting emergency cache reduction...');
      try {
        // Keep only names and IDs for emergency fallback
        const emergencyCache = {};
        const entries = Object.entries(users).slice(0, 20); // Only 20 users
        
        for (const [userId, userData] of entries) {
          emergencyCache[userId] = {
            name: userData.name || 'Unknown',
            timestamp: Date.now(),
            type: userData.type || 'unknown'
          };
        }
        
        await window.client.db.set(STORAGE_KEYS.USER_CACHE, emergencyCache);
        console.log('✅ Emergency cache saved with minimal data');
        return true;
      } catch (emergencyError) {
        console.error('❌ Emergency cache save also failed:', emergencyError);
        return false;
      }
    }
    
    return false;
  }
}

/**
 * Get user details by ID with caching
 * @param {number} userId - User ID 
 * @returns {Promise<Object>} - User data or null
 */
async function getUserDetails(userId) {
  if (!userId) return null;
  
  // Check for client availability
  if (!window.client || !window.client.db) {
    console.error('Client not available for user lookup');
    return null;
  }

  try {
    // Check the search cache first (window.userCache)
    if (window.userCache && window.userCache[userId]) {
      const cachedUser = window.userCache[userId];
      // Check if cache is still valid (5 minutes)
      if (cachedUser.timestamp > Date.now() - CACHE_TIMEOUT) {
        console.log(`Using search cache user data: ${cachedUser.first_name} ${cachedUser.last_name}`);
        return cachedUser;
      }
    }
    
    // Check the persistent cache
    const cachedUsers = await getCachedUsers();
    
    // If user is in cache and not expired, use it
    if (cachedUsers[userId] && 
        cachedUsers[userId].timestamp > Date.now() - CACHE_TIMEOUT) {
      console.log(`Using cached user data: ${cachedUsers[userId].name}`);
      return cachedUsers[userId].data;
    }
    
    // If not in cache or expired, fetch from API
    console.log(`Fetching user ${userId} from API`);
    
    // First try to get the user as a requester
    try {
      const response = await window.client.request.invokeTemplate("getRequesterDetails", {
        context: {
          requester_id: userId
        }
      });
      
      if (response && response.response) {
        const parsedData = JSON.parse(response.response || '{}');
        if (parsedData && parsedData.requester) {
          const user = parsedData.requester;
          const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown';
          
          // Update persistent cache
          cachedUsers[userId] = {
            name: userName,
            data: user,
            timestamp: Date.now(),
            type: 'requester'
          };
          await cacheUsers(cachedUsers);
          
          // Also update search cache for consistency
          if (!window.userCache) window.userCache = {};
          window.userCache[userId] = {
            ...user,
            type: 'requester',
            timestamp: Date.now()
          };
          
          console.log(`Found user ${userId} as requester: ${userName}`);
          return user;
        }
      }
    } catch (requesterErr) {
      console.log(`User ${userId} not found as requester, trying as agent...`);
    }
    
    // If not found as requester, try as an agent using direct API call instead of template
    try {
      // Use invokeTemplate to get individual agent
      const response = await window.client.request.invokeTemplate("getAgents", {
        path_suffix: `/${userId}`
      });
      
      if (response && response.response) {
        const parsedData = JSON.parse(response.response || '{}');
        if (parsedData && parsedData.agent) {
          const user = parsedData.agent;
          const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown';
          
          // Update persistent cache
          cachedUsers[userId] = {
            name: userName,
            data: user,
            timestamp: Date.now(),
            type: 'agent'
          };
          await cacheUsers(cachedUsers);
          
          // Also update search cache
          if (!window.userCache) window.userCache = {};
          window.userCache[userId] = {
            ...user,
            type: 'agent',
            timestamp: Date.now()
          };
          
          console.log(`Found user ${userId} as agent: ${userName}`);
          return user;
        }
      }
    } catch (agentErr) {
      console.error(`User ${userId} not found as agent either:`, agentErr);
    }
    
    console.error(`User ${userId} not found as either requester or agent`);
    return null;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

/**
 * Get user or manager name by ID with caching
 * @param {number} userId - User ID 
 * @returns {Promise<string>} - User name
 */
async function getUserName(userId) {
  if (!userId) return 'N/A';
  
  const user = await getUserDetails(userId);
  if (user) {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown';
  }
  return 'Unknown';
}

/**
 * Get reporting manager name by ID with caching
 * @param {number} managerId - Manager ID 
 * @returns {Promise<string>} - Manager name
 */
async function getManagerName(managerId) {
  const manager = await getUserDetails(managerId);
  return manager ? `${manager.first_name || ''} ${manager.last_name || ''}`.trim() : 'Unknown Manager';
}

/**
 * Initialize the Freshworks app
 * @returns {Promise<void>}
 */
async function initializeApp() {
  try {
    console.log('🚀 Starting app initialization...');
    
    // Initialize all caches using the centralized cache manager
    console.log('📦 Initializing cache manager...');
    
    // Check if CacheManager is available
    if (!window.CacheManager) {
      console.error('❌ CacheManager not available - falling back to individual cache initialization');
      
      // Fallback to original cache initialization
      const cachePromises = [
        fetchAllAssetTypes().catch(error => {
          console.error('⚠️ Asset types cache initialization failed:', error);
          return {}; // Return empty cache on failure
        }),
        fetchAllLocations().catch(error => {
          console.error('⚠️ Locations cache initialization failed:', error);
          return {}; // Return empty cache on failure
        })
      ];
      
      const [assetTypesCache, locationsCache] = await Promise.all(cachePromises);
      
      console.log(`✅ Fallback cache initialization complete:`);
      console.log(`   📋 Asset types: ${Object.keys(assetTypesCache).length} cached`);
      console.log(`   📍 Locations: ${Object.keys(locationsCache).length} cached`);
    } else {
      // Use the centralized cache manager
      const cacheResults = await window.CacheManager.initializeAllCaches();
      
      console.log(`✅ Cache manager initialization complete:`);
      console.log(`   📋 Asset types: ${cacheResults.assetTypes} cached`);
      console.log(`   📍 Locations: ${cacheResults.locations} cached`);
      
      if (cacheResults.errors.length > 0) {
        console.warn(`⚠️ Some caches failed to initialize: ${cacheResults.errors.join(', ')}`);
      }
    }
    
    // Initialize form components
    populateFormFields();
    setupEventListeners();
    
    // Initialize change type defaults
    initializeChangeTypeDefaults();
    
    // Pre-initialize AssetAssociation module to ensure services are ready
    try {
      if (window.AssetAssociation && !window.AssetAssociation._initialized) {
        console.log('🔄 Pre-initializing Asset Association Module...');
        await window.AssetAssociation.init();
        window.AssetAssociation._initialized = true;
        console.log('✅ Asset Association Module pre-initialized');
      }
    } catch (error) {
      console.warn('⚠️ Asset Association pre-initialization failed:', error);
      // Don't fail the entire app if this fails - it will be retried when tab is shown
    }
    
    console.log('✅ App initialization completed successfully');
    
  } catch (error) {
    console.error('❌ Error in app initialization:', error);
    displayInitError('Failed to initialize application: ' + error.message);
  }
}

/**
 * Display initialization error to user
 * @param {string} message Error message
 */
function displayInitError(message) {
  const body = document.body;
  const errorDiv = document.createElement('div');
  errorDiv.className = 'alert alert-danger';
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    max-width: 600px;
    min-width: 400px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    border-radius: 8px;
  `;
  errorDiv.innerHTML = `
    <div style="text-align: center;">
      <div style="font-size: 3rem; margin-bottom: 1rem;">💥</div>
      <h4 style="margin-bottom: 1rem;">🚨 Initialization Error</h4>
      <p style="margin-bottom: 1.5rem; color: #721c24;">${message}</p>
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button class="btn btn-primary" onclick="location.reload()" style="display: flex; align-items: center; gap: 8px;">
          <span>🔄</span> Retry Initialization
        </button>
        <button class="btn btn-outline-secondary" onclick="this.parentElement.parentElement.parentElement.remove()" style="display: flex; align-items: center; gap: 8px;">
          <span>❌</span> Dismiss
        </button>
      </div>
    </div>
  `;
  body.insertBefore(errorDiv, body.firstChild);
}

/**
 * Populate form fields with default values
 */
function populateFormFields() {
  // Get current date for default values
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Format dates for input fields (YYYY-MM-DDTHH:MM)
  const formatDateTime = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Set default planned start time (2 days from now at 9 AM for normal changes)
  const plannedStart = new Date(now);
  plannedStart.setDate(plannedStart.getDate() + 2); // 2-day lead time
  plannedStart.setHours(9, 0, 0, 0);
  
  // Set default planned end time (1 hour after start time)
  const plannedEnd = new Date(plannedStart);
  plannedEnd.setHours(plannedStart.getHours() + 1); // 1 hour duration

  // Populate form fields with defaults
  const plannedStartField = document.getElementById('planned-start');
  const plannedEndField = document.getElementById('planned-end');
  
  if (plannedStartField) {
    plannedStartField.value = formatDateTime(plannedStart);
  }
  
  if (plannedEndField) {
    plannedEndField.value = formatDateTime(plannedEnd);
  }

  console.log('Form fields populated with default values');
}

/**
 * Set up event listeners for form inputs
 */
function setupEventListeners() {
  console.log('🎯 Setting up event listeners...');
  
  // Tab event listeners
  const assetAssociationTab = document.getElementById('asset-association-tab');
  if (assetAssociationTab) {
    assetAssociationTab.addEventListener('shown.bs.tab', async function () {
      // Initialize Asset Association Module when tab is first shown
      if (window.AssetAssociation && !window.AssetAssociation._initialized) {
        console.log('🔧 Initializing Asset Association Module...');
        await window.AssetAssociation.init();
        window.AssetAssociation._initialized = true;
        console.log('✅ Asset Association Module initialized');
      }
    });
    console.log('✅ Asset Association tab listener added');
  }
  
  // Impacted Services tab
  const impactedServicesTab = document.getElementById('impacted-services-tab');
  if (impactedServicesTab) {
    impactedServicesTab.addEventListener('shown.bs.tab', function () {
      console.log('🔄 Impacted Services tab shown - checking initialization...');
      
      // Initialize Impacted Services Module when tab is first shown
      if (window.ImpactedServices && !window.ImpactedServices._initialized) {
        console.log('🔧 Initializing Impacted Services Module for the first time...');
        window.ImpactedServices.init();
        window.ImpactedServices._initialized = true;
        console.log('✅ Impacted Services Module initialized');
      } else if (window.ImpactedServices && window.ImpactedServices._initialized) {
        console.log('ℹ️ Impacted Services Module already initialized, refreshing direct assets...');
      } else if (!window.ImpactedServices) {
        console.error('❌ ImpactedServices module not available!');
      }
      
      // Refresh direct assets from Asset Association
      if (window.ImpactedServices && window.ImpactedServices.loadDirectAssets) {
        window.ImpactedServices.loadDirectAssets();
      }
    });
    
    impactedServicesTab.addEventListener('hidden.bs.tab', function () {
      // Capture impacted services data when leaving the tab
      if (window.ImpactedServices && typeof window.ImpactedServices.getImpactedServicesData === 'function') {
        const impactedServicesData = window.ImpactedServices.getImpactedServicesData();
        window.changeRequestData.impactedServices = impactedServicesData;
        console.log('💾 Captured impacted services data');
      }
    });
    
    console.log('✅ Impacted Services tab listeners added');
  }
  
  // Change type selection
  const changeTypeSelect = document.getElementById('change-type');
  if (changeTypeSelect) {
    changeTypeSelect.addEventListener('change', handleChangeTypeSelection);
    console.log('✅ Change type selection listener added');
  }
  
  // Requester search with live search functionality
  const requesterSearch = document.getElementById('requester-search');
  if (requesterSearch) {
    requesterSearch.addEventListener('input', (e) => {
      const searchTerm = e.target.value.trim();
      
      // Clear any existing timer
      if (liveSearchState.requester.timer) {
        clearTimeout(liveSearchState.requester.timer);
        liveSearchState.requester.timer = null;
      }
      
      // Clear results if input is empty
      if (searchTerm.length === 0) {
        clearRequesterResults();
        liveSearchState.requester.isActive = false;
        return;
      }
      
      // Show live search indicator if minimum length reached
      if (searchTerm.length >= liveSearchState.requester.minLength) {
        showLiveSearchIndicator('requester-results', 'requesters');
        liveSearchState.requester.isActive = true;
        
        // Set timer for live search
        liveSearchState.requester.timer = setTimeout(() => {
          console.log(`🔍 Live search for requesters: "${searchTerm}"`);
          performRequesterSearch(searchTerm, false, true); // true indicates live search
        }, liveSearchState.requester.delay);
      } else {
        // Show hint for minimum characters
        showSearchHint('requester-results', liveSearchState.requester.minLength);
      }
    });
    
    // Handle Enter key for manual search
    requesterSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const searchTerm = e.target.value.trim();
        
        // Clear live search timer
        if (liveSearchState.requester.timer) {
          clearTimeout(liveSearchState.requester.timer);
          liveSearchState.requester.timer = null;
        }
        
        if (searchTerm.length >= liveSearchState.requester.minLength) {
          console.log(`🔍 Manual search for requesters: "${searchTerm}"`);
          performRequesterSearch(searchTerm, false, false); // false indicates manual search
        }
      }
    });
    
    console.log('✅ Requester live search listener added');
  }
  
  // Agent search with live search functionality
  const agentSearch = document.getElementById('agent-search');
  if (agentSearch) {
    agentSearch.addEventListener('input', (e) => {
      const searchTerm = e.target.value.trim();
      
      // Clear any existing timer
      if (liveSearchState.agent.timer) {
        clearTimeout(liveSearchState.agent.timer);
        liveSearchState.agent.timer = null;
      }
      
      // Clear results if input is empty
      if (searchTerm.length === 0) {
        clearAgentResults();
        liveSearchState.agent.isActive = false;
        return;
      }
      
      // Show live search indicator if minimum length reached
      if (searchTerm.length >= liveSearchState.agent.minLength) {
        showLiveSearchIndicator('agent-results', 'agents');
        liveSearchState.agent.isActive = true;
        
        // Set timer for live search
        liveSearchState.agent.timer = setTimeout(() => {
          console.log(`🔍 Live search for agents: "${searchTerm}"`);
          performAgentSearch(searchTerm, false, true); // true indicates live search
        }, liveSearchState.agent.delay);
      } else {
        // Show hint for minimum characters
        showSearchHint('agent-results', liveSearchState.agent.minLength);
      }
    });
    
    // Handle Enter key for manual search
    agentSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const searchTerm = e.target.value.trim();
        
        // Clear live search timer
        if (liveSearchState.agent.timer) {
          clearTimeout(liveSearchState.agent.timer);
          liveSearchState.agent.timer = null;
        }
        
        if (searchTerm.length >= liveSearchState.agent.minLength) {
          console.log(`🔍 Manual search for agents: "${searchTerm}"`);
          performAgentSearch(searchTerm, false, false); // false indicates manual search
        }
      }
    });
    
    console.log('✅ Agent live search listener added');
  }

  // Risk assessment inputs
  const riskInputs = document.querySelectorAll('input[name="business-impact"], input[name="affected-users"], input[name="complexity"], input[name="testing"], input[name="rollback"]');
  riskInputs.forEach(input => {
    input.addEventListener('change', updateRiskSelection);
  });
  console.log(`✅ Risk assessment listeners added (${riskInputs.length} inputs)`);

  // Form field event listeners to capture values
  const reasonForChangeField = document.getElementById('reason-for-change');
  if (reasonForChangeField) {
    reasonForChangeField.addEventListener('input', (e) => {
      changeRequestData.reasonForChange = e.target.value.trim();
    });
    console.log('✅ Reason for change field listener added');
  }
  
  const changeDescriptionField = document.getElementById('change-description');
  if (changeDescriptionField) {
    changeDescriptionField.addEventListener('input', (e) => {
      changeRequestData.changeDescription = e.target.value.trim();
    });
    console.log('✅ Change description field listener added');
  }
  
  const implementationPlanField = document.getElementById('implementation-plan');
  if (implementationPlanField) {
    implementationPlanField.addEventListener('input', (e) => {
      changeRequestData.implementationPlan = e.target.value.trim();
    });
  }
  
  const backoutPlanField = document.getElementById('backout-plan');
  if (backoutPlanField) {
    backoutPlanField.addEventListener('input', (e) => {
      changeRequestData.backoutPlan = e.target.value.trim();
    });
  }
  
  const validationPlanField = document.getElementById('validation-plan');
  if (validationPlanField) {
    validationPlanField.addEventListener('input', (e) => {
      changeRequestData.validationPlan = e.target.value.trim();
    });
  }
  
  const plannedStartField = document.getElementById('planned-start');
  if (plannedStartField) {
    plannedStartField.addEventListener('change', (e) => {
      changeRequestData.plannedStart = e.target.value;
      validateDateTimes();
    });
  }
  
  const plannedEndField = document.getElementById('planned-end');
  if (plannedEndField) {
    plannedEndField.addEventListener('change', (e) => {
      changeRequestData.plannedEnd = e.target.value;
      validateDateTimes();
    });
  }

  console.log('✅ All event listeners setup complete');
}

/**
 * Validate that start time is not after end time
 */
function validateDateTimes() {
  const plannedStartField = document.getElementById('planned-start');
  const plannedEndField = document.getElementById('planned-end');
  
  if (!plannedStartField || !plannedEndField) {
    return true;
  }
  
  const startValue = plannedStartField.value;
  const endValue = plannedEndField.value;
  
  // Clear previous validation states
  plannedStartField.classList.remove('is-invalid');
  plannedEndField.classList.remove('is-invalid');
  
  // Remove previous error messages
  const startFeedback = plannedStartField.parentNode.querySelector('.invalid-feedback');
  const endFeedback = plannedEndField.parentNode.querySelector('.invalid-feedback');
  if (startFeedback) startFeedback.remove();
  if (endFeedback) endFeedback.remove();
  
  // Only validate if both fields have values
  if (startValue && endValue) {
    const startDate = new Date(startValue);
    const endDate = new Date(endValue);
    
    if (startDate >= endDate) {
      // Start time is after or equal to end time - show error
      plannedEndField.classList.add('is-invalid');
      
      const feedback = document.createElement('div');
      feedback.className = 'invalid-feedback';
      feedback.textContent = 'End time must be after start time';
      plannedEndField.parentNode.appendChild(feedback);
      
      console.log('❌ Date validation failed: Start time is after or equal to end time');
      return false;
    }
  }
  
  console.log('✅ Date validation passed');
  return true;
}

/**
 * Search for requesters using Freshservice API
 */
function searchRequesters(e) {
  const searchTerm = e.target.value.trim();
  const resultsContainer = document.getElementById('requester-results');
  
  // Clear and hide results if search term is too short
  if (searchTerm.length < 3) {
    resultsContainer.style.display = 'none';
    return;
  }

  // Show loading indicator
  resultsContainer.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm" role="status"></div> Loading...</div>';
  resultsContainer.style.display = 'block';
  
  // Check cache first
  getFromSearchCache('requesters', searchTerm).then(cachedResults => {
    if (cachedResults && cachedResults.length > 0) {
      // Use cached results
      console.log(`📦 Found ${cachedResults.length} cached requester results for "${searchTerm}"`);
      displaySearchResults('requester-results', cachedResults, selectRequester);
      
      // Get the configured search cache timeout
      getInstallationParams().then(params => {
        const searchCacheTimeout = params.searchCacheTimeout || DEFAULT_SEARCH_CACHE_TIMEOUT;
        
        // Set a timer to check for fresh results after the timeout
        setTimeout(() => {
          // Only perform API call if the search term is still the current one
          const currentSearchTerm = document.getElementById('requester-search').value.trim();
          if (currentSearchTerm === searchTerm) {
            console.log(`Cache timeout reached (${searchCacheTimeout}ms), refreshing requester search for: ${searchTerm}`);
            performRequesterSearch(searchTerm, true);
          }
        }, searchCacheTimeout);
      });
      
      return;
    }
    
    // No cache hit OR cache returned empty results, perform API search immediately
    console.log(`🔍 No cached results found for "${searchTerm}", performing API search...`);
    performRequesterSearch(searchTerm);
  }).catch(error => {
    console.error('Error checking requester search cache:', error);
    // Fallback to direct search on cache error
    performRequesterSearch(searchTerm);
  });
}

/**
 * Search for agents using Freshservice API
 */
function searchAgents(e) {
  const searchTerm = e.target.value.trim();
  const resultsContainer = document.getElementById('agent-results');
  
  // Clear and hide results if search term is too short
  if (searchTerm.length < 3) {
    resultsContainer.style.display = 'none';
    return;
  }

  // Show loading indicator
  resultsContainer.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm" role="status"></div> Loading...</div>';
  resultsContainer.style.display = 'block';
  
  // Check cache first
  getFromSearchCache('agents', searchTerm).then(cachedResults => {
    if (cachedResults && cachedResults.length > 0) {
      // Use cached results
      console.log(`📦 Found ${cachedResults.length} cached agent results for "${searchTerm}"`);
      displaySearchResults('agent-results', cachedResults, selectAgent);
      
      // Get the configured search cache timeout
      getInstallationParams().then(params => {
        const searchCacheTimeout = params.searchCacheTimeout || DEFAULT_SEARCH_CACHE_TIMEOUT;
        
        // Set a timer to check for fresh results after the timeout
        setTimeout(() => {
          // Only perform API call if the search term is still the current one
          const currentSearchTerm = document.getElementById('agent-search').value.trim();
          if (currentSearchTerm === searchTerm) {
            console.log(`Cache timeout reached (${searchCacheTimeout}ms), refreshing agent search for: ${searchTerm}`);
            performAgentSearch(searchTerm, true);
          }
        }, searchCacheTimeout);
      });
      
      return;
    }
    
    // No cache hit OR cache returned empty results, perform API search immediately
    console.log(`🔍 No cached results found for "${searchTerm}", performing API search...`);
    performAgentSearch(searchTerm);
  }).catch(error => {
    console.error('Error checking agent search cache:', error);
    // Fallback to direct search on cache error
    performAgentSearch(searchTerm);
  });
}

/**
 * Perform the actual API search for agents
 * @param {string} searchTerm - The search term
 * @param {boolean} isRefresh - Whether this is a cache refresh operation
 */
function performAgentSearch(searchTerm, isRefresh = false, isLiveSearch = false) {
  // Ensure client is available
  if (!window.client || !window.client.request) {
    console.error('Client or request object not available for agent search');
    showNotification('error', 'API client not initialized. Please refresh the page.');
    return;
  }

  // Use field-specific format for agents API
  // Use Freshservice API query syntax for agents with proper double quotes
  // Format: "~[first_name|last_name|email]:'searchterm'" (agents use 'email' not 'primary_email')
  const agentQuery = encodeURIComponent(`"~[first_name|last_name|email]:'${searchTerm}'"`);
  
  console.log(`${isRefresh ? 'Refreshing' : isLiveSearch ? 'Live searching' : 'Performing'} agent search with query:`, agentQuery);
  
  // Show appropriate loading indicator
  if (!isRefresh) {
    const resultsContainer = document.getElementById('agent-results');
    if (isLiveSearch) {
      showLiveSearchIndicator('agent-results', 'agents');
    } else {
      resultsContainer.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm" role="status"></div> Loading...</div>';
      resultsContainer.style.display = 'block';
    }
  }
  
  // Function to load agent results from a specific page
  function loadAgentsPage(page = 1, allResults = []) {
    // Use invokeTemplate with path suffix to add query parameter
    const requestUrl = `?query=${agentQuery}&page=${page}&per_page=30`;
    console.log('Agent API URL:', requestUrl);
    
    window.client.request.invokeTemplate("getAgents", {
      path_suffix: requestUrl
    })
    .then(function(data) {
      try {
        if (!data) {
          console.error('No data returned from agent search');
          finalizeAgentSearch(searchTerm, allResults, isRefresh);
          return;
        }
        
        console.log('Agent search raw response:', data.response);
        const response = JSON.parse(data.response || '{"agents":[]}');
        const agents = response && response.agents ? response.agents : [];
        console.log(`Agent search returned ${agents.length} results for requesters`);
        
        // Manual filtering if the API filtering isn't working
        const filteredAgents = agents.filter(agent => {
          const fullName = `${agent.first_name || ''} ${agent.last_name || ''}`.toLowerCase();
          const email = (agent.email || '').toLowerCase();
          const term = searchTerm.toLowerCase();
          return fullName.includes(term) || email.includes(term);
        });
        
        console.log(`Manual filtering returned ${filteredAgents.length} agent results`);
        
        // Combine with previous results
        const combinedResults = [...allResults, ...filteredAgents];
        
        // Check if we should load more pages based on results and configured limits
        const shouldLoadMorePages = filteredAgents.length === 30; // API returned full page
        
        if (shouldLoadMorePages) {
          // Get configured page limits
          (async function() {
              const params = await getInstallationParams();
              const paginationDelay = params.paginationDelay || DEFAULT_PAGINATION_DELAY;
              const pageLimit = params.listAgentsPageLimit || 3; // Default to 3 pages
              
              if (page < pageLimit) {
                updateLoadingMessage('agent-results', `Loading more results... (page ${page + 1}/${pageLimit})`);
                setTimeout(() => {
                  loadAgentsPage(page + 1, combinedResults);
                }, paginationDelay);
              } else {
                console.log(`📄 Reached page limit (${pageLimit}) for agent search, finalizing with ${combinedResults.length} results`);
                finalizeAgentSearch(searchTerm, combinedResults, isRefresh);
              }
          })().catch(err => {
              console.error('Error getting pagination settings:', err);
              // Default behavior if error - limit to 2 pages
              if (page < 2) {
                setTimeout(() => {
                  loadAgentsPage(page + 1, combinedResults);
                }, DEFAULT_PAGINATION_DELAY);
              } else {
                finalizeAgentSearch(searchTerm, combinedResults, isRefresh);
              }
          });
        } else {
          // No more results expected, complete the search
          console.log(`📄 No more pages expected (got ${filteredAgents.length} results), finalizing agent search with ${combinedResults.length} total results`);
          finalizeAgentSearch(searchTerm, combinedResults, isRefresh);
        }
      } catch (error) {
        console.error('Error parsing agent response:', error);
        finalizeAgentSearch(searchTerm, allResults, isRefresh);
      }
    })
    .catch(function(error) {
      console.error('Agent API request failed:', error);
      finalizeAgentSearch(searchTerm, allResults, isRefresh);
    });
  }
  
  // Start loading from page 1
  loadAgentsPage(1, []);
}

/**
 * Finalize requester search with results
 * @param {string} searchTerm - Original search term
 * @param {Array} results - Search results
 * @param {boolean} isRefresh - Whether this is a cache refresh operation
 */
// eslint-disable-next-line no-unused-vars
function finalizeRequesterSearch(searchTerm, results, isRefresh) {
  // Cache the results
  addToSearchCache('requesters', searchTerm, results);
  
  // Display all results with refresh status for logging
  console.log(`Displaying ${results.length} requester results (refresh: ${isRefresh})`);
  displaySearchResults('requester-results', results, selectRequester);
  
  // Add individual users to the user cache for later use
  if (results.length > 0) {
    cacheIndividualUsers(results, 'requester');
  }
}

/**
 * Global function to clear and refresh services cache
 */
window.refreshServices = async function() {
  try {
    console.log('🔄 Clearing services cache and forcing refresh...');
    
    // Clear services cache
    await clearServicesCache();
    console.log('✅ Services cache cleared');
    
    // Force refresh services
    console.log('🔄 Fetching fresh services...');
    const services = await getServices(true);
    console.log(`✅ Fetched ${services.length} services with new logic`);
    
    // Refresh the dropdown
    console.log('🔄 Refreshing services dropdown...');
    await initializeServicesDropdown();
    console.log('✅ Services dropdown refreshed');
    
    console.log('💡 Services should now be updated with the latest configuration');
    
  } catch (error) {
    console.error('❌ Error refreshing services:', error);
  }
};

/**
 * Global function to completely clear ALL browser storage and force refresh
 */
window.clearAllCache = async function() {
  try {
    console.log('🧹 CLEARING ALL CACHE AND STORAGE...');
    
    // Clear all localStorage items related to this app
    const keys = Object.keys(localStorage);
    const appKeys = keys.filter(key => 
      key.includes('services_cache') || 
      key.includes('asset') || 
      key.includes('change_request') ||
      key.includes('freshservice')
    );
    
    console.log('🗑️ Clearing localStorage keys:', appKeys);
    appKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`   ✅ Removed: ${key}`);
    });
    
    // Clear session storage too
    const sessionKeys = Object.keys(sessionStorage);
    const appSessionKeys = sessionKeys.filter(key => 
      key.includes('services') || 
      key.includes('asset') || 
      key.includes('change_request')
    );
    
    console.log('🗑️ Clearing sessionStorage keys:', appSessionKeys);
    appSessionKeys.forEach(key => {
      sessionStorage.removeItem(key);
      console.log(`   ✅ Removed: ${key}`);
    });
    
    // Clear in-memory caches
    if (typeof searchCache !== 'undefined') {
      searchCache.requesters = {};
      searchCache.agents = {};
      searchCache.assets = {};
      console.log('✅ Cleared in-memory search cache');
    }
    
    // Clear cache objects
    if (typeof cache !== 'undefined') {
      cache.asset_types = { data: {}, timestamp: 0 };
      cache.services = { data: [], timestamp: 0 };
      console.log('✅ Cleared cache objects');
    }
    
    // Clear asset type cache
    if (typeof assetTypeCache !== 'undefined') {
      assetTypeCache.byId = {};
      assetTypeCache.list = [];
      assetTypeCache.timestamp = 0;
      assetTypeCache.types = {};
      console.log('✅ Cleared asset type cache');
    }
    
    // Clear any existing dropdown
    const dropdown = document.getElementById('service-select');
    if (dropdown) {
      dropdown.innerHTML = '<option value="">Loading services...</option>';
      dropdown.disabled = true;
    }
    
    console.log('🔄 FORCING COMPLETE REFRESH...');
    
    // Force refresh everything
    const services = await getServices(true);
    console.log(`✅ Fetched ${services.length} fresh services`);
    
    // Reinitialize dropdown
    await initializeServicesDropdown();
    console.log('✅ Services dropdown reinitialized');
    
    console.log('🎉 COMPLETE CACHE CLEAR AND REFRESH DONE!');
    console.log('💡 All data should now be fresh from the API');
    
  } catch (error) {
    console.error('❌ Error clearing all cache:', error);
  }
};

/**
 * Debug function to check current service filtering logic
 */
window.debugServiceFilter = async function() {
  try {
    console.log('🔍 === DEBUGGING SERVICE FILTER LOGIC ===');
    
    // Check installation params
    const params = await getInstallationParams();
    console.log('📋 Installation params:', params);
    
    // Check default vs configured asset type IDs
    const defaultServiceAssetTypeIds = [37000374722, 37000374723, 37000374726, 37000374730];
    const configuredIds = params.serviceAssetTypeIds || defaultServiceAssetTypeIds;
    console.log('🎯 Default service asset type IDs:', defaultServiceAssetTypeIds);
    console.log('🎯 Configured service asset type IDs:', configuredIds);
    
    // Build the filter query
    const filterQuery = configuredIds.map(id => `asset_type_id:${id}`).join(' OR ');
    console.log('📝 Filter query that will be used:', filterQuery);
    
    // Show the full API URL
    const requestUrl = `?filter="${filterQuery}"&per_page=100`;
    console.log('🌐 Full API request URL:', requestUrl);
    
    // Check current cached services
    console.log('🔍 Checking current cached services...');
    const cachedServices = await getCachedServices();
    if (cachedServices && cachedServices.length > 0) {
      console.log(`📦 Found ${cachedServices.length} cached services`);
      
      // Group by asset_type_id to see what we have
      const groupedByType = {};
      cachedServices.forEach(service => {
        const typeId = service.asset_type_id || 'no_type';
        if (!groupedByType[typeId]) {
          groupedByType[typeId] = [];
        }
        groupedByType[typeId].push(service.display_name || service.name);
      });
      
      console.log('📊 Services grouped by asset_type_id:');
      Object.entries(groupedByType).forEach(([typeId, services]) => {
        const isInFilter = configuredIds.includes(parseInt(typeId));
        console.log(`   ${typeId} (${isInFilter ? '✅ IN FILTER' : '❌ NOT IN FILTER'}): ${services.length} services`);
        console.log(`      Examples: ${services.slice(0, 3).join(', ')}`);
      });
    } else {
      console.log('📦 No cached services found');
    }
    
    console.log('💡 To test fresh API call with current filter, run: refreshServicesWithDebug()');
    
  } catch (error) {
    console.error('❌ Error debugging service filter:', error);
  }
};

/**
 * Force refresh services with detailed debugging
 */
window.refreshServicesWithDebug = async function() {
  try {
    console.log('🔄 === FORCE REFRESH SERVICES WITH DEBUG ===');
    
    // Clear services cache first
    await clearServicesCache();
    console.log('✅ Services cache cleared');
    
    // Force refresh with debugging
    const services = await getServices(true);
    console.log(`✅ Fresh API call returned ${services.length} services`);
    
    // Analyze the results
    if (services.length > 0) {
      const groupedByType = {};
      services.forEach(service => {
        const typeId = service.asset_type_id || 'no_type';
        if (!groupedByType[typeId]) {
          groupedByType[typeId] = [];
        }
        groupedByType[typeId].push(service.display_name || service.name);
      });
      
      console.log('📊 Fresh services grouped by asset_type_id:');
      Object.entries(groupedByType).forEach(([typeId, serviceNames]) => {
        console.log(`   ${typeId}: ${serviceNames.length} services`);
        console.log(`      Examples: ${serviceNames.slice(0, 3).join(', ')}`);
      });
    }
    
    // Reinitialize dropdown
    await initializeServicesDropdown();
    console.log('✅ Services dropdown reinitialized');
    
  } catch (error) {
    console.error('❌ Error refreshing services with debug:', error);
  }
};

/**
 * Global debug function to test asset type filtering
 */
window.debugAssetTypeFiltering = async function() {
  console.log('🔧 === DEBUGGING ASSET TYPE FILTERING ===');
  
  try {
    // Get installation params
    const params = await getInstallationParams();
    console.log('📋 Installation params:', params);
    
    // Show the asset type IDs we're looking for
    const defaultServiceAssetTypeIds = [
      37000374722, // Applications/Software
      37000374723, // Additional asset type
      37000374726, // IT Software  
      37000374730  // ISP/Network Services
    ];
    const serviceAssetTypeIds = params.serviceAssetTypeIds || defaultServiceAssetTypeIds;
    console.log('🎯 Target asset type IDs:', serviceAssetTypeIds);
    
    // Get a sample of assets to test filtering
    console.log('🔄 Fetching first page of assets for testing...');
    const response = await window.client.request.invokeTemplate("getAssets", {
      path_suffix: "?per_page=30&page=1"
    });
    
    if (response && response.response) {
      const data = JSON.parse(response.response);
      const assets = data.assets || [];
      console.log(`📦 Found ${assets.length} assets on first page`);
      
      // Show all unique asset type IDs
      const foundAssetTypes = [...new Set(assets.map(a => a.asset_type_id))].sort((a, b) => a - b);
      console.log('🔍 Asset type IDs found on first page:', foundAssetTypes);
      
      // Test filtering
      const filteredAssets = assets.filter(asset => serviceAssetTypeIds.includes(asset.asset_type_id));
      console.log(`✅ Filtered assets: ${filteredAssets.length} of ${assets.length} match our target types`);
      
      // Show which target types have matches
      serviceAssetTypeIds.forEach(targetId => {
        const matches = assets.filter(a => a.asset_type_id === targetId);
        if (matches.length > 0) {
          console.log(`✅ Type ${targetId}: ${matches.length} assets found - ${matches.slice(0, 3).map(a => a.name).join(', ')}${matches.length > 3 ? '...' : ''}`);
        } else {
          console.log(`❌ Type ${targetId}: No assets found`);
        }
      });
      
      // Show which found types aren't in our target list
      const nonTargetTypes = foundAssetTypes.filter(id => !serviceAssetTypeIds.includes(id));
      if (nonTargetTypes.length > 0) {
        console.log('📋 Non-target asset types found:', nonTargetTypes);
        nonTargetTypes.forEach(typeId => {
          const examples = assets.filter(a => a.asset_type_id === typeId).slice(0, 2).map(a => a.name);
          console.log(`   Type ${typeId}: ${examples.join(', ')}`);
        });
      }
      
    } else {
      console.error('❌ Failed to fetch assets for testing');
    }
  } catch (error) {
    console.error('❌ Error in debugging:', error);
  }
};

/**
 * Global debug function to test asset search pagination
 */
window.testAssetSearchPagination = async function(searchTerm = 'test') {
  try {
    console.log('🔧 === TESTING ASSET SEARCH PAGINATION ===');
    console.log(`Search term: "${searchTerm}"`);
    
    // Get configured asset type IDs
    const assetTypeIds = await getConfiguredAssetTypeIds();
    console.log(`🎯 Configured asset type IDs: ${assetTypeIds.join(', ')}`);
    
    // Build search query
    const assetTypeFilter = assetTypeIds.length > 0 ? 
      `(${assetTypeIds.map(id => `asset_type_id:${id}`).join(' OR ')})` : '';
    const nameFilter = `name:'*${searchTerm}*'`;
    const query = assetTypeFilter ? 
      `${assetTypeFilter} AND ${nameFilter}` : 
      nameFilter;
    
    console.log(`🔍 Query: "${query}"`);
    
    // Test first few pages
    for (let page = 1; page <= 3; page++) {
      console.log(`\n📄 Testing page ${page}:`);
      
      const requestUrl = `?query=${encodeURIComponent(query)}&per_page=30&page=${page}`;
      console.log(`   URL: ${requestUrl}`);
      
      try {
        const response = await window.client.request.invokeTemplate("getAssets", {
          path_suffix: requestUrl
        });
        
        if (!response || !response.response) {
          console.log(`   ❌ No response for page ${page}`);
          break;
        }
        
        const data = JSON.parse(response.response);
        const assets = data.assets || [];
        
        console.log(`   📦 Retrieved: ${assets.length} assets`);
        
        if (assets.length > 0) {
          // Show first asset as example
          const firstAsset = assets[0];
          console.log(`   📋 Sample asset: "${firstAsset.name || firstAsset.display_name}" (ID: ${firstAsset.id}, Type: ${firstAsset.asset_type_id})`);
          
          // Filter by search term
          const filtered = assets.filter(asset => {
            const assetName = (asset.display_name || asset.name || '').toLowerCase();
            return assetName.includes(searchTerm.toLowerCase());
          });
          console.log(`   🔽 Matching search term: ${filtered.length} assets`);
        }
        
        if (assets.length < 30) {
          console.log(`   ✅ Last page reached (${assets.length} < 30)`);
          break;
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.log(`   ❌ Error on page ${page}:`, error.message);
        break;
      }
    }
    
    console.log('\n💡 Use performAssetSearch() to run the actual search function');
    
  } catch (error) {
    console.error('❌ Error testing pagination:', error);
  }
};

/**
 * Global debug function to show API limits and current usage
 */
window.showApiLimits = async function() {
  try {
    console.log('📊 === API LIMITS AND CONSTRAINTS ===');
    
    console.log('📋 Freshservice Assets API Limits:');
    console.log('   • Objects per page: 30 (fixed)');
    console.log('   • Maximum pages: 40');
    console.log('   • Maximum total objects: 1,200');
    console.log('   • Query string max length: 512 characters');
    console.log('   • Supports logical operators: AND, OR, ()');
    console.log('   • Supports relational operators: :>, :<');
    
    console.log('\n🔧 Current App Configuration:');
    const params = await getInstallationParams();
    console.log(`   • Pagination delay: ${params.paginationDelay || 300}ms`);
    console.log(`   • Search cache timeout: ${params.searchCacheTimeout || 7000}ms`);
    console.log(`   • Asset type names: "${params.assetTypeNames}"`);
    
    console.log('\n🎯 Current Asset Type Configuration:');
    const assetTypeIds = await getConfiguredAssetTypeIds();
    console.log(`   • Configured asset type IDs: ${assetTypeIds.join(', ')}`);
    
    // Test query length
    const assetTypeFilter = assetTypeIds.length > 0 ? 
      `(${assetTypeIds.map(id => `asset_type_id:${id}`).join(' OR ')})` : '';
    console.log(`   • Asset type filter length: ${assetTypeFilter.length} characters`);
    
    if (assetTypeFilter.length > 400) {
      console.log('   ⚠️ Warning: Query getting long, may approach 512 character limit');
    }
    
    console.log('\n💡 Available test functions:');
    console.log('   • testAssetSearchPagination("searchTerm") - Test pagination');
    console.log('   • debugAssetTypes() - Debug asset type configuration');
    console.log('   • clearAllCache() - Clear all caches');
    console.log('   • refreshServices() - Refresh services cache');
    
  } catch (error) {
    console.error('❌ Error showing API limits:', error);
  }
};

/**
 * Global debug function to test different search strategies
 */
window.testSearchStrategies = async function(searchTerm = 'software') {
  try {
    console.log('🧪 === TESTING DIFFERENT SEARCH STRATEGIES ===');
    console.log(`Search term: "${searchTerm}"`);
    
    const assetTypeIds = await getConfiguredAssetTypeIds();
    
    // Strategy 1: Asset type filter only
    console.log('\n🔍 Strategy 1: Asset type filter only');
    const typeOnlyQuery = assetTypeIds.length > 0 ? 
      `(${assetTypeIds.map(id => `asset_type_id:${id}`).join(' OR ')})` : '';
    console.log(`   Query: "${typeOnlyQuery}"`);
    await testSingleQuery(typeOnlyQuery, 'Type filter only');
    
    // Strategy 2: Name search only
    console.log('\n🔍 Strategy 2: Name search only');
    const nameOnlyQuery = `name:'*${searchTerm}*'`;
    console.log(`   Query: "${nameOnlyQuery}"`);
    await testSingleQuery(nameOnlyQuery, 'Name search only');
    
    // Strategy 3: Combined (current approach)
    console.log('\n🔍 Strategy 3: Combined filter (current approach)');
    const combinedQuery = typeOnlyQuery ? 
      `${typeOnlyQuery} AND ${nameOnlyQuery}` : 
      nameOnlyQuery;
    console.log(`   Query: "${combinedQuery}"`);
    await testSingleQuery(combinedQuery, 'Combined filter');
    
    console.log('\n💡 The combined approach (Strategy 3) is most efficient for your use case');
    
  } catch (error) {
    console.error('❌ Error testing search strategies:', error);
  }
};

/**
 * Helper function to test a single query
 */
async function testSingleQuery(query, description) {
  try {
    const requestUrl = `?query=${encodeURIComponent(query)}&per_page=30&page=1`;
    
    const response = await window.client.request.invokeTemplate("getAssets", {
      path_suffix: requestUrl
    });
    
    if (!response || !response.response) {
      console.log(`   ❌ No response for ${description}`);
      return;
    }
    
    const data = JSON.parse(response.response);
    const assets = data.assets || [];
    
    console.log(`   📦 Results: ${assets.length} assets`);
    
    if (assets.length > 0) {
      // Show asset type breakdown
      const typeBreakdown = {};
      assets.forEach(asset => {
        const typeId = asset.asset_type_id || 'unknown';
        typeBreakdown[typeId] = (typeBreakdown[typeId] || 0) + 1;
      });
      
      console.log(`   📊 Asset types found:`, typeBreakdown);
      console.log(`   📋 Sample: "${assets[0].name || assets[0].display_name}" (Type: ${assets[0].asset_type_id})`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error testing ${description}:`, error.message);
  }
}

/**
 * Global debug function to test response headers and pagination info
 */
window.testAssetHeaders = async function(searchTerm = 'test') {
  try {
    console.log('🔧 === TESTING ASSET API HEADERS ===');
    console.log(`Search term: "${searchTerm}"`);
    
    // Get configured asset type IDs
    const assetTypeIds = await getConfiguredAssetTypeIds();
    console.log(`🎯 Configured asset type IDs: ${assetTypeIds.join(', ')}`);
    
    // Build search query
    const assetTypeFilter = assetTypeIds.length > 0 ? 
      `(${assetTypeIds.map(id => `asset_type_id:${id}`).join(' OR ')})` : '';
    const nameFilter = `name:'*${searchTerm}*'`;
    const query = assetTypeFilter ? 
      `${assetTypeFilter} AND ${nameFilter}` : 
      nameFilter;
    
    console.log(`🔍 Query: "${query}"`);
    
    // Test first page to see headers
    const requestUrl = `?query=${encodeURIComponent(query)}&per_page=30&page=1`;
    console.log(`🌐 API request: ${requestUrl}`);
    
    const response = await window.client.request.invokeTemplate("getAssets", {
      path_suffix: requestUrl
    });
    
    if (!response) {
      console.log('❌ No response received');
      return;
    }
    
    console.log('📦 Raw response object:', {
      hasResponse: !!response.response,
      hasHeaders: !!response.headers,
      responseType: typeof response.response,
      headersType: typeof response.headers
    });
    
    // Parse and display headers
    if (response.headers) {
      console.log('📋 Raw headers:', response.headers);
      
      let parsedHeaders = {};
      try {
        parsedHeaders = typeof response.headers === 'string' ? 
          JSON.parse(response.headers) : response.headers;
        console.log('📋 Parsed headers:', parsedHeaders);
        
        // Look for pagination-related headers
        const paginationHeaders = {};
        Object.keys(parsedHeaders).forEach(key => {
          const lowerKey = key.toLowerCase();
          if (lowerKey.includes('total') || 
              lowerKey.includes('count') || 
              lowerKey.includes('page') || 
              lowerKey.includes('link') ||
              lowerKey.includes('x-')) {
            paginationHeaders[key] = parsedHeaders[key];
          }
        });
        
        console.log('🔢 Pagination-related headers:', paginationHeaders);
        
      } catch (e) {
        console.log('❌ Could not parse headers as JSON:', e.message);
      }
    } else {
      console.log('⚠️ No headers in response');
    }
    
    // Parse and display response data
    if (response.response) {
      try {
        const data = JSON.parse(response.response);
        const assets = data.assets || [];
        
        console.log('📊 Response data summary:');
        console.log(`   • Assets returned: ${assets.length}`);
        console.log(`   • Response keys: ${Object.keys(data).join(', ')}`);
        
        // Look for pagination info in response body
        const paginationInfo = {};
        Object.keys(data).forEach(key => {
          const lowerKey = key.toLowerCase();
          if (lowerKey.includes('total') || 
              lowerKey.includes('count') || 
              lowerKey.includes('page') ||
              lowerKey.includes('meta')) {
            paginationInfo[key] = data[key];
          }
        });
        
        if (Object.keys(paginationInfo).length > 0) {
          console.log('🔢 Pagination info in response body:', paginationInfo);
        } else {
          console.log('⚠️ No pagination info found in response body');
        }
        
        if (assets.length > 0) {
          console.log('📋 Sample asset:', {
            id: assets[0].id,
            name: assets[0].name || assets[0].display_name,
            asset_type_id: assets[0].asset_type_id
          });
        }
        
      } catch (e) {
        console.log('❌ Could not parse response body:', e.message);
      }
    } else {
      console.log('⚠️ No response body');
    }
    
    console.log('\n💡 This helps determine what pagination info is available from the API');
    
  } catch (error) {
    console.error('❌ Error testing headers:', error);
  }
};

/**
 * Global debug function to test efficient services loading
 */
window.testEfficientServicesLoading = async function() {
  try {
    console.log('🔧 === TESTING EFFICIENT SERVICES LOADING ===');
    
    // Get configured asset type IDs
    const params = await getInstallationParams();
    const serviceAssetTypeIds = params.serviceAssetTypeIds || [
      37000374722, 37000374723, 37000374726, 37000374730
    ];
    
    console.log(`🎯 Service asset type IDs: ${serviceAssetTypeIds.join(', ')}`);
    
    // Build query to filter by asset type IDs
    const assetTypeFilter = serviceAssetTypeIds.length > 0 ? 
      `(${serviceAssetTypeIds.map(id => `asset_type_id:${id}`).join(' OR ')})` : '';
    
    console.log(`🔍 Filter query: "${assetTypeFilter}"`);
    
    // Test single page to see response structure
    const encodedQuery = encodeURIComponent(assetTypeFilter);
    const requestUrl = `?query=${encodedQuery}&per_page=30&page=1`;
    
    console.log(`🌐 Test API request: ${requestUrl}`);
    
    const response = await window.client.request.invokeTemplate("getAssets", {
      path_suffix: requestUrl
    });
    
    if (response && response.response) {
      const data = JSON.parse(response.response);
      const assets = data.assets || [];
      
      console.log(`📄 Retrieved ${assets.length} assets on first page`);
      
      // Check headers
      if (response.headers) {
        console.log('📊 Response headers:', response.headers);
        
        try {
          const headers = typeof response.headers === 'string' ? 
            JSON.parse(response.headers) : response.headers;
          
          console.log('📊 Parsed headers:', Object.keys(headers));
          
          // Look for pagination info
          Object.entries(headers).forEach(([key, value]) => {
            if (key.toLowerCase().includes('total') || 
                key.toLowerCase().includes('count') ||
                key.toLowerCase().includes('page')) {
              console.log(`📊 ${key}: ${value}`);
            }
          });
        } catch (e) {
          console.log('📊 Could not parse headers:', e.message);
        }
      }
      
      // Show asset type breakdown
      const typeBreakdown = {};
      assets.forEach(asset => {
        const typeId = asset.asset_type_id;
        typeBreakdown[typeId] = (typeBreakdown[typeId] || 0) + 1;
      });
      
      console.log('📊 Asset types in results:', typeBreakdown);
      
      // Show sample assets
      if (assets.length > 0) {
        console.log('📋 Sample assets:');
        assets.slice(0, 3).forEach((asset, index) => {
          console.log(`   ${index + 1}. ${asset.name} (Type: ${asset.asset_type_id})`);
        });
      }
    } else {
      console.error('❌ No response from API');
    }
    
  } catch (error) {
    console.error('❌ Error testing efficient services loading:', error);
  }
};

/**
 * Global debug function to compare loading strategies
 */
window.compareLoadingStrategies = async function() {
  try {
    console.log('🔧 === COMPARING LOADING STRATEGIES ===');
    
    const serviceAssetTypeIds = [37000374722, 37000374723, 37000374726, 37000374730];
    
    // Strategy 1: Filtered query (new approach)
    console.log('🔍 Testing Strategy 1: Filtered Query');
    const startTime1 = Date.now();
    
    const assetTypeFilter = `(${serviceAssetTypeIds.map(id => `asset_type_id:${id}`).join(' OR ')})`;
    const encodedQuery = encodeURIComponent(assetTypeFilter);
    const filteredUrl = `?query=${encodedQuery}&per_page=30&page=1`;
    
    const filteredResponse = await window.client.request.invokeTemplate("getAssets", {
      path_suffix: filteredUrl
    });
    
    const filteredTime = Date.now() - startTime1;
    const filteredData = JSON.parse(filteredResponse.response);
    const filteredAssets = filteredData.assets || [];
    
    
    console.log(`✅ Strategy 1: ${filteredAssets.length} assets in ${filteredTime}ms`);
    
    // Strategy 2: Unfiltered query (old approach)
    console.log('🔍 Testing Strategy 2: Unfiltered Query');
    const startTime2 = Date.now();
    
    const unfilteredUrl = `?per_page=30&page=1`;
    const unfilteredResponse = await window.client.request.invokeTemplate("getAssets", {
      path_suffix: unfilteredUrl
    });
    
    const unfilteredTime = Date.now() - startTime2;
    const unfilteredData = JSON.parse(unfilteredResponse.response);
    const unfilteredAssets = unfilteredData.assets || [];
    
    // Filter client-side
    const clientFiltered = unfilteredAssets.filter(asset => 
      serviceAssetTypeIds.includes(asset.asset_type_id)
    );
    
    console.log(`✅ Strategy 2: ${unfilteredAssets.length} total assets, ${clientFiltered.length} relevant in ${unfilteredTime}ms`);
    
    // Compare efficiency
    console.log('📊 Comparison:');
    console.log(`   Filtered Query: ${filteredAssets.length} relevant assets in ${filteredTime}ms`);
    console.log(`   Unfiltered + Client Filter: ${clientFiltered.length} relevant assets in ${unfilteredTime}ms`);
    console.log(`   Efficiency gain: ${((unfilteredTime - filteredTime) / unfilteredTime * 100).toFixed(1)}% faster`);
    console.log(`   Bandwidth savings: ${((unfilteredAssets.length - filteredAssets.length) / unfilteredAssets.length * 100).toFixed(1)}% less data`);
    
  } catch (error) {
    console.error('❌ Error comparing loading strategies:', error);
  }
};

/**
 * Global debug function to test different API search syntaxes
 */
window.testApiSearchSyntax = async function(searchTerm = 'middleware') {
  try {
    console.log('🔧 === TESTING API SEARCH SYNTAX ===');
    console.log(`Search term: "${searchTerm}"`);
    
    // Get configured asset type IDs
    const assetTypeIds = await getConfiguredAssetTypeIds();
    const assetTypeFilter = assetTypeIds.length > 0 ? 
      `(${assetTypeIds.map(id => `asset_type_id:${id}`).join(' OR ')})` : '';
    
    console.log(`🎯 Asset type filter: ${assetTypeFilter}`);
    
    // Test different search syntaxes
    const searchSyntaxes = [
      {
        name: 'Current syntax (single quotes with wildcards)',
        query: `${assetTypeFilter} AND name:'*${searchTerm}*'`
      },
      {
        name: 'Double quotes with wildcards',
        query: `${assetTypeFilter} AND name:"*${searchTerm}*"`
      },
      {
        name: 'No quotes with wildcards',
        query: `${assetTypeFilter} AND name:*${searchTerm}*`
      },
      {
        name: 'Contains syntax',
        query: `${assetTypeFilter} AND name:${searchTerm}`
      },
      {
        name: 'Display name search',
        query: `${assetTypeFilter} AND display_name:'*${searchTerm}*'`
      },
      {
        name: 'Asset type filter only (no name filter)',
        query: assetTypeFilter
      }
    ];
    
    for (const syntax of searchSyntaxes) {
      console.log(`\n🔍 Testing: ${syntax.name}`);
      console.log(`Query: "${syntax.query}"`);
      
      try {
        const encodedQuery = encodeURIComponent(syntax.query);
        const requestUrl = `?query=${encodedQuery}&per_page=10&page=1`;
        
        const response = await window.client.request.invokeTemplate("getAssets", {
          path_suffix: requestUrl
        });
        
        if (response && response.response) {
          const data = JSON.parse(response.response);
          const assets = data.assets || [];
          
          console.log(`✅ ${syntax.name}: ${assets.length} assets returned`);
          
          if (assets.length > 0) {
            // Check how many actually match our search term
            const nameMatches = assets.filter(asset => {
              const assetName = (asset.display_name || asset.name || '').toLowerCase();
              return assetName.includes(searchTerm.toLowerCase());
            });
            
            console.log(`   📊 ${nameMatches.length} assets actually contain "${searchTerm}" in name`);
            
            // Show sample assets
            console.log(`   📋 Sample assets:`);
            assets.slice(0, 3).forEach((asset, index) => {
              const assetName = asset.display_name || asset.name || 'Unknown';
              const matches = assetName.toLowerCase().includes(searchTerm.toLowerCase());
              console.log(`      ${index + 1}. "${assetName}" ${matches ? '✅' : '❌'}`);
            });
          }
        } else {
          console.log(`❌ ${syntax.name}: No response`);
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.log(`❌ ${syntax.name}: Error - ${error.message}`);
      }
    }
    
    console.log('\n🔧 === SEARCH SYNTAX TEST COMPLETE ===');
    
  } catch (error) {
    console.error('❌ Error testing API search syntax:', error);
  }
};

/**
 * Global debug function to find assets that contain specific terms
 */
window.findAssetsContaining = async function(searchTerm = 'middleware') {
  try {
    console.log('🔧 === FINDING ASSETS BY NAME (ALL TYPES) ===');
    console.log(`Search term: "${searchTerm}"`);
    console.log('🎯 Searching ALL asset types by name/displayname (no filters)');
    
    // Get ALL assets without any filters
    const query = ''; // Empty query = all assets across all types
    const encodedQuery = encodeURIComponent(query);
    const requestUrl = `?query=${encodedQuery}&per_page=30&page=1`;
    
    console.log(`🔍 Getting all assets without filters (all types)`);
    
    const response = await window.client.request.invokeTemplate("getAssets", {
      path_suffix: requestUrl
    });
    
    if (response && response.response) {
      const data = JSON.parse(response.response);
      const assets = data.assets || [];
      
      console.log(`📄 Retrieved ${assets.length} total assets (all types)`);
      
      // Find assets that contain the search term in name or display_name
      const matchingAssets = assets.filter(asset => {
        const assetName = (asset.display_name || asset.name || '').toLowerCase();
        return assetName.includes(searchTerm.toLowerCase());
      });
      
      console.log(`🎯 Found ${matchingAssets.length} assets containing "${searchTerm}" in name`);
      
      if (matchingAssets.length > 0) {
        console.log(`📋 Matching assets:`);
        matchingAssets.forEach((asset, index) => {
          const assetName = asset.display_name || asset.name || 'Unknown';
          console.log(`   ${index + 1}. "${assetName}" (ID: ${asset.id}, Type: ${asset.asset_type_id})`);
        });
      } else {
        console.log(`📋 Sample assets (first 10):`);
        assets.slice(0, 10).forEach((asset, index) => {
          const assetName = asset.display_name || asset.name || 'Unknown';
          console.log(`   ${index + 1}. "${assetName}" (ID: ${asset.id}, Type: ${asset.asset_type_id})`);
        });
      }
    } else {
      console.log('❌ No response from API');
    }
    
  } catch (error) {
    console.error('❌ Error finding assets:', error);
  }
};

/**
 * Global debug function to test the new efficient asset search
 */
window.testEfficientAssetSearch = async function(searchTerm = 'active') {
  try {
    console.log('🔧 === TESTING BASIC ASSET SEARCH ===');
    console.log(`Search term: "${searchTerm}"`);
    console.log('🎯 Using basic assets endpoint (no query parameters)');
    console.log('⚠️ Client-side filtering for names (API does not support name queries)');
    
    let allAssets = [];
    let matchingAssets = [];
    let page = 1;
    const maxPages = 3; // Limit for testing
    
    while (page <= maxPages) {
      const requestUrl = `?per_page=30&page=${page}`;
      
      console.log(`🌐 Page ${page} request: ${requestUrl}`);
      
      const response = await window.client.request.invokeTemplate("getAssets", {
        path_suffix: requestUrl
      });
      
      if (response && response.response) {
        const data = JSON.parse(response.response);
        const pageAssets = data.assets || [];
        
        console.log(`📄 Page ${page}: Retrieved ${pageAssets.length} assets`);
        
        if (pageAssets.length === 0) {
          console.log('📄 No more assets, stopping');
          break;
        }
        
        // Filter for matching assets by name
        const pageMatches = pageAssets.filter(asset => {
          const assetName = (asset.display_name || asset.name || '').toLowerCase();
          return assetName.includes(searchTerm.toLowerCase());
        });
        
        console.log(`🔽 Page ${page}: ${pageMatches.length} assets match "${searchTerm}" by name`);
        
        allAssets = allAssets.concat(pageAssets);
        matchingAssets = matchingAssets.concat(pageMatches);
        
        // Show matches found on this page
        if (pageMatches.length > 0) {
          pageMatches.forEach((asset, index) => {
            const assetName = asset.display_name || asset.name || 'Unknown';
            console.log(`   ✅ ${index + 1}. "${assetName}" (ID: ${asset.id}, Type: ${asset.asset_type_id})`);
          });
        }
        
        // Stop if we have enough matches
        if (matchingAssets.length >= 10) {
          console.log(`✅ Found enough matches (${matchingAssets.length}), stopping early`);
          break;
        }
        
        // Stop if we didn't get a full page
        if (pageAssets.length < 30) {
          console.log('📄 Partial page received, stopping');
          break;
        }
        
        page++;
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        console.log(`❌ No response for page ${page}`);
        break;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total assets retrieved: ${allAssets.length}`);
    console.log(`   Matching assets found: ${matchingAssets.length}`);
    console.log(`   Pages searched: ${page - 1}`);
    console.log(`   Efficiency: ${((matchingAssets.length / allAssets.length) * 100).toFixed(1)}% relevant`);
    
    if (matchingAssets.length > 0) {
      console.log(`\n📋 All matching assets:`);
      matchingAssets.forEach((asset, index) => {
        const assetName = asset.display_name || asset.name || 'Unknown';
        console.log(`   ${index + 1}. "${assetName}" (ID: ${asset.id}, Type: ${asset.asset_type_id})`);
      });
    }
    
    console.log('\n🔧 === BASIC ASSET SEARCH TEST COMPLETE ===');
    
  } catch (error) {
    console.error('❌ Error testing basic asset search:', error);
  }
};

/**
 * Global debug function to find assets containing a specific term using basic API endpoint
 */
window.findAssetsContaining = async function(searchTerm = 'middleware') {
  try {
    console.log('🔧 === TESTING BASIC ASSETS ENDPOINT ===');
    console.log(`Search term: "${searchTerm}"`);
    console.log('🎯 Using basic assets endpoint (no query parameters)');
    
    // Use basic assets endpoint without query parameters
    const requestUrl = `?per_page=30&page=1`;
    
    console.log(`🔍 No query parameters (API doesn't support name search)`);
    console.log(`🌐 Request URL: ${requestUrl}`);
    
    const response = await window.client.request.invokeTemplate("getAssets", {
      path_suffix: requestUrl
    });
    
    if (response && response.response) {
      const data = JSON.parse(response.response);
      const assets = data.assets || [];
      
      console.log(`📄 Retrieved ${assets.length} assets from basic endpoint`);
      
      // Filter client-side for matches
      const matchingAssets = assets.filter(asset => {
        const assetName = (asset.display_name || asset.name || '').toLowerCase();
        return assetName.includes(searchTerm.toLowerCase());
      });
      
      console.log(`🔽 ${matchingAssets.length} assets match "${searchTerm}" after client-side filtering`);
      
      if (matchingAssets.length > 0) {
        console.log(`📋 Matching assets:`);
        matchingAssets.forEach((asset, index) => {
          const assetName = asset.display_name || asset.name || 'Unknown';
          console.log(`   ${index + 1}. "${assetName}" (ID: ${asset.id}, Type: ${asset.asset_type_id})`);
        });
      } else {
        console.log(`📋 No matches found. Sample assets (first 5):`);
        assets.slice(0, 5).forEach((asset, index) => {
          const assetName = asset.display_name || asset.name || 'Unknown';
          console.log(`   ${index + 1}. "${assetName}" (ID: ${asset.id}, Type: ${asset.asset_type_id})`);
        });
        console.log('💡 Try different search terms that might match the asset names above');
      }
    } else {
      console.log('❌ No response from API');
    }
    
  } catch (error) {
    console.error('❌ Error finding assets:', error);
  }
};

/**
 * Test the new Enter key search behavior
 */
window.testSearchBehavior = function() {
  console.log('🧪 === TESTING ENTER KEY SEARCH BEHAVIOR ===');
  
  const assetSearchInput = document.getElementById('asset-search');
  const assetSearchBtn = document.getElementById('asset-search-btn');
  
  if (!assetSearchInput) {
    console.error('❌ Asset search input not found');
    return;
  }
  
  if (!assetSearchBtn) {
    console.error('❌ Asset search button not found');
    return;
  }
  
  console.log('✅ Asset search input found:', assetSearchInput);
  console.log('✅ Asset search button found:', assetSearchBtn);
  console.log('📝 Placeholder text:', assetSearchInput.placeholder);
  
  // Test that keydown events are properly bound
  const events = getEventListeners ? getEventListeners(assetSearchInput) : null;
  if (events) {
    console.log('🔗 Event listeners on input:', Object.keys(events));
  } else {
    console.log('🔗 Event listeners check not available (use dev tools)');
  }
  
  console.log('\n💡 Testing instructions:');
  console.log('1. Type a search term in the asset search input');
  console.log('2. Press Enter or click the search button');
  console.log('3. Verify search only triggers on Enter/click, not on typing');
  console.log('4. Check console for search trigger messages');
  
  console.log('\n🔧 === SEARCH BEHAVIOR TEST COMPLETE ===');
}

/**
 * Display asset search results
 */
function displayAssetResults() {
  // Asset search results display functionality removed - blank slate for new implementation
  console.log('Asset results display - functionality removed');
}

/**
 * Handle change type selection
 * @param {Event} event Change event
 */
function handleChangeTypeSelection(event) {
  const changeType = event.target.value;
  
  // Update lead time display
  const leadTimeElement = document.getElementById('lead-time');
  if (leadTimeElement) {
    leadTimeElement.textContent = leadTimeText[changeType] || '2 business days';
  }
  
  // Update change type description/tooltip
  const tooltipElement = document.getElementById('change-type-tooltip');
  if (tooltipElement) {
    tooltipElement.textContent = changeTypeTooltips[changeType] || '';
  }
  
  // Update the stored change request data
  changeRequestData.changeType = changeType;
  changeRequestData.leadTime = leadTimeText[changeType] || '2 business days';
  
  console.log(`Change type updated to: ${changeType}, Lead time: ${changeRequestData.leadTime}`);
}

/**
 * Initialize change type defaults on page load
 */
function initializeChangeTypeDefaults() {
  const changeTypeSelect = document.getElementById('change-type');
  if (!changeTypeSelect) return;
  
  // Get the currently selected change type (default is 'normal')
  const currentChangeType = changeTypeSelect.value || 'normal';
  
  // Update lead time display
  const leadTimeElement = document.getElementById('lead-time');
  if (leadTimeElement) {
    leadTimeElement.textContent = leadTimeText[currentChangeType] || '2 business days';
  }
  
  // Update change type description/tooltip
  const tooltipElement = document.getElementById('change-type-tooltip');
  if (tooltipElement) {
    tooltipElement.textContent = changeTypeTooltips[currentChangeType] || '';
  }
  
  // Initialize the stored change request data
  changeRequestData.changeType = currentChangeType;
  changeRequestData.leadTime = leadTimeText[currentChangeType] || '2 business days';
  
  console.log(`Initialized change type: ${currentChangeType}, Lead time: ${changeRequestData.leadTime}`);
}

/**
 * Global debug function to test the new efficient asset search
 */
window.testEfficientAssetSearch = async function(searchTerm = 'active') {
  try {
    console.log('🔧 === TESTING BASIC ASSET SEARCH ===');
    console.log(`Search term: "${searchTerm}"`);
    console.log('🎯 Using basic assets endpoint (no query parameters)');
    console.log('⚠️ Client-side filtering for names (API does not support name queries)');
    
    let allAssets = [];
    let matchingAssets = [];
    let page = 1;
    const maxPages = 3; // Limit for testing
    
    while (page <= maxPages) {
      const requestUrl = `?per_page=30&page=${page}`;
      
      console.log(`🌐 Page ${page} request: ${requestUrl}`);
      
      const response = await window.client.request.invokeTemplate("getAssets", {
        path_suffix: requestUrl
      });
      
      if (response && response.response) {
        const data = JSON.parse(response.response);
        const pageAssets = data.assets || [];
        
        console.log(`📄 Page ${page}: Retrieved ${pageAssets.length} assets`);
        
        if (pageAssets.length === 0) {
          console.log('📄 No more assets, stopping');
          break;
        }
        
        // Filter for matching assets by name
        const pageMatches = pageAssets.filter(asset => {
          const assetName = (asset.display_name || asset.name || '').toLowerCase();
          return assetName.includes(searchTerm.toLowerCase());
        });
        
        console.log(`🔽 Page ${page}: ${pageMatches.length} assets match "${searchTerm}" by name`);
        
        allAssets = allAssets.concat(pageAssets);
        matchingAssets = matchingAssets.concat(pageMatches);
        
        // Show matches found on this page
        if (pageMatches.length > 0) {
          pageMatches.forEach((asset, index) => {
            const assetName = asset.display_name || asset.name || 'Unknown';
            console.log(`   ✅ ${index + 1}. "${assetName}" (ID: ${asset.id}, Type: ${asset.asset_type_id})`);
          });
        }
        
        // Stop if we have enough matches
        if (matchingAssets.length >= 10) {
          console.log(`✅ Found enough matches (${matchingAssets.length}), stopping early`);
          break;
        }
        
        // Stop if we didn't get a full page
        if (pageAssets.length < 30) {
          console.log('📄 Partial page received, stopping');
          break;
        }
        
        page++;
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        console.log(`❌ No response for page ${page}`);
        break;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total assets retrieved: ${allAssets.length}`);
    console.log(`   Matching assets found: ${matchingAssets.length}`);
    console.log(`   Pages searched: ${page - 1}`);
    console.log(`   Efficiency: ${((matchingAssets.length / allAssets.length) * 100).toFixed(1)}% relevant`);
    
    if (matchingAssets.length > 0) {
      console.log(`\n📋 All matching assets:`);
      matchingAssets.forEach((asset, index) => {
        const assetName = asset.display_name || asset.name || 'Unknown';
        console.log(`   ${index + 1}. "${assetName}" (ID: ${asset.id}, Type: ${asset.asset_type_id})`);
      });
    }
    
    console.log('\n🔧 === BASIC ASSET SEARCH TEST COMPLETE ===');
    
  } catch (error) {
    console.error('❌ Error testing basic asset search:', error);
  }
};

/**
 * Get location name by ID with caching
 * @param {number} locationId - Location ID 
 * @returns {Promise<string>} - Location name
 */
async function getLocationName(locationId) {
  if (!locationId) return 'N/A';
  
  // Check if CacheManager is available and use it
  if (window.CacheManager && window.CacheManager.getLocationName) {
    console.log(`🔍 Using CacheManager to lookup location name for ID: ${locationId}`);
    return await window.CacheManager.getLocationName(locationId);
  }
  
  // Fallback to original logic if CacheManager is not available
  console.log(`🔍 CacheManager not available, using fallback logic for location ID: ${locationId}`);
  
  // Check for client availability
  if (!window.client || !window.client.db) {
    console.error('Client not available for location lookup');
    return 'Unknown';
  }

  try {
    // Check cache first
    const cachedLocations = await getCachedLocations();
    
    // If location is in cache and not expired, use it
    if (cachedLocations[locationId] && 
        cachedLocations[locationId].timestamp > Date.now() - CACHE_TIMEOUT) {
      console.log(`✅ Using cached location: "${cachedLocations[locationId].name}" for ID ${locationId}`);
      return cachedLocations[locationId].name;
    }
    
    console.log(`🔄 Location ${locationId} not in cache or expired, trying to refresh...`);
    
    // Try to refresh cache and look again
    try {
      const allLocations = await fetchAllLocations();
      
      // Check if our target location was included in the refresh
      if (allLocations[locationId]) {
        console.log(`✅ Found location ${locationId} after cache refresh: "${allLocations[locationId].name}"`);
        return allLocations[locationId].name;
      }
    } catch (bulkError) {
      console.log(`⚠️ Bulk location fetch failed: ${bulkError.message}`);
    }
    
    console.log(`❌ Location ${locationId} not found even after refresh`);
    return `Location ${locationId}`;
    
  } catch (error) {
    console.error(`❌ Error in getLocationName for ${locationId}:`, error);
    return `Location ${locationId}`;
  }
}

/**
 * Get cached locations from storage
 * @returns {Promise<Object>} - Cached locations
 */
async function getCachedLocations() {
  try {
    // Try to get cached locations
    const result = await window.client.db.get(STORAGE_KEYS.LOCATION_CACHE);
    return result || {};
  } catch (error) {
    // If error or not found, return empty cache
    console.log('No location cache found or error:', error);
    return {};
  }
}

/**
 * Save locations to cache
 * @param {Object} locations - Locations to cache
 * @returns {Promise<boolean>} - Success status
 */
async function cacheLocations(locations) {
  try {
    await window.client.db.set(STORAGE_KEYS.LOCATION_CACHE, locations);
    console.log('Location cache updated');
    return true;
  } catch (error) {
    console.error('Failed to save location cache:', error);
    return false;
  }
}

// Expose the getLocationName function globally for use by other modules
window.getLocationName = getLocationName;

/**
 * Global debug function to test asset type caching and lookup
 */
window.testAssetTypeCaching = async function() {
  try {
    console.log('🔧 === TESTING ASSET TYPE CACHING ===');
    
    // Check current cache
    const cachedTypes = await getCachedAssetTypes();
    console.log(`📦 Current cache contains ${Object.keys(cachedTypes).length} asset types`);
    
    // Specifically check for laptop type
    if (cachedTypes[37000374826]) {
      console.log(`✅ Laptop asset type in cache: "${cachedTypes[37000374826].name}"`);
    } else {
      console.log('❌ Laptop asset type (37000374826) NOT in cache');
    }
    
    // Force refresh cache
    console.log('🔄 Force refreshing asset type cache...');
    await window.client.db.set(STORAGE_KEYS.ASSET_TYPE_CACHE, {});
    
    const freshTypes = await fetchAllAssetTypes();
    console.log(`📦 Fresh fetch returned ${Object.keys(freshTypes).length} asset types`);
    
    // Check for laptop type again
    if (freshTypes[37000374826]) {
      console.log(`✅ Laptop asset type fetched: "${freshTypes[37000374826].name}"`);
    } else {
      console.log('❌ Laptop asset type (37000374826) NOT found in fresh fetch');
    }
    
    // Test individual lookup
    console.log('🔍 Testing individual asset type lookup...');
    const laptopTypeName = await getAssetTypeName(37000374826);
    console.log(`🎯 Laptop type name result: "${laptopTypeName}"`);
    
    // Show sample of cached types
    const sampleTypes = Object.entries(freshTypes).slice(0, 10);
    console.log('📋 Sample cached asset types:');
    sampleTypes.forEach(([id, type]) => {
      console.log(`   ${id}: "${type.name}"`);
    });
    
  } catch (error) {
    console.error('❌ Error testing asset type caching:', error);
  }
};

/**
 * Global debug function to specifically fetch the laptop asset type
 */
window.fetchLaptopAssetType = async function() {
  try {
    console.log('🔧 === FETCHING LAPTOP ASSET TYPE ===');
    
    // Try individual fetch
    const response = await window.client.request.invokeTemplate("getAssetTypes", {
      path_suffix: `/37000374826`
    });
    
    if (response && response.response) {
      const data = JSON.parse(response.response);
      console.log('📦 Laptop asset type response:', data);
      
      if (data.asset_type) {
        console.log(`✅ Laptop asset type: "${data.asset_type.name}" (ID: ${data.asset_type.id})`);
        
        // Cache it manually
        const cache = await getCachedAssetTypes();
        cache[37000374826] = {
          name: data.asset_type.name,
          description: data.asset_type.description || '',
          visible: data.asset_type.visible !== false,
          timestamp: Date.now()
        };
        await cacheAssetTypes(cache);
        console.log('✅ Manually cached laptop asset type');
      }
    } else {
      console.log('❌ No response for laptop asset type');
    }
  } catch (error) {
    console.error('❌ Error fetching laptop asset type:', error);
  }
};

/**
 * Global debug function to test location caching and lookup
 */
window.testLocationCaching = async function() {
  try {
    console.log('🔧 === TESTING LOCATION CACHING ===');
    
    // Check current cache
    const cachedLocations = await getCachedLocations();
    console.log(`📦 Current cache contains ${Object.keys(cachedLocations).length} locations`);
    
    // Show sample cached locations
    if (Object.keys(cachedLocations).length > 0) {
      const sampleLocations = Object.entries(cachedLocations).slice(0, 5);
      console.log('📋 Sample cached locations:');
      sampleLocations.forEach(([id, location]) => {
        console.log(`   ${id}: "${location.name}"`);
      });
    }
    
    // Force refresh cache
    console.log('🔄 Force refreshing location cache...');
    await window.client.db.set(STORAGE_KEYS.LOCATION_CACHE, {});
    
    const freshLocations = await fetchAllLocations();
    console.log(`📦 Fresh fetch returned ${Object.keys(freshLocations).length} locations`);
    
    // Show sample fresh locations
    if (Object.keys(freshLocations).length > 0) {
      const sampleFresh = Object.entries(freshLocations).slice(0, 5);
      console.log('📋 Sample fresh locations:');
      sampleFresh.forEach(([id, location]) => {
        console.log(`   ${id}: "${location.name}"`);
      });
    }
    
    // Test individual lookup
    if (Object.keys(freshLocations).length > 0) {
      const firstLocationId = Object.keys(freshLocations)[0];
      console.log(`🔍 Testing individual location lookup for ID: ${firstLocationId}`);
      const locationName = await getLocationName(firstLocationId);
      console.log(`🎯 Location name result: "${locationName}"`);
    }
    
  } catch (error) {
    console.error('❌ Error testing location caching:', error);
  }
};

/**
 * Global debug function to test the locations API endpoint
 */
window.testLocationsAPI = async function() {
  try {
    console.log('🔧 === TESTING LOCATIONS API ===');
    
    console.log('🔄 Testing getLocations template...');
    const response = await window.client.request.invokeTemplate("getLocations", {
      path_suffix: "?page=1&per_page=10"
    });
    
    if (response && response.response) {
      const data = JSON.parse(response.response);
      console.log('📦 Locations API response:', data);
      
      if (data.locations && data.locations.length > 0) {
        console.log(`✅ Found ${data.locations.length} locations`);
        data.locations.forEach((location, index) => {
          console.log(`   ${index + 1}. "${location.name}" (ID: ${location.id})`);
        });
      } else {
        console.log('❌ No locations found in response');
      }
    } else {
      console.log('❌ No response from locations API');
    }
  } catch (error) {
    console.error('❌ Error testing locations API:', error);
  }
};

/**
 * Global debug function to test which API endpoints are available
 */
window.testAvailableAPIs = async function() {
  try {
    console.log('🔧 === TESTING AVAILABLE APIs ===');
    
    // Test asset types API
    console.log('🔄 Testing Asset Types API...');
    try {
      const assetTypesResponse = await window.client.request.invokeTemplate("getAssetTypes", {
        path_suffix: "?page=1&per_page=5"
      });
      if (assetTypesResponse && assetTypesResponse.response) {
        const data = JSON.parse(assetTypesResponse.response);
        console.log(`✅ Asset Types API: Working (${data.asset_types?.length || 0} types found)`);
      }
    } catch (error) {
      console.log(`❌ Asset Types API: Failed - ${error.message}`);
    }
    
    // Test locations API with template
    console.log('🔄 Testing Locations API (template)...');
    try {
      const locationsResponse = await window.client.request.invokeTemplate("getLocations", {
        path_suffix: "?page=1&per_page=5"
      });
      if (locationsResponse && locationsResponse.response) {
        const data = JSON.parse(locationsResponse.response);
        console.log(`✅ Locations API (template): Working (${data.locations?.length || 0} locations found)`);
      }
    } catch (error) {
      console.log(`❌ Locations API (template): Failed - ${error.message}`);
    }
    
    // Test direct locations API
    console.log('🔄 Testing Locations API (direct)...');
    try {
      const directResponse = await window.client.request.invokeTemplate("getLocations", {
        path_suffix: "?page=1&per_page=5"
      });
      if (directResponse && directResponse.response) {
        const data = JSON.parse(directResponse.response);
        console.log(`✅ Locations API (direct): Working (${data.locations?.length || 0} locations found)`);
      }
    } catch (error) {
      console.log(`❌ Locations API (direct): Failed - ${error.message}`);
    }
    
    // Test individual asset type fetch
    console.log('🔄 Testing Individual Asset Type API...');
    try {
      const assetTypeResponse = await window.client.request.invokeTemplate("getAssetTypes", {
        path_suffix: "/37000374826"
      });
      if (assetTypeResponse && assetTypeResponse.response) {
        const data = JSON.parse(assetTypeResponse.response);
        console.log(`✅ Individual Asset Type API: Working`);
        console.log(`📦 Sample response structure:`, Object.keys(data));
      }
    } catch (error) {
      console.log(`❌ Individual Asset Type API: Failed - ${error.message}`);
    }
    
    // Test individual location fetch with template
    console.log('🔄 Testing Individual Location API (template)...');
    try {
      const locationResponse = await window.client.request.invokeTemplate("getLocation", {
        context: {
          location_id: 37000074320
        }
      });
      if (locationResponse && locationResponse.response) {
        const data = JSON.parse(locationResponse.response);
        console.log(`✅ Individual Location API (template): Working`);
        console.log(`📦 Sample response structure:`, Object.keys(data));
      }
    } catch (error) {
      console.log(`❌ Individual Location API (template): Failed - ${error.message}`);
    }
    
    // Test individual location fetch direct
    console.log('🔄 Testing Individual Location API (direct)...');
    try {
      const directLocationResponse = await window.client.request.invokeTemplate("getLocation", {
        path_suffix: "/37000074320"
      });
      if (directLocationResponse && directLocationResponse.response) {
        const data = JSON.parse(directLocationResponse.response);
        console.log(`✅ Individual Location API (direct): Working`);
        console.log(`📦 Sample response structure:`, Object.keys(data));
      }
    } catch (error) {
      console.log(`❌ Individual Location API (direct): Failed - ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing APIs:', error);
  }
};

/**
 * Global debug function to test the new cache manager
 */
window.testCacheManager = async function() {
  try {
    console.log('🔧 === TESTING CACHE MANAGER ===');
    
    // Check if cache manager is available
    if (!window.CacheManager) {
      console.error('❌ CacheManager not available');
      return;
    }
    
    console.log('✅ CacheManager is available');
    
    // Test cache manager initialization
    console.log('🚀 Testing cache manager initialization...');
    const results = await window.CacheManager.initializeAllCaches();
    console.log('✅ Cache manager initialization results:', results);
    
    // Test asset type lookup
    console.log('🔍 Testing asset type lookup for laptop (ID: 37000374826)...');
    const laptopTypeName = await window.CacheManager.getAssetTypeName(37000374826);
    console.log(`🎯 Laptop type name result: "${laptopTypeName}"`);
    
    // Test location lookup (if any locations exist)
    const cachedLocations = await window.CacheManager.getCachedLocations();
    const locationIds = Object.keys(cachedLocations);
    
    if (locationIds.length > 0) {
      const testLocationId = locationIds[0];
      console.log(`🔍 Testing location lookup for ID: ${testLocationId}...`);
      const locationName = await window.CacheManager.getLocationName(testLocationId);
      console.log(`🎯 Location name result: "${locationName}"`);
    } else {
      console.log('ℹ️ No locations found in cache to test');
    }
    
    // Test asset search with type_fields
    console.log('🔍 Testing asset search with type_fields...');
    try {
      const searchResults = await window.CacheManager.searchAssets('laptop', 'name');
      console.log(`✅ Asset search returned ${searchResults.length} results`);
      
      if (searchResults.length > 0) {
        const sampleAsset = searchResults[0];
        console.log(`📦 Sample asset structure:`, {
          id: sampleAsset.id,
          name: sampleAsset.name,
          asset_type_id: sampleAsset.asset_type_id,
          has_type_fields: !!(sampleAsset.type_fields && sampleAsset.type_fields.length > 0),
          type_fields_count: sampleAsset.type_fields ? sampleAsset.type_fields.length : 0
        });
        
        // Test field extraction on the sample asset
        if (sampleAsset.type_fields && sampleAsset.type_fields.length > 0) {
          console.log('🔍 Testing field extraction on sample asset:');
          const environment = window.CacheManager.getEnvironmentInfo(sampleAsset);
          const managedBy = window.CacheManager.getManagedByInfo(sampleAsset);
          console.log(`   Environment: "${environment}"`);
          console.log(`   Managed By: "${managedBy}"`);
          
          // Show all type_fields for debugging
          console.log(`📋 All type_fields for sample asset:`, sampleAsset.type_fields);
        } else {
          console.log('⚠️ Sample asset has no type_fields data');
        }
      } else {
        console.log('ℹ️ No assets found in search results to test');
      }
    } catch (searchError) {
      console.error('❌ Error testing asset search:', searchError);
    }
    
    // Show cache statistics
    const assetTypes = await window.CacheManager.getCachedAssetTypes();
    const locations = await window.CacheManager.getCachedLocations();
    
    console.log('📊 Cache Statistics:');
    console.log(`   📋 Asset types cached: ${Object.keys(assetTypes).length}`);
    console.log(`   📍 Locations cached: ${Object.keys(locations).length}`);
    
    // Show sample asset types
    const sampleAssetTypes = Object.entries(assetTypes).slice(0, 5);
    console.log('📋 Sample cached asset types:');
    sampleAssetTypes.forEach(([id, type]) => {
      console.log(`   ${id}: "${type.name}"`);
    });
    
    // Show sample locations
    if (Object.keys(locations).length > 0) {
      const sampleLocations = Object.entries(locations).slice(0, 5);
      console.log('📍 Sample cached locations:');
      sampleLocations.forEach(([id, location]) => {
        console.log(`   ${id}: "${location.name}"`);
      });
    }
    
    // Test asset search cache functionality
    console.log('🔍 Testing asset search cache functionality...');
    try {
      // First search (should hit API)
      console.log('   First search (should hit API)...');
      const firstSearch = await window.CacheManager.searchAssets('test', 'name');
      
      // Second search (should use cache)
      console.log('   Second search (should use cache)...');
      const secondSearch = await window.CacheManager.searchAssets('test', 'name');
      
      console.log(`   ✅ Cache test complete: ${firstSearch.length} and ${secondSearch.length} results`);
    } catch (cacheError) {
      console.error('❌ Error testing asset search cache:', cacheError);
    }
    
  } catch (error) {
    console.error('❌ Error testing cache manager:', error);
  }
};

/**
 * Global debug function to clear all caches via cache manager
 */
window.clearAllCaches = async function() {
  try {
    console.log('🧹 Clearing all caches via CacheManager...');
    
    if (!window.CacheManager) {
      console.error('❌ CacheManager not available');
      return;
    }
    
    const success = await window.CacheManager.clearAllCaches();
    if (success) {
      console.log('✅ All caches cleared successfully');
    } else {
      console.log('⚠️ Cache clearing may have failed');
    }
    
  } catch (error) {
    console.error('❌ Error clearing caches:', error);
  }
};

/**
 * Global debug function to test asset search with type_fields
 * @param {string} searchTerm - Term to search for (defaults to 'laptop')
 * @param {string} searchField - Field to search in (defaults to 'name')
 */
window.testAssetSearchWithTypeFields = async function(searchTerm = 'laptop', searchField = 'name') {
  try {
    console.log('🔧 === TESTING ASSET SEARCH WITH TYPE_FIELDS ===');
    console.log(`🔍 Searching for "${searchTerm}" in field "${searchField}"`);
    
    if (!window.CacheManager) {
      console.error('❌ CacheManager not available');
      return;
    }
    
    // Perform the search
    const searchResults = await window.CacheManager.searchAssets(searchTerm, searchField);
    console.log(`✅ Search returned ${searchResults.length} results`);
    
    if (searchResults.length === 0) {
      console.log('ℹ️ No assets found. Try searching for a different term.');
      return;
    }
    
    // Analyze the first few results
    const resultsToAnalyze = searchResults.slice(0, 3);
    console.log(`📋 Analyzing first ${resultsToAnalyze.length} results:`);
    
    resultsToAnalyze.forEach((asset, index) => {
      console.log(`\n📦 Asset ${index + 1}: "${asset.name}" (ID: ${asset.id})`);
      console.log(`   Asset Type ID: ${asset.asset_type_id}`);
      console.log(`   Description: ${asset.description || 'N/A'}`);
      console.log(`   Location ID: ${asset.location_id || 'N/A'}`);
      console.log(`   Asset Tag: ${asset.asset_tag || 'N/A'}`);
      console.log(`   Serial Number: ${asset.serial_number || 'N/A'}`);
      
      // Check type_fields
      if (asset.type_fields && Array.isArray(asset.type_fields)) {
        console.log(`   ✅ Has type_fields: ${asset.type_fields.length} fields`);
        
        // Show all type_fields
        asset.type_fields.forEach((field, fieldIndex) => {
          console.log(`      ${fieldIndex + 1}. ${field.field_name || field.name || 'Unknown'}: "${field.value || field.field_value || field.display_value || 'N/A'}"`);
        });
        
        // Test field extraction
        const environment = window.CacheManager.getEnvironmentInfo(asset);
        const managedBy = window.CacheManager.getManagedByInfo(asset);
        
        console.log(`   🔍 Extracted fields:`);
        console.log(`      Environment: "${environment}"`);
        console.log(`      Managed By: "${managedBy}"`);
        
      } else {
        console.log(`   ❌ No type_fields found`);
      }
    });
    
    // Test cache functionality
    console.log(`\n🔄 Testing cache functionality with same search...`);
    const startTime = Date.now();
    const cachedResults = await window.CacheManager.searchAssets(searchTerm, searchField);
    const endTime = Date.now();
    
    console.log(`✅ Cached search returned ${cachedResults.length} results in ${endTime - startTime}ms`);
    console.log(`📊 Cache working: ${cachedResults.length === searchResults.length ? 'YES' : 'NO'}`);
    
    // Clean cache for testing
    console.log(`\n🧹 Testing cache cleanup...`);
    await window.CacheManager.cleanAssetSearchCache();
    console.log(`✅ Cache cleanup completed`);
    
  } catch (error) {
    console.error('❌ Error testing asset search with type_fields:', error);
  }
};

// Make getUserName available globally for cache manager
window.getUserName = getUserName;

// Make clear functions globally accessible
window.clearRequester = clearRequester;
window.clearAgent = clearAgent;

// Debug/test functions for requester and agent clearing
window.testClearFunctionality = function() {
  console.log('🧪 Testing requester and agent clear functionality...');
  
  // Test requester clearing
  console.log('📋 Testing requester clear:');
  console.log(`   Before clear - requester data:`, changeRequestData.requester);
  
  const requesterDiv = document.getElementById('selected-requester');
  const requesterSearch = document.getElementById('requester-search');
  
  console.log(`   Before clear - requester div visible:`, requesterDiv ? requesterDiv.style.display !== 'none' : 'not found');
  console.log(`   Before clear - requester search value:`, requesterSearch ? requesterSearch.value : 'not found');
  
  // Clear requester
  clearRequester();
  
  console.log(`   After clear - requester data:`, changeRequestData.requester);
  console.log(`   After clear - requester div visible:`, requesterDiv ? requesterDiv.style.display !== 'none' : 'not found');
  console.log(`   After clear - requester search value:`, requesterSearch ? requesterSearch.value : 'not found');
  
  // Test agent clearing
  console.log('📋 Testing agent clear:');
  console.log(`   Before clear - agent data:`, changeRequestData.agent);
  
  const agentDiv = document.getElementById('selected-agent');
  const agentSearch = document.getElementById('agent-search');
  
  console.log(`   Before clear - agent div visible:`, agentDiv ? agentDiv.style.display !== 'none' : 'not found');
  console.log(`   Before clear - agent search value:`, agentSearch ? agentSearch.value : 'not found');
  
  // Clear agent
  clearAgent();
  
  console.log(`   After clear - agent data:`, changeRequestData.agent);
  console.log(`   After clear - agent div visible:`, agentDiv ? agentDiv.style.display !== 'none' : 'not found');
  console.log(`   After clear - agent search value:`, agentSearch ? agentSearch.value : 'not found');
  
  console.log('✅ Clear functionality test complete');
};

window.testRequesterSelection = function(mockRequester = null) {
  console.log('🧪 Testing requester selection and clearing...');
  
  const testRequester = mockRequester || {
    id: 12345,
    first_name: 'Test',
    last_name: 'User',
    email: 'test.user@company.com'
  };
  
  console.log('📋 Selecting test requester...');
  selectRequester(testRequester);
  
  console.log('📋 Testing clear after 2 seconds...');
  setTimeout(() => {
    clearRequester();
    console.log('✅ Requester selection and clear test complete');
  }, 2000);
};

window.testAgentSelection = function(mockAgent = null) {
  console.log('🧪 Testing agent selection and clearing...');
  
  const testAgent = mockAgent || {
    id: 67890,
    first_name: 'Test',
    last_name: 'Agent',
    email: 'test.agent@company.com'
  };
  
  console.log('📋 Selecting test agent...');
  selectAgent(testAgent);
  
  console.log('📋 Testing clear after 2 seconds...');
  setTimeout(() => {
    clearAgent();
    console.log('✅ Agent selection and clear test complete');
  }, 2000);
};

/**
 * Show live search indicator for user searches
 * @param {string} containerId - The results container ID
 * @param {string} searchType - Type of search (requesters/agents)
 */
function showLiveSearchIndicator(containerId, searchType) {
  const resultsContainer = document.getElementById(containerId);
  if (resultsContainer) {
    resultsContainer.innerHTML = `
      <div class="search-loading live-search">
        <div class="d-flex align-items-center justify-content-center p-3">
          <div class="spinner-border spinner-border-sm me-2 text-primary" role="status" style="width: 1rem; height: 1rem;"></div>
          <span class="text-primary"><i class="fas fa-bolt me-1"></i>Live searching ${searchType}...</span>
        </div>
      </div>
    `;
    resultsContainer.style.display = 'block';
  }
}

/**
 * Show search hint for minimum characters
 * @param {string} containerId - The results container ID
 * @param {number} minLength - Minimum character length required
 */
function showSearchHint(containerId, minLength) {
  const resultsContainer = document.getElementById(containerId);
  if (resultsContainer) {
    resultsContainer.innerHTML = `
      <div class="search-hint p-3 text-center text-muted">
        <i class="fas fa-info-circle me-1"></i>
        Type at least ${minLength} characters to start searching...
      </div>
    `;
    resultsContainer.style.display = 'block';
  }
}

/**
 * Clear requester search results
 */
function clearRequesterResults() {
  const resultsContainer = document.getElementById('requester-results');
  if (resultsContainer) {
    resultsContainer.style.display = 'none';
    resultsContainer.innerHTML = '';
  }
}

/**
 * Clear agent search results
 */
function clearAgentResults() {
  const resultsContainer = document.getElementById('agent-results');
  if (resultsContainer) {
    resultsContainer.style.display = 'none';
    resultsContainer.innerHTML = '';
  }
}

/**
 * Search for requesters using Freshservice API
 */

/**
 * Update risk selection and automatically calculate risk
 * @param {Event} e - The change event
 */
function updateRiskSelection(e) {
  console.log(`Risk selection updated: ${e.target.name} = ${e.target.value}`);
  
  // Automatically calculate risk when any selection changes
  calculateRisk();
}

/**
 * Calculate the overall risk score based on selected answers
 */
function calculateRisk() {
  console.log('🎯 Calculating risk assessment...');
  
  // Get all risk input values
  const businessImpact = document.querySelector('input[name="business-impact"]:checked');
  const affectedUsers = document.querySelector('input[name="affected-users"]:checked');
  const complexity = document.querySelector('input[name="complexity"]:checked');
  const testing = document.querySelector('input[name="testing"]:checked');
  const rollback = document.querySelector('input[name="rollback"]:checked');
  
  // Check if all questions are answered
  if (!businessImpact || !affectedUsers || !complexity || !testing || !rollback) {
    console.log('⚠️ Not all risk questions answered yet');
    hideRiskResult();
    return;
  }
  
  // Calculate total risk score (sum of all values)
  const totalScore = parseInt(businessImpact.value) + 
                    parseInt(affectedUsers.value) + 
                    parseInt(complexity.value) + 
                    parseInt(testing.value) + 
                    parseInt(rollback.value);
  
  console.log(`📊 Risk scores: Business Impact: ${businessImpact.value}, Users: ${affectedUsers.value}, Complexity: ${complexity.value}, Testing: ${testing.value}, Rollback: ${rollback.value}`);
  console.log(`📊 Total Risk Score: ${totalScore}/15`);
  
  // Determine risk level based on total score
  let riskLevel, riskClass, riskExplanation;
  
  if (totalScore <= 7) {
    riskLevel = 'Low';
    riskClass = 'bg-success';
    riskExplanation = 'This change has a low risk profile. Standard approval processes apply.';
  } else if (totalScore <= 11) {
    riskLevel = 'Medium';
    riskClass = 'bg-warning';
    riskExplanation = 'This change has a medium risk profile. Additional review and approval may be required.';
  } else {
    riskLevel = 'High';
    riskClass = 'bg-danger';
    riskExplanation = 'This change has a high risk profile. Extensive review, testing, and senior approval are required.';
  }
  
  // Update the global form data
  if (!window.formData) {
    window.formData = {};
  }
  if (!window.formData.riskAssessment) {
    window.formData.riskAssessment = {};
  }
  
  window.formData.riskAssessment = {
    businessImpact: parseInt(businessImpact.value),
    affectedUsers: parseInt(affectedUsers.value),
    complexity: parseInt(complexity.value),
    testing: parseInt(testing.value),
    rollback: parseInt(rollback.value),
    totalScore: totalScore,
    riskLevel: riskLevel
  };
  
  // Display the risk result
  showRiskResult(totalScore, riskLevel, riskClass, riskExplanation);
  
  console.log(`✅ Risk assessment complete: ${riskLevel} (${totalScore}/15)`);
}

/**
 * Show the risk assessment result
 * @param {number} score - Total risk score
 * @param {string} level - Risk level (Low/Medium/High)
 * @param {string} cssClass - CSS class for styling
 * @param {string} explanation - Risk explanation text
 */
function showRiskResult(score, level, cssClass, explanation) {
  const riskResult = document.getElementById('risk-result');
  const riskScoreValue = document.getElementById('risk-score-value');
  const riskLevelValue = document.getElementById('risk-level-value');
  const riskExplanation = document.getElementById('risk-explanation');
  
  if (riskResult && riskScoreValue && riskLevelValue && riskExplanation) {
    riskScoreValue.textContent = `${score}/15`;
    riskLevelValue.textContent = level;
    riskLevelValue.className = `badge ${cssClass}`;
    riskExplanation.textContent = explanation;
    
    riskResult.classList.remove('hidden');
    riskResult.style.display = 'block';
    
    // Scroll to result
    riskResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/**
 * Hide the risk assessment result
 */
function hideRiskResult() {
  const riskResult = document.getElementById('risk-result');
  if (riskResult) {
    riskResult.classList.add('hidden');
    riskResult.style.display = 'none';
  }
}

/**
 * Validate risk assessment and proceed to submission summary
 */
function validateRiskAndNext() {
  console.log('🔍 Validating risk assessment...');
  
  // Check if risk has been calculated
  if (!window.formData || !window.formData.riskAssessment || !window.formData.riskAssessment.riskLevel) {
    showNotification('error', 'Please complete the risk assessment by answering all questions.');
    return false;
  }
  
  console.log('✅ Risk assessment validation passed');
  
  // Prepare consolidated change request data for submission
  prepareChangeRequestDataForSubmission();
  
  // Use the change submission module to show the summary modal
  if (window.ChangeSubmission) {
    console.log('✅ ChangeSubmission module found, showing submission summary...');
    window.ChangeSubmission.showSubmissionSummary();
  } else {
    console.error('❌ Change Submission module not available');
    console.error('Available window properties:', Object.keys(window).filter(key => key.includes('Change') || key.includes('Submission')));
    showNotification('error', 'Change submission module not loaded. Please refresh the page.');
  }
  
  return true;
}

/**
 * Prepare consolidated change request data for submission
 */
function prepareChangeRequestDataForSubmission() {
  console.log('📦 Preparing consolidated change request data...');
  
  // Ensure we have the latest form data
  if (!window.formData) {
    window.formData = {};
  }
  
  // Collect all form data
  const changeTitle = document.getElementById('change-title')?.value?.trim() || '';
  const changeDescription = document.getElementById('change-description')?.value?.trim() || '';
  const reasonForChange = document.getElementById('reason-for-change')?.value?.trim() || '';
  const implementationPlan = document.getElementById('implementation-plan')?.value?.trim() || '';
  const backoutPlan = document.getElementById('backout-plan')?.value?.trim() || '';
  const validationPlan = document.getElementById('validation-plan')?.value?.trim() || '';
  const plannedStart = document.getElementById('planned-start')?.value || '';
  const plannedEnd = document.getElementById('planned-end')?.value || '';
  const changeType = document.getElementById('change-type')?.value || 'normal';
  
  // Get selected assets
  const selectedAssets = window.AssetAssociation ? window.AssetAssociation.getSelectedAssets() : [];
  
  // Create consolidated data object
  window.changeRequestData = {
    changeTitle,
    changeDescription,
    reasonForChange,
    implementationPlan,
    backoutPlan,
    validationPlan,
    plannedStart,
    plannedEnd,
    changeType,
    selectedRequester: window.formData.requester || null,
    selectedAgent: window.formData.agent || null,
    riskAssessment: window.formData.riskAssessment || null,
    selectedAssets: selectedAssets
  };
  
  console.log('✅ Change request data prepared:', {
    title: changeTitle,
    requester: window.formData.requester?.name || 'Not selected',
    agent: window.formData.agent?.name || 'Not selected',
    riskLevel: window.formData.riskAssessment?.riskLevel || 'Not assessed',
    assetCount: selectedAssets.length
  });
}

/**
 * Validate details and proceed to next step
 */
function validateDetailsAndNext() {
  console.log('🔍 Validating change details...');
  
  // Check required fields
  const changeTitle = document.getElementById('change-title');
  const plannedStart = document.getElementById('planned-start');
  const plannedEnd = document.getElementById('planned-end');
  const reasonForChange = document.getElementById('reason-for-change');
  const implementationPlan = document.getElementById('implementation-plan');
  const backoutPlan = document.getElementById('backout-plan');
  const validationPlan = document.getElementById('validation-plan');
  
  let isValid = true;
  let firstErrorField = null;
  
  // Clear previous highlighting
  clearFieldHighlighting();
  
  // Validate change title
  if (!changeTitle.value.trim()) {
    highlightInvalidField('change-title', 'Change title is required');
    isValid = false;
    if (!firstErrorField) firstErrorField = 'change-title';
  }
  
  // Validate requester
  if (!window.formData || !window.formData.requester || !window.formData.requester.id) {
    highlightInvalidField('requester-search', 'Requester is required');
    isValid = false;
    if (!firstErrorField) firstErrorField = 'requester-search';
  }
  
  // Validate agent
  if (!window.formData || !window.formData.agent || !window.formData.agent.id) {
    highlightInvalidField('agent-search', 'Agent is required');
    isValid = false;
    if (!firstErrorField) firstErrorField = 'agent-search';
  }
  
  // Validate planned start
  if (!plannedStart.value) {
    highlightInvalidField('planned-start', 'Planned start date is required');
    isValid = false;
    if (!firstErrorField) firstErrorField = 'planned-start';
  }
  
  // Validate planned end
  if (!plannedEnd.value) {
    highlightInvalidField('planned-end', 'Planned end date is required');
    isValid = false;
    if (!firstErrorField) firstErrorField = 'planned-end';
  }
  
  // Validate that start time is not after end time
  if (plannedStart.value && plannedEnd.value) {
    if (!validateDateTimes()) {
      isValid = false;
      if (!firstErrorField) firstErrorField = 'planned-end';
    }
  }
  
  // Validate implementation plan
  if (!implementationPlan.value.trim()) {
    highlightInvalidField('implementation-plan', 'Implementation plan is required');
    isValid = false;
    if (!firstErrorField) firstErrorField = 'implementation-plan';
  }
  
  // Validate backout plan
  if (!backoutPlan.value.trim()) {
    highlightInvalidField('backout-plan', 'Backout plan is required');
    isValid = false;
    if (!firstErrorField) firstErrorField = 'backout-plan';
  }
  
  // Validate validation plan
  if (!validationPlan.value.trim()) {
    highlightInvalidField('validation-plan', 'Validation plan is required');
    isValid = false;
    if (!firstErrorField) firstErrorField = 'validation-plan';
  }
  
  // Validate reason for change
  if (!reasonForChange.value.trim()) {
    highlightInvalidField('reason-for-change', 'Reason for change is required');
    isValid = false;
    if (!firstErrorField) firstErrorField = 'reason-for-change';
  }
  
  if (!isValid) {
    showNotification('error', 'Please fill in all required fields before proceeding.');
    if (firstErrorField) {
      document.getElementById(firstErrorField).focus();
    }
    return false;
  }
  
  console.log('✅ Details validation passed');
  
  // Switch to asset association tab
  switchTab('asset-association');
  
  return true;
}

/**
 * Validate assets and proceed to next step
 */
function validateAssetsAndNext() {
  console.log('🔍 Validating asset associations...');
  
  // For now, assets are optional, so this always passes
  // In the future, you might want to add validation logic here
  
  console.log('✅ Asset validation passed (assets are optional)');
  switchTab('impacted-services');
}

/**
 * Switch between tabs
 * @param {string} tabId - The ID of the tab to switch to
 */
function switchTab(tabId) {
  console.log(`🔄 Switching to tab: ${tabId}`);
  
  // Find the tab button and trigger click
  const tabButton = document.querySelector(`[data-bs-target="#${tabId}"]`);
  if (tabButton) {
    tabButton.click();
  } else {
    console.error(`Tab button not found for: ${tabId}`);
  }
}

/**
 * Show notification to user
 * @param {string} type - Type of notification (success, error, warning, info)
 * @param {string} message - Message to display
 * @param {boolean} scrollToTop - Whether to scroll to top
 */
function showNotification(type, message, scrollToTop = true) {
  console.log(`📢 ${type.toUpperCase()}: ${message}`);
  
  // Remove any existing notifications
  const existingNotifications = document.querySelectorAll('.alert');
  existingNotifications.forEach(notification => notification.remove());
  
  // Create notification element
  const alertClass = type === 'error' ? 'alert-danger' : 
                    type === 'success' ? 'alert-success' : 
                    type === 'warning' ? 'alert-warning' : 'alert-info';
  
  const notification = document.createElement('div');
  notification.className = `alert ${alertClass} alert-dismissible fade show`;
  notification.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  // Insert at the top of the active tab content
  const activeTab = document.querySelector('.tab-pane.active');
  if (activeTab) {
    activeTab.insertBefore(notification, activeTab.firstChild);
    
    if (scrollToTop) {
      activeTab.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}

/**
 * Highlight invalid field
 * @param {string} fieldId - ID of the field to highlight
 * @param {string} message - Error message to display
 */
function highlightInvalidField(fieldId, message = '') {
  const field = document.getElementById(fieldId);
  if (field) {
    field.classList.add('is-invalid');
    
    // Add error message if provided
    if (message) {
      let feedback = field.parentNode.querySelector('.invalid-feedback');
      if (!feedback) {
        feedback = document.createElement('div');
        feedback.className = 'invalid-feedback';
        field.parentNode.appendChild(feedback);
      }
      feedback.textContent = message;
    }
  }
}

/**
 * Clear field highlighting
 */
function clearFieldHighlighting() {
  const invalidFields = document.querySelectorAll('.is-invalid');
  invalidFields.forEach(field => {
    field.classList.remove('is-invalid');
  });
  
  const feedbacks = document.querySelectorAll('.invalid-feedback');
  feedbacks.forEach(feedback => feedback.remove());
}

/**
 * Show submission summary
 */
function showSubmissionSummary() {
  console.log('📋 Showing submission summary...');
  
  // Collect all form data
  if (!window.formData) {
    window.formData = {};
  }
  
  // Collect change details
  const changeTitle = document.getElementById('change-title');
  const changeDescription = document.getElementById('change-description');
  const changeType = document.getElementById('change-type');
  const reasonForChange = document.getElementById('reason-for-change');
  const plannedStart = document.getElementById('planned-start');
  const plannedEnd = document.getElementById('planned-end');
  const implementationPlan = document.getElementById('implementation-plan');
  const backoutPlan = document.getElementById('backout-plan');
  const validationPlan = document.getElementById('validation-plan');
  
  // Store all change details
  window.formData.changeDetails = {
    title: changeTitle ? changeTitle.value.trim() : '',
    description: changeDescription ? changeDescription.value.trim() : '',
    changeType: changeType ? changeType.value : '',
    reasonForChange: reasonForChange ? reasonForChange.value.trim() : '',
    plannedStart: plannedStart ? plannedStart.value : '',
    plannedEnd: plannedEnd ? plannedEnd.value : '',
    implementationPlan: implementationPlan ? implementationPlan.value.trim() : '',
    backoutPlan: backoutPlan ? backoutPlan.value.trim() : '',
    validationPlan: validationPlan ? validationPlan.value.trim() : ''
  };
  
  // Collect selected assets
  if (window.AssetAssociation && window.AssetAssociation.getSelectedAssets) {
    window.formData.selectedAssets = window.AssetAssociation.getSelectedAssets();
  }
  
  // Collect impacted services data
  if (window.ImpactedServices && window.ImpactedServices.getApproversAndStakeholders) {
    const impactData = window.ImpactedServices.getApproversAndStakeholders();
    window.formData.impactedServices = impactData;
  }
  
  console.log('📊 Complete form data collected:', window.formData);
  
  // This would typically show a modal with the summary
  // For now, just show a success message
  showNotification('success', `Change request "${window.formData.changeDetails.title}" is ready for submission!`);
  
  // You could implement a modal here to show the full summary
}

/**
 * Finalize requester search with results
 * @param {string} searchTerm - Original search term
 * @param {Array} results - Search results
 * @param {boolean} isRefresh - Whether this is a cache refresh operation
 */
// eslint-disable-next-line no-unused-vars
function performRequesterSearch(searchTerm, isRefresh = false, isLiveSearch = false) {
  // Ensure client is available
  if (!window.client || !window.client.request) {
    console.error('Client or request object not available for requester search');
    const resultsContainer = document.getElementById('requester-results');
    if (resultsContainer) {
      resultsContainer.innerHTML = '<div class="text-center p-3 text-danger">API client not initialized. Please refresh the page.</div>';
    }
    return;
  }

  // Use field-specific format for both requesters and agents API (since agents can be requesters too)
  // Use Freshservice API query syntax with proper double quotes
  // Format: "~[first_name|last_name|primary_email]:'searchterm'"
  const userQuery = encodeURIComponent(`"~[first_name|last_name|primary_email]:'${searchTerm}'"`);
  
  // Note: If server-side filtering fails, we rely on client-side filtering
  
  console.log(`${isRefresh ? 'Refreshing' : isLiveSearch ? 'Live searching' : 'Performing'} requester search with query:`, userQuery);
  
  // Show appropriate loading indicator
  if (!isRefresh) {
    const resultsContainer = document.getElementById('requester-results');
    if (resultsContainer) {
      if (isLiveSearch) {
        showLiveSearchIndicator('requester-results', 'requesters');
      } else {
        resultsContainer.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm" role="status"></div> Loading...</div>';
        resultsContainer.style.display = 'block';
      }
    }
  }
  
  // Function to load requester results from a specific page
  function loadRequestersPage(page = 1, allResults = []) {
    // Use invokeTemplate with path suffix to add query parameter
    // Note: include_agents=true removed due to API permission limitations
    const requestUrl = `?query=${userQuery}&page=${page}&per_page=30`;
    console.log('Requester API URL:', requestUrl);
    
    window.client.request.invokeTemplate("getRequesters", {
      path_suffix: requestUrl,
      cache: true,
      ttl: 300000 // 5 minutes cache
    })
    .then(function(data) {
      try {
        if (!data) {
          console.error('No data returned from requester search');
          // Continue to load agents since requesters search failed
          loadAgentsAsRequesters(page, allResults);
          return;
        }
        
        console.log('Requester search raw response:', data.response);
        const response = JSON.parse(data.response || '{"requesters":[],"agents":[]}');
        const requesters = response && response.requesters ? response.requesters : [];
        const agents = response && response.agents ? response.agents : [];
        console.log(`Requester search returned ${requesters.length} requesters and ${agents.length} agents`);
        
        // Check if server-side filtering worked by looking for obvious matches
        const term = searchTerm.toLowerCase();
        const hasObviousMatches = requesters.some(req => {
          const fullName = `${req.first_name || ''} ${req.last_name || ''}`.toLowerCase();
          const email = (req.primary_email || req.email || '').toLowerCase();
          return fullName.startsWith(term) || email.startsWith(term);
        }) || agents.some(agent => {
          const fullName = `${agent.first_name || ''} ${agent.last_name || ''}`.toLowerCase();
          const email = (agent.email || '').toLowerCase();
          return fullName.startsWith(term) || email.startsWith(term);
        });
        
        // If we got 30 results but no obvious matches, server-side filtering likely failed
        const serverFilteringFailed = (requesters.length === 30 || agents.length > 0) && !hasObviousMatches;
        
        if (serverFilteringFailed) {
          console.warn(`⚠️ Server-side filtering appears to have failed for "${searchTerm}" - falling back to client-side filtering`);
          console.log(`💡 Suggestion: Try searching for existing users like "adam", "agnes", or "ahmed" to test if search works`);
          console.log(`🔍 Debug: include_agents=true returned ${agents.length} agents - this might be a permission or API issue`);
          
          // If include_agents=true isn't working, we should search agents separately
          if (agents.length === 0) {
            console.log(`💡 Recommendation: Try searching in the "Agent" field instead of "Requester" field to find agent users`);
            console.log(`⚙️ API Limitation: include_agents=true requires "Manage Agents" permission which this API key lacks`);
            console.log(`🔧 Workaround: Use separate agent search or request permission upgrade`);
          }
        }
        
        // Manual filtering for requesters (always do this as server-side may not work)
        const filteredRequesters = requesters.filter(requester => {
          const fullName = `${requester.first_name || ''} ${requester.last_name || ''}`.toLowerCase();
          const email = (requester.primary_email || requester.email || '').toLowerCase();
          // Use 'includes' for broader matching since server-side filtering may not work
          return fullName.includes(term) || email.includes(term);
        });
        
        // Manual filtering for agents
        const filteredAgents = agents.filter(agent => {
          const fullName = `${agent.first_name || ''} ${agent.last_name || ''}`.toLowerCase();
          const email = (agent.email || '').toLowerCase();
          // Use 'includes' for broader matching since server-side filtering may not work
          return fullName.includes(term) || email.includes(term);
        });
        
        console.log(`Manual filtering returned ${filteredRequesters.length} requester results and ${filteredAgents.length} agent results`);
        
        // Debug: Show some sample names from the response to help troubleshoot
        if (filteredRequesters.length === 0 && filteredAgents.length === 0 && (requesters.length > 0 || agents.length > 0)) {
          const sampleNames = [
            ...requesters.slice(0, 3).map(r => `${r.first_name} ${r.last_name}`),
            ...agents.slice(0, 2).map(a => `${a.first_name} ${a.last_name}`)
          ];
          console.log(`🔍 No matches found for "${searchTerm}". Sample names in response:`, sampleNames);
          
          // Also check if there might be matches in the cached users
          if (window.userCache && window.userCache.requesters) {
            const cachedMatches = window.userCache.requesters.filter(user => {
              const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
              const email = (user.primary_email || user.email || '').toLowerCase();
              return fullName.includes(term) || email.includes(term);
            });
            if (cachedMatches.length > 0) {
              console.log(`💡 Found ${cachedMatches.length} potential matches in cached users:`, 
                cachedMatches.slice(0, 3).map(u => `${u.first_name} ${u.last_name}`));
            }
            
            // Also check agents cache
            if (window.userCache.agents) {
              const agentMatches = window.userCache.agents.filter(user => {
                const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
                const email = (user.email || '').toLowerCase();
                return fullName.includes(term) || email.includes(term);
              });
              if (agentMatches.length > 0) {
                console.log(`💡 Found ${agentMatches.length} potential matches in cached agents:`, 
                  agentMatches.slice(0, 3).map(u => `${u.first_name} ${u.last_name}`));
              }
            }
          }
        }
        
        // Mark agents as potential requesters
        const agentsAsRequesters = filteredAgents.map(agent => ({
          ...agent,
          _isAgent: true, // Mark as agent so we can show this in UI
          _canBeRequester: true
        }));
        
        // Remove duplicates based on email
        const existingEmails = new Set(allResults.map(r => r.primary_email || r.email));
        const uniqueRequesters = filteredRequesters.filter(req => !existingEmails.has(req.primary_email || req.email));
        const uniqueAgents = agentsAsRequesters.filter(agent => !existingEmails.has(agent.email));
        
        // Combine all results
        const combinedResults = [...allResults, ...uniqueRequesters, ...uniqueAgents];
        
        // Since include_agents=true doesn't work, search agents separately
        // This ensures we find all users (requesters + agents who can be requesters)
        loadAgentsAsRequesters(page, combinedResults);
        
      } catch (error) {
        console.error('Error parsing requester response:', error);
        // Complete with existing results
        finalizeRequesterSearch(searchTerm, allResults, isRefresh);
      }
    })
    .catch(function(error) {
      console.error('Requester API request failed:', error);
      // Complete with existing results
      finalizeRequesterSearch(searchTerm, allResults, isRefresh);
    });
  }
  
  // Function to search agents as potential requesters (since include_agents=true doesn't work)
  function loadAgentsAsRequesters(page = 1, existingResults = []) {
    // Use the same query format for agents
    const agentQuery = encodeURIComponent(`"~[first_name|last_name|email]:'${searchTerm}'"`);
    const requestUrl = `?query=${agentQuery}&page=${page}&per_page=30`;
    console.log('Agent-as-requester API URL:', requestUrl);
    
    window.client.request.invokeTemplate("getAgents", {
      path_suffix: requestUrl,
      cache: true,
      ttl: 300000 // 5 minutes cache
    })
    .then(function(data) {
      try {
        if (!data) {
          console.error('No data returned from agent search for requesters');
          finalizeRequesterSearch(searchTerm, existingResults, isRefresh);
          return;
        }
        
        console.log('Agent search (for requesters) raw response:', data.response);
        const response = JSON.parse(data.response || '{"agents":[]}');
        const agents = response && response.agents ? response.agents : [];
        console.log(`Agent search returned ${agents.length} results for requesters`);
        
        // Check if server-side filtering worked for agents
        const term = searchTerm.toLowerCase();
        const hasObviousMatches = agents.some(agent => {
          const fullName = `${agent.first_name || ''} ${agent.last_name || ''}`.toLowerCase();
          const email = (agent.email || '').toLowerCase();
          return fullName.startsWith(term) || email.startsWith(term);
        });
        
        if (agents.length === 30 && !hasObviousMatches) {
          console.warn(`⚠️ Server-side filtering also failed for agents with "${searchTerm}"`);
        }
        
        // Manual filtering for agents
        const filteredAgents = agents.filter(agent => {
          const fullName = `${agent.first_name || ''} ${agent.last_name || ''}`.toLowerCase();
          const email = (agent.email || '').toLowerCase();
          return fullName.includes(term) || email.includes(term);
        });
        
        console.log(`Manual filtering returned ${filteredAgents.length} agent results for requesters`);
        
        // Mark agents as potential requesters and avoid duplicates
        const agentsAsRequesters = filteredAgents.map(agent => ({
          ...agent,
          _isAgent: true, // Mark as agent so we can show this in UI
          _canBeRequester: true,
          // Normalize email field for consistency
          primary_email: agent.email
        }));
        
        // Remove duplicates based on email
        const existingEmails = new Set(existingResults.map(r => r.primary_email || r.email));
        const uniqueAgents = agentsAsRequesters.filter(agent => !existingEmails.has(agent.email));
        
        // Combine all results
        const allResults = [...existingResults, ...uniqueAgents];
        
        // Check if we should load more pages
        const shouldLoadMorePages = filteredAgents.length === 30; // API returned full page
        
        if (shouldLoadMorePages) {
          // Get configured page limits
          (async function() {
              const params = await getInstallationParams();
              const paginationDelay = params.paginationDelay || DEFAULT_PAGINATION_DELAY;
              const pageLimit = params.listRequestersPageLimit || 3; // Default to 3 pages
              
              if (page < pageLimit) {
                updateLoadingMessage('requester-results', `Loading more results... (page ${page + 1}/${pageLimit})`);
                setTimeout(() => {
                  loadRequestersPage(page + 1, allResults);
                }, paginationDelay);
              } else {
                console.log(`📄 Reached page limit (${pageLimit}) for requester search, finalizing with ${allResults.length} results`);
                finalizeRequesterSearch(searchTerm, allResults, isRefresh);
              }
          })().catch(err => {
              console.error('Error getting pagination settings:', err);
              // Default behavior if error - limit to 2 pages
              if (page < 2) {
                setTimeout(() => {
                  loadRequestersPage(page + 1, allResults);
                }, DEFAULT_PAGINATION_DELAY);
              } else {
                finalizeRequesterSearch(searchTerm, allResults, isRefresh);
              }
          });
        } else {
          // No more results expected, complete the search
          console.log(`📄 No more pages expected (got ${filteredAgents.length} agent results), finalizing requester search with ${allResults.length} total results`);
          finalizeRequesterSearch(searchTerm, allResults, isRefresh);
        }
      } catch (error) {
        console.error('Error parsing agent response for requesters:', error);
        // Complete with existing results
        finalizeRequesterSearch(searchTerm, existingResults, isRefresh);
      }
    })
    .catch(function(error) {
      console.error('Agent API request failed for requesters:', error);
      // Complete with existing results
      finalizeRequesterSearch(searchTerm, existingResults, isRefresh);
    });
  }

  
  // Start loading from page 1
  loadRequestersPage(1, []);
}

/**
 * Finalize agent search with results
 * @param {string} searchTerm - Original search term
 * @param {Array} results - Search results
 * @param {boolean} isRefresh - Whether this is a cache refresh operation
 */
// eslint-disable-next-line no-unused-vars
function finalizeAgentSearch(searchTerm, results, isRefresh) {
  // Cache the results
  addToSearchCache('agents', searchTerm, results);
  
  // Display all results with refresh status for logging
  console.log(`Displaying ${results.length} agent results (refresh: ${isRefresh})`);
  displaySearchResults('agent-results', results, selectAgent);
  
  // Add individual users to the user cache for later use
  if (results.length > 0) {
    cacheIndividualUsers(results, 'agent');
  }
}

/**
 * Select a requester from search results
 * @param {Object} requester - The selected requester object
 */
function selectRequester(requester) {
  console.log('📋 Selecting requester:', requester);
  
  // Store in global form data
  if (!window.formData) {
    window.formData = {};
  }
  window.formData.requester = requester;
  
  // Update the UI
  const selectedContainer = document.getElementById('selected-requester');
  const searchInput = document.getElementById('requester-search');
  const resultsContainer = document.getElementById('requester-results');
  
  if (selectedContainer && searchInput) {
    const badgeHtml = generateUserBadges(requester, 'requester');
    
    selectedContainer.innerHTML = `
      <div class="selected-user d-flex justify-content-between align-items-start">
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <strong>${requester.first_name} ${requester.last_name}</strong>
          </div>
          <small class="text-muted d-block">${requester.primary_email || requester.email}</small>
          ${badgeHtml}
        </div>
        <button type="button" class="btn btn-sm btn-outline-danger ms-2" onclick="clearRequester()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    // Clear search input and hide results
    searchInput.value = '';
    if (resultsContainer) {
      resultsContainer.style.display = 'none';
    }
    
    // Clear any validation errors
    searchInput.classList.remove('is-invalid');
    const feedback = searchInput.parentNode.querySelector('.invalid-feedback');
    if (feedback) feedback.remove();
  }
}

/**
 * Select an agent from search results
 * @param {Object} agent - The selected agent object
 */
function selectAgent(agent) {
  console.log('📋 Selecting agent:', agent);
  
  // Store in global form data
  if (!window.formData) {
    window.formData = {};
  }
  window.formData.agent = agent;
  
  // Update the UI
  const selectedContainer = document.getElementById('selected-agent');
  const searchInput = document.getElementById('agent-search');
  const resultsContainer = document.getElementById('agent-results');
  
  if (selectedContainer && searchInput) {
    const badgeHtml = generateUserBadges(agent, 'agent');
    
    selectedContainer.innerHTML = `
      <div class="selected-user d-flex justify-content-between align-items-start">
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <strong>${agent.first_name} ${agent.last_name}</strong>
          </div>
          <small class="text-muted d-block">${agent.email}</small>
          ${badgeHtml}
        </div>
        <button type="button" class="btn btn-sm btn-outline-danger ms-2" onclick="clearAgent()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    // Clear search input and hide results
    searchInput.value = '';
    if (resultsContainer) {
      resultsContainer.style.display = 'none';
    }
    
    // Clear any validation errors
    searchInput.classList.remove('is-invalid');
    const feedback = searchInput.parentNode.querySelector('.invalid-feedback');
    if (feedback) feedback.remove();
  }
}

/**
 * Clear selected requester
 */
function clearRequester() {
  console.log('🗑️ Clearing selected requester');
  
  // Clear from global form data
  if (window.formData && window.formData.requester) {
    delete window.formData.requester;
  }
  
  // Clear UI
  const selectedContainer = document.getElementById('selected-requester');
  if (selectedContainer) {
    selectedContainer.innerHTML = '';
  }
}

/**
 * Clear selected agent
 */
function clearAgent() {
  console.log('🗑️ Clearing selected agent');
  
  // Clear from global form data
  if (window.formData && window.formData.agent) {
    delete window.formData.agent;
  }
  
  // Clear UI
  const selectedContainer = document.getElementById('selected-agent');
  if (selectedContainer) {
    selectedContainer.innerHTML = '';
  }
}

/**
 * Display search results in a container with keyboard navigation support
 * @param {string} containerId - ID of the container to display results
 * @param {Array} results - Array of search results
 * @param {Function} selectCallback - Callback function when item is selected
 */
function displaySearchResults(containerId, results, selectCallback) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container ${containerId} not found`);
    return;
  }
  
  if (!results || results.length === 0) {
    container.innerHTML = '<div class="text-center p-3 text-muted">No results found</div>';
    container.style.display = 'block';
    return;
  }
  
  // Store the callback function and results globally for access
  const storageKey = containerId.replace(/[^a-zA-Z0-9]/g, '_');
  window[`selectCallback_${storageKey}`] = selectCallback;
  window[`searchResults_${storageKey}`] = results;
  
  const resultItems = results.map((item, index) => {
    // Build badges for additional user information
    const badges = [];
    
    // Agent badge
    if (item._isAgent) {
      badges.push('<span class="badge bg-info me-1">Agent</span>');
    }
    
    // Department badge
    if (item.department_names && item.department_names.length > 0) {
      const departments = item.department_names.join(', ');
      badges.push(`<span class="badge bg-secondary me-1" title="Department"><i class="fas fa-building me-1"></i>${departments}</span>`);
    }
    
    // Location badge
    if (item.location_name) {
      badges.push(`<span class="badge bg-success me-1" title="Location"><i class="fas fa-map-marker-alt me-1"></i>${item.location_name}</span>`);
    }
    
    // Job title badge (if available)
    if (item.job_title) {
      badges.push(`<span class="badge bg-warning text-dark me-1" title="Job Title"><i class="fas fa-briefcase me-1"></i>${item.job_title}</span>`);
    }
    
    // Manager badge (will be resolved asynchronously)
    if (item.reporting_manager_id) {
      badges.push(`<span class="badge bg-primary me-1" title="Reporting Manager" id="manager-badge-${storageKey}-${index}"><i class="fas fa-user-tie me-1"></i>Loading...</span>`);
      // Resolve manager name asynchronously
      resolveManagerName(item.reporting_manager_id, `manager-badge-${storageKey}-${index}`);
    }
    
    return `
      <div class="list-group-item list-group-item-action keyboard-nav-item" 
           data-index="${index}" 
           tabindex="0"
           onclick="window.selectCallback_${storageKey}(window.searchResults_${storageKey}[${index}])"
           onkeydown="handleResultItemKeydown(event, '${storageKey}', ${index})">
        <div class="d-flex justify-content-between align-items-start">
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <strong>${item.first_name} ${item.last_name}</strong>
            </div>
            <small class="text-muted d-block mb-2">${item.primary_email || item.email}</small>
            <div class="d-flex flex-wrap gap-1">
              ${badges.join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = resultItems;
  container.style.display = 'block';
  
  // Add keyboard navigation support
  setupKeyboardNavigation(containerId, storageKey);
}

/**
 * Setup keyboard navigation for search results
 * @param {string} containerId - Container ID
 * @param {string} storageKey - Storage key for results
 */
function setupKeyboardNavigation(containerId, storageKey) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const items = container.querySelectorAll('.keyboard-nav-item');
  let selectedIndex = -1;
  
  // Find the associated search input
  const searchInput = getSearchInputForContainer(containerId);
  
  if (searchInput) {
    // Remove any existing keyboard listeners for this input
    const oldHandler = searchInput._keyboardHandler;
    if (oldHandler) {
      searchInput.removeEventListener('keydown', oldHandler);
    }
    
    // Add new keyboard navigation handler
    const keyboardHandler = (e) => {
      // Only handle arrow keys and Escape if dropdown is visible
      const isDropdownVisible = container.style.display !== 'none' && items.length > 0;
      
      switch (e.key) {
        case 'ArrowDown':
          if (isDropdownVisible) {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            updateSelection(items, selectedIndex);
          }
          break;
          
        case 'ArrowUp':
          if (isDropdownVisible) {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            updateSelection(items, selectedIndex);
          }
          break;
          
        case 'Enter':
          // Only intercept Enter if dropdown is visible and an item is selected
          if (isDropdownVisible && selectedIndex >= 0 && selectedIndex < items.length) {
            e.preventDefault();
            e.stopPropagation();
            // Select the highlighted item
            const callback = window[`selectCallback_${storageKey}`];
            const results = window[`searchResults_${storageKey}`];
            if (callback && results && results[selectedIndex]) {
              callback(results[selectedIndex]);
            }
          }
          // Otherwise, let the existing Enter handler for search work
          break;
          
        case 'Escape':
          if (isDropdownVisible) {
            e.preventDefault();
            // Hide the results dropdown
            container.style.display = 'none';
            selectedIndex = -1;
            // Reset selection when hiding
            updateSelection(items, -1);
          }
          break;
      }
    };
    
    searchInput.addEventListener('keydown', keyboardHandler);
    searchInput._keyboardHandler = keyboardHandler; // Store reference for cleanup
  }
  
  // Function to update visual selection
  function updateSelection(items, index) {
    // Remove previous selection
    items.forEach(item => {
      item.classList.remove('active');
      item.style.backgroundColor = '';
    });
    
    // Add selection to current item
    if (index >= 0 && index < items.length) {
      const selectedItem = items[index];
      selectedItem.classList.add('active');
      selectedItem.style.backgroundColor = '#e3f2fd';
      
      // Scroll item into view if needed
      selectedItem.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }
}

/**
 * Get the search input associated with a results container
 * @param {string} containerId - Results container ID
 * @returns {HTMLElement|null} - Associated search input element
 */
function getSearchInputForContainer(containerId) {
  if (containerId.includes('requester')) {
    return document.getElementById('requester-search');
  } else if (containerId.includes('agent')) {
    return document.getElementById('agent-search');
  }
  return null;
}

/**
 * Handle keydown events on individual result items
 * @param {KeyboardEvent} event - The keyboard event
 * @param {string} storageKey - Storage key for results
 * @param {number} index - Index of the item
 */
function handleResultItemKeydown(event, storageKey, index) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    const callback = window[`selectCallback_${storageKey}`];
    const results = window[`searchResults_${storageKey}`];
    if (callback && results && results[index]) {
      callback(results[index]);
    }
  }
}

/**
 * Resolve manager name asynchronously and update badge
 * @param {number} managerId - Manager ID to resolve
 * @param {string} badgeId - Badge element ID to update
 */
async function resolveManagerName(managerId, badgeId) {
  try {
    const managerName = await getManagerName(managerId);
    const badgeElement = document.getElementById(badgeId);
    if (badgeElement) {
      badgeElement.innerHTML = `<i class="fas fa-user-tie me-1"></i>${managerName}`;
    }
  } catch (error) {
    console.error('Error resolving manager name:', error);
    const badgeElement = document.getElementById(badgeId);
    if (badgeElement) {
      badgeElement.innerHTML = `<i class="fas fa-user-tie me-1"></i>Unknown Manager`;
      badgeElement.classList.remove('bg-primary');
      badgeElement.classList.add('bg-secondary');
    }
  }
}

/**
 * Add results to search cache
 * @param {string} type - Type of search (requesters/agents)
 * @param {string} searchTerm - The search term
 * @param {Array} results - The search results
 */
/**
 * Get search results from cache
 * @param {string} type - Type of search (requesters/agents)
 * @param {string} searchTerm - The search term
 * @returns {Promise<Array|null>} - Promise resolving to cached results or null
 */
async function getFromSearchCache(type, searchTerm) {
  try {
    if (!window.searchCache) {
      window.searchCache = {};
    }
    
    const cacheKey = `${type}_${searchTerm.toLowerCase()}`;
    const cached = window.searchCache[cacheKey];
    
    if (!cached) {
      console.log(`📦 No cache found for ${type} search: "${searchTerm}"`);
      return null;
    }
    
    // Check if cache is expired
    const params = await getInstallationParams();
    const searchCacheTimeout = params.searchCacheTimeout || DEFAULT_SEARCH_CACHE_TIMEOUT;
    
    if (Date.now() - cached.timestamp > searchCacheTimeout) {
      console.log(`⏰ Cache expired for ${type} search: "${searchTerm}"`);
      delete window.searchCache[cacheKey];
      return null;
    }
    
    console.log(`📦 Using cached ${type} results for "${searchTerm}": ${cached.results.length} results`);
    return cached.results;
  } catch (error) {
    console.error(`Error accessing ${type} search cache:`, error);
    return null;
  }
}

function addToSearchCache(type, searchTerm, results) {
  if (!window.searchCache) {
    window.searchCache = {};
  }
  
  const cacheKey = `${type}_${searchTerm.toLowerCase()}`;
  window.searchCache[cacheKey] = {
    results: results,
    timestamp: Date.now()
  };
  
  console.log(`📦 Cached ${results.length} ${type} results for "${searchTerm}"`);
}

/**
 * Cache individual users for later use
 * @param {Array} users - Array of user objects
 * @param {string} type - Type of users (requester/agent)
 */
function cacheIndividualUsers(users, type) {
  if (!window.userCache) {
    window.userCache = {};
  }
  
  users.forEach(user => {
    if (user.id) {
      window.userCache[user.id] = {
        ...user,
        type: type,
        timestamp: Date.now()
      };
    }
  });
  
  console.log(`👥 Cached ${users.length} individual ${type} users`);
}

/**
 * Update loading message in a container
 * @param {string} containerId - ID of the container
 * @param {string} message - Loading message to display
 */
function updateLoadingMessage(containerId, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="text-center p-3">
        <div class="spinner-border spinner-border-sm" role="status"></div>
        ${message}
      </div>
    `;
  }
}

/**
 * Get installation parameters
 * @returns {Promise<Object>} Installation parameters
 */
function getInstallationParams() {
  // Return default parameters for now
  // In a real implementation, this would fetch from the app's configuration
  return Promise.resolve({
    searchCacheTimeout: 300000, // 5 minutes
    paginationDelay: 500 // 500ms
  });
}

/**
 * Generate badge HTML for a user
 * @param {Object} user - User object with badge information
 * @param {string} containerId - Container ID for unique badge IDs
 * @returns {string} - HTML string with badges
 */
function generateUserBadges(user, containerId = '') {
  const badges = [];
  
  // Agent badge
  if (user._isAgent) {
    badges.push('<span class="badge bg-info me-1">Agent</span>');
  }
  
  // Department badge
  if (user.department_names && user.department_names.length > 0) {
    const departments = user.department_names.join(', ');
    badges.push(`<span class="badge bg-secondary me-1" title="Department"><i class="fas fa-building me-1"></i>${departments}</span>`);
  }
  
  // Location badge
  if (user.location_name) {
    badges.push(`<span class="badge bg-success me-1" title="Location"><i class="fas fa-map-marker-alt me-1"></i>${user.location_name}</span>`);
  }
  
  // Job title badge (if available)
  if (user.job_title) {
    badges.push(`<span class="badge bg-warning text-dark me-1" title="Job Title"><i class="fas fa-briefcase me-1"></i>${user.job_title}</span>`);
  }
  
  // Manager badge (will be resolved asynchronously if manager ID exists)
  if (user.reporting_manager_id) {
    const badgeId = containerId ? `selected-manager-badge-${containerId}` : `selected-manager-badge-${Date.now()}`;
    badges.push(`<span class="badge bg-primary me-1" title="Reporting Manager" id="${badgeId}"><i class="fas fa-user-tie me-1"></i>Loading...</span>`);
    // Resolve manager name asynchronously
    setTimeout(() => resolveManagerName(user.reporting_manager_id, badgeId), 100);
  }
  
  return badges.length > 0 ? `<div class="mt-2">${badges.join('')}</div>` : '';
}

/**
 * Update initialization progress
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} message - Progress message
 */
function updateInitializationProgress(progress, message) {
  const progressBar = document.getElementById('initialization-progress-bar');
  const progressMessage = document.getElementById('initialization-message');
  
  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }
  
  if (progressMessage) {
    progressMessage.textContent = message;
  }
  
  console.log(`📊 Initialization: ${progress}% - ${message}`);
}

/**
 * Hide initialization overlay and show main app
 */
function hideInitializationOverlay() {
  const overlay = document.getElementById('initialization-overlay');
  const appContent = document.getElementById('app-content');
  
  if (overlay) {
    // Add fade-out class for smooth transition
    overlay.classList.add('fade-out');
    
    // Remove overlay after animation completes
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 500);
  }
  
  if (appContent) {
    // Remove blur effect from main content
    appContent.classList.remove('app-initializing');
    appContent.classList.add('app-ready');
  }
  
  console.log('✅ Initialization overlay hidden, app ready for interaction');
}

/**
 * Initialize app with progress tracking
 */
async function initializeAppWithProgress() {
  try {
    console.log('🚀 Starting app initialization with progress tracking...');
    
    updateInitializationProgress(5, '🎨 Loading FontAwesome styles...');
    loadFontAwesome();
    await new Promise(resolve => setTimeout(resolve, 200)); // Brief pause for visual effect
    
    updateInitializationProgress(15, '⚡ Initializing cache systems...');
    // Initialize cache manager if available
    if (window.CacheManager) {
      await window.CacheManager.initializeAllCaches();
    }
    await new Promise(resolve => setTimeout(resolve, 300));
    
    updateInitializationProgress(25, '🏗️ Loading asset type definitions...');
    // Try to load asset types, but don't fail if it doesn't work
    try {
      await fetchAndCacheAssetTypes();
      updateInitializationProgress(35, '✅ Asset types loaded successfully');
    } catch (error) {
      console.log('⚠️ Asset types loading failed, initializing caches...');
      // Initialize empty caches as fallback
      await cacheAssetTypes({});
      updateInitializationProgress(35, '⚠️ Asset types initialized with fallback');
    }
    await new Promise(resolve => setTimeout(resolve, 200));
    
    updateInitializationProgress(45, '🌍 Loading location data...');
    // Try to load locations, but don't fail if it doesn't work
    try {
      await fetchAllLocations();
      updateInitializationProgress(55, '🎯 Locations loaded successfully');
    } catch (error) {
      console.log('⚠️ Locations loading failed, using fallback...');
      // Initialize empty cache as fallback
      await cacheLocations({});
      updateInitializationProgress(55, '⚠️ Locations initialized with fallback');
    }
    await new Promise(resolve => setTimeout(resolve, 200));
    
    updateInitializationProgress(65, '⚙️ Setting up form components...');
    
    // Initialize Impacted Services module - removed from here as it should initialize when tab is shown
    // The module will be initialized when the impacted services tab is first accessed
    
    // Initialize Change Submission module
    if (window.ChangeSubmission) {
      window.ChangeSubmission.init();
      console.log('✅ Change Submission module initialized');
      updateInitializationProgress(75, '📝 Change submission module ready');
    } else {
      console.warn('⚠️ Change Submission module not available');
      updateInitializationProgress(75, '⚠️ Change submission module unavailable');
    }
    await new Promise(resolve => setTimeout(resolve, 200));
    
    updateInitializationProgress(80, '🔧 Configuring form components...');
    // Setup form components
    populateFormFields();
    setupEventListeners();
    initializeChangeTypeDefaults();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    updateInitializationProgress(90, '👥 Preloading user cache...');
    // Preload user cache in background (don't wait for it)
    preloadUserCache().catch(error => {
      console.warn('⚠️ User cache preload failed:', error);
    });
    await new Promise(resolve => setTimeout(resolve, 400));
    
    updateInitializationProgress(95, '🎉 Finalizing initialization...');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    updateInitializationProgress(100, '🚀 Ready to create change requests!');
    
    // Small delay before hiding overlay for final message visibility
    await new Promise(resolve => setTimeout(resolve, 800));
    
    console.log('✅ App initialization completed successfully');
    hideInitializationOverlay();
    
  } catch (error) {
    console.error('❌ Error in app initialization:', error);
    updateInitializationProgress(0, '💥 Initialization failed. Please refresh the page.');
    displayInitError('Failed to initialize application: ' + error.message);
  }
}

/**
 * Initialize app (legacy function for compatibility)
 */

/**
 * Preload user cache to improve manager name resolution
 * @returns {Promise<number>} - Number of users cached
 */
async function preloadUserCache() {
  try {
    console.log('👥 Preloading user cache...');
    
    // Use existing fetchUsers function which gets both requesters and agents
    const userCache = await fetchUsers();
    
    if (userCache && typeof userCache === 'object') {
      const userCount = Object.keys(userCache).length;
      console.log(`✅ Preloaded ${userCount} users into cache`);
      
      // Log breakdown by type
      const requesters = Object.values(userCache).filter(u => u.type === 'requester').length;
      const agents = Object.values(userCache).filter(u => u.type === 'agent').length;
      console.log(`   📊 Breakdown: ${requesters} requesters, ${agents} agents`);
      
      return userCount;
    }
    
    console.log('⚠️ No users cached during preload');
    return 0;
  } catch (error) {
    console.error('❌ Error preloading user cache:', error);
    return 0;
  }
}

/**
 * Preload specific users referenced in assets to ensure managed_by resolution works
 * @param {Array} assets - Array of assets to analyze for user references
 * @returns {Promise<number>} - Number of users successfully cached
 */
async function preloadAssetUsers(assets) {
  if (!assets || assets.length === 0) {
    console.log('📦 No assets provided for user preloading');
    return 0;
  }

  console.log(`👥 Preloading users referenced in ${assets.length} assets...`);
  
  // Collect all unique user IDs referenced in assets
  const userIds = new Set();
  
  assets.forEach(asset => {
    // Check various fields that might contain user IDs
    if (asset.agent_id && !isNaN(asset.agent_id)) {
      userIds.add(parseInt(asset.agent_id));
    }
    if (asset.user_id && !isNaN(asset.user_id)) {
      userIds.add(parseInt(asset.user_id));
    }
    if (asset.managed_by && !isNaN(asset.managed_by)) {
      userIds.add(parseInt(asset.managed_by));
    }
    
    // Check type_fields for managed_by references
    if (asset.type_fields) {
      Object.entries(asset.type_fields).forEach(([key, value]) => {
        if (key.includes('managed_by') && value && !isNaN(value)) {
          userIds.add(parseInt(value));
        }
      });
    }
  });

  console.log(`🔍 Found ${userIds.size} unique user IDs to preload: [${Array.from(userIds).join(', ')}]`);

  if (userIds.size === 0) {
    console.log('⚠️ No user IDs found in assets');
    return 0;
  }

  // Get current user cache
  const cachedUsers = await getCachedUsers();
  let newUsersLoaded = 0;

  // Check each user ID and load if not in cache or expired
  for (const userId of userIds) {
    try {
      // Check if user is already in cache and not expired
      if (cachedUsers[userId] && 
          cachedUsers[userId].timestamp > Date.now() - CACHE_TIMEOUT) {
        console.log(`✅ User ${userId} already in cache: ${cachedUsers[userId].name}`);
        continue;
      }

      // Load user details from API
      console.log(`📡 Loading user ${userId} from API...`);
      const userDetails = await getUserDetails(userId);
      
      if (userDetails) {
        newUsersLoaded++;
        console.log(`✅ Loaded user ${userId}: ${userDetails.first_name} ${userDetails.last_name}`);
      } else {
        console.log(`⚠️ Could not load user ${userId} - user may not exist`);
      }
    } catch (error) {
      console.warn(`❌ Error loading user ${userId}:`, error);
    }
  }

  console.log(`✅ Preloaded ${newUsersLoaded} new users for asset analysis`);
  return newUsersLoaded;
}

/**
 * Preload user cache to improve manager name resolution
 */

/**
 * Debug function to check user cache status and asset user references
 * @param {Array} assets - Optional array of assets to analyze
 */
async function debugUserCacheStatus(assets = null) {
  console.log('🔍 === USER CACHE DEBUG STATUS ===');
  
  try {
    // Check user cache status
    const cachedUsers = await getCachedUsers();
    const userCount = Object.keys(cachedUsers).length;
    console.log(`📦 Total users in cache: ${userCount}`);
    
    if (userCount > 0) {
      const requesters = Object.values(cachedUsers).filter(u => u.type === 'requester').length;
      const agents = Object.values(cachedUsers).filter(u => u.type === 'agent').length;
      const others = userCount - requesters - agents;
      
      console.log(`   📊 Breakdown:`);
      console.log(`      👤 Requesters: ${requesters}`);
      console.log(`      🛠️ Agents: ${agents}`);
      console.log(`      ❓ Others: ${others}`);
      
      // Show sample user IDs
      const sampleUsers = Object.entries(cachedUsers).slice(0, 5);
      console.log(`   📋 Sample cached users:`);
      sampleUsers.forEach(([userId, user]) => {
        console.log(`      ${userId}: "${user.name}" (${user.type})`);
      });
    }
    
    // Check search cache
    if (window.userCache) {
      const searchCacheCount = Object.keys(window.userCache).length;
      console.log(`🔍 Search cache users: ${searchCacheCount}`);
    } else {
      console.log(`🔍 Search cache: Not initialized`);
    }
    
    // Analyze assets if provided
    if (assets && assets.length > 0) {
      console.log(`\n📦 === ASSET USER REFERENCE ANALYSIS ===`);
      console.log(`Analyzing ${assets.length} assets for user references...`);
      
      const userIds = new Set();
      const assetUserRefs = [];
      
      assets.forEach((asset, index) => {
        const refs = {
          assetName: asset.name || asset.display_name || `Asset ${index + 1}`,
          assetId: asset.id,
          agent_id: asset.agent_id,
          user_id: asset.user_id,
          managed_by: asset.managed_by,
          type_fields_managed: []
        };
        
        // Collect user IDs
        if (asset.agent_id && !isNaN(asset.agent_id)) {
          userIds.add(parseInt(asset.agent_id));
        }
        if (asset.user_id && !isNaN(asset.user_id)) {
          userIds.add(parseInt(asset.user_id));
        }
        if (asset.managed_by && !isNaN(asset.managed_by)) {
          userIds.add(parseInt(asset.managed_by));
        }
        
        // Check type_fields
        if (asset.type_fields) {
          Object.entries(asset.type_fields).forEach(([key, value]) => {
            if (key.includes('managed_by') && value && !isNaN(value)) {
              userIds.add(parseInt(value));
              refs.type_fields_managed.push(`${key}: ${value}`);
            }
          });
        }
        
        assetUserRefs.push(refs);
      });
      
      console.log(`🔍 Found ${userIds.size} unique user IDs referenced in assets`);
      console.log(`📋 User IDs: [${Array.from(userIds).join(', ')}]`);
      
      // Check which user IDs are in cache vs missing
      const cachedIds = [];
      const missingIds = [];
      
      for (const userId of userIds) {
        if (cachedUsers[userId]) {
          cachedIds.push(userId);
        } else {
          missingIds.push(userId);
        }
      }
      
      console.log(`✅ User IDs in cache: ${cachedIds.length} [${cachedIds.join(', ')}]`);
      console.log(`❌ User IDs missing from cache: ${missingIds.length} [${missingIds.join(', ')}]`);
      
      // Show detailed asset analysis
      console.log(`\n📋 === DETAILED ASSET USER REFERENCES ===`);
      assetUserRefs.forEach((refs, index) => {
        console.log(`${index + 1}. "${refs.assetName}" (ID: ${refs.assetId})`);
        if (refs.agent_id) console.log(`   🛠️ agent_id: ${refs.agent_id} ${cachedUsers[refs.agent_id] ? '✅' : '❌'}`);
        if (refs.user_id) console.log(`   👤 user_id: ${refs.user_id} ${cachedUsers[refs.user_id] ? '✅' : '❌'}`);
        if (refs.managed_by) console.log(`   👥 managed_by: ${refs.managed_by} ${cachedUsers[refs.managed_by] ? '✅' : '❌'}`);
        if (refs.type_fields_managed.length > 0) {
          refs.type_fields_managed.forEach(field => {
            const userId = field.split(': ')[1];
            console.log(`   🏷️ ${field} ${cachedUsers[userId] ? '✅' : '❌'}`);
          });
        }
      });
      
      if (missingIds.length > 0) {
        console.log(`\n💡 === RECOMMENDATIONS ===`);
        console.log(`❌ ${missingIds.length} user IDs are missing from cache`);
        console.log(`💡 Run: await preloadAssetUsers(assets) to load missing users`);
        console.log(`💡 Or run: await fetchUsers() to refresh the entire user cache`);
      } else {
        console.log(`\n✅ === ALL GOOD ===`);
        console.log(`✅ All user IDs referenced in assets are available in cache!`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error debugging user cache:', error);
  }
}

// Make debug function available globally
window.debugUserCacheStatus = debugUserCacheStatus;

/**
 * Update initialization progress
 */

/**
 * Get safe API limits for pagination to avoid rate limiting
 * @returns {Object} - API limits configuration
 */
function getSafeApiLimits() {
  // Return more aggressive limits for better user coverage
  // These limits are designed to get comprehensive user data while respecting API constraints
  return {
    listRequestersPageLimit: 10,  // Increased from 1 to 10 (up to 1000 requesters)
    listAgentsPageLimit: 10,      // Increased from 1 to 10 (up to 1000 agents)
    searchPageLimit: 5,           // For search operations
    delayBetweenRequests: 100     // 100ms delay between requests to avoid rate limiting
  };
}

/**
 * Force refresh user cache with enhanced pagination
 * This will clear the existing cache and fetch fresh user data
 * @returns {Promise<Object>} - Refreshed user cache
 */
async function refreshUserCache() {
  console.log('🔄 === FORCE REFRESHING USER CACHE ===');
  console.log('🗑️ Clearing existing user cache...');
  
  try {
    // Clear existing caches
    await window.client.db.set(STORAGE_KEYS.USER_CACHE, {});
    window.userCache = {};
    
    console.log('✅ Existing cache cleared');
    
    // Fetch fresh user data with enhanced pagination
    console.log('📡 Fetching fresh user data with enhanced pagination...');
    const freshUsers = await fetchUsers();
    
    console.log('✅ User cache refresh complete!');
    return freshUsers;
    
  } catch (error) {
    console.error('❌ Error refreshing user cache:', error);
    return {};
  }
}

// Make refresh function available globally
window.refreshUserCache = refreshUserCache;

// Make additional helper functions available globally for troubleshooting
window.preloadAssetUsers = preloadAssetUsers;
window.getSafeApiLimits = getSafeApiLimits;
window.fetchUsers = fetchUsers;

// Add convenience function to test enhanced pagination
window.testEnhancedUserCache = async function() {
  console.log('🧪 === TESTING ENHANCED USER CACHE ===');
  console.log('🎯 This will test the enhanced pagination and user coverage');
  
  try {
    // Show current API limits
    const limits = getSafeApiLimits();
    console.log('📊 Current API limits:', limits);
    
    // Check current cache status
    console.log('\n📦 Current cache status:');
    await debugUserCacheStatus();
    
    // Offer to refresh cache
    console.log('\n💡 To refresh user cache with enhanced pagination, run:');
    console.log('   await refreshUserCache()');
    
    return limits;
  } catch (error) {
    console.error('❌ Error testing enhanced user cache:', error);
    return null;
  }
};
