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

// Utility functions
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
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
 * Get asset types from cache or fetch if expired
 * @returns {Promise<Object>} Asset types map
 */
async function getAssetTypes() {
  const now = Date.now();
  const cacheAge = now - cache.asset_types.timestamp;

  if (cacheAge > CACHE.TIMEOUTS.ASSET_TYPES || Object.keys(cache.asset_types.data).length === 0) {
    console.log('Asset types cache expired or empty, refreshing...');
    return await fetchAndCacheAssetTypes();
  }

  return cache.asset_types.data;
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
  changeType: 'standard',
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
  }
};

// Data storage keys
const STORAGE_KEYS = {
  CHANGE_DATA: 'change_request_data',
  DRAFT_ID: 'change_request_draft_id',
  LOCATION_CACHE: 'location_cache',
  USER_CACHE: 'user_cache',
  ASSET_TYPE_CACHE: 'asset_type_cache'
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
  'standard': 'Standard Changes: All changes to critical assets > automate predefined/repeatable changes as much as possible',
  'emergency': 'Emergency Changes: Changes arise from an unexpected error/issue and need to be addressed immediately to restore service for customers or employees, or to secure a system against a threat',
  'non-standard': 'Non-standard change: any change that requires an exception to the policy'
};

const leadTimeText = {
  'standard': '2 business days',
  'emergency': 'No lead time required',
  'non-standard': '2 business days'
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
  
    // Load FontAwesome first
    loadFontAwesome();
  
  // Use Freshworks standard initialization
  app.initialized().then(function(client) {
    console.log('Freshworks app initialized successfully');
    window.client = client;
    
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
      console.log('🗑️ Asset search test functions removed - see blank slate comment');
    };
    
    console.log('💡 Type testConsole() in the console to verify access');
    
    // Wait a moment for everything to settle
    setTimeout(() => {
      initializeApp().catch(error => {
        console.error('Failed to initialize app:', error);
        displayInitError('Failed to initialize the application. Please refresh the page and try again.');
      });
    }, 500);
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
  console.log('Fetching all locations from API');
  
  // Check for client availability
  if (!window.client || !window.client.request) {
    console.error('Client not available for locations fetch');
    return {};
  }

  try {
    const allLocations = {};
    let page = 1;
    let hasMorePages = true;
    
    // Function to load locations from a specific page
    async function loadLocationsPage(pageNum) {
      console.log(`Loading locations page ${pageNum}`);
      
      try {
        // Use invokeTemplate to access locations API
        const response = await window.client.request.invokeTemplate("getLocation", {
          path_suffix: `?page=${pageNum}&per_page=100`
        });
        
        if (!response || !response.response) {
          console.error('Invalid locations response:', response);
          return { locations: [], more: false };
        }
        
        try {
          const parsedData = JSON.parse(response.response || '{"locations":[]}');
          const locations = parsedData.locations || [];
          
          // Check if we might have more pages (received full page of results)
          const hasMore = locations.length === 100;
          
          return { locations, more: hasMore };
        } catch (parseError) {
          console.error('Error parsing locations response:', parseError);
          return { locations: [], more: false };
        }
      } catch (error) {
        console.error(`Error fetching locations page ${pageNum}:`, error);
        return { locations: [], more: false };
      }
    }
    
    // Load all pages of locations
    while (hasMorePages) {
      const { locations, more } = await loadLocationsPage(page);
      
      // Process locations and add to cache
      locations.forEach(location => {
        if (location && location.id && location.name) {
          allLocations[location.id] = {
            name: location.name,
            timestamp: Date.now()
          };
        }
      });
      
      // Check if we should load more pages
      hasMorePages = more;
      page++;
      
      // Safety check to prevent infinite loops
      if (page > 10) {
        console.warn('Reached maximum number of location pages (10)');
        break;
      }
    }
    
    // Save all locations to cache
    if (Object.keys(allLocations).length > 0) {
      console.log(`Caching ${Object.keys(allLocations).length} locations`);
      await cacheLocations(allLocations);
    } else {
      console.warn('No locations found to cache');
    }
    
    return allLocations;
  } catch (error) {
    console.error('Error in fetchAllLocations:', error);
    return {};
  }
}

/**
 * Fetch all asset types from the API and store them in the cache
 * @returns {Promise<Object>} - Cached asset types
 */
async function fetchAllAssetTypes() {
  console.log('🔄 Attempting to fetch asset types from API (optional)');
  
  // Check for client availability
  if (!window.client || !window.client.request) {
    console.log('⚠️ Client not available for asset types fetch - this is optional');
    return {};
  }

  try {
    const allAssetTypes = {};
    let page = 1;
    let hasMorePages = true;
    
    // Function to load asset types from a specific page
    async function loadAssetTypesPage(pageNum) {
      console.log(`📄 Loading asset types page ${pageNum}`);
      
      try {
        // Check if the client request method is available
        if (!window.client.request.invokeTemplate) {
          console.log('⚠️ Client request.invokeTemplate not available for asset types');
          return { assetTypes: [], more: false };
        }
        
        // Use invokeTemplate to access asset types API
        const response = await window.client.request.invokeTemplate("getAssetTypes", {
          path_suffix: `?page=${pageNum}&per_page=100`
        });
        
        if (!response || !response.response) {
          console.log('⚠️ Invalid asset types API response');
          return { assetTypes: [], more: false };
        }
        
        try {
          const parsedData = JSON.parse(response.response || '{"asset_types":[]}');
          const assetTypes = parsedData.asset_types || [];
          
          console.log(`✅ Loaded ${assetTypes.length} asset types from page ${pageNum}`);
          
          // Check if we might have more pages (received full page of results)
          const hasMore = assetTypes.length === 100;
          
          return { assetTypes, more: hasMore };
        } catch (parseError) {
          console.log('⚠️ Error parsing asset types response - this is optional:', parseError.message);
          return { assetTypes: [], more: false };
        }
      } catch (error) {
        console.log(`⚠️ Error fetching asset types page ${pageNum} - this is optional:`, error.message);
        return { assetTypes: [], more: false };
      }
    }
    
    // Load all pages of asset types
    while (hasMorePages && page <= 5) { // Limit to 5 pages for safety
      const { assetTypes, more } = await loadAssetTypesPage(page);
      
      if (assetTypes.length === 0) {
        console.log('📄 No more asset types to load');
        break;
      }
      
      // Process asset types and add to cache
      assetTypes.forEach(assetType => {
        if (assetType && assetType.id && assetType.name) {
          allAssetTypes[assetType.id] = {
            name: assetType.name,
            description: assetType.description || '',
            visible: assetType.visible || false,
            timestamp: Date.now()
          };
        }
      });
      
      // Check if we should load more pages
      hasMorePages = more;
      page++;
      
      // Add pagination delay if we're loading more pages
      if (hasMorePages) {
        const params = await getInstallationParams();
        const paginationDelay = params.paginationDelay || DEFAULT_PAGINATION_DELAY;
        await new Promise(resolve => setTimeout(resolve, paginationDelay));
      }
    }
    
    // Save all asset types to cache if we got any
    const totalTypes = Object.keys(allAssetTypes).length;
    if (totalTypes > 0) {
      console.log(`✅ Successfully cached ${totalTypes} asset types`);
      await cacheAssetTypes(allAssetTypes);
    } else {
      console.log('⚠️ No asset types were fetched - this is optional and the app will still work');
    }
    
    return allAssetTypes;
  } catch (error) {
    console.log('⚠️ Error in fetchAllAssetTypes - this is optional and the app will still work:', error.message);
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
      console.log(`Using cached asset type: ${cachedAssetTypes[assetTypeId].name}`);
      return cachedAssetTypes[assetTypeId].name;
    }
    
    // If not in cache or expired, fetch from API
    // But first, check if we can trigger a full refresh to benefit other asset types too
    if (Object.keys(cachedAssetTypes).length === 0 || 
        Object.values(cachedAssetTypes).some(type => type.timestamp < Date.now() - CACHE_TIMEOUT)) {
      console.log('Asset type cache expired or empty, fetching all asset types');
      const allAssetTypes = await fetchAllAssetTypes();
      
      // Check if our target asset type was included in the refresh
      if (allAssetTypes[assetTypeId]) {
        return allAssetTypes[assetTypeId].name;
      }
    }
    
    // If we still don't have the asset type after a refresh attempt, get it individually
    console.log(`Fetching individual asset type ${assetTypeId} from API`);
    
    // Check if the client request method is available
    if (!window.client.request || !window.client.request.invokeTemplate) {
      console.error('Client request.invokeTemplate not available');
      return `Asset Type ${assetTypeId}`;
    }
    
    const response = await window.client.request.invokeTemplate("getAssetTypes", {
      path_suffix: `/${assetTypeId}`
    });
    
    if (!response || !response.response) {
      console.error('Invalid asset type response:', response);
      return `Asset Type ${assetTypeId}`;
    }
    
    try {
      const parsedData = JSON.parse(response.response || '{}');
      if (parsedData && parsedData.asset_type && parsedData.asset_type.name) {
        const assetTypeName = parsedData.asset_type.name;
        
        // Update cache
        cachedAssetTypes[assetTypeId] = {
          name: assetTypeName,
          description: parsedData.asset_type.description || '',
          visible: parsedData.asset_type.visible || false,
          timestamp: Date.now()
        };
        await cacheAssetTypes(cachedAssetTypes);
        
        return assetTypeName;
      }
      return `Asset Type ${assetTypeId}`;
    } catch (parseError) {
      console.error('Error parsing asset type response:', parseError);
      return `Asset Type ${assetTypeId}`;
    }
  } catch (error) {
    console.error('Error fetching asset type:', error);
    return `Asset Type ${assetTypeId}`;
  }
}

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
    let assetTypeIds = [...KNOWN_SOFTWARE_TYPE_IDS];
    
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
 * This may not fetch ALL users as there could be thousands
 * but will pre-fetch a reasonable number to reduce API calls
 * @returns {Promise<Object>} - Cached users
 */
async function fetchUsers() {
  console.log('Fetching users from API');
  
  // Check for client availability
  if (!window.client || !window.client.request) {
    console.error('Client not available for users fetch');
    return {};
  }

  try {
    // Get safe API limits based on plan settings
    const apiLimits = await getSafeApiLimits();
    const requesterPageLimit = apiLimits.listRequestersPageLimit || 1;
    const agentPageLimit = apiLimits.listAgentsPageLimit || 1;
    
    console.log(`Using rate limits: ${requesterPageLimit} requester pages, ${agentPageLimit} agent pages`);
    
    const allUsers = {};
    
    // Function to load requesters from a specific page
    async function loadRequestersPage(pageNum) {
      console.log(`Loading requesters page ${pageNum}`);
      
      try {
        // Use invokeTemplate which is more reliable in Freshservice
        const response = await window.client.request.invokeTemplate("getRequesters", {
          path_suffix: `?page=${pageNum}&per_page=100`
        });
        
        if (!response || !response.response) {
          console.error('Invalid requesters response:', response);
          return { users: [], more: false };
        }
        
        try {
          const parsedData = JSON.parse(response.response || '{"requesters":[]}');
          const users = parsedData.requesters || [];
          
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
      console.log(`Loading agents page ${pageNum}`);
      
      try {
        // Use invokeTemplate to access agents API
        const response = await window.client.request.invokeTemplate("getAgents", {
          path_suffix: `?page=${pageNum}&per_page=100`
        });
        
        if (!response || !response.response) {
          console.error('Invalid agents response:', response);
          return { users: [], more: false };
        }
        
        try {
          const parsedData = JSON.parse(response.response || '{"agents":[]}');
          const users = parsedData.agents || [];
          
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
    
    // Fetch requesters
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
        }
      });
      
      hasMoreRequesters = more;
      requesterPage++;
    }
    
    // Fetch agents
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
        }
      });
      
      hasMoreAgents = more;
      agentPage++;
    }
    
    // Save all users to cache
    if (Object.keys(allUsers).length > 0) {
      console.log(`Caching ${Object.keys(allUsers).length} users (${requesterPage-1} requester pages, ${agentPage-1} agent pages)`);
      await cacheUsers(allUsers);
    } else {
      console.warn('No users found to cache');
    }
    
    return allUsers;
  } catch (error) {
    console.error('Error in fetchUsers:', error);
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
 * Save users to cache
 * @param {Object} users - Users to cache
 * @returns {Promise<boolean>} - Success status
 */
async function cacheUsers(users) {
  try {
    await window.client.db.set(STORAGE_KEYS.USER_CACHE, users);
    console.log('User cache updated');
    return true;
  } catch (error) {
    console.error('Failed to save user cache:', error);
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
    // Check cache first
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
          
          // Update cache
          cachedUsers[userId] = {
            name: userName,
            data: user,
            timestamp: Date.now(),
            type: 'requester'
          };
          await cacheUsers(cachedUsers);
          
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
          
          // Update cache
          cachedUsers[userId] = {
            name: userName,
            data: user,
            timestamp: Date.now(),
            type: 'agent'
          };
          await cacheUsers(cachedUsers);
          
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
    console.log('Starting app initialization...');
    
    // Initialize caches in parallel for better performance
    await Promise.all([
      fetchAndCacheAssetTypes()
    ]);
    
    console.log('Caches initialized successfully');
    
    // Initialize form components
    populateFormFields();
    setupEventListeners();
    
    // Initialize change type defaults
    initializeChangeTypeDefaults();
    
    console.log('App initialization completed successfully');
    
  } catch (error) {
    console.error('Error in app initialization:', error);
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
  errorDiv.innerHTML = `
    <h4>Initialization Error</h4>
    <p>${message}</p>
    <button class="btn btn-primary" onclick="location.reload()">Retry</button>
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

  // Set default planned start time (tomorrow at 9 AM)
  const plannedStart = new Date(tomorrow);
  plannedStart.setHours(9, 0, 0, 0);
  
  // Set default planned end time (tomorrow at 10 AM)
  const plannedEnd = new Date(tomorrow);
  plannedEnd.setHours(10, 0, 0, 0);

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
    assetAssociationTab.addEventListener('shown.bs.tab', function () {
      // Initialize Asset Association Module when tab is first shown
      if (window.AssetAssociation && !window.AssetAssociation._initialized) {
        console.log('🔧 Initializing Asset Association Module...');
        window.AssetAssociation.init();
        window.AssetAssociation._initialized = true;
        console.log('✅ Asset Association Module initialized');
      }
    });
    console.log('✅ Asset Association tab listener added');
  }
  
  // Change type selection
  const changeTypeSelect = document.getElementById('change-type');
  if (changeTypeSelect) {
    changeTypeSelect.addEventListener('change', handleChangeTypeSelection);
    console.log('✅ Change type selection listener added');
  }
  
  // Requester search
  const requesterSearch = document.getElementById('requester-search');
  if (requesterSearch) {
    const debouncedRequesterSearch = debounce(searchRequesters, 300);
    requesterSearch.addEventListener('input', debouncedRequesterSearch);
    console.log('✅ Requester search listener added');
  }
  
  // Agent search
  const agentSearch = document.getElementById('agent-search');
  if (agentSearch) {
    const debouncedAgentSearch = debounce(searchAgents, 300);
    agentSearch.addEventListener('input', debouncedAgentSearch);
    console.log('✅ Agent search listener added');
  }

  // Risk assessment inputs
  const riskInputs = document.querySelectorAll('input[name^="risk-"]');
  riskInputs.forEach(input => {
    input.addEventListener('change', updateRiskSelection);
  });
  console.log(`✅ Risk assessment listeners added (${riskInputs.length} inputs)`);

  console.log('✅ All event listeners setup complete');
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
    if (cachedResults) {
      // Use cached results
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
    
    // No cache hit, perform search immediately
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
    if (cachedResults) {
      // Use cached results
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
    
    // No cache hit, perform search immediately
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
function performAgentSearch(searchTerm, isRefresh = false) {
  // Ensure client is available
  if (!window.client || !window.client.request) {
    console.error('Client or request object not available for agent search');
    showNotification('error', 'API client not initialized. Please refresh the page.');
    return;
  }

  // Use field-specific format for agents API
  const agentQuery = encodeURIComponent(`~[first_name|last_name|email]:'${searchTerm}'`);
  
  console.log(`${isRefresh ? 'Refreshing' : 'Performing'} agent search with query:`, agentQuery);
  
  // Only show loading indicator for non-refresh operations
  if (!isRefresh) {
    const resultsContainer = document.getElementById('agent-results');
    resultsContainer.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm" role="status"></div> Loading...</div>';
    resultsContainer.style.display = 'block';
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
        console.log(`Agent search returned ${agents.length} results`);
        
        // Manual filtering if the API filtering isn't working
        const filteredAgents = agents.filter(agent => {
          const fullName = `${agent.first_name || ''} ${agent.last_name || ''}`.toLowerCase();
          const email = (agent.email || '').toLowerCase();
          const term = searchTerm.toLowerCase();
          return fullName.includes(term) || email.includes(term);
        });
        
        console.log(`Manual filtering returned ${filteredAgents.length} results`);
        
        // Combine with previous results
        const combinedResults = [...allResults, ...filteredAgents];
        
        // If we got a full page of results, there might be more
        if (agents.length === 30 && page < 3) { // Limit to 3 pages (90 results) max
          // Load next page
          (async function() {
            const params = await getInstallationParams();
            const paginationDelay = params.paginationDelay || DEFAULT_PAGINATION_DELAY;
            
            updateLoadingMessage('agent-results', `Loading more results... (page ${page + 1})`);
            setTimeout(() => {
              loadAgentsPage(page + 1, combinedResults);
            }, paginationDelay);
          })().catch(err => {
            console.error('Error getting pagination delay:', err);
            // Default delay if error
            setTimeout(() => {
              loadAgentsPage(page + 1, combinedResults);
            }, DEFAULT_PAGINATION_DELAY);
          });
        } else {
          // Complete the search with all results
          finalizeAgentSearch(searchTerm, combinedResults, isRefresh);
        }
      } catch (error) {
        console.error('Error parsing response:', error);
        // Complete with existing results
        finalizeAgentSearch(searchTerm, allResults, isRefresh);
      }
    })
    .catch(function(error) {
      console.error('API request failed:', error);
      // Complete with existing results
      finalizeAgentSearch(searchTerm, allResults, isRefresh);
    });
  }
  
  // Start loading from page 1
  loadAgentsPage(1, []);
}

/**
 * Finalize agent search with results
 * @param {string} searchTerm - Original search term
 * @param {Array} results - Search results
 * @param {boolean} isRefresh - Whether this is a cache refresh operation
 */
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
 * Display search results in the specified container
 * @param {string} containerId - ID of the container element
 * @param {Array} results - Search results to display
 * @param {Function} selectCallback - Callback function when a result is selected
 */
function displaySearchResults(containerId, results, selectCallback) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (results.length === 0) {
    container.innerHTML = '<div class="text-center p-3">No results found</div>';
    return;
  }

  // Sort results by name
  results.sort((a, b) => {
    const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
    const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
    return nameA.localeCompare(nameB);
  });

  // Create results list
  let html = '<div class="list-group">';
  results.forEach(result => {
    const name = `${result.first_name || ''} ${result.last_name || ''}`.trim() || 'Unknown';
    const email = result.email || result.primary_email || '';
    const jobTitle = result.job_title || '';
    const department = result.department_names ? result.department_names[0] : '';
    
    // Check if this is an agent who can be a requester
    const isAgentAsRequester = result._isAgent && result._canBeRequester;
    const userTypeIndicator = isAgentAsRequester ? 
      '<span class="badge bg-info ms-2">Agent</span>' : '';
    
    html += `
      <button type="button" class="list-group-item list-group-item-action" data-id="${result.id}">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <div class="fw-bold">${name}${userTypeIndicator}</div>
            <div class="text-secondary small"><i class="fas fa-envelope me-1"></i>${email}</div>
          </div>
          <div class="text-end">
            ${jobTitle ? `<div class="small text-muted"><i class="fas fa-briefcase me-1"></i>${jobTitle}</div>` : ''}
            ${department ? `<div class="small text-muted"><i class="fas fa-building me-1"></i>${department}</div>` : ''}
          </div>
        </div>
      </button>
    `;
  });
  html += '</div>';
  
  container.innerHTML = html;
  
  // Add click handlers
  container.querySelectorAll('.list-group-item').forEach(item => {
    item.addEventListener('click', () => {
      const selectedId = parseInt(item.dataset.id);
      const selectedResult = results.find(r => r.id === selectedId);
      if (selectedResult) {
        selectCallback(selectedResult);
        container.style.display = 'none';
      }
    });
  });
}

/**
 * Update the loading message in a results container
 * @param {string} containerId - ID of the container element
 * @param {string} message - Message to display
 */
function updateLoadingMessage(containerId, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `<div class="text-center p-3"><div class="spinner-border spinner-border-sm" role="status"></div> ${message}</div>`;
  }
}

/**
 * Cache individual users for later use
 * @param {Array} users - Array of user objects to cache
 * @param {string} type - Type of users ('requester' or 'agent')
 */
async function cacheIndividualUsers(users, type) {
  try {
    const cachedUsers = await getCachedUsers();
    
    users.forEach(user => {
      if (user && user.id) {
        const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown';
        
        // Determine the actual user type for caching
        let cacheType = type;
        if (type === 'requester' && user._isAgent) {
          // This is an agent found in requester search, cache as 'both'
          cacheType = 'both';
        }
        
        // Clean the user data before caching
        const cleanUser = { ...user };
        delete cleanUser._isAgent;
        delete cleanUser._canBeRequester;
        
        cachedUsers[user.id] = {
          name: userName,
          data: cleanUser,
          timestamp: Date.now(),
          type: cacheType
        };
      }
    });
    
    await cacheUsers(cachedUsers);
    console.log(`Cached ${users.length} individual users as ${type}s`);
  } catch (error) {
    console.error(`Error caching individual users as ${type}s:`, error);
  }
}

/**
 * Get installation parameters from iparams
 * @returns {Promise<Object>} Installation parameters
 */
async function getInstallationParams() {
  try {
    // Check if client is available
    if (!window.client || !window.client.iparams) {
      console.warn('Client or iparams not available, using default parameters');
      return getDefaultParams();
    }

    // Get iparams using client.iparams.get()
    const iparams = await window.client.iparams.get();
    if (!iparams) {
      console.warn('No installation parameters found, using defaults');
      return getDefaultParams();
    }

    // Parse and validate the parameters
    return {
      // Asset type configuration
      assetTypeNames: iparams.assetTypeNames || 'Software, IT Software, ISP',
      
      // Cache timeouts
      searchCacheTimeout: parseInt(iparams.searchCacheTimeout) || DEFAULT_SEARCH_CACHE_TIMEOUT,
      paginationDelay: parseInt(iparams.paginationDelay) || DEFAULT_PAGINATION_DELAY,
      
      // API rate limiting
      safetyMargin: parseInt(iparams.safetyMargin) || DEFAULT_SAFETY_MARGIN,
      
      // Page limits for API calls
      listRequestersPageLimit: parseInt(iparams.listRequestersPageLimit) || 3,
      listAgentsPageLimit: parseInt(iparams.listAgentsPageLimit) || 3,
      
      // Other configuration
      enableDebugMode: iparams.enableDebugMode === 'true',
      customFields: iparams.customFields || {}
    };
  } catch (error) {
    console.error('Error getting installation parameters:', error);
    return getDefaultParams();
  }
}

/**
 * Get default parameters when iparams are not available
 * @returns {Object} Default parameters
 */
function getDefaultParams() {
  return {
    assetTypeNames: 'Software, IT Software, ISP',
    searchCacheTimeout: DEFAULT_SEARCH_CACHE_TIMEOUT,
    paginationDelay: DEFAULT_PAGINATION_DELAY,
    safetyMargin: DEFAULT_SAFETY_MARGIN,
    listRequestersPageLimit: 3,
    listAgentsPageLimit: 3,
    enableDebugMode: false,
    customFields: {}
  };
}

/**
 * Get cached search results
 * @param {string} type - Type of search (requesters, agents, assets)
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array|null>} Cached results or null if not found
 */
async function getFromSearchCache(type, searchTerm) {
  if (!searchCache[type] || !searchCache[type][searchTerm]) {
    return null;
  }
  
  const cachedData = searchCache[type][searchTerm];
  const currentTime = Date.now();
  
  // Get the configured search cache timeout
  const params = await getInstallationParams();
  const cacheTimeout = params.searchCacheTimeout || DEFAULT_SEARCH_CACHE_TIMEOUT;
  
  // Check if the cache is still valid
  if (currentTime - cachedData.timestamp < cacheTimeout) {
    console.log(`✅ Cache hit for ${type} search: "${searchTerm}" (${cachedData.results.length} items)`);
    return cachedData.results;
  } else {
    console.log(`⏰ Cache expired for ${type} search: "${searchTerm}"`);
    // Remove expired cache entry
    delete searchCache[type][searchTerm];
  }
  
  return null;
}

/**
 * Add search results to cache
 * @param {string} type - Type of search (requesters, agents, assets)
 * @param {string} searchTerm - Search term
 * @param {Array} results - Search results to cache
 */
function addToSearchCache(type, searchTerm, results) {
  if (!searchCache[type]) {
    searchCache[type] = {};
  }
  
  searchCache[type][searchTerm] = {
    results: results,
    timestamp: Date.now()
  };
  
  console.log(`💾 Cached ${results.length} ${type} results for "${searchTerm}"`);
}

/**
 * Map internal change type to Freshservice change type
 */
function mapChangeType(changeType) {
  const typeMapping = {
    'standard': 1,
    'emergency': 3,
    'non-standard': 2
  };
  return typeMapping[changeType] || 1;
}

/**
 * Map risk level to Freshservice priority
 */
function mapRiskToPriority(riskLevel) {
  const priorityMapping = {
    'Low': 1,      // Low priority
    'Medium': 2,   // Medium priority
    'High': 3      // High priority
  };
  return priorityMapping[riskLevel] || 2;
}

/**
 * Generate change request subject
 */
function generateChangeSubject() {
  const requesterName = changeRequestData.requester ? 
    `${changeRequestData.requester.first_name || ''} ${changeRequestData.requester.last_name || ''}`.trim() : 
    'Unknown';
  
  const changeTypeLabel = changeRequestData.changeType || 'Standard';
  const riskLevel = changeRequestData.riskAssessment.riskLevel || 'Unknown';
  
  return `${changeTypeLabel} Change Request - ${riskLevel} Risk - Requested by ${requesterName}`;
}

/**
 * Generate change request description
 */
function generateChangeDescription() {
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleString();
  };

  return `
=== CHANGE REQUEST DETAILS ===

Requester: ${changeRequestData.requester ? 
  `${changeRequestData.requester.first_name || ''} ${changeRequestData.requester.last_name || ''}`.trim() + 
  ` (${changeRequestData.requester.email || ''})` 
  : 'Not specified'}

Technical SME: ${changeRequestData.agent ? 
  `${changeRequestData.agent.first_name || ''} ${changeRequestData.agent.last_name || ''}`.trim() + 
  ` (${changeRequestData.agent.email || ''})` 
  : 'Not specified'}

Change Type: ${changeRequestData.changeType || 'Standard'}
Lead Time: ${changeRequestData.leadTime || '2 business days'}

=== TIMING ===
Planned Start: ${formatDate(changeRequestData.plannedStart)}
Planned End: ${formatDate(changeRequestData.plannedEnd)}

=== IMPLEMENTATION PLAN ===
${changeRequestData.implementationPlan || 'Not provided'}

=== BACKOUT (RECOVERY) PLAN ===
${changeRequestData.backoutPlan || 'Not provided'}

=== VALIDATION PLAN ===
${changeRequestData.validationPlan || 'Not provided'}

=== RISK ASSESSMENT ===
Risk Score: ${changeRequestData.riskAssessment.totalScore}
Risk Level: ${changeRequestData.riskAssessment.riskLevel}

Risk Assessment Details:
- Business Impact: ${getRiskLabel('businessImpact', changeRequestData.riskAssessment.businessImpact)}
- Affected Users: ${getRiskLabel('affectedUsers', changeRequestData.riskAssessment.affectedUsers)}
- Complexity: ${getRiskLabel('complexity', changeRequestData.riskAssessment.complexity)}
- Testing Level: ${getRiskLabel('testing', changeRequestData.riskAssessment.testing)}
- Rollback Plan: ${getRiskLabel('rollback', changeRequestData.riskAssessment.rollback)}

=== SUBMISSION INFO ===
Submitted via Change Request App
Submission Date: ${new Date().toLocaleString()}
  `.trim();
}

/**
 * Get risk assessment label for description
 */
function getRiskLabel(category, value) {
  const labels = {
    businessImpact: ['Low', 'Medium', 'High'],
    affectedUsers: ['Few (<50)', 'Some (50-200)', 'Many (>200)'],
    complexity: ['Simple', 'Moderate', 'Complex'],
    testing: ['Comprehensive', 'Adequate', 'Limited'],
    rollback: ['Yes - Detailed', 'Partial', 'No']
  };
  
  return value > 0 ? labels[category][value - 1] : 'Not answered';
}

/**
 * Reset form after successful submission
 */
function resetForm() {
  // Clear form fields
  document.getElementById('change-type').value = 'standard';
  document.getElementById('planned-start').value = '';
  document.getElementById('planned-end').value = '';
  document.getElementById('implementation-plan').value = '';
  document.getElementById('backout-plan').value = '';
  document.getElementById('validation-plan').value = '';
  
  // Clear selected data
  changeRequestData.requester = null;
  changeRequestData.agent = null;
  changeRequestData.changeType = 'standard';
  changeRequestData.leadTime = '2 business days';
  changeRequestData.plannedStart = '';
  changeRequestData.plannedEnd = '';
  changeRequestData.implementationPlan = '';
  changeRequestData.backoutPlan = '';
  changeRequestData.validationPlan = '';
  changeRequestData.selectedAssets = [];
  changeRequestData.riskAssessment = {
    businessImpact: 0,
    affectedUsers: 0,
    complexity: 0,
    testing: 0,
    rollback: 0,
    totalScore: 0,
    riskLevel: ''
  };
  
  // Clear displays
  clearRequester();
  clearAgent();
  updateSelectedAssetsDisplay();
  
  // Reset risk assessment
  document.querySelectorAll('input[name="business-impact"]').forEach(input => input.checked = false);
  document.querySelectorAll('input[name="affected-users"]').forEach(input => input.checked = false);
  document.querySelectorAll('input[name="complexity"]').forEach(input => input.checked = false);
  document.querySelectorAll('input[name="testing"]').forEach(input => input.checked = false);
  document.querySelectorAll('input[name="rollback"]').forEach(input => input.checked = false);
  
  // Clear risk display
  const riskDisplay = document.getElementById('risk-display');
  if (riskDisplay) {
    riskDisplay.innerHTML = '<span class="badge bg-secondary">Not Assessed</span>';
  }
  
  // Clear any notifications
  clearFieldHighlighting();
  
  // Switch to first tab
  switchTab('details-tab');
  
  console.log('Form reset to initial state');
}

/**
 * Search for services for asset association
 * COMMENTED OUT - Services functionality removed
 */
/*
function searchServices(e) {
  const searchTerm = e.target.value.trim();
  const resultsContainer = document.getElementById('service-search-results');
  
  // Clear and hide results if search term is too short
  if (searchTerm.length < 2) {
    resultsContainer.style.display = 'none';
    return;
  }

  // Show loading indicator
  resultsContainer.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm" role="status"></div> Loading...</div>';
  resultsContainer.style.display = 'block';
  
  // Filter from cached services
  getServices().then(services => {
    const filteredServices = services.filter(service => {
      const serviceName = (service.display_name || service.name || '').toLowerCase();
      const description = (service.description || '').toLowerCase();
      const term = searchTerm.toLowerCase();
      return serviceName.includes(term) || description.includes(term);
    });
    
    // Display service results
    displayServiceResults(filteredServices);
  }).catch(error => {
    console.error('Error searching services:', error);
    resultsContainer.innerHTML = '<div class="text-center p-3 text-danger">Error loading services</div>';
  });
}
*/

/**
 * Display service search results
 * COMMENTED OUT - Services functionality removed
 */
/*
function displayServiceResults(services) {
  const container = document.getElementById('service-search-results');
  if (!container) return;
  
  if (services.length === 0) {
    container.innerHTML = '<div class="text-center p-3">No services found</div>';
    return;
  }
  
  // Sort services by name
  services.sort((a, b) => {
    const nameA = (a.display_name || a.name || '').toLowerCase();
    const nameB = (b.display_name || b.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  // Create results list
  let html = '<div class="list-group">';
  services.forEach(service => {
    const name = service.display_name || service.name || 'Unknown';
    const description = service.description || '';
    const assetTypeId = service.asset_type_id;
    
    // Check if already selected
    const isSelected = changeRequestData.selectedServices.some(s => s.id === service.id);
    
    html += `
      <button type="button" class="list-group-item list-group-item-action ${isSelected ? 'disabled' : ''}" 
              data-id="${service.id}" ${isSelected ? 'disabled' : ''}>
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <div class="fw-bold">${name} ${isSelected ? '<span class="badge bg-success ms-2">Selected</span>' : ''}</div>
            ${description ? `<div class="text-secondary small">${description}</div>` : ''}
          </div>
          <div class="text-end">
            <div class="small text-muted">Type ID: ${assetTypeId}</div>
          </div>
        </div>
      </button>
    `;
  });
  html += '</div>';
  
  container.innerHTML = html;
  
  // Add click handlers
  container.querySelectorAll('.list-group-item:not(.disabled)').forEach(item => {
    item.addEventListener('click', () => {
      const selectedId = parseInt(item.dataset.id);
      const selectedService = services.find(s => s.id === selectedId);
      if (selectedService) {
        selectService(selectedService);
        container.style.display = 'none';
        // Clear search input
        document.getElementById('service-search').value = '';
      }
    });
  });
}
*/

/**
 * Select a service for association
 * COMMENTED OUT - Services functionality removed
 */
/*
function selectService(service) {
  // Check if already selected
  if (changeRequestData.selectedServices.some(s => s.id === service.id)) {
    return;
  }
  
  // Add to selected services
  changeRequestData.selectedServices.push(service);
  
  // Update the display
  updateSelectedServicesDisplay();
  updateAssociationCounts();
  
  console.log('Service selected:', service);
}
*/

/**
 * Update the selected services display
 * COMMENTED OUT - Services functionality removed
 */
/*
function updateSelectedServicesDisplay() {
  const container = document.getElementById('selected-services-list');
  if (!container) return;
  
  
  if (changeRequestData.selectedServices.length === 0) {
    container.innerHTML = '<div class="text-muted">No services selected</div>';
    return;
  }
  
  let html = '<div class="selected-items">';
  changeRequestData.selectedServices.forEach(service => {
    const name = service.display_name || service.name || 'Unknown';
    const description = service.description || '';
    const assetTypeId = service.asset_type_id || 'N/A';
    
    html += `
      <div class="selected-item d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
        <div>
          <div class="fw-bold">${name}</div>
          ${description ? `<div class="text-secondary small">${description}</div>` : ''}
          <div class="text-muted small">Asset Type ID: ${assetTypeId}</div>
        </div>
        <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeService(${service.id})">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
  });
  html += '</div>';
  
  container.innerHTML = html;
  
  // Debug: Log selected services to verify asset_type_id is preserved
  console.log('📋 Selected services with asset_type_id:', changeRequestData.selectedServices.map(s => ({
    id: s.id,
    name: s.display_name || s.name,
    asset_type_id: s.asset_type_id,
    hasAssetTypeId: !!s.asset_type_id
  })));
}

/**
 * Remove a selected service
 */
function removeService(serviceId) {
  changeRequestData.selectedServices = changeRequestData.selectedServices.filter(s => s.id !== serviceId);
  updateSelectedServicesDisplay();
  updateAssociationCounts();
  console.log('Service removed:', serviceId);
}


/**
 * Select an asset for association
 */
function selectAsset(asset) {
  // Check if already selected
  if (changeRequestData.selectedAssets.some(a => a.id === asset.id)) {
    return;
  }
  
  // Add to selected assets
  changeRequestData.selectedAssets.push(asset);
  
  // Update the display
  updateSelectedAssetsDisplay();
  
  console.log('Asset selected:', asset);
}

/**
 * Update the selected assets display
 */
function updateSelectedAssetsDisplay() {
  // Delegate to Asset Association module if available
  if (window.AssetAssociation) {
    window.AssetAssociation.updateSelectedAssetsDisplay();
    return;
  }
  
  // Fallback implementation
  const container = document.getElementById('selected-assets-list');
  if (!container) return;
  
  if (changeRequestData.selectedAssets.length === 0) {
    container.innerHTML = '<div class="text-muted">No assets selected</div>';
    return;
  }
  
  let html = '<div class="selected-items">';
  changeRequestData.selectedAssets.forEach(asset => {
    const name = asset.display_name || asset.name || 'Unknown';
    const description = asset.description || '';
    
    html += `
      <div class="selected-item d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
        <div>
          <div class="fw-bold">${name}</div>
          ${description ? `<div class="text-secondary small">${description}</div>` : ''}
        </div>
        <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeAsset(${asset.id})">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
  });
  html += '</div>';
  
  container.innerHTML = html;
}

/**
 * Remove a selected asset
 */
function removeAsset(assetId) {
  changeRequestData.selectedAssets = changeRequestData.selectedAssets.filter(a => a.id !== assetId);
  updateSelectedAssetsDisplay();
  console.log('Asset removed:', assetId);
}

/**
 * Update association counts
 */
function updateAssociationCounts() {
  const assetsCount = document.getElementById('assets-count');
  
  if (assetsCount) {
    assetsCount.textContent = changeRequestData.selectedAssets.length;
  }
}

/**
 * Validate asset associations and proceed to next step
 */
function validateAssetsAndNext() {
  // Use the Asset Association module validation if available
  if (window.AssetAssociation) {
    const validation = window.AssetAssociation.validateSelection();
    
    if (!validation.isValid) {
      showNotification('error', validation.message);
      return;
    }
    
    // Update main app state with selected assets
    changeRequestData.selectedAssets = window.AssetAssociation.getSelectedAssets();
    console.log(`✅ Asset validation passed. ${changeRequestData.selectedAssets.length} assets selected`);
  } else {
    // Fallback validation if module not available
    if (changeRequestData.selectedAssets.length === 0) {
      showNotification('error', 'Please select at least one asset before proceeding.');
      return;
    }
  }
  
  // Switch to the risk assessment tab
  switchTab('risk-assessment');
}

/**
 * Display asset search results for asset association
 */
function displayAssetAssociationResults() {
  // Asset search display functionality removed - blank slate for new implementation
  console.log('Asset association results display - functionality removed');
}

/**
 * Handle requester selection
 * @param {Object} requester - Selected requester
 */
function selectRequester(requester) {
  console.log('Requester selected:', requester);
  
  // Update the selected requester display
  const selectedDiv = document.getElementById('selected-requester');
  if (selectedDiv) {
    const name = `${requester.first_name || ''} ${requester.last_name || ''}`.trim();
    const email = requester.email || requester.primary_email || '';
    
    // Check if this is an agent acting as a requester
    const isAgentAsRequester = requester._isAgent && requester._canBeRequester;
    const userTypeIndicator = isAgentAsRequester ? 
      '<span class="badge bg-info ms-2">Agent</span>' : '';
    
    selectedDiv.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <strong>${name}${userTypeIndicator}</strong>
          <div class="text-secondary small">${email}</div>
          ${isAgentAsRequester ? '<div class="text-info small">This agent can submit requests</div>' : ''}
        </div>
        <button type="button" class="btn btn-sm btn-outline-danger" onclick="clearRequester()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    selectedDiv.style.display = 'block';
  }
  
  // Clear the search input
  const searchInput = document.getElementById('requester-search');
  if (searchInput) {
    searchInput.value = '';
  }
  
  // Store the selected requester (clean up the agent markers for storage)
  const cleanRequester = { ...requester };
  delete cleanRequester._isAgent;
  delete cleanRequester._canBeRequester;
  changeRequestData.requester = cleanRequester;
}

/**
 * Handle agent selection
 * @param {Object} agent - Selected agent
 */
function selectAgent(agent) {
  console.log('Agent selected:', agent);
  
  // Update the selected agent display
  const selectedDiv = document.getElementById('selected-agent');
  if (selectedDiv) {
    const name = `${agent.first_name || ''} ${agent.last_name || ''}`.trim();
    const email = agent.email || agent.primary_email || '';
    
    selectedDiv.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <strong>${name}</strong>
          <div class="text-secondary small">${email}</div>
        </div>
        <button type="button" class="btn btn-sm btn-outline-danger" onclick="clearAgent()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    selectedDiv.style.display = 'block';
  }
  
  // Clear the search input
  const searchInput = document.getElementById('agent-search');
  if (searchInput) {
    searchInput.value = '';
  }
  
  // Store the selected agent
  changeRequestData.agent = agent;
}

/**
 * Clear selected requester
 */
function clearRequester() {
  const selectedDiv = document.getElementById('selected-requester');
  if (selectedDiv) {
    selectedDiv.style.display = 'none';
  }
  changeRequestData.requester = null;
}

/**
 * Clear selected agent
 */
function clearAgent() {
  const selectedDiv = document.getElementById('selected-agent');
  if (selectedDiv) {
    selectedDiv.style.display = 'none';
  }
  changeRequestData.agent = null;
}

/**
 * Validate details form and proceed to next tab
 */
function validateDetailsAndNext() {
  // Clear any previous highlighting
  clearFieldHighlighting();
  
  let hasErrors = false;
  let firstErrorField = null;
  
  // Basic validation with field highlighting
  if (!changeRequestData.requester) {
    showNotification('error', 'Please select a requester');
    highlightInvalidField('requester-search', 'Requester is required');
    hasErrors = true;
    if (!firstErrorField) firstErrorField = 'requester-search';
  }
  
  if (!changeRequestData.agent) {
    showNotification('error', 'Please select an agent (Technical SME)');
    highlightInvalidField('agent-search', 'Agent is required');
    hasErrors = true;
    if (!firstErrorField) firstErrorField = 'agent-search';
  }
  
  // Get values from form inputs
  const plannedStart = document.getElementById('planned-start').value;
  const plannedEnd = document.getElementById('planned-end').value;
  const implementationPlan = document.getElementById('implementation-plan').value.trim();
  const backoutPlan = document.getElementById('backout-plan').value.trim();
  const validationPlan = document.getElementById('validation-plan').value.trim();
  
  if (!plannedStart) {
    showNotification('error', 'Please select a planned start date and time');
    highlightInvalidField('planned-start', 'Start date and time is required');
    hasErrors = true;
    if (!firstErrorField) firstErrorField = 'planned-start';
  }
  
  if (!plannedEnd) {
    showNotification('error', 'Please select a planned end date and time');
    highlightInvalidField('planned-end', 'End date and time is required');
    hasErrors = true;
    if (!firstErrorField) firstErrorField = 'planned-end';
  }
  
  if (!implementationPlan) {
    showNotification('error', 'Please provide an implementation plan');
    highlightInvalidField('implementation-plan', 'Implementation plan is required');
    hasErrors = true;
    if (!firstErrorField) firstErrorField = 'implementation-plan';
  }
  
  if (!backoutPlan) {
    showNotification('error', 'Please provide a backout (recovery) plan');
    highlightInvalidField('backout-plan', 'Backout plan is required');
    hasErrors = true;
    if (!firstErrorField) firstErrorField = 'backout-plan';
  }
  
  if (!validationPlan) {
    showNotification('error', 'Please provide a validation plan');
    highlightInvalidField('validation-plan', 'Validation plan is required');
    hasErrors = true;
    if (!firstErrorField) firstErrorField = 'validation-plan';
  }
  
  // If there are validation errors, scroll to the first error field
  if (hasErrors) {
    if (firstErrorField) {
      setTimeout(() => {
        const field = document.getElementById(firstErrorField);
        if (field) {
          field.focus();
        }
      }, 100);
    }
    return;
  }
  
  // Update change request data
  changeRequestData.plannedStart = plannedStart;
  changeRequestData.plannedEnd = plannedEnd;
  changeRequestData.implementationPlan = implementationPlan;
  changeRequestData.backoutPlan = backoutPlan;
  changeRequestData.validationPlan = validationPlan;
  
  // Validate start and end dates
  const startDate = new Date(plannedStart);
  const endDate = new Date(plannedEnd);
  
  if (endDate <= startDate) {
    showNotification('error', 'Planned end date must be after the planned start date');
    highlightInvalidField('planned-end', 'End date must be after start date');
    highlightInvalidField('planned-start', 'Start date must be before end date');
    return;
  }
  
  // Switch to asset association tab
  switchTab('asset-association');
}

/**
 * Update risk selection when radio buttons change
 */
function updateRiskSelection(e) {
  const question = e.target.name;
  const value = parseInt(e.target.value);
  
  // Map questions to the risk assessment object properties
  const questionMapping = {
    'business-impact': 'businessImpact',
    'affected-users': 'affectedUsers',
    'complexity': 'complexity',
    'testing': 'testing',
    'rollback': 'rollback'
  };
  
  if (questionMapping[question]) {
    changeRequestData.riskAssessment[questionMapping[question]] = value;
    console.log(`Risk ${question} updated to ${value}`);
  }
}

/**
 * Calculate risk score and display results
 */
function calculateRisk() {
  // Clear any previous highlighting
  clearFieldHighlighting();
  
  // Check if all questions are answered
  const riskKeys = ['businessImpact', 'affectedUsers', 'complexity', 'testing', 'rollback'];
  const unansweredQuestions = riskKeys.filter(key => changeRequestData.riskAssessment[key] === 0);
  
  if (unansweredQuestions.length > 0) {
    showNotification('error', 'Please answer all risk assessment questions before calculating the risk score');
    
    // Highlight the first unanswered question
    const questionMapping = {
      'businessImpact': 'business-impact',
      'affectedUsers': 'affected-users',
      'complexity': 'complexity',
      'testing': 'testing',
      'rollback': 'rollback'
    };
    
    // Find the first unanswered question and highlight it
    const firstUnanswered = unansweredQuestions[0];
    const questionName = questionMapping[firstUnanswered];
    if (questionName) {
      // Find the question container and highlight it
      const questionRadios = document.querySelectorAll(`input[name="${questionName}"]`);
      if (questionRadios.length > 0) {
        const questionContainer = questionRadios[0].closest('.risk-question');
        if (questionContainer) {
          questionContainer.classList.add('border-danger');
          questionContainer.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
          
          // Remove highlighting after 5 seconds
          setTimeout(() => {
            questionContainer.classList.remove('border-danger');
          }, 5000);
        }
      }
    }
    return;
  }
  
  // Calculate total risk score
  const totalScore = riskKeys.reduce((sum, key) => sum + changeRequestData.riskAssessment[key], 0);
  changeRequestData.riskAssessment.totalScore = totalScore;
  
  // Determine risk level and badge color
  let riskLevel, riskExplanation;
  if (totalScore <= 7) {
    riskLevel = 'Low';
    riskExplanation = 'This change poses minimal risk to business operations and is likely to be implemented successfully.';
  } else if (totalScore <= 11) {
    riskLevel = 'Medium';
    riskExplanation = 'This change poses moderate risk to business operations. Consider additional testing or verification steps.';
  } else {
    riskLevel = 'High';
    riskExplanation = 'This change poses significant risk to business operations. A detailed review is recommended before proceeding.';
  }
  changeRequestData.riskAssessment.riskLevel = riskLevel;
  
  // Display results
  const scoreElement = document.getElementById('risk-score-value');
  if (scoreElement) {
    scoreElement.textContent = totalScore;
  }
  
  const riskLevelElement = document.getElementById('risk-level-value');
  if (riskLevelElement) {
    riskLevelElement.textContent = riskLevel;
    riskLevelElement.className = `badge ${getRiskBadgeClass(riskLevel)}`;
  }
  
  const explanationElement = document.getElementById('risk-explanation');
  if (explanationElement) {
    explanationElement.textContent = riskExplanation;
  }
  
  const resultElement = document.getElementById('risk-result');
  if (resultElement) {
    resultElement.classList.remove('hidden');
    resultElement.style.display = 'block';
  }
  
  console.log(`Risk calculated: Score ${totalScore}, Level ${riskLevel}`);
}

/**
 * Get CSS class for risk level badge
 */
function getRiskBadgeClass(riskLevel) {
  switch (riskLevel.toLowerCase()) {
    case 'low':
      return 'bg-success';
    case 'medium':
      return 'bg-warning';
    case 'high':
      return 'bg-danger';
    default:
      return 'bg-secondary';
  }
}

/**
 * Validate risk assessment and proceed to submission
 */
function validateRiskAndNext() {
  if (changeRequestData.riskAssessment.totalScore === 0) {
    showNotification('error', 'Please calculate the risk score before proceeding');
    return;
  }
  
  // Show submission summary modal directly
  showSubmissionSummary();
}

/**
 * Switch to a specific tab
 */
function switchTab(tabId) {
  // Hide all tab panes
  const allTabs = document.querySelectorAll('.tab-pane');
  allTabs.forEach(tab => {
    tab.classList.remove('show', 'active');
  });
  
  // Remove active class from all nav links
  const allNavLinks = document.querySelectorAll('.nav-link');
  allNavLinks.forEach(link => {
    link.classList.remove('active');
  });
  
  // Show the target tab
  const targetTab = document.getElementById(tabId);
  if (targetTab) {
    targetTab.classList.add('show', 'active');
  }
  
  // Activate the corresponding nav link
  const targetNavLink = document.querySelector(`[data-bs-target="#${tabId}"]`);
  if (targetNavLink) {
    targetNavLink.classList.add('active');
  }
  
  console.log(`Switched to tab: ${tabId}`);
}

/**
 * Show notification to user with auto-scroll to top
 */
function showNotification(type, message, scrollToTop = true) {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
  notification.style.zIndex = '9999';
  notification.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  // Insert at top of page
  const container = document.querySelector('.fw-widget-wrapper') || document.querySelector('.container') || document.body;
  container.insertBefore(notification, container.firstChild);
  
  // Scroll to top to ensure notification is visible
  if (scrollToTop) {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
  
  console.log(`Notification (${type}): ${message}`);
}

/**
 * Highlight an invalid form field
 */
function highlightInvalidField(fieldId, message = '') {
  const field = document.getElementById(fieldId);
  if (!field) return;
  
  // Add error styling
  field.classList.add('is-invalid');
  
  // Remove existing error message if any
  const existingError = field.parentNode.querySelector('.invalid-feedback');
  if (existingError) {
    existingError.remove();
  }
  
  // Add error message if provided
  if (message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'invalid-feedback';
    errorDiv.textContent = message;
    field.parentNode.appendChild(errorDiv);
  }
  
  // Scroll to the field
  field.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });
  
  // Remove highlighting after 5 seconds
  setTimeout(() => {
    field.classList.remove('is-invalid');
    const errorMessage = field.parentNode.querySelector('.invalid-feedback');
    if (errorMessage) {
      errorMessage.remove();
    }
  }, 5000);
}

/**
 * Clear all field highlighting
 */
function clearFieldHighlighting() {
  // Remove all is-invalid classes
  document.querySelectorAll('.is-invalid').forEach(field => {
    field.classList.remove('is-invalid');
  });
  
  // Remove all error messages
  document.querySelectorAll('.invalid-feedback').forEach(error => {
    error.remove();
  });
}

/**
 * Show submission summary in modal
 */
function showSubmissionSummary() {
  const summaryContent = document.getElementById('summary-content');
  if (!summaryContent) return;

  // Format the planned dates
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get risk assessment details
  const getRiskDetails = () => {
    const { riskAssessment } = changeRequestData;
    const questions = [
      { key: 'businessImpact', label: 'Business Impact', values: ['Low', 'Medium', 'High'] },
      { key: 'affectedUsers', label: 'Affected Users', values: ['Few (<50)', 'Some (50-200)', 'Many (>200)'] },
      { key: 'complexity', label: 'Complexity', values: ['Simple', 'Moderate', 'Complex'] },
      { key: 'testing', label: 'Testing Level', values: ['Comprehensive', 'Adequate', 'Limited'] },
      { key: 'rollback', label: 'Rollback Plan', values: ['Yes - Detailed', 'Partial', 'No'] }
    ];

    return questions.map(q => {
      const value = riskAssessment[q.key];
      const label = value > 0 ? q.values[value - 1] : 'Not answered';
      return `<li><strong>${q.label}:</strong> ${label}</li>`;
    }).join('');
  };

  // Get asset associations summary
  const getAssetAssociations = () => {
    let html = '';
    
    if (changeRequestData.selectedAssets.length > 0) {
      html += `
        <div class="mb-3">
          <strong>Associated Assets (${changeRequestData.selectedAssets.length}):</strong>
          <ul class="mt-2 mb-0">
            ${changeRequestData.selectedAssets.map(asset => 
              `<li>${asset.display_name || asset.name || 'Unknown'}</li>`
            ).join('')}
          </ul>
        </div>
      `;
    }
    
    if (changeRequestData.selectedAssets.length === 0) {
      html = '<div class="text-muted">No assets have been associated with this change.</div>';
    }
    
    return html;
  };

  // Create the summary HTML
  summaryContent.innerHTML = `
    <div class="row">
      <div class="col-12">
        <div class="alert alert-info">
          <i class="fas fa-info-circle me-2"></i>
          Please review all details before submitting your change request to Freshservice.
        </div>
      </div>
    </div>

    <div class="row">
      <!-- Basic Information -->
      <div class="col-md-6">
        <div class="card mb-3">
          <div class="card-header">
            <h6 class="mb-0"><i class="fas fa-user me-2"></i>Basic Information</h6>
          </div>
          <div class="card-body">
            <div class="mb-2">
              <strong>Requester:</strong><br>
              ${changeRequestData.requester ? 
                `${changeRequestData.requester.first_name || ''} ${changeRequestData.requester.last_name || ''}`.trim() + 
                `<br><small class="text-muted">${changeRequestData.requester.email || ''}</small>` 
                : 'Not specified'}
            </div>
            <div class="mb-2">
              <strong>Agent (Technical SME):</strong><br>
              ${changeRequestData.agent ? 
                `${changeRequestData.agent.first_name || ''} ${changeRequestData.agent.last_name || ''}`.trim() + 
                `<br><small class="text-muted">${changeRequestData.agent.email || ''}</small>` 
                : 'Not specified'}
            </div>
            <div class="mb-2">
              <strong>Change Type:</strong> <span class="badge bg-primary">${changeRequestData.changeType || 'Standard'}</span>
            </div>
            <div>
              <strong>Lead Time:</strong> ${changeRequestData.leadTime || '2 business days'}
            </div>
          </div>
        </div>
      </div>

      <!-- Timing -->
      <div class="col-md-6">
        <div class="card mb-3">
          <div class="card-header">
            <h6 class="mb-0"><i class="fas fa-clock me-2"></i>Timing</h6>
          </div>
          <div class="card-body">
            <div class="mb-2">
              <strong>Planned Start:</strong><br>
              <small>${formatDate(changeRequestData.plannedStart)}</small>
            </div>
            <div>
              <strong>Planned End:</strong><br>
              <small>${formatDate(changeRequestData.plannedEnd)}</small>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <!-- Implementation Details -->
      <div class="col-12">
        <div class="card mb-3">
          <div class="card-header">
            <h6 class="mb-0"><i class="fas fa-cogs me-2"></i>Implementation Details</h6>
          </div>
          <div class="card-body">
            <div class="mb-3">
              <strong>Implementation Plan:</strong>
              <div class="border rounded p-2 mt-1 bg-light">
                <small>${changeRequestData.implementationPlan || 'Not specified'}</small>
              </div>
            </div>
            <div class="mb-3">
              <strong>Backout (Recovery) Plan:</strong>
              <div class="border rounded p-2 mt-1 bg-light">
                <small>${changeRequestData.backoutPlan || 'Not specified'}</small>
              </div>
            </div>
            <div>
              <strong>Validation Plan:</strong>
              <div class="border rounded p-2 mt-1 bg-light">
                <small>${changeRequestData.validationPlan || 'Not specified'}</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <!-- Asset Associations -->
      <div class="col-md-6">
        <div class="card mb-3">
          <div class="card-header">
            <h6 class="mb-0"><i class="fas fa-link me-2"></i>Asset Associations</h6>
          </div>
          <div class="card-body">
            ${getAssetAssociations()}
          </div>
        </div>
      </div>

      <!-- Risk Assessment -->
      <div class="col-md-6">
        <div class="card mb-3">
          <div class="card-header">
            <h6 class="mb-0"><i class="fas fa-exclamation-triangle me-2"></i>Risk Assessment</h6>
          </div>
          <div class="card-body">
            <div class="row align-items-center mb-3">
              <div class="col-md-6">
                <div class="text-center">
                  <div class="display-4 fw-bold text-primary">${changeRequestData.riskAssessment.totalScore}</div>
                  <small class="text-muted">Risk Score</small>
                </div>
              </div>
              <div class="col-md-6">
                <div class="text-center">
                  <span class="badge ${getRiskBadgeClass(changeRequestData.riskAssessment.riskLevel)} fs-6">
                    ${changeRequestData.riskAssessment.riskLevel} Risk
                  </span>
                </div>
              </div>
            </div>
            <div class="mb-3">
              <strong>Risk Assessment Details:</strong>
              <ul class="mt-2 mb-0">
                ${getRiskDetails()}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-12">
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-circle me-2"></i>
          <strong>Important:</strong> Once submitted, this change request will be created in Freshservice and assigned for review according to your organization's change management process.
        </div>
      </div>
    </div>
  `;

  // Show the modal
  const modal = new bootstrap.Modal(document.getElementById('confirmation-modal'));
  modal.show();
}

/**
 * Get safe API limits based on plan settings
 * @returns {Promise<Object>} - API limits configuration
 */
async function getSafeApiLimits() {
  try {
    const params = await getInstallationParams();
    
    // Default safe limits for different plan types
    const defaultLimits = {
      listRequestersPageLimit: 3,  // Fetch up to 3 pages of requesters (300 users max)
      listAgentsPageLimit: 2,      // Fetch up to 2 pages of agents (200 agents max)
      searchLimit: 50,             // Limit search results
      cacheTimeout: 30 * 60 * 1000 // 30 minutes cache
    };
    
    // You can adjust these based on your Freshservice plan
    // For higher tier plans, you might want to increase these limits
    const planBasedLimits = {
      'starter': {
        listRequestersPageLimit: 1,
        listAgentsPageLimit: 1,
        searchLimit: 25
      },
      'growth': {
        listRequestersPageLimit: 2,
        listAgentsPageLimit: 2,
        searchLimit: 50
      },
      'pro': {
        listRequestersPageLimit: 3,
        listAgentsPageLimit: 3,
        searchLimit: 75
      },
      'enterprise': {
        listRequestersPageLimit: 5,
        listAgentsPageLimit: 5,
        searchLimit: 100
      }
    };
    
    // Try to detect plan or use defaults
    const planType = params.plan_type || 'growth'; // Default to growth plan
    const limits = planBasedLimits[planType] || defaultLimits;
    
    console.log(`Using API limits for plan '${planType}':`, limits);
    return { ...defaultLimits, ...limits };
    
  } catch (error) {
    console.error('Error getting API limits, using defaults:', error);
    return {
      listRequestersPageLimit: 2,
      listAgentsPageLimit: 2,
      searchLimit: 50,
      cacheTimeout: 30 * 60 * 1000
    };
  }
}

/**
 * Fetch all users (both requesters and agents) with rate limiting
 */

/**
 * Perform the actual API search for requesters
 * @param {string} searchTerm - The search term
 * @param {boolean} isRefresh - Whether this is a cache refresh operation
 */
// eslint-disable-next-line no-unused-vars
function performRequesterSearch(searchTerm, isRefresh = false) {
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
  const userQuery = encodeURIComponent(`~[first_name|last_name|email]:'${searchTerm}'`);
  
  console.log(`${isRefresh ? 'Refreshing' : 'Performing'} requester search with query:`, userQuery);
  
  // Only show loading indicator for non-refresh operations
  if (!isRefresh) {
    const resultsContainer = document.getElementById('requester-results');
    if (resultsContainer) {
      resultsContainer.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm" role="status"></div> Loading...</div>';
      resultsContainer.style.display = 'block';
    }
  }
  
  // Function to load requester results from a specific page
  function loadRequestersPage(page = 1, allResults = []) {
    // Use invokeTemplate with path suffix to add query parameter
    const requestUrl = `?query=${userQuery}&page=${page}&per_page=30`;
    console.log('Requester API URL:', requestUrl);
    
    window.client.request.invokeTemplate("getRequesters", {
      path_suffix: requestUrl
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
        const response = JSON.parse(data.response || '{"requesters":[]}');
        const requesters = response && response.requesters ? response.requesters : [];
        console.log(`Requester search returned ${requesters.length} results`);
        
        // Manual filtering if the API filtering isn't working
        const filteredRequesters = requesters.filter(requester => {
          const fullName = `${requester.first_name || ''} ${requester.last_name || ''}`.toLowerCase();
          const email = (requester.email || '').toLowerCase();
          const term = searchTerm.toLowerCase();
          return fullName.includes(term) || email.includes(term);
        });
        
        console.log(`Manual filtering returned ${filteredRequesters.length} requester results`);
        
        // Combine with previous results
        const combinedResults = [...allResults, ...filteredRequesters];
        
        // Now also search agents since they can be requesters too
        loadAgentsAsRequesters(page, combinedResults);
        
      } catch (error) {
        console.error('Error parsing requester response:', error);
        // Still try to load agents
        loadAgentsAsRequesters(page, allResults);
      }
    })
    .catch(function(error) {
      console.error('Requester API request failed:', error);
      // Still try to load agents
      loadAgentsAsRequesters(page, allResults);
    });
  }
  
  // Function to also search agents as potential requesters
  function loadAgentsAsRequesters(page = 1, existingResults = []) {
    const requestUrl = `?query=${userQuery}&page=${page}&per_page=30`;
    console.log('Agent-as-requester API URL:', requestUrl);
    
    window.client.request.invokeTemplate("getAgents", {
      path_suffix: requestUrl
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
        
        // Manual filtering for agents
        const filteredAgents = agents.filter(agent => {
          const fullName = `${agent.first_name || ''} ${agent.last_name || ''}`.toLowerCase();
          const email = (agent.email || '').toLowerCase();
          const term = searchTerm.toLowerCase();
          return fullName.includes(term) || email.includes(term);
        });
        
        console.log(`Manual filtering returned ${filteredAgents.length} agent results for requesters`);
        
        // Mark agents as potential requesters and avoid duplicates
        const agentsAsRequesters = filteredAgents.map(agent => ({
          ...agent,
          _isAgent: true, // Mark as agent so we can show this in UI
          _canBeRequester: true
        }));
        
        // Remove duplicates based on email
        const existingEmails = new Set(existingResults.map(r => r.email));
        const uniqueAgents = agentsAsRequesters.filter(agent => !existingEmails.has(agent.email));
        
        // Combine all results
        const allResults = [...existingResults, ...uniqueAgents];
        
        // Check if we should load more pages (limit to 2 pages for performance)
        if ((filteredAgents.length === 30 || existingResults.length < 30) && page < 2) {
          // Load next page
          (async function() {
              const params = await getInstallationParams();
              const paginationDelay = params.paginationDelay || DEFAULT_PAGINATION_DELAY;
              
              updateLoadingMessage('requester-results', `Loading more results... (page ${page + 1})`);
              setTimeout(() => {
                loadRequestersPage(page + 1, allResults);
              }, paginationDelay);
          })().catch(err => {
              console.error('Error getting pagination delay:', err);
              // Default delay if error
              setTimeout(() => {
                loadRequestersPage(page + 1, allResults);
              }, DEFAULT_PAGINATION_DELAY);
          });
        } else {
          // Complete the search with all results
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
    const filterQuery = configuredIds.map(id => `asset_type_id: ${id}`).join(' OR ');
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
  
  // Get the currently selected change type (default is 'standard')
  const currentChangeType = changeTypeSelect.value || 'standard';
  
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
