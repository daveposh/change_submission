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
  byId: {}, // Map of asset_type_id -> { name, timestamp }
  list: [],  // List of all asset types
  timestamp: 0 // Last update timestamp
};

// Default safety margin for API rate limiting (70%)
const DEFAULT_SAFETY_MARGIN = 70;

// Default inventory software/services type IDs (can be multiple)
// Based on your asset types: 37000374726 has software like Active Directory
const DEFAULT_INVENTORY_TYPE_IDS = [37000374726, 37000374859]; // Include both software and server types

// Default asset type timeout
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
  console.log('Fetching all asset types from API');
  
  // Check for client availability
  if (!window.client || !window.client.request) {
    console.error('Client not available for asset types fetch');
    return {};
  }

  try {
    const allAssetTypes = {};
    let page = 1;
    let hasMorePages = true;
    
    // Function to load asset types from a specific page
    async function loadAssetTypesPage(pageNum) {
      console.log(`Loading asset types page ${pageNum}`);
      
      try {
        // Check if the client request method is available
        if (!window.client.request || !window.client.request.invokeTemplate) {
          console.error('Client request.invokeTemplate not available for asset types');
          return { assetTypes: [], more: false };
        }
        
        // Use invokeTemplate to access asset types API
        const response = await window.client.request.invokeTemplate("getAssetTypes", {
          path_suffix: `?page=${pageNum}&per_page=100`
        });
        
        if (!response || !response.response) {
          console.error('Invalid asset types response:', response);
          return { assetTypes: [], more: false };
        }
        
        try {
          const parsedData = JSON.parse(response.response || '{"asset_types":[]}');
          const assetTypes = parsedData.asset_types || [];
          
          // Check if we might have more pages (received full page of results)
          const hasMore = assetTypes.length === 100;
          
          return { assetTypes, more: hasMore };
        } catch (parseError) {
          console.error('Error parsing asset types response:', parseError);
          return { assetTypes: [], more: false };
        }
      } catch (error) {
        console.error(`Error fetching asset types page ${pageNum}:`, error);
        return { assetTypes: [], more: false };
      }
    }
    
    // Load all pages of asset types
    while (hasMorePages) {
      const { assetTypes, more } = await loadAssetTypesPage(page);
      
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
      
      // Safety check to prevent infinite loops
      if (page > 10) {
        console.warn('Reached maximum number of asset type pages (10)');
        break;
      }
      
      // Add pagination delay if we're loading more pages
      if (hasMorePages) {
        const params = await getInstallationParams();
        const paginationDelay = params.paginationDelay || DEFAULT_PAGINATION_DELAY;
        await new Promise(resolve => setTimeout(resolve, paginationDelay));
      }
    }
    
    // Save all asset types to cache
    if (Object.keys(allAssetTypes).length > 0) {
      console.log(`Caching ${Object.keys(allAssetTypes).length} asset types`);
      await cacheAssetTypes(allAssetTypes);
    } else {
      console.warn('No asset types found to cache');
    }
    
    return allAssetTypes;
  } catch (error) {
    console.error('Error in fetchAllAssetTypes:', error);
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
 * Find the software/services asset type IDs from cached asset types using configured names
 * @returns {Promise<Array<number>>} - Array of asset type IDs for software/services
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



