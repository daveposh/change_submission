/**
 * Change Request App
 * Full page application for managing change requests in Freshservice
 */

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
 * Get services from cache or fetch if expired
 * @returns {Promise<Array>} Services array
 */
async function getServices() {
  const now = Date.now();
  const cacheAge = now - cache.services.timestamp;

  if (cacheAge > CACHE.TIMEOUTS.SERVICES || cache.services.data.length === 0) {
    console.log('Services cache expired or empty, refreshing...');
    return await fetchAndCacheServices();
  }

  return cache.services.data;
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
  riskAssessment: {
    businessImpact: 0,
    affectedUsers: 0,
    complexity: 0,
    testing: 0,
    rollback: 0,
    totalScore: 0,
    riskLevel: ''
  },
  selectedAssets: []
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
  agents: {},     // Map of search term -> { results, timestamp }
  assets: {},     // Map of search term -> { results, timestamp }
  assetsByType: {} // Map of assetTypeId -> search term -> { results, timestamp }
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

document.onreadystatechange = function() {
  if (document.readyState === 'interactive') {
    console.log('Document ready, initializing app...');
    // Load FontAwesome first
    loadFontAwesome();
    setTimeout(initializeApp, 500); // Add slight delay before initialization
  }
};

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
 * Initialize the services dropdown
 */
async function initializeServicesDropdown() {
  try {
    const services = await getServices();
    const dropdown = document.getElementById('service-select');
    if (!dropdown) return;

    // Clear existing options
    dropdown.innerHTML = '<option value="">Select a Service</option>';

    // Sort services by name
    services.sort((a, b) => {
      const nameA = (a.display_name || a.name || '').toLowerCase();
      const nameB = (b.display_name || b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // Add options
    services.forEach(service => {
      const option = document.createElement('option');
      option.value = service.id;
      option.textContent = service.display_name || service.name;
      dropdown.appendChild(option);
    });

    // Enable the dropdown
    dropdown.disabled = false;
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
 * Handle service selection
 * @param {Event} event Change event
 */
function handleServiceSelection(event) {
  const serviceId = event.target.value;
  if (!serviceId) {
    document.getElementById('selected-service-details').style.display = 'none';
    return;
  }

  const service = cache.services.data.find(s => s.id === parseInt(serviceId));
  if (!service) return;

  // Update the form with service details
  const details = {
    name: service.display_name || service.name,
    type: cache.asset_types.data[service.asset_type_id]?.name || 'Unknown Type',
    description: service.description || 'No description available'
  };

  // Update UI elements
  document.getElementById('selected-service-name').textContent = details.name;
  document.getElementById('selected-service-type').textContent = details.type;
  document.getElementById('selected-service-description').textContent = details.description;
  
  // Show the details section
  document.getElementById('selected-service-details').style.display = 'block';
}

function initializeApp() {
  try {
    console.log('Initializing app...');
    
    // Initialize form fields first
    populateFormFields();
    
    // Initialize caches and services dropdown
    Promise.all([
      getAssetTypes(),
      getServices()
    ]).then(() => {
      console.log('Caches initialized');
      initializeServicesDropdown();
    }).catch(error => {
      console.error('Error initializing caches:', error);
      const dropdown = document.getElementById('service-select');
      if (dropdown) {
        dropdown.innerHTML = '<option value="">Error loading services</option>';
        dropdown.disabled = true;
      }
    });

    // Set up event listeners
    const serviceSelect = document.getElementById('service-select');
    if (serviceSelect) {
      serviceSelect.addEventListener('change', handleServiceSelection);
    }

    // ... rest of initialization code ...
  } catch (error) {
    console.error('Error in app initialization:', error);
    displayInitError('Failed to initialize application');
  }
}

function populateFormFields() {
  // Helper functions for safe element access
  function safeGetElement(id) {
    const element = document.getElementById(id);
    if (!element) {
      console.warn(`Element with id '${id}' not found`);
    }
    return element;
  }

  function safeSetValue(id, value) {
    const element = safeGetElement(id);
    if (element) element.value = value || '';
  }

  function safeSetText(id, text) {
    const element = safeGetElement(id);
    if (element) element.textContent = text || '';
  }

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

  // Insert services section at the start of the form
  const form = document.querySelector('form');
  if (form) {
    form.insertBefore(servicesSection, form.firstChild);
  }

  // ... rest of the existing populateFormFields code ...
}

// ... rest of existing code ...



