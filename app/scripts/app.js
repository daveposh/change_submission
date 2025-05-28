/**
 * Change Request App
 * Full page application for managing change requests in Freshservice
 */

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

function initializeApp() {
  console.log('Starting app initialization...');
  console.log('Client object available:', typeof window.client);
  console.log('Client request available:', typeof window.client?.request);
  console.log('Client request.invokeTemplate available:', typeof window.client?.request?.invokeTemplate);
  
  try {
    // Make sure window is defined
    if (typeof window === 'undefined') {
      console.error('Window object is not available');
      return;
    }

    // Check for Bootstrap
    if (typeof window.bootstrap === 'undefined') {
      console.warn('Bootstrap not available in window object. Some UI components may not work correctly.');
    }

    // Initialize app client with proper error handling
    if (typeof app === 'undefined') {
      console.error('App object is not available');
      displayInitError('App initialization failed: app object not available');
      return;
    }
    
    app.initialized()
      .then(function getClient(_client) {
        console.log('App client initialized successfully');
        
        // Ensure client is stored in the window object for global access
        if (typeof window === 'undefined') {
          console.error('Window object is not available for client storage');
          return;
        }
        
        window.client = _client;
        
        // IMPORTANT: Wait for DOM to be fully ready before setting up UI
        setTimeout(() => {
          try {
            console.log('Setting up app components...');
            
            // Manually initialize Bootstrap tabs
            initializeBootstrapTabs();
            
            setupEventListeners();
            setupChangeTypeTooltips();
            
            // Fetch and cache all locations, users, and asset types
            Promise.all([
              fetchAllLocations().catch(err => {
                console.error("Error in fetchAllLocations:", err);
              }),
              fetchUsers().catch(err => {
                console.error("Error in fetchUsers:", err);
              }),
              fetchAllAssetTypes().catch(err => {
                console.error("Error in fetchAllAssetTypes:", err);
              })
            ]).then(() => {
              // After asset types are loaded, show the configured types for debugging
              setTimeout(() => {
                showConfiguredAssetTypes().catch(err => {
                  console.error("Error showing configured asset types:", err);
                });
              }, 1000);
            });
            
            // Only attempt to load data after setup is complete
            setTimeout(() => {
              try {
                console.log('Loading saved data...');
                // Check for client before trying to load saved data
                if (!window.client) {
                  console.error('Client not available for loading data');
                  return;
                }
                
                // Load saved form data
                loadSavedData().catch(err => {
                  console.error("Error in loadSavedData promise:", err);
                });
                
                // Pre-load asset search results in the background (will use cached asset types)
                setTimeout(() => {
                  try {
                    // Initial search with empty term (will use asset_type_id from config)
                    console.log('Pre-loading asset search results...');
                    searchAssets({ target: { value: '' } });
                  } catch (assetErr) {
                    console.error("Error pre-loading assets:", assetErr);
                  }
                }, 1500); // Increased delay to ensure asset types are loaded first
              } catch (dataErr) {
                console.error("Exception during data loading:", dataErr);
              }
            }, 300);
          } catch (setupErr) {
            console.error("Error during app setup:", setupErr);
          }
        }, 300);
      })
      .catch(function(initErr) {
        console.error("App client initialization failed:", initErr);
        // Try to show error without using client interface
        displayInitError('App initialization failed. Please refresh the page or contact support.');
      });
  } catch (e) {
    console.error("Critical error during initialization:", e);
    displayInitError('Critical initialization error: ' + (e.message || 'unknown error'));
  }
}

// Helper function to display initialization errors without relying on the client
function displayInitError(message) {
  try {
    document.body.innerHTML += `
      <div style="color: red; padding: 20px; border: 1px solid red; margin: 20px; background: #fff">
        ${message}
      </div>
    `;
  } catch (e) {
    console.error("Failed to show error message:", e);
  }
}

/**
 * Manually initialize Bootstrap tabs to avoid conflicts with Freshservice CSS
 */
function initializeBootstrapTabs() {
  try {
    console.log('Manually initializing Bootstrap tabs');
    
    // Get all tab buttons
    const tabButtons = document.querySelectorAll('#changeTabs button[data-bs-toggle="tab"]');
    
    // Add click handlers to each button
    tabButtons.forEach(button => {
      button.addEventListener('click', function(event) {
        event.preventDefault();
        
        // Get the target panel ID
        const targetId = button.getAttribute('data-bs-target');
        
        // Hide all panels
        document.querySelectorAll('.tab-pane').forEach(pane => {
          pane.classList.remove('show', 'active');
        });
        
        // Hide all active tab buttons
        document.querySelectorAll('#changeTabs button').forEach(btn => {
          btn.classList.remove('active');
          btn.setAttribute('aria-selected', 'false');
        });
        
        // Show the target panel
        const targetPane = document.querySelector(targetId);
        if (targetPane) {
          targetPane.classList.add('show', 'active');
        }
        
        // Show the active tab button
        button.classList.add('active');
        button.setAttribute('aria-selected', 'true');
      });
    });
    
    // Manually activate the first tab
    const firstTab = document.querySelector('#changeTabs button:first-child');
    if (firstTab) {
      const targetId = firstTab.getAttribute('data-bs-target');
      const targetPane = document.querySelector(targetId);
      
      if (targetPane) {
        targetPane.classList.add('show', 'active');
      }
      
      firstTab.classList.add('active');
      firstTab.setAttribute('aria-selected', 'true');
    }
    
    console.log('Bootstrap tabs initialized');
  } catch (error) {
    console.error('Error initializing Bootstrap tabs:', error);
  }
}

/**
 * Load saved change request data from the data storage
 * Tries client DB first, then falls back to localStorage
 */
async function loadSavedData() {
  console.log('Attempting to load saved data...');
  let dataLoaded = false;
  
  // First try to load from client DB
  if (window.client && window.client.db && typeof window.client.db.get === 'function') {
    try {
      console.log('Requesting data from client DB...');
    const result = await window.client.db.get(STORAGE_KEYS.CHANGE_DATA);
    
    // Check if we have valid data
    if (result && typeof result === 'object') {
        console.log('Data retrieved successfully from client DB');
      
      // Update the global data object with saved values
      Object.keys(result).forEach(key => {
        changeRequestData[key] = result[key];
      });
      
        dataLoaded = true;
      } else {
        console.log('No saved data found in client DB');
      }
    } catch (error) {
      console.log('Error accessing client DB:', error);
    }
  } else {
    console.warn('Client DB API not available for loading data');
  }
  
  // If client DB failed, try localStorage
  if (!dataLoaded) {
    try {
      console.log('Trying to load data from localStorage...');
      const savedDataString = localStorage.getItem(STORAGE_KEYS.CHANGE_DATA);
      
      if (savedDataString) {
        const savedData = JSON.parse(savedDataString);
        
        if (savedData && typeof savedData === 'object') {
          console.log('Data retrieved successfully from localStorage');
          
          // Update the global data object with saved values
          Object.keys(savedData).forEach(key => {
            changeRequestData[key] = savedData[key];
          });
          
          dataLoaded = true;
        } else {
          console.log('No valid saved data found in localStorage');
        }
      } else {
        console.log('No saved data found in localStorage');
      }
    } catch (localStorageError) {
      console.error('Error accessing localStorage:', localStorageError);
    }
  }
  
  // Update UI if we loaded data from either source
  if (dataLoaded) {
      try {
        console.log('Populating form fields with saved data');
        populateFormFields();
        
        // Only show notification after successfully populating the form
        setTimeout(() => {
          showNotification('info', 'Draft change request data loaded');
        }, 500);
        
      return true;
      } catch (formError) {
        console.error('Error populating form with saved data:', formError);
      }
    }
  
    return false;
}

/**
 * Save current change request data to the data storage
 * Uses both Freshservice client DB and localStorage for redundancy
 */
async function saveCurrentData() {
  let savedToClientDB = false;
  
  // First try to save to client DB
  if (window.client && window.client.db && typeof window.client.db.set === 'function') {
  try {
      console.log('Saving form data to client DB...');
    await window.client.db.set(STORAGE_KEYS.CHANGE_DATA, changeRequestData);
      console.log('Form data saved successfully to client DB');
      savedToClientDB = true;
    } catch (error) {
      console.error('Failed to save draft to client DB:', error);
    }
  } else {
    console.warn('Client DB API not available for saving data');
  }
  
  // Always save to localStorage as backup/fallback
  try {
    console.log('Saving form data to localStorage...');
    localStorage.setItem(STORAGE_KEYS.CHANGE_DATA, JSON.stringify(changeRequestData));
    console.log('Form data saved successfully to localStorage');
    
    // Only show notification 20% of the time to avoid too many notifications
    if (Math.random() < 0.2) {
      setTimeout(() => {
        try {
          showNotification('success', 'Change request draft saved locally');
        } catch (notifyErr) {
          console.warn('Could not show save notification:', notifyErr);
        }
      }, 300);
    }
    
    return true;
  } catch (localStorageError) {
    console.error('Failed to save draft to localStorage:', localStorageError);
    
    // Only show error if we failed to save to both storage mechanisms
    if (!savedToClientDB && Math.random() < 0.3) {
      try {
        showNotification('error', 'Failed to save draft');
      } catch (notifyErr) {
        console.warn('Could not show error notification:', notifyErr);
      }
    }
    
    return savedToClientDB; // Return true if at least client DB save worked
  }
}

/**
 * Clear saved data from all storage locations
 */
async function clearSavedData() {
  let clientDBCleared = false;
  
  // Clear from client DB if available
  if (window.client && window.client.db && typeof window.client.db.delete === 'function') {
  try {
    await window.client.db.delete(STORAGE_KEYS.CHANGE_DATA);
      console.log('Saved data cleared from client DB');
      clientDBCleared = true;
  } catch (error) {
      console.error('Error clearing saved data from client DB:', error);
    }
  } else {
    console.warn('Client DB API not available for clearing data');
  }
  
  // Always clear from localStorage as well
  try {
    localStorage.removeItem(STORAGE_KEYS.CHANGE_DATA);
    console.log('Saved data cleared from localStorage');
    return true;
  } catch (localStorageError) {
    console.error('Error clearing saved data from localStorage:', localStorageError);
    return clientDBCleared; // Return true if at least client DB was cleared
  }
}

/**
 * Populate form fields with data from storage
 */
function populateFormFields() {
  console.log('Populating form fields with saved data');
  
  // Safely get a DOM element with null checking
  function safeGetElement(id) {
    const element = document.getElementById(id);
    if (!element) {
      console.warn(`Element not found: ${id}`);
      return null;
    }
    return element;
  }
  
  // Safely set element value with null checking
  function safeSetValue(id, value) {
    const element = safeGetElement(id);
    if (element && value !== undefined && value !== null) {
      element.value = value;
    }
  }
  
  // Safely set element text content with null checking
  function safeSetText(id, text) {
    const element = safeGetElement(id);
    if (element && text !== undefined && text !== null) {
      element.textContent = text;
    }
  }
  
  try {
    // Populate requester if exists
    if (changeRequestData.requester) {
      const requester = changeRequestData.requester;
      const selectedContainer = safeGetElement('selected-requester');
      
      if (selectedContainer) {
        // Create detailed requester info display with improved styling
        let requesterInfo = `
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div>
              <div class="fw-bold">${requester.first_name} ${requester.last_name}</div>
              <div class="text-secondary small"><i class="fas fa-envelope me-1"></i>${requester.email || requester.primary_email}</div>
            </div>
            <div>
              <span class="badge bg-primary me-2">Requester</span>
              <button class="btn btn-sm btn-outline-secondary clear-requester" type="button"><i class="fas fa-times"></i></button>
            </div>
          </div>
        `;
        
        // Add badges for additional details in a flex container
        const detailsList = [];
        
        if (requester.job_title) {
          detailsList.push(`<span class="badge bg-light text-dark border"><i class="fas fa-briefcase me-1"></i>${requester.job_title}</span>`);
        }
        
        if (requester.location_name) {
          detailsList.push(`<span class="badge bg-light text-dark border"><i class="fas fa-map-marker-alt me-1"></i>${requester.location_name}</span>`);
        }
        
        if (requester.manager_name) {
          detailsList.push(`<span class="badge bg-light text-dark border"><i class="fas fa-user-tie me-1"></i>${requester.manager_name}</span>`);
        }
        
        if (requester.department_names && requester.department_names.length > 0) {
          detailsList.push(`<span class="badge bg-light text-dark border"><i class="fas fa-building me-1"></i>${requester.department_names[0]}</span>`);
        }
        
        if (detailsList.length > 0) {
          requesterInfo += `<div class="d-flex flex-wrap gap-2 mt-1">${detailsList.join('')}</div>`;
        }
        
        selectedContainer.innerHTML = requesterInfo;
        selectedContainer.style.display = 'block';
        selectedContainer.classList.add('p-2', 'border', 'rounded', 'bg-light');
        
        // Add event listener to the clear button
        document.querySelector('.clear-requester').addEventListener('click', clearRequester);
      }
    }
    
    // Populate agent if exists
    if (changeRequestData.agent) {
      const agent = changeRequestData.agent;
      const selectedContainer = safeGetElement('selected-agent');
      
      if (selectedContainer) {
        // Create detailed agent info display with improved styling
        let agentInfo = `
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div>
              <div class="fw-bold">${agent.first_name} ${agent.last_name}</div>
              <div class="text-secondary small"><i class="fas fa-envelope me-1"></i>${agent.email}</div>
            </div>
            <div>
              <span class="badge bg-info me-2">Agent</span>
              <button class="btn btn-sm btn-outline-secondary clear-agent" type="button"><i class="fas fa-times"></i></button>
            </div>
          </div>
        `;
        
        // Add badges for additional details in a flex container
        const detailsList = [];
        
        if (agent.job_title) {
          detailsList.push(`<span class="badge bg-light text-dark border"><i class="fas fa-briefcase me-1"></i>${agent.job_title}</span>`);
        }
        
        if (agent.location_name) {
          detailsList.push(`<span class="badge bg-light text-dark border"><i class="fas fa-map-marker-alt me-1"></i>${agent.location_name}</span>`);
        }
        
        if (agent.manager_name) {
          detailsList.push(`<span class="badge bg-light text-dark border"><i class="fas fa-user-tie me-1"></i>${agent.manager_name}</span>`);
        }
        
        if (agent.department_names && agent.department_names.length > 0) {
          detailsList.push(`<span class="badge bg-light text-dark border"><i class="fas fa-building me-1"></i>${agent.department_names[0]}</span>`);
        }
        
        if (detailsList.length > 0) {
          agentInfo += `<div class="d-flex flex-wrap gap-2 mt-1">${detailsList.join('')}</div>`;
        }
        
        selectedContainer.innerHTML = agentInfo;
        selectedContainer.style.display = 'block';
        selectedContainer.classList.add('p-2', 'border', 'rounded', 'bg-light');
        
        // Add event listener to the clear button
        document.querySelector('.clear-agent').addEventListener('click', clearAgent);
      }
    }
    
    // Populate Change Type
    const changeTypeSelect = safeGetElement('change-type');
    if (changeTypeSelect && changeRequestData.changeType) {
      changeTypeSelect.value = changeRequestData.changeType;
    }
    safeSetText('lead-time', changeRequestData.leadTime || '2 business days');
    
    // Populate dates
    safeSetValue('planned-start', changeRequestData.plannedStart || '');
    safeSetValue('planned-end', changeRequestData.plannedEnd || '');
    
    // Populate text areas
    safeSetValue('implementation-plan', changeRequestData.implementationPlan || '');
    safeSetValue('backout-plan', changeRequestData.backoutPlan || '');
    safeSetValue('validation-plan', changeRequestData.validationPlan || '');
    
    // Populate risk assessment if it exists
    const riskAssessment = changeRequestData.riskAssessment;
    if (riskAssessment) {
      // Set radio buttons based on saved risk data
      try {
        if (riskAssessment.businessImpact > 0) {
          const radioElement = document.querySelector(`input[name="business-impact"][value="${riskAssessment.businessImpact}"]`);
          if (radioElement) radioElement.checked = true;
        }
        
        if (riskAssessment.affectedUsers > 0) {
          const radioElement = document.querySelector(`input[name="affected-users"][value="${riskAssessment.affectedUsers}"]`);
          if (radioElement) radioElement.checked = true;
        }
        
        if (riskAssessment.complexity > 0) {
          const radioElement = document.querySelector(`input[name="complexity"][value="${riskAssessment.complexity}"]`);
          if (radioElement) radioElement.checked = true;
        }
        
        if (riskAssessment.testing > 0) {
          const radioElement = document.querySelector(`input[name="testing"][value="${riskAssessment.testing}"]`);
          if (radioElement) radioElement.checked = true;
        }
        
        if (riskAssessment.rollback > 0) {
          const radioElement = document.querySelector(`input[name="rollback"][value="${riskAssessment.rollback}"]`);
          if (radioElement) radioElement.checked = true;
        }
      } catch (radioErr) {
        console.error('Error setting risk radio buttons:', radioErr);
      }
      
      // Show risk results if they exist
      if (riskAssessment.totalScore > 0) {
        safeSetText('risk-score-value', riskAssessment.totalScore);
        
        const riskLevelElement = safeGetElement('risk-level-value');
        if (riskLevelElement) {
          riskLevelElement.textContent = riskAssessment.riskLevel;
          riskLevelElement.className = `badge ${getRiskBadgeClass(riskAssessment.riskLevel)}`;
        }
        
        let riskExplanation = '';
        if (riskAssessment.riskLevel === 'Low') {
          riskExplanation = 'This change poses minimal risk to business operations and is likely to be implemented successfully.';
        } else if (riskAssessment.riskLevel === 'Medium') {
          riskExplanation = 'This change poses moderate risk to business operations. Consider additional testing or verification steps.';
        } else {
          riskExplanation = 'This change poses significant risk to business operations. A detailed review is recommended before proceeding.';
        }
        
        safeSetText('risk-explanation', riskExplanation);
        
        const riskResultElement = safeGetElement('risk-result');
        if (riskResultElement) {
          riskResultElement.classList.remove('hidden');
        }
      }
    }
    
    // Populate selected assets
    if (changeRequestData.selectedAssets && changeRequestData.selectedAssets.length > 0) {
      renderSelectedAssets();
    }
    
    console.log('Form populated successfully');
  } catch (error) {
    console.error('Error populating form fields:', error);
  }
}

function setupEventListeners() {
  // We don't need to manually handle tab switching since Bootstrap will handle it
  // Just add listeners for the Next buttons to programmatically switch tabs

  // Enhance search inputs with icons and styling
  enhanceSearchInputs();

  // Change Details tab
  document.getElementById('requester-search').addEventListener('input', debounce(searchRequesters, 300));
  document.getElementById('agent-search').addEventListener('input', debounce(searchAgents, 300));
  document.getElementById('change-type').addEventListener('change', updateChangeType);
  document.getElementById('details-next').addEventListener('click', validateDetailsAndNext);

  // Risk Assessment tab
  const riskRadios = document.querySelectorAll('.risk-options input[type="radio"]');
  riskRadios.forEach(radio => {
    radio.addEventListener('change', updateRiskSelection);
  });
  document.getElementById('calculate-risk').addEventListener('click', calculateRisk);
  document.getElementById('risk-next').addEventListener('click', validateRiskAndNext);

  // Impacted Assets tab
  document.getElementById('asset-search').addEventListener('input', debounce(searchAssets, 300));
  document.getElementById('show-all-assets').addEventListener('click', function() {
    // Trigger asset search with empty search term to show all assets of configured type
    searchAssets({ target: { value: '' } });
  });
  
  // Add debug button for finding specific assets
  const debugButton = document.createElement('button');
  debugButton.className = 'btn btn-sm btn-outline-info ms-2';
  debugButton.innerHTML = '<i class="fas fa-search me-1"></i> Find "Middleware"';
  debugButton.title = 'Search for Middleware asset across all types';
  debugButton.onclick = function() {
    findAssetByName('Middleware');
  };
  
  // Add the debug button next to the show all assets button
  const showAllButton = document.getElementById('show-all-assets');
  if (showAllButton && showAllButton.parentNode) {
    showAllButton.parentNode.appendChild(debugButton);
  }
  document.getElementById('submit-change').addEventListener('click', showSummary);
  
  // Load assets automatically when the Assets tab is shown
  document.getElementById('assets-tab').addEventListener('shown.bs.tab', function() {
    // Only load if we haven't already loaded assets
    if (document.getElementById('asset-results').children.length <= 1) {
      console.log('Assets tab shown - loading initial asset listing');
      // Trigger the show all assets function
      searchAssets({ target: { value: '' } });
    }
  });

  // Confirmation Modal
  document.getElementById('edit-request').addEventListener('click', closeModal);
  document.getElementById('confirm-submit').addEventListener('click', submitChangeRequest);
  
  // Form inputs with auto-save
  document.getElementById('planned-start').addEventListener('change', function() {
    changeRequestData.plannedStart = this.value;
    saveCurrentData();
  });
  
  document.getElementById('planned-end').addEventListener('change', function() {
    changeRequestData.plannedEnd = this.value;
    saveCurrentData();
  });
  
  document.getElementById('implementation-plan').addEventListener('input', debounce(function() {
    changeRequestData.implementationPlan = this.value;
    saveCurrentData();
  }, 1000));
  
  document.getElementById('backout-plan').addEventListener('input', debounce(function() {
    changeRequestData.backoutPlan = this.value;
    saveCurrentData();
  }, 1000));
  
  document.getElementById('validation-plan').addEventListener('input', debounce(function() {
    changeRequestData.validationPlan = this.value;
    saveCurrentData();
  }, 1000));
}

/**
 * Enhance search inputs with icons and better styling
 * Simplified version to fix FDK validation errors
 */
function enhanceSearchInputs() {
  // Fix search input placeholders without DOM manipulation
  const requesterSearch = document.getElementById('requester-search');
  const agentSearch = document.getElementById('agent-search');
  const assetSearch = document.getElementById('asset-search');
  
  if (requesterSearch) {
    requesterSearch.placeholder = 'Search for a requester...';
    requesterSearch.classList.add('form-control');
  }
  
  if (agentSearch) {
    agentSearch.placeholder = 'Search for an agent...';
    agentSearch.classList.add('form-control');
  }
  
  if (assetSearch) {
    assetSearch.placeholder = 'Search for software and services...';
    assetSearch.classList.add('form-control');
  }
  
  // Add icon labels next to inputs using existing markup
  // This avoids complex DOM manipulation that might cause FDK issues
  addIconLabel('requester-search-label', 'fas fa-user', 'Requester');
  addIconLabel('agent-search-label', 'fas fa-user-tie', 'Agent');
  addIconLabel('asset-search-label', 'fas fa-cogs', 'Software/Services');
}

// Helper to add icon labels
function addIconLabel(labelId, iconClass, text) {
  const label = document.getElementById(labelId);
  if (label) {
    label.innerHTML = `<i class="${iconClass} me-1"></i> ${text}`;
    label.classList.add('fw-bold');
  }
}

function setupChangeTypeTooltips() {
  const changeTypeSelect = document.getElementById('change-type');
  const changeTypeTooltip = document.getElementById('change-type-tooltip');
  
  // Ensure tooltip container has proper styling
  if (changeTypeTooltip) {
    // Apply better styling to the tooltip
    changeTypeTooltip.style.padding = '10px 15px';
    changeTypeTooltip.style.border = '1px solid #ccc';
    changeTypeTooltip.style.borderRadius = '5px';
    changeTypeTooltip.style.backgroundColor = '#f8f9fa';
    changeTypeTooltip.style.marginTop = '10px';
    changeTypeTooltip.style.fontSize = '0.9rem';
    changeTypeTooltip.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    changeTypeTooltip.style.maxWidth = '400px';
  }
  
  // Show tooltip for the default selected change type immediately
  updateTooltipContent(changeTypeSelect.value);
  
  // Always display the tooltip after initialization
  if (changeTypeTooltip) {
    changeTypeTooltip.style.display = 'block';
  }
  
  // Keep showing the tooltip on hover (doesn't hide it anymore)
  changeTypeSelect.addEventListener('mouseenter', function() {
    if (changeTypeTooltip) {
      changeTypeTooltip.style.display = 'block';
    }
  });
  
  // Keep showing the tooltip on focus (doesn't hide it anymore)
  changeTypeSelect.addEventListener('focus', function() {
    if (changeTypeTooltip) {
      changeTypeTooltip.style.display = 'block';
    }
  });
  
  function updateTooltipContent(changeType) {
    if (changeTypeTooltip) {
      // Get tooltip content for the selected change type
      const tooltipContent = changeTypeTooltips[changeType] || '';
      
      // Update tooltip content
      changeTypeTooltip.textContent = tooltipContent;
      
      // Always show tooltip
      changeTypeTooltip.style.display = 'block';
      
      // Add visual indication of selected type
      changeTypeTooltip.className = ''; // Clear any existing classes
      changeTypeTooltip.classList.add('tooltip-' + changeType);
      
      // Add a small indicator of the currently selected type
      const typeLabel = document.createElement('div');
      typeLabel.className = 'fw-bold mb-1';
      typeLabel.textContent = 'Selected: ' + changeType.charAt(0).toUpperCase() + changeType.slice(1);
      
      // Wrap the tooltip text in a container
      const tooltipContainer = document.createElement('div');
      tooltipContainer.textContent = tooltipContent;
      
      // Clear the tooltip and add the new content
      changeTypeTooltip.innerHTML = '';
      changeTypeTooltip.appendChild(typeLabel);
      changeTypeTooltip.appendChild(tooltipContainer);
    }
  }
  
  // Update tooltip when change type changes
  changeTypeSelect.addEventListener('change', function() {
    updateTooltipContent(this.value);
    
    // Update lead time text
    const leadTimeElement = document.getElementById('lead-time');
    if (leadTimeElement) {
      leadTimeElement.textContent = leadTimeText[this.value] || '2 business days';
    }
    
    // Always ensure tooltip is visible after changing
    if (changeTypeTooltip) {
      changeTypeTooltip.style.display = 'block';
    }
  });
}

function switchTab(tabId) {
  console.log(`Switching to tab: ${tabId}`);
  try {
    // Get the tab button that corresponds to this tabId
    const tabSelector = `#changeTabs button[data-bs-target="#${tabId}"]`;
    const tabElement = document.querySelector(tabSelector);
    
    if (tabElement) {
      // Hide all panels
      document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('show', 'active');
      });
      
      // Hide all active tab buttons
      document.querySelectorAll('#changeTabs button').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      });
      
      // Show the target panel
      const targetPane = document.getElementById(tabId);
      if (targetPane) {
        targetPane.classList.add('show', 'active');
        console.log(`Activated tab pane: ${tabId}`);
      }
      
      // Show the active tab button
      tabElement.classList.add('active');
      tabElement.setAttribute('aria-selected', 'true');
      console.log(`Activated tab button for: ${tabId}`);
      
      // Save current tab in storage (if client is available)
      try {
        if (window.client && typeof window.client.db === 'object' && typeof window.client.db.set === 'function') {
          saveCurrentData().catch(err => console.error('Error saving tab state:', err));
        }
      } catch (saveErr) {
        console.error('Error saving tab state:', saveErr);
      }
    } else {
      console.error(`Tab element not found for: ${tabId}`);
    }
  } catch (tabErr) {
    console.error('Error switching tab:', tabErr);
  }
}

/**
 * Check if search term exists in cache and is still valid
 * @param {string} searchType - Type of search ('requesters' or 'agents')
 * @param {string} searchTerm - The search term
 * @returns {Array|null} - Cached results or null if not found/expired
 */
async function getFromSearchCache(searchType, searchTerm) {
  if (!searchCache[searchType] || !searchCache[searchType][searchTerm]) {
    return null;
  }
  
  // Get the configured search cache timeout from installation parameters
  const params = await getInstallationParams();
  const searchCacheTimeout = params.searchCacheTimeout;
  
  const cached = searchCache[searchType][searchTerm];
  
  // Check if cache is still valid (within the configured timeout)
  if (Date.now() - cached.timestamp <= searchCacheTimeout) {
    console.log(`Using cached ${searchType} search results for: ${searchTerm} (timeout: ${searchCacheTimeout}ms)`);
    return cached.results;
  }
  
  // Cache expired
  return null;
}

/**
 * Store search results in cache
 * @param {string} searchType - Type of search ('requesters' or 'agents')
 * @param {string} searchTerm - The search term
 * @param {Array} results - The search results
 */
function addToSearchCache(searchType, searchTerm, results) {
  if (!searchCache[searchType]) {
    searchCache[searchType] = {};
  }
  
  searchCache[searchType][searchTerm] = {
    results: results,
    timestamp: Date.now()
  };
  
  console.log(`Cached ${results.length} ${searchType} search results for: ${searchTerm}`);
}

/**
 * Search for requesters using Freshservice API
 */
function searchRequesters(e) {
  const searchTerm = e.target.value.trim();
  if (searchTerm.length < 2) return;

  // Show loading indicator
  const resultsContainer = document.getElementById('requester-results');
  resultsContainer.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm" role="status"></div> Loading...</div>';
  resultsContainer.style.display = 'block';
  
  // Check cache first
  getFromSearchCache('requesters', searchTerm).then(cachedResults => {
    if (cachedResults) {
      // Use cached results
      displaySearchResults('requester-results', cachedResults, selectRequester);
      
      // Get the configured search cache timeout
      getInstallationParams().then(params => {
        const searchCacheTimeout = params.searchCacheTimeout;
        
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
 * Perform the actual API search for requesters
 * @param {string} searchTerm - The search term
 * @param {boolean} isRefresh - Whether this is a cache refresh operation
 */
function performRequesterSearch(searchTerm, isRefresh = false) {
  // Ensure client is available
  if (!window.client || !window.client.request) {
    console.error('Client or request object not available for requester search');
    handleErr('API client not initialized. Please refresh the page.');
    return;
  }

  // Use simple quoted format for requesters API (it doesn't support field-specific syntax)
  const requesterQuery = encodeURIComponent(`"${searchTerm}"`);
  // Use field-specific format for agents API  
  const agentQuery = encodeURIComponent(`~[first_name|last_name|email]:'${searchTerm}'`);
  
  console.log(`${isRefresh ? 'Refreshing' : 'Performing'} requester search with requester query:`, requesterQuery, 'and agent query:', agentQuery);
  
  // Only show loading indicator for non-refresh operations
  if (!isRefresh) {
    const resultsContainer = document.getElementById('requester-results');
    resultsContainer.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm" role="status"></div> Loading...</div>';
    resultsContainer.style.display = 'block';
  }
  
  // Search both requesters and agents, and then combine results
  searchRequestersOnly(searchTerm, requesterQuery, agentQuery, isRefresh, []);
}

/**
 * Search for requesters only, then proceed to search for agents
 * @param {string} searchTerm - Original search term
 * @param {string} requesterQuery - Encoded query string for requesters
 * @param {string} agentQuery - Encoded query string for agents
 * @param {boolean} isRefresh - Whether this is a cache refresh operation
 * @param {Array} existingResults - Results collected so far
 */
function searchRequestersOnly(searchTerm, requesterQuery, agentQuery, isRefresh, existingResults) {
  // Function to load requester results from a specific page
  function loadRequestersPage(page = 1, allResults = []) {
    // Use invokeTemplate with path suffix to add query parameter
    const requestUrl = `?query=${requesterQuery}&page=${page}&per_page=30`;
    console.log('Requester API URL:', requestUrl);
    
    window.client.request.invokeTemplate("getRequesters", {
      path_suffix: requestUrl
    })
    .then(function(data) {
      try {
        if (!data) {
          console.error('No data returned from requester search');
          // Proceed to search agents
          searchAgentsOnly(searchTerm, agentQuery, isRefresh, allResults);
          return;
        }
        
        console.log('Requester search raw response:', data.response);
        const response = JSON.parse(data.response || '{"requesters":[]}');
        const requesters = response && response.requesters ? response.requesters : [];
        console.log(`Requester search returned ${requesters.length} results`);
        
        // Manual filtering if the API filtering isn't working
        const filteredRequesters = requesters.filter(requester => {
          const fullName = `${requester.first_name || ''} ${requester.last_name || ''}`.toLowerCase();
          const email = (requester.primary_email || requester.email || '').toLowerCase();
          const term = searchTerm.toLowerCase();
          return fullName.includes(term) || email.includes(term);
        });
        
        console.log(`Manual filtering returned ${filteredRequesters.length} results`);
        
        // Combine with previous results
        const combinedResults = [...allResults, ...filteredRequesters];
        
        // If we got a full page of results, there might be more
        if (requesters.length === 30 && page < 3) { // Limit to 3 pages (90 results) max
          // Load next page
          (async function() {
            const params = await getInstallationParams();
            const paginationDelay = params.paginationDelay || DEFAULT_PAGINATION_DELAY;
            
            updateLoadingMessage('requester-results', `Loading more results... (page ${page + 1})`);
            setTimeout(() => {
              loadRequestersPage(page + 1, combinedResults);
            }, paginationDelay);
          })().catch(err => {
            console.error('Error getting pagination delay:', err);
            // Default delay if error
            setTimeout(() => {
              loadRequestersPage(page + 1, combinedResults);
            }, DEFAULT_PAGINATION_DELAY);
          });
        } else {
          // Proceed to search agents
          searchAgentsOnly(searchTerm, agentQuery, isRefresh, combinedResults);
        }
      } catch (error) {
        console.error('Error parsing response:', error);
        // Proceed to search agents even if there was an error
        searchAgentsOnly(searchTerm, agentQuery, isRefresh, allResults);
      }
    })
    .catch(function(error) {
      console.error('API request failed:', error);
      // Proceed to search agents even if there was an error
      searchAgentsOnly(searchTerm, agentQuery, isRefresh, allResults);
    });
  }
  
  // Start loading from page 1
  loadRequestersPage(1, existingResults);
}

/**
 * Search for agents and combine with requester results
 * @param {string} searchTerm - Original search term
 * @param {string} agentQuery - Encoded query string for agents
 * @param {boolean} isRefresh - Whether this is a cache refresh operation
 * @param {Array} requesterResults - Results from requester search
 */
function searchAgentsOnly(searchTerm, agentQuery, isRefresh, requesterResults) {
  // Function to load agent results from a specific page
  function loadAgentsPage(page = 1, allResults = []) {
    // Use invokeTemplate with path suffix to add query parameter
    const requestUrl = `?query=${agentQuery}&page=${page}&per_page=30`;
    console.log('Agent API URL for requester search:', requestUrl);
    
    window.client.request.invokeTemplate("getAgents", {
      path_suffix: requestUrl
    })
    .then(function(data) {
      try {
        if (!data) {
          console.error('No data returned from agent search');
          // Complete the search with existing results
          finalizeRequesterSearch(searchTerm, [...requesterResults, ...allResults], isRefresh);
          return;
        }
        
        console.log('Agent search raw response for requester search:', data.response);
        const response = JSON.parse(data.response || '{"agents":[]}');
        const agents = response && response.agents ? response.agents : [];
        console.log(`Agent search for requester returned ${agents.length} results`);
        
        // Manual filtering if the API filtering isn't working
        const filteredAgents = agents.filter(agent => {
          const fullName = `${agent.first_name || ''} ${agent.last_name || ''}`.toLowerCase();
          const email = (agent.email || '').toLowerCase();
          const term = searchTerm.toLowerCase();
          return fullName.includes(term) || email.includes(term);
        });
        
        console.log(`Manual filtering returned ${filteredAgents.length} agent results for requester search`);
        
        // Combine with previous agent results
        const combinedAgentResults = [...allResults, ...filteredAgents];
        
        // If we got a full page of results, there might be more
        if (agents.length === 30 && page < 3) { // Limit to 3 pages (90 results) max
          // Load next page with pagination delay
          (async function() {
            try {
              const params = await getInstallationParams();
              const paginationDelay = params.paginationDelay || DEFAULT_PAGINATION_DELAY;
              
              updateLoadingMessage('requester-results', `Loading more results... (page ${page + 1})`);
              setTimeout(() => {
                loadAgentsPage(page + 1, combinedAgentResults);
              }, paginationDelay);
            } catch (err) {
              console.error('Error getting pagination delay:', err);
              // Default delay if error
              setTimeout(() => {
                loadAgentsPage(page + 1, combinedAgentResults);
              }, DEFAULT_PAGINATION_DELAY);
            }
          })();
        } else {
          // Complete the search with combined results
          finalizeRequesterSearch(searchTerm, [...requesterResults, ...combinedAgentResults], isRefresh);
        }
      } catch (error) {
        console.error('Error parsing agent response for requester search:', error);
        // Complete with existing results
        finalizeRequesterSearch(searchTerm, [...requesterResults, ...allResults], isRefresh);
      }
    })
    .catch(function(error) {
      console.error('Agent API request failed for requester search:', error);
      // Complete with existing results
      finalizeRequesterSearch(searchTerm, [...requesterResults, ...allResults], isRefresh);
    });
  }
  
  // Start loading from page 1
  loadAgentsPage(1, []);
}

/**
 * Finalize requester search with combined results
 * @param {string} searchTerm - Original search term
 * @param {Array} combinedResults - Combined requester and agent results
 * @param {boolean} isRefresh - Whether this is a cache refresh operation
 */
function finalizeRequesterSearch(searchTerm, combinedResults, isRefresh) {
  // Cache the results
  addToSearchCache('requesters', searchTerm, combinedResults);
  
  // Display all results with refresh status for logging
  console.log(`Displaying ${combinedResults.length} requester results (refresh: ${isRefresh})`);
  displaySearchResults('requester-results', combinedResults, selectRequester);
  
  // Add individual users to the user cache for later use
  if (combinedResults.length > 0) {
    cacheIndividualUsers(combinedResults, 'requester');
  }
}

/**
 * Search for agents using Freshservice API
 */
function searchAgents(e) {
  const searchTerm = e.target.value.trim();
  if (searchTerm.length < 2) return;

  // Show loading indicator
  const resultsContainer = document.getElementById('agent-results');
  resultsContainer.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm" role="status"></div> Loading...</div>';
  resultsContainer.style.display = 'block';
  
  // Check cache first
  getFromSearchCache('agents', searchTerm).then(cachedResults => {
    if (cachedResults) {
      // Use cached results
      displaySearchResults('agent-results', cachedResults, selectAgent);
      
      // Get the configured search cache timeout
      getInstallationParams().then(params => {
        const searchCacheTimeout = params.searchCacheTimeout;
        
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

  // Format the query using the specified format
  const encodedQuery = encodeURIComponent(`~[first_name|last_name|email]:'${searchTerm}'`);
  console.log(`${isRefresh ? 'Refreshing' : 'Performing'} agent search with query:`, encodedQuery);
  
  // Only show loading indicator for non-refresh operations
  if (!isRefresh) {
    const resultsContainer = document.getElementById('agent-results');
    resultsContainer.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm" role="status"></div> Loading...</div>';
    resultsContainer.style.display = 'block';
  }
  
  // Function to load results from a specific page
  function loadPage(page = 1, allResults = []) {
    // Use invokeTemplate with path suffix to add query parameter
    const requestUrl = `?query=${encodedQuery}&page=${page}&per_page=30`;
    console.log('Agent API URL:', requestUrl);
    
    window.client.request.invokeTemplate("getAgents", {
      path_suffix: requestUrl
    })
    .then(function(data) {
      try {
        if (!data) {
          console.error('No data returned from agent search');
          displaySearchResults('agent-results', allResults, selectAgent);
          // Cache even empty results to prevent repeated API calls
          addToSearchCache('agents', searchTerm, allResults);
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
        
        // Combine with previous results, avoiding duplicates
        const combinedResults = [...allResults, ...filteredAgents];
        
        // If we got a full page of results, there might be more
        if (agents.length === 30 && page < 3) { // Limit to 3 pages (90 results) max
          // Load next page with pagination delay
          (async function() {
            try {
              const params = await getInstallationParams();
              const paginationDelay = params.paginationDelay || DEFAULT_PAGINATION_DELAY;
              
              updateLoadingMessage('agent-results', `Loading more results... (page ${page + 1})`);
              setTimeout(() => {
                loadPage(page + 1, combinedResults);
              }, paginationDelay);
            } catch (err) {
              console.error('Error getting pagination delay:', err);
              // Default delay if error
              setTimeout(() => {
                loadPage(page + 1, combinedResults);
              }, DEFAULT_PAGINATION_DELAY);
            }
          })();
        } else {
          // Cache the results
          addToSearchCache('agents', searchTerm, combinedResults);
          
          // Display all results
          displaySearchResults('agent-results', combinedResults, selectAgent);
          
          // Add individual users to the user cache for later use
          if (combinedResults.length > 0) {
            cacheIndividualUsers(combinedResults, 'agent');
          }
        }
      } catch (error) {
        console.error('Error parsing response:', error);
        displaySearchResults('agent-results', allResults, selectAgent);
      }
    })
    .catch(function(error) {
      console.error('API request failed:', error);
      displaySearchResults('agent-results', allResults, selectAgent);
      handleErr(error);
    });
  }
  
  // Start loading from page 1
  loadPage(1, []);
}

/**
 * Cache individual users from search results for future reference
 * @param {Array} users - Array of user objects
 * @param {string} type - Type of user ('requester' or 'agent')
 */
async function cacheIndividualUsers(users, type) {
  try {
    // Get current user cache
    const cachedUsers = await getCachedUsers();
    
    // Add each user to the cache
    users.forEach(user => {
      if (user && user.id) {
        const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown';
        cachedUsers[user.id] = {
          name: displayName,
          data: user,
          timestamp: Date.now(),
          type: type
        };
      }
    });
    
    // Save updated cache
    await cacheUsers(cachedUsers);
    console.log(`Added ${users.length} ${type}s to user cache`);
  } catch (error) {
    console.error(`Error caching individual ${type}s:`, error);
  }
}

/**
 * Get location name by ID with caching
 * @param {number} locationId - Location ID 
 * @returns {Promise<string>} - Location name
 */
async function getLocationName(locationId) {
  if (!locationId) return 'N/A';
  
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
      console.log(`Using cached location: ${cachedLocations[locationId].name}`);
      return cachedLocations[locationId].name;
    }
    
    // If not in cache or expired, fetch from API
    // But first, check if we can trigger a full refresh to benefit other locations too
    if (Object.keys(cachedLocations).length === 0 || 
        Object.values(cachedLocations).some(loc => loc.timestamp < Date.now() - CACHE_TIMEOUT)) {
      console.log('Location cache expired or empty, fetching all locations');
      const allLocations = await fetchAllLocations();
      
      // Check if our target location was included in the refresh
      if (allLocations[locationId]) {
        return allLocations[locationId].name;
      }
    }
    
    // If we still don't have the location after a refresh attempt, get it individually
    console.log(`Fetching individual location ${locationId} from API`);
    const response = await window.client.request.invokeTemplate("getLocation", {
      path_suffix: `/${locationId}`
    });
    
    if (!response || !response.response) {
      console.error('Invalid location response:', response);
      return 'Unknown';
    }
    
    try {
      const parsedData = JSON.parse(response.response || '{}');
      if (parsedData && parsedData.location && parsedData.location.name) {
        const locationName = parsedData.location.name;
        
        // Update cache
        cachedLocations[locationId] = {
          name: locationName,
          timestamp: Date.now()
        };
        await cacheLocations(cachedLocations);
        
        return locationName;
      }
      return 'Unknown';
    } catch (parseError) {
      console.error('Error parsing location response:', parseError);
      return 'Unknown';
    }
  } catch (error) {
    console.error('Error fetching location:', error);
    return 'Unknown';
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

/**
 * Display search results with enhanced information
 */
function displaySearchResults(containerId, results, selectionCallback) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  container.style.display = results.length ? 'block' : 'none';
  
  if (results.length === 0) {
    container.innerHTML = '<div class="list-group-item search-result-item no-results">No results found</div>';
    container.style.display = 'block';
    return;
  }
  
  // First enhance all contacts with location and manager information
  Promise.all(results.map(async (result) => {
    // Only fetch additional info if we have IDs but don't have names yet
    if ((result.location_id && !result.location_name) || 
        (result.reporting_manager_id && !result.manager_name)) {
      return await enhanceContactInfo(result);
    }
    return result;
  }))
  .then(enhancedResults => {
    // Now render with the enhanced data
    enhancedResults.forEach(result => {
      const resultItem = document.createElement('div');
      resultItem.className = 'list-group-item search-result-item d-flex flex-column';
      
      // Basic information
      const email = result.email || result.primary_email || '';
      
      // Create a container for name and badges
      const headerDiv = document.createElement('div');
      headerDiv.className = 'd-flex justify-content-between align-items-center w-100';
      
      // Name with proper styling
      const nameDiv = document.createElement('div');
      nameDiv.className = 'fw-bold';
      nameDiv.textContent = `${result.first_name} ${result.last_name}`;
      headerDiv.appendChild(nameDiv);
      
      // Role/type badge - determine type based on object properties
      const roleDiv = document.createElement('div');
      // Check if the result is an agent by looking for agent-specific properties
      // Agents typically have 'email' property while requesters have 'primary_email'
      const isAgent = result.hasOwnProperty('email') && !result.hasOwnProperty('primary_email');
      const type = containerId.includes('agent') || isAgent ? 'Agent' : 'Requester';
      roleDiv.innerHTML = `<span class="badge ${type === 'Agent' ? 'bg-info' : 'bg-primary'}">${type}</span>`;
      headerDiv.appendChild(roleDiv);
      
      resultItem.appendChild(headerDiv);
      
      // Email
      const emailDiv = document.createElement('div');
      emailDiv.className = 'text-secondary small';
      emailDiv.innerHTML = `<i class="fas fa-envelope me-1"></i>${email}`;
      resultItem.appendChild(emailDiv);
      
      // Details container for additional info
      const detailsContainer = document.createElement('div');
      detailsContainer.className = 'mt-2 d-flex flex-wrap gap-2';
      
      // Add job title badge if available
      if (result.job_title) {
        const jobTitleBadge = document.createElement('span');
        jobTitleBadge.className = 'badge bg-light text-dark border';
        jobTitleBadge.innerHTML = `<i class="fas fa-briefcase me-1"></i>${result.job_title}`;
        detailsContainer.appendChild(jobTitleBadge);
      }
      
      // Add department badge if available
      if (result.department_names && result.department_names.length > 0) {
        const deptBadge = document.createElement('span');
        deptBadge.className = 'badge bg-light text-dark border';
        deptBadge.innerHTML = `<i class="fas fa-building me-1"></i>${result.department_names[0]}`;
        detailsContainer.appendChild(deptBadge);
      }
      
      // Add location badge if available (enhanced info)
      if (result.location_name) {
        const locBadge = document.createElement('span');
        locBadge.className = 'badge bg-light text-dark border';
        locBadge.innerHTML = `<i class="fas fa-map-marker-alt me-1"></i>${result.location_name}`;
        detailsContainer.appendChild(locBadge);
      } else if (result.location_id) {
        // Display "Loading..." if we have a location ID but no name yet
        const locBadge = document.createElement('span');
        locBadge.className = 'badge bg-light text-dark border';
        locBadge.innerHTML = `<i class="fas fa-map-marker-alt me-1"></i>Loading...`;
        detailsContainer.appendChild(locBadge);
      }
      
      // Add manager badge if available (enhanced info)
      if (result.manager_name) {
        const mgrBadge = document.createElement('span');
        mgrBadge.className = 'badge bg-light text-dark border';
        mgrBadge.innerHTML = `<i class="fas fa-user-tie me-1"></i>${result.manager_name}`;
        detailsContainer.appendChild(mgrBadge);
      }
      
      // Only add details container if we have any badges
      if (detailsContainer.children.length > 0) {
        resultItem.appendChild(detailsContainer);
      }
      
      // Add hover effect and clickable styling
      resultItem.classList.add('search-item-hover');
      
      // Store the full result object for selection
      resultItem.addEventListener('click', () => {
        selectionCallback(result);
      });
      
      container.appendChild(resultItem);
    });
  })
  .catch(error => {
    console.error('Error enhancing search results:', error);
    // Fallback to basic display without enhancement
    results.forEach(result => {
      const resultItem = document.createElement('div');
      resultItem.className = 'list-group-item search-result-item';
      resultItem.innerHTML = `<div class="fw-bold">${result.first_name} ${result.last_name}</div>`;
      resultItem.addEventListener('click', () => selectionCallback(result));
      container.appendChild(resultItem);
    });
  });
}

/**
 * Enhance contact information with location name and manager name
 */
async function enhanceContactInfo(contact) {
  try {
    // Make a copy to avoid modifying the original
    const enhancedContact = { ...contact };
    
    // Add location name if location ID exists and location_name doesn't already exist
    if (contact.location_id && !contact.location_name) {
      enhancedContact.location_name = await getLocationName(contact.location_id);
      console.log(`Enhanced contact with location: ${enhancedContact.location_name}`);
    }
    
    // Add manager name if manager ID exists and manager_name doesn't already exist
    if (contact.reporting_manager_id && !contact.manager_name) {
      enhancedContact.manager_name = await getUserName(contact.reporting_manager_id);
      console.log(`Enhanced contact with manager: ${enhancedContact.manager_name}`);
    }
    
    return enhancedContact;
  } catch (error) {
    console.error('Error enhancing contact info:', error);
    return contact;
  }
}

function selectRequester(requester) {
  changeRequestData.requester = requester;
  const selectedContainer = document.getElementById('selected-requester');
  
  // Create detailed requester info display with improved styling
  let requesterInfo = `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <div>
        <div class="fw-bold">${requester.first_name} ${requester.last_name}</div>
        <div class="text-secondary small"><i class="fas fa-envelope me-1"></i>${requester.email || requester.primary_email}</div>
      </div>
      <div>
        <span class="badge bg-primary me-2">Requester</span>
        <button class="btn btn-sm btn-outline-secondary clear-requester" type="button"><i class="fas fa-times"></i></button>
      </div>
    </div>
  `;
  
  // Add badges for additional details in a flex container
  const detailsList = [];
  
  if (requester.job_title) {
    detailsList.push(`<span class="badge bg-light text-dark border"><i class="fas fa-briefcase me-1"></i>${requester.job_title}</span>`);
  }
  
  if (requester.location_name) {
    detailsList.push(`<span class="badge bg-light text-dark border"><i class="fas fa-map-marker-alt me-1"></i>${requester.location_name}</span>`);
  }
  
  if (requester.manager_name) {
    detailsList.push(`<span class="badge bg-light text-dark border"><i class="fas fa-user-tie me-1"></i>${requester.manager_name}</span>`);
  }
  
  if (requester.department_names && requester.department_names.length > 0) {
    detailsList.push(`<span class="badge bg-light text-dark border"><i class="fas fa-building me-1"></i>${requester.department_names[0]}</span>`);
  }
  
  if (detailsList.length > 0) {
    requesterInfo += `<div class="d-flex flex-wrap gap-2 mt-1">${detailsList.join('')}</div>`;
  }
  
  selectedContainer.innerHTML = requesterInfo;
  selectedContainer.style.display = 'block';
  selectedContainer.classList.add('p-2', 'border', 'rounded', 'bg-light');
  
  // Add event listener to the clear button
  document.querySelector('.clear-requester').addEventListener('click', clearRequester);
  
  document.getElementById('requester-results').style.display = 'none';
  document.getElementById('requester-search').value = '';
  
  // Save to data storage
  saveCurrentData();
}

function selectAgent(agent) {
  changeRequestData.agent = agent;
  const selectedContainer = document.getElementById('selected-agent');
  
  // Create detailed agent info display with improved styling
  let agentInfo = `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <div>
        <div class="fw-bold">${agent.first_name} ${agent.last_name}</div>
        <div class="text-secondary small"><i class="fas fa-envelope me-1"></i>${agent.email}</div>
      </div>
      <div>
        <span class="badge bg-info me-2">Agent</span>
        <button class="btn btn-sm btn-outline-secondary clear-agent" type="button"><i class="fas fa-times"></i></button>
      </div>
    </div>
  `;
  
  // Add badges for additional details in a flex container
  const detailsList = [];
  
  if (agent.job_title) {
    detailsList.push(`<span class="badge bg-light text-dark border"><i class="fas fa-briefcase me-1"></i>${agent.job_title}</span>`);
  }
  
  if (agent.location_name) {
    detailsList.push(`<span class="badge bg-light text-dark border"><i class="fas fa-map-marker-alt me-1"></i>${agent.location_name}</span>`);
  }
  
  if (agent.manager_name) {
    detailsList.push(`<span class="badge bg-light text-dark border"><i class="fas fa-user-tie me-1"></i>${agent.manager_name}</span>`);
  }
  
  if (agent.department_names && agent.department_names.length > 0) {
    detailsList.push(`<span class="badge bg-light text-dark border"><i class="fas fa-building me-1"></i>${agent.department_names[0]}</span>`);
  }
  
  if (detailsList.length > 0) {
    agentInfo += `<div class="d-flex flex-wrap gap-2 mt-1">${detailsList.join('')}</div>`;
  }
  
  selectedContainer.innerHTML = agentInfo;
  selectedContainer.style.display = 'block';
  selectedContainer.classList.add('p-2', 'border', 'rounded', 'bg-light');
  
  // Add event listener to the clear button
  document.querySelector('.clear-agent').addEventListener('click', clearAgent);
  
  document.getElementById('agent-results').style.display = 'none';
  document.getElementById('agent-search').value = '';
  
  // Save to data storage
  saveCurrentData();
}

// Function to clear the selected requester
function clearRequester() {
  // Clear the data
  changeRequestData.requester = null;
  
  // Clear the UI
  const selectedContainer = document.getElementById('selected-requester');
  selectedContainer.innerHTML = '';
  selectedContainer.style.display = 'none';
  selectedContainer.classList.remove('p-2', 'border', 'rounded', 'bg-light');
  
  // Save to data storage
  saveCurrentData();
}

// Function to clear the selected agent
function clearAgent() {
  // Clear the data
  changeRequestData.agent = null;
  
  // Clear the UI
  const selectedContainer = document.getElementById('selected-agent');
  selectedContainer.innerHTML = '';
  selectedContainer.style.display = 'none';
  selectedContainer.classList.remove('p-2', 'border', 'rounded', 'bg-light');
  
  // Save to data storage
  saveCurrentData();
}

function updateChangeType(e) {
  const changeType = e.target.value;
  changeRequestData.changeType = changeType;
  changeRequestData.leadTime = leadTimeText[changeType];
  
  document.getElementById('lead-time').textContent = leadTimeText[changeType];
  
  // Save to data storage
  saveCurrentData();
}

function validateDetailsAndNext() {
  // Basic validation
  if (!changeRequestData.requester) {
    showNotification('error', 'Please select a requester');
    return;
  }
  
  if (!changeRequestData.agent) {
    showNotification('error', 'Please select an agent (Technical SME)');
    return;
  }
  
  if (!changeRequestData.plannedStart) {
    showNotification('error', 'Please select a planned start date and time');
    return;
  }
  
  if (!changeRequestData.plannedEnd) {
    showNotification('error', 'Please select a planned end date and time');
    return;
  }
  
  // Validate start and end dates
  const startDate = new Date(changeRequestData.plannedStart);
  const endDate = new Date(changeRequestData.plannedEnd);
  
  if (endDate <= startDate) {
    showNotification('error', 'Planned end date must be after the planned start date');
    return;
  }
  
  // Use our robust tab switching function instead of direct Bootstrap access
  switchTab('risk-assessment');
}

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
  
  changeRequestData.riskAssessment[questionMapping[question]] = value;
  
  // Save to data storage
  saveCurrentData();
}

function calculateRisk() {
  // Check if all questions are answered
  const riskKeys = ['businessImpact', 'affectedUsers', 'complexity', 'testing', 'rollback'];
  const unansweredQuestions = riskKeys.filter(key => changeRequestData.riskAssessment[key] === 0);
  
  if (unansweredQuestions.length > 0) {
    showNotification('error', 'Please answer all risk assessment questions');
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
  document.getElementById('risk-score-value').textContent = totalScore;
  
  const riskLevelElement = document.getElementById('risk-level-value');
  riskLevelElement.textContent = riskLevel;
  riskLevelElement.className = `badge ${getRiskBadgeClass(riskLevel)}`;
  
  document.getElementById('risk-explanation').textContent = riskExplanation;
  document.getElementById('risk-result').classList.remove('hidden');
  
  // Save to data storage
  saveCurrentData();
}

function validateRiskAndNext() {
  if (changeRequestData.riskAssessment.totalScore === 0) {
    showNotification('error', 'Please calculate the risk score before proceeding');
    return;
  }
  
  // Use our robust tab switching function instead of direct Bootstrap access
  switchTab('impacted-assets');
}

/**
 * Search for assets using Freshservice API
 * @param {Event|Object} e - Event object from input or click
 */
function searchAssets(e) {
  // Get search term if available, might be empty for initial asset listing
  const searchTerm = e.target && e.target.value ? e.target.value.trim() : '';
  
  console.log(`🔍 Asset search triggered with term: "${searchTerm}"`);
  
  // Reset search state for new search
  assetSearchState.currentSearchTerm = searchTerm;
  assetSearchState.currentPage = 1;
  assetSearchState.isLoading = false;
  assetSearchState.hasMoreResults = true;
  assetSearchState.totalResults = 0;
  assetSearchState.initialLoad = !searchTerm; // Flag to indicate initial asset listing
  
  // Clear search results container
  const resultsContainer = document.getElementById('asset-results');
  resultsContainer.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm" role="status"></div> Loading...</div>';
  resultsContainer.style.display = 'block';
  
  // Check if forced refresh is requested (via button click)
  const isForceRefresh = e.forceRefresh === true;

  // Ensure client is available
  if (!window.client || !window.client.request) {
    console.error('Client or request object not available for asset search');
    handleErr('API client not initialized. Please refresh the page.');
    return;
  }

  // For initial load (no search term), use asset_type_id search only
  if (!searchTerm) {
    console.log('Initial asset listing - showing all assets of configured type');
    
    // Skip cache check for initial load if force refresh is requested
    if (!isForceRefresh) {
      // Get the asset type IDs from configuration
      findSoftwareServicesAssetTypeIds().then(assetTypeIds => {
        if (!assetTypeIds || assetTypeIds.length === 0) {
          console.log('No asset type IDs configured, performing initial asset listing without filtering');
          performInitialAssetListing();
          return;
        }
        
        // Generate consistent cache key for the configured asset types
        const cacheKey = generateAssetTypeCacheKey(assetTypeIds);
        console.log(`🔑 Using cache key: "${cacheKey}" for asset types: ${assetTypeIds.join(', ')}`);
        
        // Use special cache key for initial asset listing with asset type IDs
        getAssetsByTypeFromCache('initial_asset_listing', cacheKey).then(cachedResults => {
    if (cachedResults) {
      // Use cached results
            console.log(`Using CACHED results for initial asset listing types ${assetTypeIds.join(', ')} (${cachedResults.length} items)`);
            displayAssetResults('asset-results', cachedResults, selectAsset, true);
            assetSearchState.totalResults = cachedResults.length;
            
            // Setup scroll event for infinite scroll after displaying results
            setupAssetSearchScroll();
            return;
          }
          
          // No cache hit, perform initial asset listing
          console.log(`No cache found for initial asset listing types ${assetTypeIds.join(', ')}, querying API...`);
          performInitialAssetListing();
        }).catch(error => {
          console.error('Error checking asset search cache:', error);
          // Fallback to direct search on cache error
          performInitialAssetListing();
        });
      }).catch(error => {
        console.error('Error getting asset type IDs:', error);
        // Fallback to direct search on params error
        performInitialAssetListing();
      });
    } else {
      // Skip cache for forced refresh
      console.log('Forced refresh requested for initial asset listing, bypassing cache...');
      performInitialAssetListing();
    }
    return;
  }

  // Regular search with search term
  // Check cache first (unless forced refresh)
  if (!isForceRefresh) {
    // Get the configured asset type IDs
    findSoftwareServicesAssetTypeIds().then(assetTypeIds => {
      if (!assetTypeIds || assetTypeIds.length === 0) {
        console.log('No asset type IDs configured, performing search without type filtering');
        performAssetSearch(searchTerm);
        return;
      }
      
      // Generate consistent cache key for the configured asset types
      const cacheKey = generateAssetTypeCacheKey(assetTypeIds);
      console.log(`🔑 Using cache key: "${cacheKey}" for search term "${searchTerm}" with asset types: ${assetTypeIds.join(', ')}`);
      
      // Check type-specific cache
      getAssetsByTypeFromCache(searchTerm, cacheKey).then(cachedResults => {
        if (cachedResults) {
          // Use cached results
          console.log(`Using CACHED results for types ${assetTypeIds.join(', ')}, term "${searchTerm}" (${cachedResults.length} items)`);
          displayAssetResults('asset-results', cachedResults, selectAsset, true);
          assetSearchState.totalResults = cachedResults.length;
          
          // Setup scroll event for infinite scroll after displaying results
          setupAssetSearchScroll();
      
      // Get the configured search cache timeout
      getInstallationParams().then(params => {
        const searchCacheTimeout = params.searchCacheTimeout;
        
        // Set a timer to check for fresh results after the timeout
        setTimeout(() => {
          // Only perform API call if the search term is still the current one
              if (assetSearchState.currentSearchTerm === searchTerm) {
            console.log(`Cache timeout reached (${searchCacheTimeout}ms), refreshing asset search for: ${searchTerm}`);
            performAssetSearch(searchTerm, true);
          }
        }, searchCacheTimeout);
      });
      
      return;
    }
    
    // No cache hit, perform search immediately
        console.log(`No cache found for types ${assetTypeIds.join(', ')}, term "${searchTerm}", querying API...`);
    performAssetSearch(searchTerm);
  }).catch(error => {
    console.error('Error checking asset search cache:', error);
    // Fallback to direct search on cache error
    performAssetSearch(searchTerm);
  });
    }).catch(error => {
      console.error('Error getting asset type IDs:', error);
      // Fallback to direct search on error
      performAssetSearch(searchTerm);
    });
  } else {
    // Skip cache for forced refresh
    console.log(`Forced refresh requested for "${searchTerm}", bypassing cache...`);
    performAssetSearch(searchTerm, false);
  }
}

/**
 * Perform the initial asset listing without search term
 */
function performInitialAssetListing() {
  findSoftwareServicesAssetTypeIds().then(assetTypeIds => {
    // Only proceed if asset type IDs are configured
    if (!assetTypeIds || assetTypeIds.length === 0) {
      console.log('No asset type IDs configured, showing empty results');
      displayAssetResults('asset-results', [], selectAsset, false);
      return;
    }
    
    console.log(`Loading initial asset listing for type IDs: ${assetTypeIds.join(', ')}`);
    
    // Build query for multiple asset types using Freshservice API syntax
    let assetTypeQuery = '';
    if (assetTypeIds.length === 1) {
      assetTypeQuery = `asset_type_id:${assetTypeIds[0]}`;
    } else {
      // For multiple types, use OR syntax
      assetTypeQuery = assetTypeIds.map(id => `asset_type_id:${id}`).join(' OR ');
    }
    
    console.log(`🔍 Initial listing query: "${assetTypeQuery}"`);
    const encodedQuery = assetTypeQuery ? encodeURIComponent(assetTypeQuery) : '';
    
    // Function to load assets page
    async function loadAssetsPage(page = 1, allResults = []) {
      try {
        console.log(`Loading initial assets page ${page} with filter for types: ${assetTypeIds.join(', ')}`);
        
        // Construct the API path with proper query parameters
        let pathSuffix = `?include=type_fields&page=${page}&per_page=100`;
        
        // Add asset type filter if we have configured types
        if (encodedQuery) {
          pathSuffix = `?include=type_fields&query=${encodedQuery}&page=${page}&per_page=100`;
        }
        
        console.log(`📡 Initial listing API call: /api/v2/assets${pathSuffix}`);
          
        const data = await window.client.request.invokeTemplate("getAssets", {
          path_suffix: pathSuffix
        });
        
        if (!data || !data.response) {
          return { assets: allResults };
        }
        
        const response = JSON.parse(data.response);
        const assets = response && response.assets ? response.assets : [];
        
        console.log(`📦 Initial listing returned ${assets.length} results for page ${page}`);
        
        // Log sample asset and check asset type IDs
        if (assets.length > 0) {
          console.log('📋 Sample asset from initial listing:', {
            id: assets[0].id,
            name: assets[0].name,
            display_name: assets[0].display_name,
            asset_type_id: assets[0].asset_type_id,
            parent_asset_type_id: assets[0].parent_asset_type_id
          });
        }
        
        // If API filtering didn't work perfectly, apply additional manual filtering
        const targetTypeIds = Array.isArray(assetTypeIds) ? assetTypeIds : [assetTypeIds];
        
        // Filter to only include assets that match our target types
        // Check both asset_type_id and parent_asset_type_id for broader coverage
        const filteredAssets = assets.filter(asset => {
          const directMatch = targetTypeIds.includes(asset.asset_type_id);
          const parentMatch = asset.parent_asset_type_id && targetTypeIds.includes(asset.parent_asset_type_id);
          return directMatch || parentMatch;
        });
        
        console.log(`🔽 Filtered to ${filteredAssets.length} of ${assets.length} assets matching configured types`);
        
        // Log details for debugging if no matches
        if (filteredAssets.length === 0 && assets.length > 0) {
          console.log('❌ No assets matched configured types in initial listing. Found these types instead:');
          const foundTypes = [...new Set(assets.map(a => a.asset_type_id))];
          foundTypes.forEach(typeId => {
            const count = assets.filter(a => a.asset_type_id === typeId).length;
            console.log(`   - Type ${typeId}: ${count} assets (${getAssetTypeNameSync(typeId)})`);
          });
          
          // Trigger detailed asset type investigation
          console.log('🔍 DEBUGGING: Let me check what asset types actually have assets...');
          setTimeout(() => {
            checkAvailableAssetTypes();
          }, 1000);
        } else if (filteredAssets.length > 0) {
          // Show sample of matched assets
          console.log(`✅ Sample matched assets from initial listing:`);
          filteredAssets.slice(0, 5).forEach(asset => {
            console.log(`   - "${asset.name || asset.display_name}" (ID: ${asset.id}, Type: ${asset.asset_type_id})`);
          });
        }
        
        // Combine with previous results, avoiding duplicates
        const existingIds = new Set(allResults.map(asset => asset.id));
        const newAssets = filteredAssets.filter(asset => !existingIds.has(asset.id));
        const combinedResults = [...allResults, ...newAssets];
        
        console.log(`📊 Page ${page}: ${newAssets.length} new assets added (${filteredAssets.length - newAssets.length} duplicates skipped)`);
        
        // Check if we should load more pages
        const shouldLoadMore = assets.length > 0 && page < 10 && (assets.length >= 10 || filteredAssets.length > 0);
        
        console.log(`📄 Search pagination decision for page ${page}: hasResults=${assets.length > 0}, withinLimit=${page < 10}, worthContinuing=${assets.length >= 10 || filteredAssets.length > 0}, shouldLoadMore=${shouldLoadMore}`);
        
        if (shouldLoadMore) {
          // Get pagination delay from params
          const params = await getInstallationParams();
          const paginationDelay = params.paginationDelay || DEFAULT_PAGINATION_DELAY;
          
          
          console.log(`🔄 Loading page ${page + 1} after ${paginationDelay}ms delay...`);
          updateLoadingMessage('asset-results', `Loading more results... (page ${page + 1})`);
          
          // Wait for the delay before loading the next page
          await new Promise(resolve => setTimeout(resolve, paginationDelay));
          
          // Load next page
          return await loadAssetsPage(page + 1, combinedResults);
        }
        
        console.log(`✅ Completed asset loading: ${combinedResults.length} total assets across ${page} pages`);
        return { assets: combinedResults };
      } catch (error) {
        console.error('Error loading initial assets:', error);
        return { assets: allResults };
      }
    }
    
    // Start loading from page 1
    loadAssetsPage(1)
      .then(response => {
        const assets = response.assets || [];
        
        if (assets.length === 0) {
          console.log('❌ No assets found of the configured types, showing empty results');
          console.log('🔍 DEBUGGING: Let me check what asset types actually have assets...');
          
          // Try to get a sample of all assets to see what types are available
          checkAvailableAssetTypes();
          
          displayAssetResults('asset-results', [], selectAsset, false);
          return;
        }
        
        console.log(`✅ Found ${assets.length} assets matching the configured asset types`);
        
        // Show sample of found assets
        console.log(`📋 Sample assets found:`);
        assets.slice(0, 5).forEach(asset => {
          console.log(`   - "${asset.name || asset.display_name}" (ID: ${asset.id}, Type: ${asset.asset_type_id})`);
        });
        if (assets.length > 5) {
          console.log(`   ... and ${assets.length - 5} more assets`);
        }
        
        // Process assets with needed fields
        const processedAssets = processAssetResults(assets);
        
        // Cache the results for future use with asset type IDs
        // Generate consistent cache key for the configured asset types
        const cacheKey = generateAssetTypeCacheKey(assetTypeIds);
        addAssetsToTypeCache('initial_asset_listing', cacheKey, processedAssets);
        
        // Display the results
        displayAssetResults('asset-results', processedAssets, selectAsset, false);
        
        // Setup scroll event
        setupAssetSearchScroll();
        
        // Update total count
        assetSearchState.totalResults = processedAssets.length;
      })
      .catch(error => {
        console.error('Initial asset listing failed:', error);
        displayAssetResults('asset-results', [], selectAsset, false);
        handleErr('Failed to load initial asset listing. Please try again.');
      });
  }).catch(error => {
    console.error('Failed to get installation params:', error);
    displayAssetResults('asset-results', [], selectAsset, false);
    handleErr('Failed to load configuration. Please refresh and try again.');
  });
}

/**
 * Setup scroll event listener for asset search results
 */
function setupAssetSearchScroll() {
  const resultsContainer = document.getElementById('asset-results');
  
  // Remove any existing scroll listener
  if (resultsContainer._scrollHandler) {
    resultsContainer.removeEventListener('scroll', resultsContainer._scrollHandler);
  }
  
  // Define the scroll handler
  resultsContainer._scrollHandler = function() {
    // Check if we're near the bottom (within 100px)
    const scrollPosition = resultsContainer.scrollTop + resultsContainer.clientHeight;
    const scrollThreshold = resultsContainer.scrollHeight - 100;
    
    if (scrollPosition >= scrollThreshold && 
        !assetSearchState.isLoading && 
        assetSearchState.hasMoreResults) {
      console.log('Reached scroll threshold, loading more asset results...');
      loadMoreAssetResults();
    }
  };
  
  // Add the scroll listener
  resultsContainer.addEventListener('scroll', resultsContainer._scrollHandler);
}

/**
 * Load more asset results when scrolling
 */
function loadMoreAssetResults() {
  // Prevent multiple simultaneous loads
  if (assetSearchState.isLoading || !assetSearchState.hasMoreResults) {
    return;
  }
  
  // Set loading state
  assetSearchState.isLoading = true;
  
  // Increment page number
  assetSearchState.currentPage++;
  
  // Show loading indicator at the bottom of results
  const resultsContainer = document.getElementById('asset-results');
  const loadingIndicator = document.createElement('div');
  loadingIndicator.id = 'load-more-indicator';
  loadingIndicator.className = 'text-center p-3';
  loadingIndicator.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div> Loading more...';
  resultsContainer.appendChild(loadingIndicator);
  
  console.log(`Loading more asset results, page ${assetSearchState.currentPage}`);
  
  // Call the API with the next page
  performAssetSearch(assetSearchState.currentSearchTerm, false, assetSearchState.currentPage);
}

/**
 * Get asset type name synchronously from cache (for debugging)
 * @param {number} assetTypeId - Asset type ID
 * @returns {string} - Asset type name or 'Unknown'
 */
function getAssetTypeNameSync(assetTypeId) {
  // This is a synchronous version for debugging purposes
  // It only works if the asset types are already cached
  try {
    // Try to get from the global assetTypeCache first
    if (assetTypeCache.byId && assetTypeCache.byId[assetTypeId]) {
      return assetTypeCache.byId[assetTypeId].name;
    }
    
    // Fallback to a simple lookup based on known IDs from the console output
    const knownTypes = {
      37000374722: "Software/Services",
      37000374723: "Business Software", 
      37000374726: "IT Software",
      37000374730: "ISP"
    };
    
    return knownTypes[assetTypeId] || `Unknown (${assetTypeId})`;
  } catch (error) {
    return `Unknown (${assetTypeId})`;
  }
}

/**
 * Perform the actual API search for assets
 * @param {string} searchTerm - The search term
 * @param {boolean} isRefresh - Whether this is a cache refresh operation
 * @param {number} pageNum - The page number to load (for infinite scroll)
 */
async function performAssetSearch(searchTerm, isRefresh = false) {
  // Only show loading indicator for non-refresh operations
  if (!isRefresh) {
    const resultsContainer = document.getElementById('asset-results');
    resultsContainer.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm" role="status"></div> Loading...</div>';
    resultsContainer.style.display = 'block';
  }
  
  // Find the correct software/services asset type IDs from cache
  const assetTypeIds = await findSoftwareServicesAssetTypeIds();
  // Log asset type IDs
  console.log(`Using software/services asset type IDs for search: ${assetTypeIds.join(', ')}`);
  console.log(`🎯 Target asset type IDs: ${assetTypeIds.map(id => `${id} (${getAssetTypeNameSync(id)})`).join(', ')}`);

  // Build query for multiple asset types using Freshservice API syntax
  // For multiple asset types, we can use OR logic: asset_type_id:123 OR asset_type_id:456
  let assetTypeQuery = '';
  if (assetTypeIds && assetTypeIds.length > 0) {
    if (assetTypeIds.length === 1) {
      assetTypeQuery = `asset_type_id:${assetTypeIds[0]}`;
    } else {
      // For multiple types, use OR syntax
      assetTypeQuery = assetTypeIds.map(id => `asset_type_id:${id}`).join(' OR ');
    }
  }
  
  console.log(`🔍 Asset type query: "${assetTypeQuery}"`);
  const encodedAssetTypeQuery = assetTypeQuery ? encodeURIComponent(assetTypeQuery) : '';
  
  // Arrays to store all results from pagination
  let allAssets = [];
  
  // Function to load assets from a specific page
  async function loadAssetsPage(page = 1) {
    console.log(`Loading assets page ${page} with filter for asset types: ${assetTypeIds.join(', ')}`);
    try {
      // Construct the API path with proper query parameters
      let pathSuffix = `?page=${page}&per_page=100`;
      
      // Add asset type filter if we have configured types
      if (encodedAssetTypeQuery) {
        pathSuffix = `?query=${encodedAssetTypeQuery}&page=${page}&per_page=100`;
      }
      
      console.log(`📡 API call: /api/v2/assets${pathSuffix}`);
      
      const data = await window.client.request.invokeTemplate("getAssets", {
        path_suffix: pathSuffix
      });
      
      if (!data || !data.response) {
        return { assets: [] };
      }
      
      try {
        const response = JSON.parse(data.response);
        const assets = response && response.assets ? response.assets : [];
        console.log(`📦 API returned ${assets.length} assets for page ${page}`);
        
        // Log sample asset to check if filtering is working
        if (assets.length > 0) {
          console.log('📋 Sample asset from API:', {
            id: assets[0].id,
            name: assets[0].name,
            asset_type_id: assets[0].asset_type_id,
            parent_asset_type_id: assets[0].parent_asset_type_id
          });
        }
        
        // If API filtering didn't work perfectly, apply additional manual filtering
        const targetTypeIds = Array.isArray(assetTypeIds) ? assetTypeIds : [assetTypeIds];
        
        // Filter to only include assets that match our target types
        // Check both asset_type_id and parent_asset_type_id for broader coverage
        const filteredAssets = assets.filter(asset => {
          const directMatch = targetTypeIds.includes(asset.asset_type_id);
          const parentMatch = asset.parent_asset_type_id && targetTypeIds.includes(asset.parent_asset_type_id);
          return directMatch || parentMatch;
        });
        
        console.log(`🔽 Filtered to ${filteredAssets.length} of ${assets.length} assets matching configured types`);
        
        // Log details for debugging if no matches
        if (filteredAssets.length === 0 && assets.length > 0) {
          console.log('❌ No assets matched configured types. Found these types instead:');
          const foundTypes = [...new Set(assets.map(a => a.asset_type_id))];
          foundTypes.forEach(typeId => {
            const count = assets.filter(a => a.asset_type_id === typeId).length;
            console.log(`   - Type ${typeId}: ${count} assets (${getAssetTypeNameSync(typeId)})`);
          });
        } else if (filteredAssets.length > 0) {
          // Show sample of matched assets
          console.log(`✅ Sample matched assets:`);
          filteredAssets.slice(0, 3).forEach(asset => {
            console.log(`   - "${asset.name}" (Type: ${asset.asset_type_id})`);
          });
        }
        
        // Combine with previous results, avoiding duplicates
        const existingIds = new Set(allAssets.map(asset => asset.id));
        const newAssets = filteredAssets.filter(asset => !existingIds.has(asset.id));
        allAssets = [...allAssets, ...newAssets];
        
        console.log(`📊 Page ${page}: ${newAssets.length} new assets added (${filteredAssets.length - newAssets.length} duplicates skipped)`);
        
        // Check if we should load more pages
        const shouldLoadMore = assets.length > 0 && page < 10 && (assets.length >= 10 || filteredAssets.length > 0);
        
        if (shouldLoadMore) {
          // Get pagination delay from params
          const params = await getInstallationParams();
          const paginationDelay = params.paginationDelay || DEFAULT_PAGINATION_DELAY;
          
          console.log(`🔄 Loading page ${page + 1} after ${paginationDelay}ms delay...`);
          updateLoadingMessage('asset-results', `Loading more results... (page ${page + 1})`);
          
          // Wait for the delay before loading the next page
          await new Promise(resolve => setTimeout(resolve, paginationDelay));
          
          // Load next page
          return await loadAssetsPage(page + 1);
        }
        
        console.log(`✅ Completed asset loading: ${allAssets.length} total assets across ${page} pages`);
        return { assets: allAssets };
      } catch (error) {
        console.error('Error parsing assets response:', error);
        return { assets: allAssets };
      }
    } catch (error) {
      console.error('Asset API call failed:', error);
      return { assets: allAssets };
    }
  }
  
  // Start loading assets from page 1
  loadAssetsPage(1)
    .then(async function(assetsResponse) {
      try {
        // Get assets from the response
        const assets = assetsResponse.assets || [];
        
        // Apply the search term filter to the assets locally if we have a search term
        const filteredAssets = searchTerm ? assets.filter(asset => {
          const searchIn = [
            asset.name || '',
            asset.display_name || '',
            asset.description || '',
            asset.asset_tag || '',
            asset.serial_number || '',
            asset.product_name || '',
            asset.vendor_name || ''
          ].map(text => text.toLowerCase()).join(' ');
          
          return searchIn.includes(searchTerm.toLowerCase());
        }) : assets; // If no search term, return all assets that match the type filter
        
        console.log(`🔍 Applied search term filter: ${assets.length} → ${filteredAssets.length} assets matching "${searchTerm}"`);
        
        // Show what assets were available before search term filtering
        if (assets.length > 0 && searchTerm) {
          console.log(`📋 Available assets before search term filtering:`);
          assets.slice(0, 5).forEach(asset => {
            console.log(`   - "${asset.name || asset.display_name}" (ID: ${asset.id}, Type: ${asset.asset_type_id})`);
          });
          if (assets.length > 5) {
            console.log(`   ... and ${assets.length - 5} more assets`);
          }
        }
        
        if (filteredAssets.length > 0) {
          console.log('📝 Sample filtered asset:', {
            id: filteredAssets[0].id,
            name: filteredAssets[0].name,
            display_name: filteredAssets[0].display_name,
            asset_type_id: filteredAssets[0].asset_type_id
          });
        } else if (searchTerm && assets.length > 0) {
          console.log(`❌ No assets matched search term "${searchTerm}". Available asset names:`);
          assets.slice(0, 10).forEach(asset => {
            console.log(`   - "${asset.name || asset.display_name}"`);
          });
        }
        
        // Process assets to include all needed fields
        const processedAssets = await Promise.all(filteredAssets.map(async asset => ({
          id: asset.id,
          name: asset.display_name || asset.name || 'Unnamed Asset',
          display_name: asset.display_name || asset.name || 'Unnamed Asset',
          type: 'asset', // Mark as asset since we're filtering by configured asset types
          asset_type_id: asset.asset_type_id,
          asset_type_name: asset.asset_type_name || await getAssetTypeName(asset.asset_type_id),
          product_name: asset.product_name,
          location_name: asset.location_name,
          department_name: asset.department_name,
          environment: asset.custom_fields?.environment || asset.environment || 'N/A',
          ip_address: asset.custom_fields?.ip_address || asset.ip_address || asset.ip || 'N/A',
          managed_by: asset.custom_fields?.managed_by || asset.managed_by || 'N/A'
        })));
        
        // Cache the results with asset type consideration
        const cacheKey = generateAssetTypeCacheKey(assetTypeIds);
        addAssetsToTypeCache(searchTerm, cacheKey, processedAssets);
        
        // Display the results
        displayAssetResults('asset-results', processedAssets, selectAsset, false);
      } catch (error) {
        console.error('Error processing asset search results:', error);
        displayAssetResults('asset-results', [], selectAsset, false);
      }
    })
    .catch(function(error) {
      console.error('Asset search failed:', error);
      displayAssetResults('asset-results', [], selectAsset, false);
      handleErr(error);
    });
}

function displayAssetResults(containerId, results, selectionCallback, isFromCache = false) {
  console.log(`📋 Displaying ${results.length} asset results (cached: ${isFromCache})`);
  
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`❌ Container element '${containerId}' not found!`);
    return;
  }
  
  container.innerHTML = '';
  container.style.display = results.length ? 'block' : 'none';
  
  // Add refresh button and cache indicator at top
  if (results.length > 0) {
    const headerRow = document.createElement('div');
    headerRow.className = 'd-flex justify-content-between align-items-center mb-2 p-2 bg-light border-bottom search-header';
    
    // Create count and cache indicator
    const resultsCount = document.createElement('div');
    resultsCount.className = 'small text-secondary';
    
    if (isFromCache) {
      resultsCount.innerHTML = `<i class="fas fa-database me-1"></i> ${results.length} cached results`;
    } else {
      resultsCount.innerHTML = `<i class="fas fa-search me-1"></i> ${results.length} results`;
    }
    
    // Create refresh button
    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'btn btn-sm btn-outline-secondary';
    refreshBtn.innerHTML = '<i class="fas fa-sync-alt me-1"></i> Refresh';
    refreshBtn.title = 'Force refresh from API';
    refreshBtn.onclick = function(e) {
      e.stopPropagation();
      // Call searchAssets with force refresh flag
      searchAssets({
        target: { value: assetSearchState.currentSearchTerm },
        forceRefresh: true
      });
    };
    
    headerRow.appendChild(resultsCount);
    headerRow.appendChild(refreshBtn);
    container.appendChild(headerRow);
  }
  
  if (results.length === 0) {
    container.innerHTML = '<div class="list-group-item search-result-item no-results">No results found</div>';
    container.style.display = 'block';
    return;
  }
  
  results.forEach(result => {
    const resultItem = document.createElement('div');
    resultItem.className = 'list-group-item search-result-item d-flex flex-column search-item-hover';
    
    // Create a container for name and type badge
    const headerDiv = document.createElement('div');
    headerDiv.className = 'd-flex justify-content-between align-items-center w-100';
    
    // Name with proper styling (using display_name as priority)
    const nameDiv = document.createElement('div');
    nameDiv.className = 'fw-bold';
    nameDiv.textContent = result.display_name || result.name || 'Unnamed';
    
    // Add display ID/asset tag if available
    if (result.display_id || result.asset_tag) {
      const idSpan = document.createElement('span');
      idSpan.className = 'text-secondary ms-2';
      idSpan.style.fontSize = '0.9em';
      idSpan.textContent = result.asset_tag ? `#${result.asset_tag}` : `#${result.display_id}`;
      nameDiv.appendChild(idSpan);
    }
    
    headerDiv.appendChild(nameDiv);
    
    // Type badge and badges container
    const badgesDiv = document.createElement('div');
    badgesDiv.className = 'd-flex align-items-center gap-2';
    
    // Asset Type ID badge to help troubleshoot
    if (result.asset_type_id) {
      const typeIdBadge = document.createElement('span');
      typeIdBadge.className = 'badge bg-secondary text-white';
      typeIdBadge.title = 'Asset Type ID';
      typeIdBadge.textContent = `Type: ${result.asset_type_id}`;
      typeIdBadge.style.fontSize = '0.7em';
      badgesDiv.appendChild(typeIdBadge);
    }
    
    // Type badge - different colors for asset vs service
    const typeDiv = document.createElement('div');
    const isService = result.type === 'service';
    typeDiv.innerHTML = `<span class="badge ${isService ? 'bg-warning text-dark' : 'bg-success'}">${isService ? 'Service' : 'Asset'}</span>`;
    headerDiv.appendChild(typeDiv);
    
    headerDiv.appendChild(badgesDiv);
    resultItem.appendChild(headerDiv);
    
    // Additional information based on asset type
    const detailsContainer = document.createElement('div');
    detailsContainer.className = 'mt-2 d-flex flex-wrap gap-2';
    
    // Environment badge
    if (result.environment && result.environment !== 'N/A') {
      const envBadge = document.createElement('span');
      envBadge.className = 'badge bg-light text-dark border';
      envBadge.innerHTML = `<i class="fas fa-server me-1"></i>${result.environment}`;
      detailsContainer.appendChild(envBadge);
    }
    
    // Hosting model badge
    if (result.hosting_model && result.hosting_model !== 'N/A') {
      const hostingBadge = document.createElement('span');
      hostingBadge.className = 'badge bg-light text-dark border';
      hostingBadge.innerHTML = `<i class="fas fa-cloud me-1"></i>${result.hosting_model}`;
      detailsContainer.appendChild(hostingBadge);
    }
    
    // IP address badge
    if (result.ip_address && result.ip_address !== 'N/A') {
      const ipBadge = document.createElement('span');
      ipBadge.className = 'badge bg-light text-dark border';
      ipBadge.innerHTML = `<i class="fas fa-network-wired me-1"></i>${result.ip_address}`;
      detailsContainer.appendChild(ipBadge);
    }
    
    // Location badge
    if (result.location_name) {
      const locBadge = document.createElement('span');
      locBadge.className = 'badge bg-light text-dark border';
      locBadge.innerHTML = `<i class="fas fa-map-marker-alt me-1"></i>${result.location_name}`;
      detailsContainer.appendChild(locBadge);
    }
    
    // Managed by badge
    if (result.managed_by && result.managed_by !== 'N/A') {
      const managedBadge = document.createElement('span');
      managedBadge.className = 'badge bg-light text-dark border';
      managedBadge.innerHTML = `<i class="fas fa-user-cog me-1"></i>${result.managed_by}`;
      detailsContainer.appendChild(managedBadge);
    }
    
    // Asset type badge (as secondary information)
    if (result.asset_type_name) {
      const typeBadge = document.createElement('span');
      typeBadge.className = 'badge bg-light text-dark border';
      typeBadge.innerHTML = `<i class="fas fa-tag me-1"></i>${result.asset_type_name}`;
      detailsContainer.appendChild(typeBadge);
    }
    
    // Only add details container if we have any badges
    if (detailsContainer.children.length > 0) {
      resultItem.appendChild(detailsContainer);
    }
    
    // Add truncated description if available
    if (result.description) {
      const descriptionDiv = document.createElement('div');
      descriptionDiv.className = 'text-muted small mt-1';
      
      // Strip HTML tags and truncate if needed
      const textDescription = result.description.replace(/<[^>]*>/g, '');
      descriptionDiv.textContent = textDescription.length > 100 ? 
        textDescription.substring(0, 100) + '...' : textDescription;
      
      resultItem.appendChild(descriptionDiv);
    }
    
    resultItem.addEventListener('click', () => selectionCallback(result));
    container.appendChild(resultItem);
  });
}

function selectAsset(asset) {
  // Check if asset already exists in the selected list
  if (changeRequestData.selectedAssets.some(item => item.id === asset.id && item.type === asset.type)) {
    showNotification('error', 'This asset has already been added');
    return;
  }
  
  // Add to the selected assets list
  changeRequestData.selectedAssets.push(asset);
  renderSelectedAssets();
  
  // Clear the search
  document.getElementById('asset-results').style.display = 'none';
  document.getElementById('asset-search').value = '';
  
  // Save to data storage
  saveCurrentData();
}

function renderSelectedAssets() {
  try {
    const container = document.getElementById('selected-assets');
    if (!container) {
      console.warn('Selected assets container not found');
      return;
    }
    
    container.innerHTML = '';
    
    // Check if we have valid asset data
    if (!Array.isArray(changeRequestData.selectedAssets) || changeRequestData.selectedAssets.length === 0) {
      container.innerHTML = '<div class="empty-message text-secondary">No assets selected</div>';
      return;
    }
    
    // Create elements for each asset
    changeRequestData.selectedAssets.forEach((asset, index) => {
      if (!asset || typeof asset !== 'object') {
        console.warn(`Invalid asset data at index ${index}`);
        return; // Skip invalid asset
      }
      
      // Safely get asset properties
      const assetName = asset.display_name || asset.name || 'Unnamed Asset';
      const assetType = asset.type || 'unknown';
      const isAsset = assetType === 'asset';
      
      const assetItem = document.createElement('div');
      assetItem.className = 'asset-item mb-2 p-2 border rounded bg-light';
      
      const headerDiv = document.createElement('div');
      headerDiv.className = 'd-flex justify-content-between align-items-center';
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'fw-bold';
      nameSpan.textContent = assetName;
      
      // Add display ID/asset tag if available
      if (asset.display_id || asset.asset_tag) {
        const idSpan = document.createElement('span');
        idSpan.className = 'text-secondary ms-2';
        idSpan.style.fontSize = '0.9em';
        idSpan.textContent = asset.asset_tag ? `#${asset.asset_tag}` : `#${asset.display_id}`;
        nameSpan.appendChild(idSpan);
      }
      
      const badgeSpan = document.createElement('span');
      badgeSpan.className = `badge ${isAsset ? 'bg-success' : 'bg-warning text-dark'} me-2`;
      badgeSpan.textContent = isAsset ? 'Asset' : 'Service';
      
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn btn-sm btn-outline-danger remove-asset';
      removeBtn.innerHTML = '✕';
      removeBtn.dataset.index = index;
      
      headerDiv.appendChild(nameSpan);
      
      const badgesDiv = document.createElement('div');
      badgesDiv.className = 'd-flex align-items-center';
      badgesDiv.appendChild(badgeSpan);
      badgesDiv.appendChild(removeBtn);
      
      headerDiv.appendChild(badgesDiv);
      assetItem.appendChild(headerDiv);
      
      // Add details if available
      const detailsContainer = document.createElement('div');
      detailsContainer.className = 'd-flex flex-wrap gap-2 mt-2';
      let hasDetails = false;
      
      // Environment badge
      if (asset.environment && asset.environment !== 'N/A') {
        hasDetails = true;
        const badge = document.createElement('span');
        badge.className = 'badge bg-light text-dark border';
        badge.innerHTML = `<i class="fas fa-server me-1"></i>${asset.environment}`;
        detailsContainer.appendChild(badge);
      }
      
      // Hosting model badge
      if (asset.hosting_model && asset.hosting_model !== 'N/A') {
        hasDetails = true;
        const badge = document.createElement('span');
        badge.className = 'badge bg-light text-dark border';
        badge.innerHTML = `<i class="fas fa-cloud me-1"></i>${asset.hosting_model}`;
        detailsContainer.appendChild(badge);
      }
      
      // IP address badge
      if (asset.ip_address && asset.ip_address !== 'N/A') {
        hasDetails = true;
        const badge = document.createElement('span');
        badge.className = 'badge bg-light text-dark border';
        badge.innerHTML = `<i class="fas fa-network-wired me-1"></i>${asset.ip_address}`;
        detailsContainer.appendChild(badge);
      }
      
      // Location badge
      if (asset.location_name) {
        hasDetails = true;
        const badge = document.createElement('span');
        badge.className = 'badge bg-light text-dark border';
        badge.innerHTML = `<i class="fas fa-map-marker-alt me-1"></i>${asset.location_name}`;
        detailsContainer.appendChild(badge);
      }
      
      // Managed by badge
      if (asset.managed_by && asset.managed_by !== 'N/A') {
        hasDetails = true;
        const badge = document.createElement('span');
        badge.className = 'badge bg-light text-dark border';
        badge.innerHTML = `<i class="fas fa-user-cog me-1"></i>${asset.managed_by}`;
        detailsContainer.appendChild(badge);
      }
      
      // Asset type badge (as secondary information)
      if (asset.asset_type_name) {
        hasDetails = true;
        const badge = document.createElement('span');
        badge.className = 'badge bg-light text-dark border';
        badge.innerHTML = `<i class="fas fa-tag me-1"></i>${asset.asset_type_name}`;
        detailsContainer.appendChild(badge);
      }
      
      if (hasDetails) {
        assetItem.appendChild(detailsContainer);
      }
      
      // Add truncated description if available
      if (asset.description) {
        const descriptionDiv = document.createElement('div');
        descriptionDiv.className = 'text-muted small mt-1';
        
        // Strip HTML tags and truncate if needed
        const textDescription = asset.description.replace(/<[^>]*>/g, '');
        descriptionDiv.textContent = textDescription.length > 100 ? 
          textDescription.substring(0, 100) + '...' : textDescription;
        
        assetItem.appendChild(descriptionDiv);
      }
      
      container.appendChild(assetItem);
    });
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-asset').forEach(button => {
      button.addEventListener('click', function() {
        try {
          const index = parseInt(this.dataset.index, 10);
          if (!isNaN(index) && index >= 0 && index < changeRequestData.selectedAssets.length) {
            changeRequestData.selectedAssets.splice(index, 1);
            renderSelectedAssets();
            saveCurrentData().catch(err => console.error('Error saving after asset removal:', err));
          }
        } catch (e) {
          console.error('Error removing asset:', e);
        }
      });
    });
  } catch (error) {
    console.error('Error rendering selected assets:', error);
  }
}

function showSummary() {
  if (changeRequestData.selectedAssets.length === 0) {
    showNotification('error', 'Please select at least one impacted service or asset');
    return;
  }
  
  const summaryContent = document.getElementById('summary-content');
  
  // Generate summary HTML with Bootstrap styling
  summaryContent.innerHTML = `
    <div class="summary-section mb-4">
      <h5>Change Details</h5>
      <hr>
      <div class="row">
        <div class="col-md-6">
          <p><strong>Requester:</strong> ${changeRequestData.requester.first_name} ${changeRequestData.requester.last_name}</p>
          <p><strong>Agent (Technical SME):</strong> ${changeRequestData.agent.first_name} ${changeRequestData.agent.last_name}</p>
          <p><strong>Change Type:</strong> ${changeRequestData.changeType}</p>
          <p><strong>Lead Time:</strong> ${changeRequestData.leadTime}</p>
        </div>
        <div class="col-md-6">
          <p><strong>Planned Start:</strong> ${formatDateTime(changeRequestData.plannedStart)}</p>
          <p><strong>Planned End:</strong> ${formatDateTime(changeRequestData.plannedEnd)}</p>
        </div>
      </div>
      
      <h6 class="mt-3">Implementation Plan</h6>
      <p class="text-secondary">${changeRequestData.implementationPlan || 'Not provided'}</p>
      
      <h6 class="mt-3">Backout (Recovery) Plan</h6>
      <p class="text-secondary">${changeRequestData.backoutPlan || 'Not provided'}</p>
      
      <h6 class="mt-3">Validation Plan</h6>
      <p class="text-secondary">${changeRequestData.validationPlan || 'Not provided'}</p>
    </div>
    
    <div class="summary-section mb-4">
      <h5>Risk Assessment</h5>
      <hr>
      <div class="row">
        <div class="col-md-6">
          <p><strong>Risk Score:</strong> ${changeRequestData.riskAssessment.totalScore}</p>
        </div>
        <div class="col-md-6">
          <p><strong>Risk Level:</strong> <span class="badge ${getRiskBadgeClass(changeRequestData.riskAssessment.riskLevel)}">${changeRequestData.riskAssessment.riskLevel}</span></p>
        </div>
      </div>
    </div>
    
    <div class="summary-section">
      <h5>Impacted Services/Assets (${changeRequestData.selectedAssets.length})</h5>
      <hr>
      <ul class="list-group">
        ${changeRequestData.selectedAssets.map(asset => `<li class="list-group-item">${asset.name} <span class="badge ${asset.type === 'service' ? 'bg-warning text-dark' : 'bg-success'}">${asset.type === 'service' ? 'Service' : 'Asset'}</span></li>`).join('')}
      </ul>
    </div>
  `;
  
  // Show the Bootstrap modal
  const modalElement = document.getElementById('confirmation-modal');
  const bootstrap = window.bootstrap || {};
  const confirmationModal = new bootstrap.Modal(modalElement);
  confirmationModal.show();
}

function closeModal() {
  const modalElement = document.getElementById('confirmation-modal');
  const bootstrap = window.bootstrap || {};
  const modal = bootstrap.Modal.getInstance(modalElement);
  if (modal) {
    modal.hide();
  }
}

async function submitChangeRequest() {
  try {
    // Here we would create the actual change request via the Freshservice API
    // For now, we'll just simulate success
    showNotification('success', 'Change request submitted successfully!');
    
    // Clear the saved draft after successful submission
    await clearSavedData();
    
    // Close the modal
    closeModal();
    
    // Reset form for new submission
    resetForm();
  } catch (error) {
    handleErr(error);
  }
}

function resetForm() {
  // Create a new object rather than mutating the existing one
  const newData = {
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
  
  // Replace the current data with the new object
  Object.keys(newData).forEach(key => {
    changeRequestData[key] = newData[key];
  });
  
  // Reset UI elements
  document.getElementById('selected-requester').textContent = '';
  document.getElementById('selected-requester').style.display = 'none';
  
  document.getElementById('selected-agent').textContent = '';
  document.getElementById('selected-agent').style.display = 'none';
  
  document.getElementById('change-type').value = 'standard';
  document.getElementById('lead-time').textContent = '2 business days';
  
  document.getElementById('planned-start').value = '';
  document.getElementById('planned-end').value = '';
  document.getElementById('implementation-plan').value = '';
  document.getElementById('backout-plan').value = '';
  document.getElementById('validation-plan').value = '';
  
  const riskRadios = document.querySelectorAll('.risk-options input[type="radio"]');
  riskRadios.forEach(radio => {
    radio.checked = false;
  });
  
  document.getElementById('risk-result').classList.add('hidden');
  document.getElementById('selected-assets').innerHTML = '';
  
  // Switch back to the first tab
  switchTab('change-details');
}

function formatDateTime(dateTimeString) {
  if (!dateTimeString) return '';
  const date = new Date(dateTimeString);
  return date.toLocaleString();
}

// Helper function for debouncing
function debounce(fn, delay) {
  // Define timeoutId in parent scope to avoid race condition
  let timeoutId = null;
  
  return function(...args) {
    const context = this;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn.apply(context, args);
      timeoutId = null;
    }, delay);
  };
}

// Helper function for showing notifications with fallback
function showNotification(type, message) {
  console.log(`Notification (${type}): ${message}`);
  
  try {
    // Only use client interface if it's fully initialized
    if (window && window.client && window.client.interface && typeof window.client.interface.trigger === 'function') {
      // Map error type to danger for Bootstrap
      const notificationType = type === 'error' ? 'danger' : type;
      const safeMessage = message || 'Notification';
      
      window.client.interface.trigger('showNotify', { 
        type: notificationType,
        message: safeMessage
      }).catch(err => {
        console.error('Error showing notification via interface:', err);
        // If interface fails, try DOM fallback
        showFallbackNotification(type, message);
      });
    } else {
      // Use DOM fallback if client interface isn't available
      console.warn('Client interface not available, using fallback notification');
      showFallbackNotification(type, message);
    }
  } catch (error) {
    console.error('Failed to show notification:', error);
    // Final fallback if everything else fails
    showFallbackNotification(type, message);
  }
}

// DOM-based notification fallback
function showFallbackNotification(type, message) {
  try {
    // Ensure type is valid
    const validType = (type === 'error' || type === 'success' || type === 'info' || type === 'warning') ? type : 'info';
    
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.fallback-notification');
    existingNotifications.forEach(note => {
      if (note && note.parentNode) {
        note.parentNode.removeChild(note);
      }
    });
    
    // Create new notification element
    const notification = document.createElement('div');
    notification.className = `fallback-notification alert alert-${validType === 'error' ? 'danger' : validType}`;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.style.maxWidth = '300px';
    notification.style.padding = '10px 15px';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    notification.textContent = message || 'Notification';
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn-close';
    closeBtn.style.float = 'right';
    closeBtn.style.marginLeft = '10px';
    closeBtn.style.fontSize = '16px';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.style.cursor = 'pointer';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.onclick = function() {
      if (notification && notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    };
    
    notification.prepend(closeBtn);
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification && notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  } catch (e) {
    console.error('Failed to create fallback notification:', e);
  }
}

function handleErr(err = 'None') {
  let errorMessage = 'An error occurred. Please try again.';
  
  // Log detailed error information
  console.error('Error occurred. Details:', err);
  
  // Try to extract a more specific error message if available
  try {
    if (typeof err === 'string') {
      errorMessage = err;
    } else if (err && err.message) {
      errorMessage = `Error: ${err.message}`;
    } else if (err && err.status && err.status.message) {
      errorMessage = `API Error: ${err.status.message}`;
    } else if (err && typeof err === 'object') {
      // Safely stringify objects
      try {
        errorMessage = `Error: ${JSON.stringify(err).substring(0, 100)}...`;
      } catch (jsonError) {
        errorMessage = 'Error: Could not format error details';
      }
    }
  } catch (e) {
    console.error('Error while processing error message:', e);
  }
  
  // Show error notification with the extracted message
  showNotification('error', errorMessage);
}

// Helper function to get appropriate Bootstrap badge class for risk level
function getRiskBadgeClass(riskLevel) {
  switch(riskLevel) {
    case 'Low':
      return 'bg-success';
    case 'Medium':
      return 'bg-warning text-dark';
    case 'High':
      return 'bg-danger';
    default:
      return 'bg-secondary';
  }
}

// Add this CSS to the top of your file
document.addEventListener('DOMContentLoaded', function() {
  // Add custom CSS for hover effect
  const style = document.createElement('style');
  style.textContent = `
    .search-item-hover {
      transition: background-color 0.2s ease;
      cursor: pointer;
    }
    .search-item-hover:hover {
      background-color: #f8f9fa;
    }
    .search-result-item {
      border-left: 3px solid transparent;
    }
    .search-result-item:hover {
      border-left: 3px solid #0d6efd;
    }
    /* Styles for scrollable results container */
    #asset-results {
      max-height: 400px;
      overflow-y: auto;
      position: relative;
      scroll-behavior: smooth;
    }
    #requester-results, #agent-results {
      max-height: 350px;
      overflow-y: auto;
    }
    /* Loading indicator styles */
    #load-more-indicator {
      border-top: 1px solid #eee;
      background-color: #f8f9fa;
      font-size: 0.9em;
    }
    /* Asset type badge styles */
    .badge.bg-secondary {
      font-weight: normal;
      opacity: 0.8;
    }
    /* Cache indicator styles */
    .search-header {
      position: sticky;
      top: 0;
      z-index: 10;
      background-color: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
    }
  `;
  document.head.appendChild(style);
});

/**
 * Calculate safe API request counts based on rate limits
 * @returns {Promise<Object>} - Object with calculated safe limits
 */
async function getSafeApiLimits() {
  try {
    // Get installation parameters
    const params = await getInstallationParams();
    const safetyMargin = parseInt(params.apiSafetyMargin) / 100 || DEFAULT_SAFETY_MARGIN / 100;
    
    // Get custom rate limits from settings
    const overallLimit = parseInt(params.rateLimitOverall) || DEFAULT_RATE_LIMITS.starter.overall;
    const listAgentsLimit = parseInt(params.rateLimitListAgents) || DEFAULT_RATE_LIMITS.starter.listAgents;
    const listRequestersLimit = parseInt(params.rateLimitListRequesters) || DEFAULT_RATE_LIMITS.starter.listRequesters;
    const listAssetsLimit = parseInt(params.rateLimitListAssets) || DEFAULT_RATE_LIMITS.starter.listAssets;
    const listTicketsLimit = parseInt(params.rateLimitListTickets) || DEFAULT_RATE_LIMITS.starter.listTickets;
    
    console.log(`Using safety margin: ${params.apiSafetyMargin}% (${safetyMargin})`);
    
    // Calculate safe number of requests (applying safety margin)
    return {
      overallLimit: Math.floor(overallLimit * safetyMargin),
      listAgentsPageLimit: Math.floor((listAgentsLimit * safetyMargin) / 100), // Each page is 100 agents
      listRequestersPageLimit: Math.floor((listRequestersLimit * safetyMargin) / 100), // Each page is 100 requesters
      listAssetsPageLimit: Math.floor((listAssetsLimit * safetyMargin) / 100), // Each page is 100 assets
      listTicketsPageLimit: Math.floor((listTicketsLimit * safetyMargin) / 100) // Each page is 100 tickets
    };
  } catch (error) {
    console.error('Error calculating API limits:', error);
    // Return default safe limits based on percentage safety margin
    const defaultSafetyMargin = DEFAULT_SAFETY_MARGIN / 100;
    return {
      overallLimit: Math.floor(DEFAULT_RATE_LIMITS.starter.overall * defaultSafetyMargin),
      listAgentsPageLimit: Math.floor((DEFAULT_RATE_LIMITS.starter.listAgents * defaultSafetyMargin) / 100),
      listRequestersPageLimit: Math.floor((DEFAULT_RATE_LIMITS.starter.listRequesters * defaultSafetyMargin) / 100),
      listAssetsPageLimit: Math.floor((DEFAULT_RATE_LIMITS.starter.listAssets * defaultSafetyMargin) / 100),
      listTicketsPageLimit: Math.floor((DEFAULT_RATE_LIMITS.starter.listTickets * defaultSafetyMargin) / 100)
    };
  }
}

/**
 * Get app installation parameters
 * @returns {Promise<Object>} - Installation parameters
 */
async function getInstallationParams() {
  try {
    if (!window.client || typeof window.client.iparams === 'undefined') {
      console.warn('iparams client not available, using defaults');
      return {
        freshserviceDomain: '',
        apiKey: '',
        planType: 'starter',
        apiSafetyMargin: DEFAULT_SAFETY_MARGIN,
        rateLimitOverall: DEFAULT_RATE_LIMITS.starter.overall,
        rateLimitListTickets: DEFAULT_RATE_LIMITS.starter.listTickets,
        rateLimitListAssets: DEFAULT_RATE_LIMITS.starter.listAssets,
        rateLimitListAgents: DEFAULT_RATE_LIMITS.starter.listAgents,
        rateLimitListRequesters: DEFAULT_RATE_LIMITS.starter.listRequesters,
        searchCacheTimeout: DEFAULT_SEARCH_CACHE_TIMEOUT,
        paginationDelay: DEFAULT_PAGINATION_DELAY,
        assetTypeNames: 'Software, IT Software, ISP'
      };
    }
    
    const iparams = await window.client.iparams.get();
    console.log('Loaded installation parameters:', iparams);
    
    return {
      freshserviceDomain: iparams.freshservice_domain || '',
      apiKey: iparams.api_key || '',
      planType: (iparams.plan_type || 'starter').toLowerCase(),
      apiSafetyMargin: parseInt(iparams.api_safety_margin || DEFAULT_SAFETY_MARGIN),
      rateLimitOverall: parseInt(iparams.rate_limit_overall || DEFAULT_RATE_LIMITS.starter.overall),
      rateLimitListTickets: parseInt(iparams.rate_limit_list_tickets || DEFAULT_RATE_LIMITS.starter.listTickets),
      rateLimitListAssets: parseInt(iparams.rate_limit_list_assets || DEFAULT_RATE_LIMITS.starter.listAssets),
      rateLimitListAgents: parseInt(iparams.rate_limit_list_agents || DEFAULT_RATE_LIMITS.starter.listAgents),
      rateLimitListRequesters: parseInt(iparams.rate_limit_list_requesters || DEFAULT_RATE_LIMITS.starter.listRequesters),
      searchCacheTimeout: parseInt(iparams.search_cache_timeout || DEFAULT_SEARCH_CACHE_TIMEOUT),
      paginationDelay: parseInt(iparams.pagination_delay || DEFAULT_PAGINATION_DELAY),
      assetTypeNames: iparams.asset_type_names || 'Software, IT Software, ISP'
    };
  } catch (error) {
    console.error('Error getting installation parameters:', error);
    return {
      freshserviceDomain: '',
      apiKey: '',
      planType: 'starter',
      apiSafetyMargin: DEFAULT_SAFETY_MARGIN,
      rateLimitOverall: DEFAULT_RATE_LIMITS.starter.overall,
      rateLimitListTickets: DEFAULT_RATE_LIMITS.starter.listTickets,
      rateLimitListAssets: DEFAULT_RATE_LIMITS.starter.listAssets,
      rateLimitListAgents: DEFAULT_RATE_LIMITS.starter.listAgents,
      rateLimitListRequesters: DEFAULT_RATE_LIMITS.starter.listRequesters,
      searchCacheTimeout: DEFAULT_SEARCH_CACHE_TIMEOUT,
      paginationDelay: DEFAULT_PAGINATION_DELAY,
      assetTypeNames: 'Software, IT Software, ISP'
    };
  }
}

/**
 * Update loading message in a container
 * @param {string} containerId - ID of container element
 * @param {string} message - Message to display
 */
function updateLoadingMessage(containerId, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `<div class="text-center p-3"><div class="spinner-border spinner-border-sm" role="status"></div> ${message}</div>`;
  }
}



/**
 * Get asset type by ID with caching
 * @param {number} typeId - Asset type ID 
 * @returns {Object} - Asset type data or null
 */
async function getAssetType(typeId) {
  if (!typeId) return null;
  
  // Check if we need to refresh the cache
  if (assetTypeCache.timestamp === 0 || 
      Date.now() - assetTypeCache.timestamp > ASSET_TYPE_CACHE_TIMEOUT ||
      Object.keys(assetTypeCache.byId).length === 0) {
    console.log('Asset type cache expired or empty, refreshing...');
    await fetchAllAssetTypes();
  }
  
  // Return from cache if available
  if (assetTypeCache.byId[typeId]) {
    return assetTypeCache.byId[typeId];
  }
  
  // If not in cache, try to fetch just this one type
  try {
    console.log(`Asset type ${typeId} not found in cache, fetching individually...`);
    const data = await window.client.request.invokeTemplate("getAssetTypes", {
      path_suffix: `/${typeId}`
    });
    
    if (!data || !data.response) {
      console.error('Invalid asset type response:', data);
      return null;
    }
    
    const parsedData = JSON.parse(data.response || '{}');
    if (parsedData && parsedData.asset_type) {
      const assetType = parsedData.asset_type;
      
      // Add to cache
      assetTypeCache.byId[typeId] = {
        name: assetType.name,
        description: assetType.description,
        data: assetType
      };
      
      return assetTypeCache.byId[typeId];
    }
  } catch (error) {
    console.error(`Error fetching individual asset type ${typeId}:`, error);
  }
  
  return null;
}

// Variables to track current search state for infinite scroll
const assetSearchState = {
  currentSearchTerm: '',
  currentPage: 1,
  isLoading: false,
  hasMoreResults: true,
  totalResults: 0
};

/**
 * Display additional asset results when scrolling (appends to existing results)
 * @param {string} containerId - ID of container element
 * @param {Array} results - New results to append
 * @param {Function} selectionCallback - Callback for when an item is selected
 */
function displayAdditionalAssetResults(containerId, results, selectionCallback) {
  const container = document.getElementById(containerId);
  
  if (!container || results.length === 0) {
    return;
  }
  
  // Create elements for each new result
  results.forEach(result => {
    const resultItem = document.createElement('div');
    resultItem.className = 'list-group-item search-result-item d-flex flex-column search-item-hover';
    
    // Create a container for name and type badge
    const headerDiv = document.createElement('div');
    headerDiv.className = 'd-flex justify-content-between align-items-center w-100';
    
    // Name with proper styling (using display_name as priority)
    const nameDiv = document.createElement('div');
    nameDiv.className = 'fw-bold';
    nameDiv.textContent = result.display_name || result.name || 'Unnamed';
    
    // Add display ID/asset tag if available
    if (result.display_id || result.asset_tag) {
      const idSpan = document.createElement('span');
      idSpan.className = 'text-secondary ms-2';
      idSpan.style.fontSize = '0.9em';
      idSpan.textContent = result.asset_tag ? `#${result.asset_tag}` : `#${result.display_id}`;
      nameDiv.appendChild(idSpan);
    }
    
    headerDiv.appendChild(nameDiv);
    
    // Type badge and badges container
    const badgesDiv = document.createElement('div');
    badgesDiv.className = 'd-flex align-items-center gap-2';
    
    // Asset Type ID badge to help troubleshoot
    if (result.asset_type_id) {
      const typeIdBadge = document.createElement('span');
      typeIdBadge.className = 'badge bg-secondary text-white';
      typeIdBadge.title = 'Asset Type ID';
      typeIdBadge.textContent = `Type: ${result.asset_type_id}`;
      typeIdBadge.style.fontSize = '0.7em';
      badgesDiv.appendChild(typeIdBadge);
    }
    
    // Type badge - different colors for asset vs service
    const typeDiv = document.createElement('span');
    const isAsset = result.type === 'asset';
    typeDiv.className = `badge ${isAsset ? 'bg-success' : 'bg-warning text-dark'}`;
    typeDiv.textContent = isAsset ? 'Asset' : 'Service';
    badgesDiv.appendChild(typeDiv);
    
    headerDiv.appendChild(badgesDiv);
    resultItem.appendChild(headerDiv);
    
    // Additional information based on asset type
    const detailsContainer = document.createElement('div');
    detailsContainer.className = 'mt-2 d-flex flex-wrap gap-2';
    
    // Environment badge
    if (result.environment && result.environment !== 'N/A') {
      const envBadge = document.createElement('span');
      envBadge.className = 'badge bg-light text-dark border';
      envBadge.innerHTML = `<i class="fas fa-server me-1"></i>${result.environment}`;
      detailsContainer.appendChild(envBadge);
    }
    
    // Hosting model badge
    if (result.hosting_model && result.hosting_model !== 'N/A') {
      const hostingBadge = document.createElement('span');
      hostingBadge.className = 'badge bg-light text-dark border';
      hostingBadge.innerHTML = `<i class="fas fa-cloud me-1"></i>${result.hosting_model}`;
      detailsContainer.appendChild(hostingBadge);
    }
    
    // IP address badge
    if (result.ip_address && result.ip_address !== 'N/A') {
      const ipBadge = document.createElement('span');
      ipBadge.className = 'badge bg-light text-dark border';
      ipBadge.innerHTML = `<i class="fas fa-network-wired me-1"></i>${result.ip_address}`;
      detailsContainer.appendChild(ipBadge);
    }
    
    // Location badge
    if (result.location_name) {
      const locBadge = document.createElement('span');
      locBadge.className = 'badge bg-light text-dark border';
      locBadge.innerHTML = `<i class="fas fa-map-marker-alt me-1"></i>${result.location_name}`;
      detailsContainer.appendChild(locBadge);
    }
    
    // Managed by badge
    if (result.managed_by && result.managed_by !== 'N/A') {
      const managedBadge = document.createElement('span');
      managedBadge.className = 'badge bg-light text-dark border';
      managedBadge.innerHTML = `<i class="fas fa-user-cog me-1"></i>${result.managed_by}`;
      detailsContainer.appendChild(managedBadge);
    }
    
    // Asset type badge (as secondary information)
    if (result.asset_type_name) {
      const typeBadge = document.createElement('span');
      typeBadge.className = 'badge bg-light text-dark border';
      typeBadge.innerHTML = `<i class="fas fa-tag me-1"></i>${result.asset_type_name}`;
      detailsContainer.appendChild(typeBadge);
    }
    
    // Only add details container if we have any badges
    if (detailsContainer.children.length > 0) {
      resultItem.appendChild(detailsContainer);
    }
    
    // Add truncated description if available
    if (result.description) {
      const descriptionDiv = document.createElement('div');
      descriptionDiv.className = 'text-muted small mt-1';
      
      // Strip HTML tags and truncate if needed
      const textDescription = result.description.replace(/<[^>]*>/g, '');
      descriptionDiv.textContent = textDescription.length > 100 ? 
        textDescription.substring(0, 100) + '...' : textDescription;
      
      resultItem.appendChild(descriptionDiv);
    }
    
    resultItem.addEventListener('click', () => selectionCallback(result));
    container.appendChild(resultItem);
  });
}

/**
 * Process asset results to extract needed fields
 * @param {Array} assets - Raw assets from API
 * @returns {Array} - Processed assets with extracted fields
 */
function processAssetResults(assets) {
  return assets.map(asset => {
    // Extract fields from type_fields if available
    const typeFields = asset.type_fields || {};
    const assetTypeId = asset.asset_type_id;
    
    // Helper function to find the correct type field with asset_type_id suffix
    const getTypeField = (fieldPrefix) => {
      // Try with suffix first
      const suffixedKey = Object.keys(typeFields).find(key => 
        key.startsWith(fieldPrefix) && key.endsWith(`_${assetTypeId}`));
      
      // Return the value if found, otherwise null
      return suffixedKey ? typeFields[suffixedKey] : null;
    };
    
    return {
      id: asset.id,
      display_id: asset.display_id,
      name: asset.name || 'Unnamed Asset',
      display_name: asset.name || 'Unnamed Asset',
      type: 'asset',
      asset_type_id: asset.asset_type_id,
      asset_type_name: asset.asset_type_name,
      product_name: asset.product_name,
      location_name: asset.location_name,
      department_name: asset.department_name,
      asset_tag: asset.asset_tag,
      description: asset.description,
      // Try to get environment from suffixed type fields first
      environment: getTypeField('environment') || 
                  typeFields.environment || 
                  asset.custom_fields?.environment || 
                  asset.environment || 
                  'N/A',
      // Try to get IP address from suffixed type fields first
      ip_address: getTypeField('ip_address') || 
                 getTypeField('ip') || 
                 typeFields.ip_address || 
                 typeFields.ip || 
                 asset.custom_fields?.ip_address || 
                 asset.ip_address || 
                 asset.ip || 
                 'N/A',
      // Try to get managed by information - could be agent name, vendor, or owner
      managed_by: getTypeField('managed_by') || 
                 getTypeField('vendor') || 
                 typeFields.managed_by || 
                 typeFields.vendor || 
                 asset.custom_fields?.managed_by || 
                 asset.managed_by || 
                 asset.vendor_name || 
                 'N/A',
      // Add hosting model if available
      hosting_model: getTypeField('hosting_model') ||
                    typeFields.hosting_model ||
                    asset.custom_fields?.hosting_model ||
                    'N/A'
    };
  });
}

// Risk Assessment tab

/**
 * Get assets from cache with asset type filtering
 * @param {string} searchTerm - Search term used to find assets
 * @param {string|number} cacheKey - Cache key (can be single asset type ID, 'multiple', or other identifier)
 * @returns {Promise<Array>} - Cached asset results or null if not found
 */
async function getAssetsByTypeFromCache(searchTerm, cacheKey) {
  if (!cacheKey) {
    return getFromSearchCache('assets', searchTerm);
  }
  
  const searchKey = searchTerm || 'initial_asset_listing';
  
  // Initialize asset type cache if needed
  if (!searchCache.assetsByType[cacheKey]) {
    searchCache.assetsByType[cacheKey] = {};
  }
  
  // Check if we have a cache hit
  if (searchCache.assetsByType[cacheKey][searchKey]) {
    const cachedData = searchCache.assetsByType[cacheKey][searchKey];
    const currentTime = Date.now();
    
    // Get the configured search cache timeout
    const params = await getInstallationParams();
    const cacheTimeout = params.searchCacheTimeout || DEFAULT_SEARCH_CACHE_TIMEOUT;
    
    // Check if the cache is still valid
    if (currentTime - cachedData.timestamp < cacheTimeout) {
      console.log(`✅ Cache hit for asset types ${cacheKey}, term "${searchKey}" (${cachedData.results.length} items)`);
      return cachedData.results;
    } else {
      console.log(`⏰ Cache expired for asset types ${cacheKey}, term "${searchKey}"`);
    }
  }
  
  console.log(`❌ No cache found for asset types ${cacheKey}, term "${searchKey}"`);
  return null;
}

/**
 * Add assets to cache with asset type filtering
 * @param {string} searchTerm - Search term used to find assets
 * @param {string|number} cacheKey - Cache key (can be single asset type ID, 'multiple', or other identifier)
 * @param {Array} results - Asset results to cache
 */
function addAssetsToTypeCache(searchTerm, cacheKey, results) {
  if (!cacheKey) {
    addToSearchCache('assets', searchTerm, results);
    return;
  }
  
  const searchKey = searchTerm || 'initial_asset_listing';
  
  // Initialize asset type cache if needed
  if (!searchCache.assetsByType[cacheKey]) {
    searchCache.assetsByType[cacheKey] = {};
  }
  
  // Add the results to the cache
  searchCache.assetsByType[cacheKey][searchKey] = {
    results: results,
    timestamp: Date.now()
  };
  
  console.log(`💾 Cached ${results.length} assets for types ${cacheKey}, term "${searchKey}"`);
}

/**
 * Generate a consistent cache key for the configured asset types
 * @param {Array<number>} assetTypeIds - Array of asset type IDs
 * @returns {string} - Cache key for these asset types
 */
function generateAssetTypeCacheKey(assetTypeIds) {
  if (!assetTypeIds || assetTypeIds.length === 0) {
    return 'all_types';
  }
  
  if (assetTypeIds.length === 1) {
    return assetTypeIds[0].toString();
  }
  
  // For multiple types, create a sorted, consistent key
  const sortedIds = [...assetTypeIds].sort((a, b) => a - b);
  return `multi_${sortedIds.join('_')}`;
}

/**
 * Simple function to search for assets by name across all asset types
 * Can be called from browser console as: findAsset("Middleware")
 */
window.findAsset = async function(assetName) {
  try {
    console.log(`🔍 Searching for asset: "${assetName}"`);
    
    if (!window.client || !window.client.request) {
      console.log('❌ Client not available');
      return;
    }
    
    // Search through multiple pages to find the asset
    for (let page = 1; page <= 5; page++) {
      console.log(`📄 Checking page ${page}...`);
      
      const data = await window.client.request.invokeTemplate("getAssets", {
        path_suffix: `?page=${page}&per_page=100`
      });
      
      if (!data || !data.response) {
        console.log(`❌ No response from page ${page}`);
        continue;
      }
      
      const response = JSON.parse(data.response);
      const assets = response && response.assets ? response.assets : [];
      
      console.log(`📦 Page ${page}: ${assets.length} assets`);
      
      // Search for assets containing the name
      const matchingAssets = assets.filter(asset => {
        const name = (asset.name || asset.display_name || '').toLowerCase();
        return name.includes(assetName.toLowerCase());
      });
      
      if (matchingAssets.length > 0) {
        console.log(`✅ FOUND ${matchingAssets.length} matching asset(s) on page ${page}:`);
        matchingAssets.forEach(asset => {
          console.log(`   📋 Asset: "${asset.name || asset.display_name}"`);
          console.log(`       ID: ${asset.id}`);
          console.log(`       Asset Type ID: ${asset.asset_type_id}`);
          console.log(`       Asset Tag: ${asset.asset_tag || 'N/A'}`);
          console.log(`       Description: ${asset.description || 'N/A'}`);
          console.log(`   ----`);
        });
        
        // Show asset type info
        const typeIds = [...new Set(matchingAssets.map(a => a.asset_type_id))];
        console.log(`🏷️ Asset Type IDs found: ${typeIds.join(', ')}`);
        
        return matchingAssets;
      }
    }
    
    console.log(`❌ No assets found matching "${assetName}"`);
    return [];
    
  } catch (error) {
    console.error('❌ Error searching for asset:', error);
  }
};

/**
 * Simple function to check what asset types are actually being used
 */
window.checkAssetTypes = async function() {
  try {
    console.log('🔍 Checking what asset types are in use...');
    
    if (!window.client || !window.client.request) {
      console.log('❌ Client not available');
      return;
    }
    
    const data = await window.client.request.invokeTemplate("getAssets", {
      path_suffix: `?page=1&per_page=100`
    });
    
    if (!data || !data.response) {
      console.log('❌ No response from API');
      return;
    }
    
    const response = JSON.parse(data.response);
    const assets = response && response.assets ? response.assets : [];
    
    // Group by asset type
    const typeGroups = {};
    assets.forEach(asset => {
      const typeId = asset.asset_type_id;
      if (!typeGroups[typeId]) {
        typeGroups[typeId] = {
          count: 0,
          examples: []
        };
      }
      typeGroups[typeId].count++;
      if (typeGroups[typeId].examples.length < 3) {
        typeGroups[typeId].examples.push(asset.name || asset.display_name);
      }
    });
    
    console.log('📊 Asset Types in use:');
    Object.entries(typeGroups).forEach(([typeId, info]) => {
      console.log(`   Type ${typeId}: ${info.count} assets`);
      console.log(`     Examples: ${info.examples.join(', ')}`);
    });
    
    // Show which types we're currently searching for
    const currentSearchTypes = [37000374722, 37000374726]; // Our known types
    console.log(`🎯 Currently searching for types: ${currentSearchTypes.join(', ')}`);
    
    // Check overlap
    const foundTypes = Object.keys(typeGroups).map(id => parseInt(id));
    const overlap = currentSearchTypes.filter(type => foundTypes.includes(type));
    const missing = currentSearchTypes.filter(type => !foundTypes.includes(type));
    
    if (overlap.length > 0) {
      console.log(`✅ Found matching types: ${overlap.join(', ')}`);
    }
    if (missing.length > 0) {
      console.log(`❌ Missing types: ${missing.join(', ')}`);
    }
    
  } catch (error) {
    console.error('❌ Error checking asset types:', error);
  }
};

/**
 * Get asset type IDs that match the configured names from iparams
 * @returns {Array} Array of asset type IDs to search
 */
async function getConfiguredAssetTypeIds() {
  try {
    // Get configured asset type names from iparams
    const params = await getInstallationParams();
    const configuredNames = params.assetTypeNames || '';
    
    if (!configuredNames.trim()) {
      console.log('⚠️ No asset type names configured, using default');
      return [37000374722, 37000374726]; // Fallback to known working types
    }
    
    // Parse configured names
    const targetNames = configuredNames.split(',').map(name => name.trim().toLowerCase());
    console.log(`🎯 Looking for asset types matching: ${targetNames.join(', ')}`);
    
    // Check if cache is fresh
    const cacheAge = Date.now() - assetTypeCache.timestamp;
if (cacheAge > ASSET_TYPE_CACHE_TIMEOUT || Object.keys(assetTypeCache.byId).length === 0) {
      console.log('🔄 Asset type cache is stale, refreshing...');
      await initializeAssetTypes();
    }
    
    // Find matching asset type IDs
    const matchingIds = [];
    
    Object.entries({...assetTypeCache.types, ...assetTypeCache.byId}).forEach(([id, type]) => {
      const typeName = type.name.toLowerCase();
      
      // Check if any configured name matches this asset type
      const isMatch = targetNames.some(configName => {
        // Exact match
        if (typeName === configName) return true;
        
        // Contains match (both directions)
        if (typeName.includes(configName) || configName.includes(typeName)) return true;
        
        // Word-based match for compound names like "IT Software"
        const typeWords = typeName.split(/\s+/);
        const configWords = configName.split(/\s+/);
        return typeWords.some(word => configWords.includes(word)) ||
               configWords.some(word => typeWords.includes(word));
      });
      
      if (isMatch) {
        matchingIds.push(parseInt(id));
        console.log(`✅ Matched: "${type.name}" (ID: ${id})`);
      }
    });
    
    if (matchingIds.length === 0) {
      console.log('❌ No asset types matched configured names, using fallback');
      console.log('💡 Available asset types:');
      Object.entries({...assetTypeCache.types, ...assetTypeCache.byId}).slice(0, 10).forEach(([id, type]) => {
        console.log(`   ${id}: ${type.name}`);
      });
      return [37000374722, 37000374726]; // Fallback
    }
    
    console.log(`🎯 Found ${matchingIds.length} matching asset type IDs: ${matchingIds.join(', ')}`);
    return matchingIds;
    
  } catch (error) {
    console.error('❌ Error getting configured asset type IDs:', error);
    return [37000374722, 37000374726]; // Fallback
  }
}

/**
 * Search for assets using the configured asset type IDs
 * @param {string} searchTerm - Search term (optional)
 * @returns {Promise<Array>} Array of matching assets
 */
async function searchAssetsWithConfiguredTypes(searchTerm = '') {
  try {
    console.log(`🔍 Searching assets with term: "${searchTerm}"`);
    
    // Get the configured asset type IDs
    const assetTypeIds = await getConfiguredAssetTypeIds();
    
    if (assetTypeIds.length === 0) {
      console.log('❌ No asset type IDs to search');
      return [];
    }
    
    // Build the asset type filter query
    let query = '';
    if (assetTypeIds.length === 1) {
      query = `asset_type_id:${assetTypeIds[0]}`;
    } else {
      query = assetTypeIds.map(id => `asset_type_id:${id}`).join(' OR ');
    }
    
    console.log(`📡 Asset type filter: ${query}`);
    
    // Fetch assets with pagination
    const allAssets = [];
    let page = 1;
    
    while (page <= 10) { // Safety limit
      console.log(`📄 Fetching assets page ${page}...`);
      
      try {
        const pathSuffix = `?query=${encodeURIComponent(query)}&page=${page}&per_page=100`;
        
        const response = await window.client.request.invokeTemplate("getAssets", {
          path_suffix: pathSuffix
        });
        
        if (!response || !response.response) {
          console.log(`⚠️ No response for page ${page}`);
          break;
        }
        
        const data = JSON.parse(response.response);
        const assets = data.assets || [];
        
        console.log(`📦 Page ${page}: ${assets.length} assets`);
        
        if (assets.length === 0) {
          break; // No more assets
        }
        
        // Filter by search term if provided
        let filteredAssets = assets;
        if (searchTerm.trim()) {
          filteredAssets = assets.filter(asset => {
            const searchableText = [
              asset.name || '',
              asset.display_name || '',
              asset.description || '',
              asset.asset_tag || '',
              asset.serial_number || ''
            ].join(' ').toLowerCase();
            
            return searchableText.includes(searchTerm.toLowerCase());
          });
        }
        
        console.log(`🔽 After search term filter: ${filteredAssets.length} assets`);
        
        // Add to results
        allAssets.push(...filteredAssets);
        
        // Check if we should continue
        if (assets.length < 100) {
          break; // Last page
        }
        
        page++;
        
        // Small delay between pages
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (pageError) {
        console.log(`⚠️ Error fetching page ${page}:`, pageError.message);
        break;
      }
    }
    
    console.log(`✅ Found ${allAssets.length} total matching assets`);
    
    // Process assets for display
    const processedAssets = allAssets.map(asset => ({
      id: asset.id,
      name: asset.display_name || asset.name || 'Unnamed Asset',
      display_name: asset.display_name || asset.name || 'Unnamed Asset',
      type: 'service', // Mark as service since we're filtering by software/service types
      asset_type_id: asset.asset_type_id,
      asset_type_name: assetTypeCache.types[asset.asset_type_id]?.name || assetTypeCache.byId[asset.asset_type_id]?.name || `Type ${asset.asset_type_id}`,
      asset_tag: asset.asset_tag || '',
      description: asset.description || '',
      product_name: asset.product_name || '',
      location_name: asset.location_name || '',
      department_name: asset.department_name || '',
      environment: asset.custom_fields?.environment || 'N/A',
      ip_address: asset.custom_fields?.ip_address || asset.ip_address || 'N/A',
      managed_by: asset.custom_fields?.managed_by || 'N/A'
    }));
    
    return processedAssets;
    
  } catch (error) {
    console.error('❌ Error searching assets:', error);
    return [];
  }
}

// Using the original getAssetTypeNameSync implementation from line 3484

/**
 * Test helper function
 */
window.testAssetSearch = async function() {
  console.log('🔍 Finding software/services asset type IDs...');
  
  try {
    // Get configured asset type names from iparams
    const params = await getInstallationParams();
    const configuredNames = params.assetTypeNames || '';
    
    if (!configuredNames.trim()) {
      console.log('⚠️ No asset type names configured, using default types');
      return [37000374722, 37000374726]; // Fallback to known working types
    }
    
    // Parse configured names
    const targetNames = configuredNames.split(',').map(name => name.trim().toLowerCase());
    console.log(`🎯 Looking for asset types matching: ${targetNames.join(', ')}`);
    
    // Get cached asset types
    const cachedAssetTypes = await getCachedAssetTypes();
    
    if (!cachedAssetTypes || Object.keys(cachedAssetTypes).length === 0) {
      console.log('⚠️ No cached asset types available, using fallback types');
      return [37000374722, 37000374726]; // Fallback
    }
    
    // Find matching asset type IDs
    const matchingIds = [];
    
    Object.entries(cachedAssetTypes).forEach(([id, typeInfo]) => {
      const typeName = (typeInfo.name || '').toLowerCase();
      
      // Check if any configured name matches this asset type
      const isMatch = targetNames.some(configName => {
        // Exact match
        if (typeName === configName) return true;
        
        // Contains match (both directions)
        if (typeName.includes(configName) || configName.includes(typeName)) return true;
        
        // Word-based match for compound names like "IT Software"
        const typeWords = typeName.split(/\s+/);
        const configWords = configName.split(/\s+/);
        return typeWords.some(word => configWords.includes(word)) ||
               configWords.some(word => typeWords.includes(word));
      });
      
      if (isMatch) {
        matchingIds.push(parseInt(id));
        console.log(`✅ Matched: "${typeInfo.name}" (ID: ${id})`);
      }
    });
    
    if (matchingIds.length === 0) {
      console.log('❌ No asset types matched configured names, using fallback');
      console.log('💡 Available asset types:');
      Object.entries(cachedAssetTypes).slice(0, 10).forEach(([id, typeInfo]) => {
        console.log(`   ${id}: ${typeInfo.name}`);
      });
      return [37000374722, 37000374726]; // Fallback
    }
    
    console.log(`🎯 Found ${matchingIds.length} matching asset type IDs: ${matchingIds.join(', ')}`);
    return matchingIds;
    
  } catch (error) {
    console.error('❌ Error getting configured asset type IDs:', error);
    return [37000374722, 37000374726]; // Fallback
  }
}

// End of file



