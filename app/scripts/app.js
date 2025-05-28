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
    ASSET_TYPES: 'asset_types_cache',
    SERVICES: 'services_cache'
  },
  TIMEOUTS: {
    ASSET_TYPES: 20 * 60 * 1000, // 20 minutes
    SERVICES: 10 * 60 * 1000     // 10 minutes
  }
};

// Cache storage
const cache = {
  asset_types: {
    data: {},
    timestamp: 0
  },
  services: {
    data: [],
    timestamp: 0
  }
};

/**
 * Fetch and cache all asset types
 * @returns {Promise<Object>} Cached asset types
 */
async function fetchAndCacheAssetTypes() {
  console.log('Fetching all asset types...');
  
  // Check for client availability
  if (!window.client || !window.client.request) {
    console.error('Client not available for asset types fetch');
    throw new Error('Client not initialized');
  }

  try {
    const response = await window.client.request.invokeTemplate("getAssetTypes", {
      path_suffix: "?per_page=100"
    });

    if (!response || !response.response) {
      throw new Error('Invalid response from asset types API');
    }

    const data = JSON.parse(response.response);
    const assetTypes = data.asset_types || [];
    
    // Transform into id -> name map
    const assetTypeMap = {};
    assetTypes.forEach(type => {
      if (type.id && type.name) {
        assetTypeMap[type.id] = {
          name: type.name,
          description: type.description || ''
        };
      }
    });

    // Update cache
    cache.asset_types = {
      data: assetTypeMap,
      timestamp: Date.now()
    };

    return assetTypeMap;
  } catch (error) {
    console.error('Error fetching asset types:', error);
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
 * @returns {Promise<Array>} Cached services
 */
async function fetchAndCacheServices() {
  console.log('Fetching services...');
  
  // Check for client availability
  if (!window.client || !window.client.request) {
    console.error('Client not available for services fetch');
    throw new Error('Client not initialized');
  }

  try {
    // Get configured asset type IDs
    const assetTypeIds = await getConfiguredAssetTypeIds();
    if (assetTypeIds.length === 0) {
      throw new Error('No configured asset types found');
    }

    // Build filter query
    const filter = assetTypeIds.map(id => `asset_type_id:${id}`).join(' OR ');
    const query = `?query="${encodeURIComponent(filter)}"&per_page=100`;

    // Fetch services
    const response = await window.client.request.invokeTemplate("getAssets", {
      path_suffix: query
    });

    if (!response || !response.response) {
      throw new Error('Invalid response from assets API');
    }

    const data = JSON.parse(response.response);
    const services = data.assets || [];

    // Update cache
    cache.services = {
      data: services,
      timestamp: Date.now()
    };

    return services;
  } catch (error) {
    console.error('Error fetching services:', error);
    throw error;
  }
}

/**
 * Get services (filtered from assets by specific service asset type IDs)
 */
async function getServices(forceRefresh = false) {
  try {
    console.log('🔍 getServices called with forceRefresh:', forceRefresh);
    
    // Check for cached services first (unless forcing refresh)
    if (!forceRefresh) {
      const cachedServices = await getCachedServices();
      if (cachedServices && cachedServices.length > 0) {
        console.log(`Using cached services: ${cachedServices.length} services`);
        // Debug: show first service structure
        if (cachedServices[0]) {
          console.log('📋 Sample cached service structure:', {
            id: cachedServices[0].id,
            name: cachedServices[0].name || cachedServices[0].display_name,
            asset_type_id: cachedServices[0].asset_type_id,
            keys: Object.keys(cachedServices[0])
          });
        }
        return cachedServices;
      }
    } else {
      console.log('Force refresh requested, clearing services cache');
      await clearServicesCache();
    }

    console.log('Fetching services from API using specific asset type IDs...');
    
    // Get installation parameters to check for custom service asset type IDs
    const params = await getInstallationParams();
    
    // Define the default service asset type IDs (can be overridden in installation params)
    const defaultServiceAssetTypeIds = [
      37000374722,
      37000374723, 
      37000374726,
      37000374730
    ];
    
    // Allow configuration override via installation parameters
    const serviceAssetTypeIds = params.serviceAssetTypeIds || defaultServiceAssetTypeIds;
    
    console.log('🎯 Service asset type IDs:', serviceAssetTypeIds);
    
    if (!Array.isArray(serviceAssetTypeIds) || serviceAssetTypeIds.length === 0) {
      console.warn('No service asset type IDs configured');
      await cacheServices([]);
      return [];
    }
    
    // Build the filter query using the specific asset type IDs
    const filterQuery = serviceAssetTypeIds
      .map(id => `asset_type_id:${id}`)
      .join(' OR ');
    
    console.log('📝 Service filter query:', filterQuery);
    
    // Fetch services using the filter - try different URL formats
    let requestUrl;
    let response;
    
    // Try the filter approach first
    try {
      requestUrl = `?filter="${filterQuery}"&per_page=100`;
      console.log('🌐 API request URL (filter approach):', requestUrl);
      
      response = await window.client.request.invokeTemplate("getAssets", {
        path_suffix: requestUrl
      });
      
      if (!response || !response.response) {
        throw new Error('No response from filter approach');
      }
      
      const data = JSON.parse(response.response);
      let services = data.assets || [];
      
      // If we got services but they don't match our filter, the filter didn't work
      const unmatchedServices = services.filter(service => 
        !serviceAssetTypeIds.includes(service.asset_type_id)
      );
      
      if (unmatchedServices.length > 0) {
        console.warn(`⚠️ Filter returned ${unmatchedServices.length} services that don't match our criteria. Trying manual filtering...`);
        console.log('🔍 Unmatched services:', unmatchedServices.slice(0, 3).map(s => ({
          name: s.display_name || s.name,
          asset_type_id: s.asset_type_id
        })));
        
        // Fall back to getting all assets and filtering manually
        throw new Error('Filter approach returned unmatched services');
      }
      
      console.log(`✅ Filter approach worked! Found ${services.length} services from asset type IDs: ${serviceAssetTypeIds.join(', ')}`);
      
    } catch (filterError) {
      console.warn('❌ Filter approach failed or returned wrong results, trying manual filtering:', filterError.message);
      
      // Fallback: Get all assets and filter manually
      try {
        requestUrl = `?per_page=100`;
        console.log('🌐 API request URL (get all approach):', requestUrl);
        
        response = await window.client.request.invokeTemplate("getAssets", {
          path_suffix: requestUrl
        });
        
        if (!response || !response.response) {
          throw new Error('No response from get all approach');
        }
        
        const data = JSON.parse(response.response);
        const allAssets = data.assets || [];
        
        console.log(`📥 Retrieved ${allAssets.length} total assets, filtering by asset type IDs...`);
        
        // Manual filtering
        const services = allAssets.filter(asset => 
          serviceAssetTypeIds.includes(asset.asset_type_id)
        );
        
        console.log(`✅ Manual filtering found ${services.length} services from asset type IDs: ${serviceAssetTypeIds.join(', ')}`);
        
        // Show which asset types we found
        const foundTypes = [...new Set(services.map(s => s.asset_type_id))];
        console.log('🔍 Found asset types:', foundTypes);
        
        response = { response: JSON.stringify({ assets: services }) };
        
      } catch (manualError) {
        console.error('❌ Both filter and manual approaches failed:', manualError);
        throw manualError;
      }
    }
    
    // Process the response (either from filter or manual filtering)
    const data = JSON.parse(response.response);
    const services = data.assets || [];
    
    console.log(`✅ Final result: ${services.length} services from asset type IDs: ${serviceAssetTypeIds.join(', ')}`);
    
    // Debug: show first service structure from API
    if (services[0]) {
      console.log('📋 Sample API service structure:', {
        id: services[0].id,
        name: services[0].name || services[0].display_name,
        asset_type_id: services[0].asset_type_id,
        keys: Object.keys(services[0])
      });
      
      // Show breakdown by asset type
      const typeBreakdown = {};
      services.forEach(service => {
        const typeId = service.asset_type_id;
        if (!typeBreakdown[typeId]) {
          typeBreakdown[typeId] = 0;
        }
        typeBreakdown[typeId]++;
      });
      console.log('📊 Services by asset type ID:', typeBreakdown);
    }
    
    // Cache the services
    await cacheServices(services);
    
    return services;
    
  } catch (error) {
    console.error('❌ Error fetching services:', error);
    
    // Return empty array on error but don't cache the error
    return [];
  }
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
async function getCachedServices() {
  try {
    const params = await getInstallationParams();
    const cacheKey = `services_cache_${params.domain || 'default'}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      const data = JSON.parse(cached);
      const now = Date.now();
      
      // Check version first - invalidate if using old logic
      const expectedVersion = 'v2_specific_asset_types';
      if (data.version !== expectedVersion) {
        console.log(`Cache version mismatch. Expected: ${expectedVersion}, Found: ${data.version || 'v1'}. Clearing cache.`);
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      // Check if cache is still valid (24 hours)
      if (now - data.timestamp < 24 * 60 * 60 * 1000) {
        console.log(`Using cached services (version ${data.version}): ${data.services.length} services`);
        return data.services;
      } else {
        // Clear expired cache
        console.log('Services cache expired, clearing');
        localStorage.removeItem(cacheKey);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting cached services:', error);
    return null;
  }
}

/**
 * Cache services data
 */
async function cacheServices(services) {
  try {
    const params = await getInstallationParams();
    const cacheKey = `services_cache_${params.domain || 'default'}`;
    
    const cacheData = {
      services: services,
      timestamp: Date.now(),
      version: 'v2_specific_asset_types' // Version to track cache format changes
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log(`Cached ${services.length} services with version ${cacheData.version}`);
  } catch (error) {
    console.error('Error caching services:', error);
  }
}

/**
 * Clear services cache (useful when changing service logic)
 */
async function clearServicesCache() {
  try {
    const params = await getInstallationParams();
    const cacheKey = `services_cache_${params.domain || 'default'}`;
    localStorage.removeItem(cacheKey);
    console.log('Services cache cleared');
  } catch (error) {
    console.error('Error clearing services cache:', error);
  }
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
  selectedServices: [],
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
    
    // Clear asset search cache
    if (window.client.db.set && STORAGE_KEYS.ASSET_CACHE) {
      await window.client.db.set(STORAGE_KEYS.ASSET_CACHE, {});
      console.log('✅ Cleared asset search cache');
    }
    
    // Clear in-memory caches
    searchCache.assets = {};
    searchCache.assetsByType = {};
    
    // Clear asset type configuration cache if it exists
    if (typeof assetTypeCache !== 'undefined') {
      assetTypeCache.byId = {};
      assetTypeCache.list = [];
      assetTypeCache.timestamp = 0;
      assetTypeCache.types = {};
    }
    
    console.log('✅ Cleared in-memory caches');
    
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
  // Since manager IDs are just user IDs, use the user cache/lookup
  return await getUserName(managerId);
}

/**
 * Initialize the services dropdown with software services
 */
async function initializeServicesDropdown() {
  try {
    console.log('Initializing services dropdown...');
    
    const services = await getServices();
    const dropdown = document.getElementById('service-select');
    if (!dropdown) {
      console.error('Service select dropdown not found');
      return;
    }
    
    // Clear existing options
    dropdown.innerHTML = '<option value="">Select a service...</option>';

    if (services.length === 0) {
      dropdown.innerHTML = '<option value="">No software services available</option>';
      dropdown.disabled = true;
      return;
    }
        
    // Sort services by name
    services.sort((a, b) => {
      const nameA = (a.display_name || a.name || '').toLowerCase();
      const nameB = (b.display_name || b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // Add options for each service
    services.forEach(service => {
      const option = document.createElement('option');
      option.value = service.id;
      option.textContent = service.display_name || service.name || 'Unknown Service';
      option.dataset.description = service.description || '';
      // Store the complete service data as JSON for later retrieval
      option.dataset.serviceData = JSON.stringify(service);
      dropdown.appendChild(option);
    });

    // Enable the dropdown
    dropdown.disabled = false;
    
    console.log(`Services dropdown initialized with ${services.length} services`);
    
    // Debug: Log first few services to verify asset_type_id is preserved
    if (services.length > 0) {
      console.log('📋 Sample services in dropdown:', services.slice(0, 3).map(s => ({
        id: s.id,
        name: s.display_name || s.name,
        asset_type_id: s.asset_type_id,
        hasAssetTypeId: !!s.asset_type_id
      })));
    }
  } catch (error) {
    console.error('Error initializing services dropdown:', error);
    const dropdown = document.getElementById('service-select');
    if (dropdown) {
      dropdown.innerHTML = '<option value="">Error loading services</option>';
      dropdown.disabled = true;
    }
  }
}

/**
 * Handle service selection from dropdown
 * @param {Event} event Change event from dropdown
 */
function handleServiceSelection(event) {
  const serviceId = event.target.value;
  
  if (!serviceId) {
    // No service selected, clear any previous selection display
    return;
  }

  // Find the selected service data from the dropdown option
  const selectedOption = event.target.selectedOptions[0];
  const serviceDataJson = selectedOption.dataset.serviceData;
  
  let service;
  
  if (serviceDataJson) {
    try {
      // Parse the complete service data stored in the option
      service = JSON.parse(serviceDataJson);
      console.log('📋 Retrieved complete service data from dropdown:', {
        id: service.id,
        name: service.display_name || service.name,
        asset_type_id: service.asset_type_id,
        description: service.description,
        hasAssetTypeId: !!service.asset_type_id
      });
    } catch (error) {
      console.error('Error parsing service data:', error);
      // Fallback to basic service object
      service = {
        id: parseInt(serviceId),
        name: selectedOption.textContent,
        display_name: selectedOption.textContent,
        description: selectedOption.dataset.description || ''
      };
    }
  } else {
    console.warn('No service data found in dropdown option, using fallback');
    // Fallback to basic service object
    service = {
      id: parseInt(serviceId),
      name: selectedOption.textContent,
      display_name: selectedOption.textContent,
      description: selectedOption.dataset.description || ''
    };
  }

  // Add to selected services if not already selected
  if (!changeRequestData.selectedServices.some(s => s.id === service.id)) {
    changeRequestData.selectedServices.push(service);
    
    // Update the display
    updateSelectedServicesDisplay();
    updateAssociationCounts();
    
    console.log('✅ Service selected and stored with complete data:', service);
  } else {
    console.log('⚠️ Service already selected:', service.id);
  }

  // Reset dropdown to placeholder
  event.target.value = '';
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
 * Initialize the Freshworks app
 * @returns {Promise<void>}
 */
async function initializeApp() {
  try {
    console.log('Starting app initialization...');
    
    // Client should already be available from app.initialized()
    if (!window.client) {
      throw new Error('Client not available after initialization');
    }
    
    // Initialize form fields first
    populateFormFields();
    
    // Initialize caches and services dropdown
    try {
      await Promise.all([
        getAssetTypes(),
        getServices(true) // Force refresh to ensure we get fresh services with new logic
      ]);
      console.log('Caches initialized successfully');
      await initializeServicesDropdown();
    } catch (error) {
      console.error('Error initializing caches:', error);
      const dropdown = document.getElementById('service-select');
      if (dropdown) {
        dropdown.innerHTML = '<option value="">Error loading services</option>';
        dropdown.disabled = true;
      }
    }

    // Set up event listeners
    setupEventListeners();

    // Initialize change type, lead time, and tooltip on page load
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

function populateFormFields() {
  // Create services section
  const servicesSection = document.createElement('div');
  servicesSection.className = 'form-group mb-4';
  servicesSection.innerHTML = `
    <label for="service-select" class="form-label">Select Service</label>
    <select id="service-select" class="form-select" disabled>
      <option value="">Loading services...</option>
    </select>
    <div id="selected-service-details" class="mt-3" style="display: none;">
      <div class="card">
        <div class="card-body">
          <h5 class="card-title" id="selected-service-name"></h5>
          <h6 class="card-subtitle mb-2 text-muted" id="selected-service-type"></h6>
          <p class="card-text" id="selected-service-description"></p>
        </div>
      </div>
    </div>
  `;

  // Create requester and agent search sections
  const searchSection = document.createElement('div');
  searchSection.className = 'row mb-4';
  searchSection.innerHTML = `
    <div class="col-md-6">
      <div class="form-group">
        <label for="requester-search" class="form-label">Search Requester:</label>
        <div class="input-group">
          <input type="text" id="requester-search" class="form-control" placeholder="Search by name or email">
          <span class="input-group-text"><i class="fas fa-search"></i></span>
        </div>
        <div id="requester-results" class="search-results" style="display: none;"></div>
        <div id="selected-requester" class="selected-user mt-2" style="display: none;"></div>
      </div>
    </div>
    <div class="col-md-6">
      <div class="form-group">
        <label for="agent-search" class="form-label">Search Technical SME:</label>
        <div class="input-group">
          <input type="text" id="agent-search" class="form-control" placeholder="Search by name or email">
          <span class="input-group-text"><i class="fas fa-search"></i></span>
        </div>
        <div id="agent-results" class="search-results" style="display: none;"></div>
        <div id="selected-agent" class="selected-user mt-2" style="display: none;"></div>
      </div>
    </div>
  `;

  // Insert sections at the start of the form
  const form = document.querySelector('form');
  if (form) {
    form.insertBefore(searchSection, form.firstChild);
    form.insertBefore(servicesSection, form.firstChild);
  }

  // Set up event listeners for search inputs
  const requesterSearch = document.getElementById('requester-search');
  const agentSearch = document.getElementById('agent-search');
  
  if (requesterSearch) {
    requesterSearch.addEventListener('input', debounce(searchRequesters, 300));
  }
  
  if (agentSearch) {
    agentSearch.addEventListener('input', debounce(searchAgents, 300));
  }

  // ... rest of the existing populateFormFields code ...
}

/**
 * Set up event listeners for form inputs
 */
function setupEventListeners() {
  // Service selection
  const serviceSelect = document.getElementById('service-select');
  if (serviceSelect) {
    serviceSelect.addEventListener('change', handleServiceSelection);
  }

  // Change type selection
  const changeTypeSelect = document.getElementById('change-type');
  if (changeTypeSelect) {
    changeTypeSelect.addEventListener('change', handleChangeTypeSelection);
  }

  // Requester search
  const requesterSearch = document.getElementById('requester-search');
  if (requesterSearch) {
    requesterSearch.addEventListener('input', debounce(searchRequesters, 300));
  }

  // Agent search
  const agentSearch = document.getElementById('agent-search');
  if (agentSearch) {
    agentSearch.addEventListener('input', debounce(searchAgents, 300));
  }

  // Form navigation buttons
  const detailsNext = document.getElementById('details-next');
  if (detailsNext) {
    detailsNext.addEventListener('click', validateDetailsAndNext);
  }

  const calculateRiskBtn = document.getElementById('calculate-risk');
  if (calculateRiskBtn) {
    calculateRiskBtn.addEventListener('click', calculateRisk);
  }

  const submitChangeBtn = document.getElementById('submit-change');
  if (submitChangeBtn) {
    submitChangeBtn.addEventListener('click', function() {
      // Clear any previous highlighting
      clearFieldHighlighting();
      
      // Validate that risk has been calculated
      if (changeRequestData.riskAssessment.totalScore === 0) {
        showNotification('error', 'Please calculate the risk score before submitting the change request');
        
        // Scroll to the calculate risk button
        const calculateRiskBtn = document.getElementById('calculate-risk');
        if (calculateRiskBtn) {
          calculateRiskBtn.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
          // Add highlighting to the button
          calculateRiskBtn.classList.add('btn-outline-danger');
          setTimeout(() => {
            calculateRiskBtn.classList.remove('btn-outline-danger');
          }, 3000);
        }
        return;
      }
      
      // Final validation of all required fields
      let hasErrors = false;
      
      if (!changeRequestData.requester) {
        showNotification('error', 'Missing requester information. Please go back to Change Details tab.');
        hasErrors = true;
      }
      
      if (!changeRequestData.agent) {
        showNotification('error', 'Missing agent information. Please go back to Change Details tab.');
        hasErrors = true;
      }
      
      if (!changeRequestData.plannedStart || !changeRequestData.plannedEnd) {
        showNotification('error', 'Missing planned dates. Please go back to Change Details tab.');
        hasErrors = true;
      }
      
      if (!changeRequestData.implementationPlan || !changeRequestData.backoutPlan || !changeRequestData.validationPlan) {
        showNotification('error', 'Missing required plans. Please go back to Change Details tab.');
        hasErrors = true;
      }
      
      if (hasErrors) {
        // Switch back to details tab if there are errors
        switchTab('change-details');
        return;
      }
      
      // Show confirmation modal with summary
      showSubmissionSummary();
    });
  }

  // Handle confirmation modal buttons
  const editRequestBtn = document.getElementById('edit-request');
  if (editRequestBtn) {
    editRequestBtn.addEventListener('click', function() {
      // Modal will close automatically due to data-bs-dismiss="modal"
      // User can continue editing the form
      console.log('User chose to edit the request');
    });
  }

  const confirmSubmitBtn = document.getElementById('confirm-submit');
  if (confirmSubmitBtn) {
    confirmSubmitBtn.addEventListener('click', function() {
      // Perform actual submission to Freshservice
      submitToFreshservice();
    });
  }

  // Risk assessment radio buttons
  const riskRadios = document.querySelectorAll('.risk-options input[type="radio"]');
  riskRadios.forEach(radio => {
    radio.addEventListener('change', updateRiskSelection);
  });

  // Form inputs with auto-save
  const plannedStart = document.getElementById('planned-start');
  if (plannedStart) {
    plannedStart.addEventListener('change', function() {
      changeRequestData.plannedStart = this.value;
      console.log('Planned start updated:', this.value);
    });
  }

  const plannedEnd = document.getElementById('planned-end');
  if (plannedEnd) {
    plannedEnd.addEventListener('change', function() {
      changeRequestData.plannedEnd = this.value;
      console.log('Planned end updated:', this.value);
    });
  }

  const implementationPlan = document.getElementById('implementation-plan');
  if (implementationPlan) {
    implementationPlan.addEventListener('input', debounce(function() {
      changeRequestData.implementationPlan = this.value;
      console.log('Implementation plan updated');
    }, 1000));
  }

  const backoutPlan = document.getElementById('backout-plan');
  if (backoutPlan) {
    backoutPlan.addEventListener('input', debounce(function() {
      changeRequestData.backoutPlan = this.value;
      console.log('Backout plan updated');
    }, 1000));
  }

  const validationPlan = document.getElementById('validation-plan');
  if (validationPlan) {
    validationPlan.addEventListener('input', debounce(function() {
      changeRequestData.validationPlan = this.value;
      console.log('Validation plan updated');
    }, 1000));
  }

  // Asset association - service dropdown and asset search
  // const serviceSelect = document.getElementById('service-select');
  // if (serviceSelect) {
  //   serviceSelect.addEventListener('change', handleServiceSelection);
  // }

  // Asset search (service dropdown already handled in main section above)
  const assetSearch = document.getElementById('asset-search');
  if (assetSearch) {
    assetSearch.addEventListener('input', debounce(searchAssets, 300));
  }

  // Asset association navigation
  const assetsNext = document.getElementById('assets-next');
  if (assetsNext) {
    assetsNext.addEventListener('click', validateAssetsAndNext);
  }
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
    handleErr('API client not initialized. Please refresh the page.');
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
 * Search for assets (handles both main asset search and asset association)
 */
function searchAssets(e) {
  const searchTerm = e.target ? e.target.value.trim() : '';
  const searchInputId = e.target ? e.target.id : '';
  
  // Determine which search container to use
  let resultsContainer;
  let selectionCallback;
  
  if (searchInputId === 'asset-search') {
    // Asset association search
    resultsContainer = document.getElementById('asset-search-results');
    selectionCallback = selectAsset; // This will be our updated selectAsset for associations
  } else {
    // Main asset search (existing functionality)
    resultsContainer = document.getElementById('asset-results');
    selectionCallback = selectAsset; // Keep existing behavior for main search
  }
  
  // Clear and hide results if search term is too short
  if (searchTerm.length < 3) {
    if (resultsContainer) {
      resultsContainer.style.display = 'none';
    }
    return;
  }

  // Show loading indicator
  if (resultsContainer) {
    resultsContainer.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm" role="status"></div> Loading...</div>';
    resultsContainer.style.display = 'block';
  }
  
  // Check cache first
  getFromSearchCache('assets', searchTerm).then(cachedResults => {
    if (cachedResults) {
      // Use cached results
      if (searchInputId === 'asset-search') {
        displayAssetAssociationResults(cachedResults);
      } else {
        displayAssetResults('asset-results', cachedResults, selectionCallback);
      }
      
      // Get the configured search cache timeout
      getInstallationParams().then(params => {
        const searchCacheTimeout = params.searchCacheTimeout || DEFAULT_SEARCH_CACHE_TIMEOUT;
        
        // Set a timer to check for fresh results after the timeout
        setTimeout(() => {
          // Only perform API call if the search term is still the current one
          const currentSearchInput = document.getElementById(searchInputId);
          const currentSearchTerm = currentSearchInput?.value.trim();
          if (currentSearchTerm === searchTerm) {
            console.log(`Cache timeout reached (${searchCacheTimeout}ms), refreshing asset search for: ${searchTerm}`);
            performAssetSearch(searchTerm, true, searchInputId);
          }
        }, searchCacheTimeout);
      });
      
      return;
    }
    
    // No cache hit, perform search immediately
    performAssetSearch(searchTerm, false, searchInputId);
  }).catch(error => {
    console.error('Error checking asset search cache:', error);
    // Fallback to direct search on cache error
    performAssetSearch(searchTerm, false, searchInputId);
  });
}

/**
 * Perform the actual API search for assets
 * @param {string} searchTerm - The search term
 * @param {boolean} isRefresh - Whether this is a cache refresh operation
 */
async function performAssetSearch(searchTerm, isRefresh = false, searchInputId) {
  // Check for client availability
  if (!window.client || !window.client.request) {
    console.error('Client not available for asset search');
    const resultsContainer = document.getElementById(searchInputId);
    if (resultsContainer) {
      resultsContainer.innerHTML = '<div class="text-center p-3 text-danger">API client not initialized</div>';
    }
    return;
  }

  // Only show loading indicator for non-refresh operations
  if (!isRefresh) {
    const resultsContainer = document.getElementById(searchInputId);
    if (resultsContainer) {
      resultsContainer.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm" role="status"></div> Loading...</div>';
      resultsContainer.style.display = 'block';
    }
  }
  
  try {
    // Get configured asset type IDs
    const assetTypeIds = await getConfiguredAssetTypeIds();
    console.log(`Searching assets with term: "${searchTerm}" in asset types: ${assetTypeIds.join(', ')}`);
    
    // Build search query
    const assetTypeFilter = assetTypeIds.length > 0 ? 
      `(${assetTypeIds.map(id => `asset_type_id:${id}`).join(' OR ')})` : '';
    const nameFilter = `name:'*${searchTerm}*'`;
    const query = assetTypeFilter ? 
      `${assetTypeFilter} AND ${nameFilter}` : 
      nameFilter;
    
    const requestUrl = `?query=${encodeURIComponent(query)}&per_page=50`;
    
    const response = await window.client.request.invokeTemplate("getAssets", {
      path_suffix: requestUrl
    });
    
    if (!response || !response.response) {
      throw new Error('Invalid response from assets API');
    }
    
    const data = JSON.parse(response.response);
    const assets = data.assets || [];
    
    // Process and filter results
    const filteredAssets = assets.filter(asset => {
      const assetName = (asset.display_name || asset.name || '').toLowerCase();
      return assetName.includes(searchTerm.toLowerCase());
    });
    
    // Cache the results
    addToSearchCache('assets', searchTerm, filteredAssets);
    
    // Display results based on search type
    if (searchInputId === 'asset-search') {
      displayAssetAssociationResults(filteredAssets);
    } else {
      displayAssetResults('asset-results', filteredAssets, selectAsset);
    }
    
    console.log(`Asset search completed: ${filteredAssets.length} results for "${searchTerm}"`);
    
  } catch (error) {
    console.error('Error submitting change request:', error);
    
    // Show error notification
    showNotification('error', `Failed to submit change request: ${error.message}. Please try again.`);
    
  } finally {
    // Re-enable button
    confirmSubmitBtn.disabled = false;
    confirmSubmitBtn.innerHTML = 'Confirm & Submit';
  }
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
  // Reset change request data
  Object.assign(changeRequestData, {
    requester: null,
    agent: null,
    changeType: 'standard',
    leadTime: '2 business days',
    plannedStart: '',
    plannedEnd: '',
    implementationPlan: '',
    backoutPlan: '',
    validationPlan: '',
    selectedServices: [],
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
  });

  // Clear form fields
  document.getElementById('requester-search').value = '';
  document.getElementById('agent-search').value = '';
  document.getElementById('planned-start').value = '';
  document.getElementById('planned-end').value = '';
  document.getElementById('implementation-plan').value = '';
  document.getElementById('backout-plan').value = '';
  document.getElementById('validation-plan').value = '';

  // Clear asset association dropdown and search fields
  const serviceSelect = document.getElementById('service-select');
  const assetSearch = document.getElementById('asset-search');
  if (serviceSelect) serviceSelect.value = '';
  if (assetSearch) assetSearch.value = '';

  // Clear selected users displays
  const selectedRequester = document.getElementById('selected-requester');
  const selectedAgent = document.getElementById('selected-agent');
  if (selectedRequester) selectedRequester.style.display = 'none';
  if (selectedAgent) selectedAgent.style.display = 'none';

  // Clear selected services and assets displays
  updateSelectedServicesDisplay();
  updateSelectedAssetsDisplay();
  updateAssociationCounts();

  // Clear risk assessment
  document.querySelectorAll('.risk-options input[type="radio"]').forEach(radio => {
    radio.checked = false;
  });

  // Hide risk results
  const riskResult = document.getElementById('risk-result');
  if (riskResult) {
    riskResult.classList.add('hidden');
    riskResult.style.display = 'none';
  }

  // Reset change type to default
  const changeTypeSelect = document.getElementById('change-type');
  if (changeTypeSelect) {
    changeTypeSelect.value = 'standard';
  }

  // Re-initialize defaults
  initializeChangeTypeDefaults();

  // Switch back to first tab
  switchTab('change-details');

  console.log('Form reset completed');
}

/**
 * Search for services for asset association
 */
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

/**
 * Display service search results
 */
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

/**
 * Select a service for association
 */
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

/**
 * Update the selected services display
 */
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
  updateAssociationCounts();
  
  console.log('Asset selected:', asset);
}

/**
 * Update the selected assets display
 */
function updateSelectedAssetsDisplay() {
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
  updateAssociationCounts();
  console.log('Asset removed:', assetId);
}

/**
 * Update association counts
 */
function updateAssociationCounts() {
  const servicesCount = document.getElementById('services-count');
  const assetsCount = document.getElementById('assets-count');
  
  if (servicesCount) {
    servicesCount.textContent = changeRequestData.selectedServices.length;
  }
  
  if (assetsCount) {
    assetsCount.textContent = changeRequestData.selectedAssets.length;
  }
}

/**
 * Validate asset associations and proceed to next step
 */
function validateAssetsAndNext() {
  // Asset association is optional, so we don't enforce any requirements
  // But we could add validation here if needed
  
  console.log('Asset associations validated:', {
    services: changeRequestData.selectedServices.length,
    assets: changeRequestData.selectedAssets.length
  });
  
  // Show submission summary
  showSubmissionSummary();
}

/**
 * Display asset search results for asset association
 */
function displayAssetAssociationResults(assets) {
  const container = document.getElementById('asset-search-results');
  if (!container) return;
  
  if (assets.length === 0) {
    container.innerHTML = '<div class="text-center p-3">No assets found</div>';
    return;
  }
  
  // Sort assets by name
  assets.sort((a, b) => {
    const nameA = (a.display_name || a.name || '').toLowerCase();
    const nameB = (b.display_name || b.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  // Create results list
  let html = '<div class="list-group">';
  assets.forEach(asset => {
    const name = asset.display_name || asset.name || 'Unknown';
    const description = asset.description || '';
    const assetTypeId = asset.asset_type_id;
    
    // Check if already selected
    const isSelected = changeRequestData.selectedAssets.some(a => a.id === asset.id);
    
    html += `
      <button type="button" class="list-group-item list-group-item-action ${isSelected ? 'disabled' : ''}" 
              data-id="${asset.id}" ${isSelected ? 'disabled' : ''}>
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
      const selectedAsset = assets.find(a => a.id === selectedId);
      if (selectedAsset) {
        selectAsset(selectedAsset);
        container.style.display = 'none';
        // Clear search input
        document.getElementById('asset-search').value = '';
      }
    });
  });
}

/**
 * Display asset search results
 * @param {string} containerId - ID of container element
 * @param {Array} results - Results to display
 * @param {Function} selectionCallback - Callback for when an item is selected
 */
function displayAssetResults(containerId, results, selectionCallback) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (results.length === 0) {
    container.innerHTML = '<div class="text-center p-3">No assets found</div>';
    return;
  }
  
  // Sort results by name
  results.sort((a, b) => {
    const nameA = (a.display_name || a.name || '').toLowerCase();
    const nameB = (b.display_name || b.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  // Create results list
  let html = '<div class="list-group">';
  results.forEach(result => {
    const name = result.display_name || result.name || 'Unknown';
    const description = result.description || '';
    const assetTypeId = result.asset_type_id;
    
    html += `
      <button type="button" class="list-group-item list-group-item-action" data-id="${result.id}">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <div class="fw-bold">${name}</div>
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
  container.querySelectorAll('.list-group-item').forEach(item => {
    item.addEventListener('click', () => {
      const selectedId = parseInt(item.dataset.id);
      const selectedResult = results.find(r => r.id === selectedId);
      if (selectedResult && selectionCallback) {
        selectionCallback(selectedResult);
        container.style.display = 'none';
      }
    });
  });
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
  
  // Switch to risk assessment tab
  switchTab('risk-assessment');
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
 * Validate risk assessment and proceed to next tab
 */
function validateRiskAndNext() {
  if (changeRequestData.riskAssessment.totalScore === 0) {
    showNotification('error', 'Please calculate the risk score before proceeding');
    return;
  }
  
  // Switch to asset association tab
  switchTab('asset-association');
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
    
    if (changeRequestData.selectedServices.length > 0) {
      html += `
        <div class="mb-3">
          <strong>Associated Services (${changeRequestData.selectedServices.length}):</strong>
          <ul class="mt-2 mb-0">
            ${changeRequestData.selectedServices.map(service => 
              `<li>${service.display_name || service.name || 'Unknown'}</li>`
            ).join('')}
          </ul>
        </div>
      `;
    }
    
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
    
    if (changeRequestData.selectedServices.length === 0 && changeRequestData.selectedAssets.length === 0) {
      html = '<div class="text-muted">No services or assets have been associated with this change.</div>';
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
