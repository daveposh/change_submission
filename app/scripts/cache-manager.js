/**
 * Cache Manager Module
 * Handles all caching operations for asset types, locations, and other data
 * Version 1.0.0
 */

const CacheManager = {
  // Cache timeout in milliseconds (5 minutes)
  CACHE_TIMEOUT: 5 * 60 * 1000,
  
  // Storage keys
  STORAGE_KEYS: {
    ASSET_TYPE_CACHE: 'asset_type_cache',
    LOCATION_CACHE: 'location_cache',
    USER_CACHE: 'user_cache',
    ASSET_SEARCH_CACHE: 'asset_search_cache'
  },

  /**
   * Initialize all caches during app startup
   * @returns {Promise<Object>} - Cache initialization results
   */
  async initializeAllCaches() {
    console.log('🚀 Starting cache initialization...');
    
    const results = {
      assetTypes: 0,
      locations: 0,
      errors: []
    };

    try {
      // Initialize asset types cache
      console.log('📦 Preloading asset types cache...');
      const assetTypes = await this.loadAssetTypesCache();
      results.assetTypes = Object.keys(assetTypes).length;
      console.log(`✅ Asset types cached: ${results.assetTypes}`);
    } catch (error) {
      console.error('❌ Failed to load asset types cache:', error);
      results.errors.push('asset_types');
    }

    try {
      // Initialize locations cache
      console.log('📍 Preloading locations cache...');
      const locations = await this.loadLocationsCache();
      results.locations = Object.keys(locations).length;
      console.log(`✅ Locations cached: ${results.locations}`);
    } catch (error) {
      console.error('❌ Failed to load locations cache:', error);
      results.errors.push('locations');
    }

    console.log('✅ Cache initialization complete:', results);
    return results;
  },

  /**
   * Load asset types from API with pagination
   * @returns {Promise<Object>} - Cached asset types
   */
  async loadAssetTypesCache() {
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
      const maxPages = 20; // Support up to 20 pages for large instances
      
      console.log(`📡 Starting asset type pagination fetch (max ${maxPages} pages)`);
      console.log(`🎯 Looking for all asset types with proper pagination`);
      
      // Continue fetching pages until we get no more results
      while (page <= maxPages) {
        console.log(`📄 Fetching asset types page ${page}...`);
        
        try {
          // Use invokeTemplate to access asset types API with proper pagination
          const response = await window.client.request.invokeTemplate("getAssetTypes", {
            context: {
              page: page,
              per_page: 30
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
              
              // Log important asset types
              if (assetType.name.toLowerCase().includes('laptop') || 
                  assetType.name.toLowerCase().includes('computer') ||
                  assetType.name.toLowerCase().includes('desktop')) {
                console.log(`🎯 Found important asset type: "${assetType.name}" (ID: ${assetType.id})`);
              }
            }
          });
          
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
        await this.saveAssetTypesCache(allAssetTypes);
        
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
      console.error('❌ Error in loadAssetTypesCache:', error);
      return {};
    }
  },

  /**
   * Load locations from API with pagination
   * @returns {Promise<Object>} - Cached locations
   */
  async loadLocationsCache() {
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
              page: page,
              per_page: 30
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
            }
          });
          
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
        await this.saveLocationsCache(allLocations);
        
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
      console.error('❌ Error in loadLocationsCache:', error);
      return {};
    }
  },

  /**
   * Get cached asset types from storage
   * @returns {Promise<Object>} - Cached asset types
   */
  async getCachedAssetTypes() {
    try {
      const result = await window.client.db.get(this.STORAGE_KEYS.ASSET_TYPE_CACHE);
      return result || {};
    } catch (error) {
      console.log('No asset type cache found or error:', error);
      return {};
    }
  },

  /**
   * Save asset types to cache
   * @param {Object} assetTypes - Asset types to cache
   * @returns {Promise<boolean>} - Success status
   */
  async saveAssetTypesCache(assetTypes) {
    try {
      await window.client.db.set(this.STORAGE_KEYS.ASSET_TYPE_CACHE, assetTypes);
      console.log('Asset type cache updated');
      return true;
    } catch (error) {
      console.error('Failed to save asset type cache:', error);
      return false;
    }
  },

  /**
   * Get cached locations from storage
   * @returns {Promise<Object>} - Cached locations
   */
  async getCachedLocations() {
    try {
      const result = await window.client.db.get(this.STORAGE_KEYS.LOCATION_CACHE);
      return result || {};
    } catch (error) {
      console.log('No location cache found or error:', error);
      return {};
    }
  },

  /**
   * Save locations to cache
   * @param {Object} locations - Locations to cache
   * @returns {Promise<boolean>} - Success status
   */
  async saveLocationsCache(locations) {
    try {
      await window.client.db.set(this.STORAGE_KEYS.LOCATION_CACHE, locations);
      console.log('Location cache updated');
      return true;
    } catch (error) {
      console.error('Failed to save location cache:', error);
      return false;
    }
  },

  /**
   * Get asset type name by ID with caching
   * @param {number} assetTypeId - Asset type ID 
   * @returns {Promise<string>} - Asset type name
   */
  async getAssetTypeName(assetTypeId) {
    if (!assetTypeId) return 'Unknown';
    
    console.log(`🔍 Looking up asset type name for ID: ${assetTypeId}`);
    
    try {
      // Check cache first
      const cachedAssetTypes = await this.getCachedAssetTypes();
      
      // If asset type is in cache and not expired, use it
      if (cachedAssetTypes[assetTypeId] && 
          cachedAssetTypes[assetTypeId].timestamp > Date.now() - this.CACHE_TIMEOUT) {
        console.log(`✅ Using cached asset type: "${cachedAssetTypes[assetTypeId].name}" for ID ${assetTypeId}`);
        return cachedAssetTypes[assetTypeId].name;
      }
      
      console.log(`🔄 Asset type ${assetTypeId} not in cache or expired, refreshing cache...`);
      
      // Refresh cache and try again
      const freshAssetTypes = await this.loadAssetTypesCache();
      if (freshAssetTypes[assetTypeId]) {
        console.log(`✅ Found asset type after refresh: "${freshAssetTypes[assetTypeId].name}"`);
        return freshAssetTypes[assetTypeId].name;
      }
      
      console.log(`❌ Asset type ${assetTypeId} not found even after refresh`);
      return `Asset Type ${assetTypeId}`;
      
    } catch (error) {
      console.error('❌ Error getting asset type name:', error);
      return `Asset Type ${assetTypeId}`;
    }
  },

  /**
   * Get location name by ID with caching
   * @param {number} locationId - Location ID 
   * @returns {Promise<string>} - Location name
   */
  async getLocationName(locationId) {
    if (!locationId) return 'Unknown';
    
    console.log(`🔍 Looking up location name for ID: ${locationId}`);
    
    try {
      // Check cache first
      const cachedLocations = await this.getCachedLocations();
      
      // If location is in cache and not expired, use it
      if (cachedLocations[locationId] && 
          cachedLocations[locationId].timestamp > Date.now() - this.CACHE_TIMEOUT) {
        console.log(`✅ Using cached location: "${cachedLocations[locationId].name}" for ID ${locationId}`);
        return cachedLocations[locationId].name;
      }
      
      console.log(`🔄 Location ${locationId} not in cache or expired, trying individual lookup...`);
      
      // Try individual location lookup first
      try {
        if (window.client.request && window.client.request.invokeTemplate) {
          const response = await window.client.request.invokeTemplate("getLocation", {
            location_id: locationId
          });
          
          if (response && response.response) {
            const data = JSON.parse(response.response);
            if (data.location && data.location.name) {
              console.log(`✅ Found location via individual lookup: "${data.location.name}"`);
              
              // Cache this individual result
              cachedLocations[locationId] = {
                name: data.location.name,
                description: data.location.description || '',
                timestamp: Date.now()
              };
              await this.saveLocationsCache(cachedLocations);
              
              return data.location.name;
            }
          }
        }
      } catch (individualError) {
        console.log(`⚠️ Individual location lookup failed: ${individualError.message}`);
      }
      
      console.log(`❌ Location ${locationId} not found, falling back to display ID`);
      return `Location ${locationId}`;
      
    } catch (error) {
      console.error('❌ Error getting location name:', error);
      return `Location ${locationId}`;
    }
  },

  /**
   * Clear all caches
   * @returns {Promise<boolean>} - Success status
   */
  async clearAllCaches() {
    try {
      await window.client.db.set(this.STORAGE_KEYS.ASSET_TYPE_CACHE, {});
      await window.client.db.set(this.STORAGE_KEYS.LOCATION_CACHE, {});
      await window.client.db.set(this.STORAGE_KEYS.ASSET_SEARCH_CACHE, {});
      console.log('✅ All caches cleared');
      return true;
    } catch (error) {
      console.error('❌ Error clearing caches:', error);
      return false;
    }
  },

  /**
   * Search assets from API with type_fields included
   * @param {string} searchTerm - The search term
   * @param {string} searchField - The field to search (optional, defaults to 'name')
   * @returns {Promise<Array>} - Array of matching assets with type_fields
   */
  async searchAssets(searchTerm, searchField = 'name') {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return [];
    }

    console.log(`🔍 CacheManager: Searching assets for "${searchTerm}" in field "${searchField}"`);

    // Check for client availability
    if (!window.client || !window.client.request || !window.client.request.invokeTemplate) {
      console.log('⚠️ Client or invokeTemplate not available for asset search');
      return [];
    }

    // Check cache first
    const cacheKey = `${searchField}:${searchTerm.toLowerCase()}`;
    const cachedResults = await this.getCachedAssetSearch(cacheKey);
    if (cachedResults) {
      console.log(`📦 Using cached asset search results for "${searchTerm}"`);
      return cachedResults;
    }

    try {
      // Use field-specific search format as required by API: field:'searchterm'
      const fieldQuery = `${searchField}:'${searchTerm}'`;
      
      console.log(`📡 CacheManager: API call with query "${fieldQuery}" and include=type_fields`);
      
      const templateContext = {
        search_query: fieldQuery,
        include_fields: "type_fields"
      };
      
      const response = await window.client.request.invokeTemplate("getAssets", {
        context: templateContext
      });

      if (!response || !response.response) {
        console.log(`⚠️ No response from asset search`);
        return [];
      }

      const data = JSON.parse(response.response);
      const assets = data.assets || [];

      console.log(`✅ CacheManager: Asset search returned ${assets.length} results with type_fields`);

      // Log sample of type_fields structure for debugging
      if (assets.length > 0 && assets[0].type_fields) {
        console.log(`📋 Sample type_fields structure:`, assets[0].type_fields);
      }

      // Sort results by name for better UX
      assets.sort((a, b) => {
        const nameA = (a.display_name || a.name || '').toLowerCase();
        const nameB = (b.display_name || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });

      // Cache the results
      await this.cacheAssetSearch(cacheKey, assets);

      return assets;

    } catch (error) {
      console.error(`❌ CacheManager: Error searching assets:`, error);
      return [];
    }
  },

  /**
   * Get cached asset search results
   * @param {string} cacheKey - The cache key for the search
   * @returns {Promise<Array|null>} - Cached results or null
   */
  async getCachedAssetSearch(cacheKey) {
    try {
      const cache = await window.client.db.get(this.STORAGE_KEYS.ASSET_SEARCH_CACHE);
      if (!cache || !cache[cacheKey]) {
        return null;
      }

      const cachedItem = cache[cacheKey];
      
      // Check if cache is expired
      if (Date.now() - cachedItem.timestamp > this.CACHE_TIMEOUT) {
        console.log(`⏰ Asset search cache expired for "${cacheKey}"`);
        return null;
      }

      return cachedItem.results;
    } catch (error) {
      console.log('No asset search cache found or error:', error);
      return null;
    }
  },

  /**
   * Cache asset search results
   * @param {string} cacheKey - The cache key for the search
   * @param {Array} assets - Assets to cache
   * @returns {Promise<boolean>} - Success status
   */
  async cacheAssetSearch(cacheKey, assets) {
    try {
      const existingCache = await window.client.db.get(this.STORAGE_KEYS.ASSET_SEARCH_CACHE) || {};
      
      existingCache[cacheKey] = {
        results: assets,
        timestamp: Date.now()
      };

      await window.client.db.set(this.STORAGE_KEYS.ASSET_SEARCH_CACHE, existingCache);
      console.log(`📦 Cached ${assets.length} asset search results for "${cacheKey}"`);
      return true;
    } catch (error) {
      console.error('Failed to save asset search cache:', error);
      return false;
    }
  },

  /**
   * Clear expired asset search cache entries
   * @returns {Promise<boolean>} - Success status
   */
  async cleanAssetSearchCache() {
    try {
      const cache = await window.client.db.get(this.STORAGE_KEYS.ASSET_SEARCH_CACHE) || {};
      const now = Date.now();
      let cleaned = 0;

      // Remove expired entries
      Object.keys(cache).forEach(key => {
        if (now - cache[key].timestamp > this.CACHE_TIMEOUT) {
          delete cache[key];
          cleaned++;
        }
      });

      if (cleaned > 0) {
        await window.client.db.set(this.STORAGE_KEYS.ASSET_SEARCH_CACHE, cache);
        console.log(`🧹 Cleaned ${cleaned} expired asset search cache entries`);
      }

      return true;
    } catch (error) {
      console.error('❌ Error cleaning asset search cache:', error);
      return false;
    }
  },

  /**
   * Extract field value from asset type_fields (helper method)
   * @param {Object} asset - The asset object
   * @param {string} fieldName - The field name to extract
   * @returns {string} - The field value or 'N/A' if not found
   */
  getAssetTypeField(asset, fieldName) {
    try {
      // Check if type_fields exists as an object (not array)
      if (asset.type_fields && typeof asset.type_fields === 'object' && !Array.isArray(asset.type_fields)) {
        // Look for the field directly or with suffix pattern (fieldname_assettypeid)
        const directValue = asset.type_fields[fieldName];
        if (directValue !== null && directValue !== undefined && directValue !== '') {
          return String(directValue);
        }
        
        // Look for field with asset type ID suffix pattern
        if (asset.asset_type_id) {
          const suffixedFieldName = `${fieldName}_${asset.asset_type_id}`;
          const suffixedValue = asset.type_fields[suffixedFieldName];
          if (suffixedValue !== null && suffixedValue !== undefined && suffixedValue !== '') {
            return String(suffixedValue);
          }
        }
        
        // Look for partial matches in field names
        const matchingKey = Object.keys(asset.type_fields).find(key => 
          key.toLowerCase().includes(fieldName.toLowerCase()) ||
          fieldName.toLowerCase().includes(key.toLowerCase())
        );
        
        if (matchingKey) {
          const value = asset.type_fields[matchingKey];
          if (value !== null && value !== undefined && value !== '') {
            return String(value);
          }
        }
      }
      
      // Also check if type_fields exists as an array (legacy support)
      if (asset.type_fields && Array.isArray(asset.type_fields)) {
        const field = asset.type_fields.find(f => 
          f.field_name === fieldName || 
          f.name === fieldName ||
          f.label === fieldName ||
          f.field_label === fieldName
        );
        
        if (field) {
          // Handle different value property names
          const value = field.value || field.field_value || field.display_value;
          if (value !== null && value !== undefined && value !== '') {
            return String(value);
          }
        }
      }
      
      // Fallback to direct property access
      if (asset[fieldName] !== null && asset[fieldName] !== undefined && asset[fieldName] !== '') {
        return String(asset[fieldName]);
      }
      
      return 'N/A';
    } catch (error) {
      console.warn(`Error extracting field ${fieldName} from asset:`, error);
      return 'N/A';
    }
  },

  /**
   * Resolve user ID to user name using global user functions
   * @param {number} userId - User ID to resolve
   * @returns {Promise<string>} - User name or 'Unknown'
   */
  async resolveUserName(userId) {
    try {
      if (!userId || isNaN(userId)) {
        return 'Unknown';
      }

      console.log(`🔍 Resolving user ID ${userId} (checking both requesters and agents)...`);

      // Use the global getUserName function if available (this checks both requesters and agents)
      if (typeof window.getUserName === 'function') {
        const userName = await window.getUserName(userId);
        if (userName && userName !== 'N/A' && userName !== 'Unknown') {
          console.log(`✅ Resolved user ID ${userId} to: "${userName}"`);
          return userName;
        }
      }

      // Fallback: try to access global functions directly
      if (typeof getUserName === 'function') {
        const userName = await getUserName(userId);
        if (userName && userName !== 'N/A' && userName !== 'Unknown') {
          console.log(`✅ Resolved user ID ${userId} to: "${userName}" (fallback)`);
          return userName;
        }
      }

      // If global functions aren't available, try direct cache access
      if (window.client && window.client.db) {
        console.log(`🔄 Trying direct cache access for user ID ${userId}...`);
        
        try {
          // Check user cache (which should contain both requesters and agents)
          const userCache = await window.client.db.get('user_cache') || {};
          
          if (userCache[userId]) {
            const cachedUser = userCache[userId];
            if (cachedUser.name && cachedUser.name !== 'Unknown') {
              console.log(`✅ Found user ID ${userId} in cache: "${cachedUser.name}" (${cachedUser.type || 'unknown type'})`);
              return cachedUser.name;
            }
          }
          
          console.log(`⚠️ User ID ${userId} not found in cache`);
        } catch (cacheError) {
          console.warn(`⚠️ Error accessing user cache for ID ${userId}:`, cacheError);
        }
      }

      // If user resolution functions are not available, return with ID
      console.log(`⚠️ Could not resolve user ID ${userId} - user functions not available`);
      return `User ID: ${userId}`;
      
    } catch (error) {
      console.warn(`Error resolving user ID ${userId}:`, error);
      return `User ID: ${userId}`;
    }
  },

  /**
   * Resolve asset ID to get the managing user from that asset
   * @param {number} assetId - Asset ID to resolve
   * @returns {Promise<string>} - Managing user name or 'Unknown'
   */
  async resolveAssetToManager(assetId) {
    try {
      if (!assetId || isNaN(assetId)) {
        return 'Unknown';
      }

      console.log(`🔍 Resolving asset ID ${assetId} to find its managing user...`);

      // Check for client availability
      if (!window.client || !window.client.request || !window.client.request.invokeTemplate) {
        console.log('⚠️ Client or invokeTemplate not available for asset lookup');
        return `Asset ID: ${assetId}`;
      }

      try {
        // Get the asset details by ID
        const response = await window.client.request.invokeTemplate("getAssets", {
          path_suffix: `/${assetId}?include=type_fields`
        });

        if (!response || !response.response) {
          console.log(`⚠️ No response for asset ID ${assetId}`);
          return `Asset ID: ${assetId}`;
        }

        const data = JSON.parse(response.response);
        const managingAsset = data.asset || data;

        if (!managingAsset) {
          console.log(`⚠️ Asset ${assetId} not found`);
          return `Asset ID: ${assetId}`;
        }

        console.log(`✅ Found managing asset: "${managingAsset.name || managingAsset.display_name}" (ID: ${managingAsset.id})`);

        // Now get the managing user from this asset
        // Check agent_id first (most common)
        if (managingAsset.agent_id) {
          const numericUserId = parseInt(managingAsset.agent_id);
          if (!isNaN(numericUserId) && numericUserId > 0) {
            console.log(`🔍 Managing asset has agent_id: ${numericUserId}`);
            const userName = await this.resolveUserName(numericUserId);
            if (userName && userName !== 'Unknown' && !userName.startsWith('User ID:')) {
              console.log(`✅ Resolved managing asset ${assetId} -> agent ${numericUserId} -> "${userName}"`);
              return userName;
            }
          }
        }

        // Check user_id as fallback
        if (managingAsset.user_id) {
          const numericUserId = parseInt(managingAsset.user_id);
          if (!isNaN(numericUserId) && numericUserId > 0) {
            console.log(`🔍 Managing asset has user_id: ${numericUserId}`);
            const userName = await this.resolveUserName(numericUserId);
            if (userName && userName !== 'Unknown' && !userName.startsWith('User ID:')) {
              console.log(`✅ Resolved managing asset ${assetId} -> user ${numericUserId} -> "${userName}"`);
              return userName;
            }
          }
        }

        // Check managed_by field in type_fields
        const managedByField = this.getAssetTypeField(managingAsset, 'managed_by');
        if (managedByField && managedByField !== 'N/A') {
          const numericId = parseInt(managedByField);
          if (!isNaN(numericId) && numericId > 0) {
            console.log(`🔍 Managing asset has managed_by in type_fields: ${numericId}`);
            const userName = await this.resolveUserName(numericId);
            if (userName && userName !== 'Unknown' && !userName.startsWith('User ID:')) {
              console.log(`✅ Resolved managing asset ${assetId} -> managed_by ${numericId} -> "${userName}"`);
              return userName;
            }
          }
        }

        console.log(`⚠️ Managing asset ${assetId} ("${managingAsset.name}") has no resolvable managing user`);
        return `Asset: ${managingAsset.name || managingAsset.display_name || assetId}`;

      } catch (apiError) {
        console.log(`⚠️ Error fetching asset ${assetId}:`, apiError);
        return `Asset ID: ${assetId}`;
      }

    } catch (error) {
      console.warn(`Error resolving asset ID ${assetId} to manager:`, error);
      return `Asset ID: ${assetId}`;
    }
  },

  /**
   * Get managed by information from asset (helper method)
   * Handles asset IDs that need to be resolved to their managing users
   * @param {Object} asset - The asset object
   * @returns {Promise<string>} - The managed by information (resolved to actual name)
   */
  async getManagedByInfo(asset) {
    try {
      // First check agent_id - this could be either a user ID or an asset ID
      if (asset.agent_id) {
        const numericId = parseInt(asset.agent_id);
        if (!isNaN(numericId) && numericId > 0) {
          console.log(`🔍 Resolving agent_id (managed by): ${numericId} (could be user ID or asset ID)`);
          
          // First try as user ID
          const userName = await this.resolveUserName(numericId);
          if (userName && userName !== 'Unknown' && !userName.startsWith('User ID:')) {
            console.log(`✅ agent_id ${numericId} resolved as user: "${userName}"`);
            return userName;
          }
          
          // If user resolution failed, try as asset ID
          console.log(`🔄 agent_id ${numericId} not found as user, trying as asset ID...`);
          const assetManager = await this.resolveAssetToManager(numericId);
          if (assetManager && assetManager !== 'Unknown' && !assetManager.startsWith('Asset ID:')) {
            console.log(`✅ agent_id ${numericId} resolved as managing asset: "${assetManager}"`);
            return assetManager;
          }
        }
        // If both resolutions failed, return with ID label
        return `Agent ID: ${asset.agent_id}`;
      }
      
      // Try to get from type_fields with various field name patterns
      const managedByField = this.getAssetTypeField(asset, 'managed_by');
      if (managedByField && managedByField !== 'N/A') {
        const numericId = parseInt(managedByField);
        if (!isNaN(numericId) && numericId > 0) {
          console.log(`🔍 Resolving managed_by from type_fields: ${numericId} (could be user ID or asset ID)`);
          
          // First try as user ID
          const userName = await this.resolveUserName(numericId);
          if (userName && userName !== 'Unknown' && !userName.startsWith('User ID:')) {
            console.log(`✅ managed_by ${numericId} resolved as user: "${userName}"`);
            return userName;
          }
          
          // If user resolution failed, try as asset ID
          console.log(`🔄 managed_by ${numericId} not found as user, trying as asset ID...`);
          const assetManager = await this.resolveAssetToManager(numericId);
          if (assetManager && assetManager !== 'Unknown' && !assetManager.startsWith('Asset ID:')) {
            console.log(`✅ managed_by ${numericId} resolved as managing asset: "${assetManager}"`);
            return assetManager;
          }
        }
        // If not a numeric ID or resolution failed, return the field value as-is
        return managedByField;
      }

      // Try various direct property names
      if (asset.managed_by_name) {
        return asset.managed_by_name;
      }
      
      if (asset.managed_by) {
        const numericId = parseInt(asset.managed_by);
        if (!isNaN(numericId) && numericId > 0) {
          console.log(`🔍 Resolving direct managed_by: ${numericId} (could be user ID or asset ID)`);
          
          // First try as user ID
          const userName = await this.resolveUserName(numericId);
          if (userName && userName !== 'Unknown' && !userName.startsWith('User ID:')) {
            console.log(`✅ direct managed_by ${numericId} resolved as user: "${userName}"`);
            return userName;
          }
          
          // If user resolution failed, try as asset ID
          console.log(`🔄 direct managed_by ${numericId} not found as user, trying as asset ID...`);
          const assetManager = await this.resolveAssetToManager(numericId);
          if (assetManager && assetManager !== 'Unknown' && !assetManager.startsWith('Asset ID:')) {
            console.log(`✅ direct managed_by ${numericId} resolved as managing asset: "${assetManager}"`);
            return assetManager;
          }
        }
        // If not a numeric ID or resolution failed, return with ID label
        return `Managed By: ${asset.managed_by}`;
      }
      
      // Check user_id field as another possibility (typically requester)
      if (asset.user_id) {
        const numericId = parseInt(asset.user_id);
        if (!isNaN(numericId) && numericId > 0) {
          console.log(`🔍 Resolving user_id (alternative managed by): ${numericId} (typically requester)`);
          const userName = await this.resolveUserName(numericId);
          if (userName && userName !== 'Unknown' && !userName.startsWith('User ID:')) {
            return userName;
          }
        }
        return `User ID: ${asset.user_id}`;
      }
      
      // Try additional field variations in type_fields
      const alternativeFields = ['owner', 'assigned_to', 'responsible_user', 'assigned_agent'];
      for (const fieldName of alternativeFields) {
        const value = this.getAssetTypeField(asset, fieldName);
        if (value && value !== 'N/A') {
          const numericId = parseInt(value);
          if (!isNaN(numericId) && numericId > 0) {
            console.log(`🔍 Resolving ${fieldName}: ${numericId} (could be user ID or asset ID)`);
            
            // First try as user ID
            const userName = await this.resolveUserName(numericId);
            if (userName && userName !== 'Unknown' && !userName.startsWith('User ID:')) {
              console.log(`✅ ${fieldName} ${numericId} resolved as user: "${userName}"`);
              return userName;
            }
            
            // If user resolution failed, try as asset ID
            console.log(`🔄 ${fieldName} ${numericId} not found as user, trying as asset ID...`);
            const assetManager = await this.resolveAssetToManager(numericId);
            if (assetManager && assetManager !== 'Unknown' && !assetManager.startsWith('Asset ID:')) {
              console.log(`✅ ${fieldName} ${numericId} resolved as managing asset: "${assetManager}"`);
              return assetManager;
            }
          }
          // If not a numeric ID or resolution failed, return the value as-is
          return value;
        }
      }
      
      return 'N/A';
    } catch (error) {
      console.warn('Error getting managed by info:', error);
      return 'N/A';
    }
  },

  /**
   * Get environment information from asset (helper method)
   * @param {Object} asset - The asset object
   * @returns {string} - The environment information
   */
  getEnvironmentInfo(asset) {
    try {
      // First try to get from type_fields
      const environmentField = this.getAssetTypeField(asset, 'environment');
      if (environmentField && environmentField !== 'N/A') {
        return environmentField;
      }

      // Try direct property access
      if (asset.environment) {
        return asset.environment;
      }
      
      // Try additional field variations in type_fields
      const alternativeFields = ['env', 'deployment_environment', 'stage'];
      for (const fieldName of alternativeFields) {
        const value = this.getAssetTypeField(asset, fieldName);
        if (value && value !== 'N/A') {
          return value;
        }
      }
      
      return 'N/A';
    } catch (error) {
      console.warn('Error getting environment info:', error);
      return 'N/A';
    }
  },

  /**
   * Get impact information from asset (helper method)
   * @param {Object} asset - The asset object
   * @returns {string} - The impact information
   */
  getImpactInfo(asset) {
    try {
      // Check direct impact property first
      if (asset.impact) {
        return asset.impact;
      }
      
      // Try to get from type_fields
      const impactField = this.getAssetTypeField(asset, 'impact');
      if (impactField && impactField !== 'N/A') {
        return impactField;
      }
      
      // Try additional field variations in type_fields
      const alternativeFields = ['business_impact', 'criticality', 'priority'];
      for (const fieldName of alternativeFields) {
        const value = this.getAssetTypeField(asset, fieldName);
        if (value && value !== 'N/A') {
          return value;
        }
      }
      
      return 'unknown';
    } catch (error) {
      console.warn('Error getting impact info:', error);
      return 'unknown';
    }
  },

  /**
   * Search for assets and display their managed by information with resolved names
   * @param {string} searchTerm - The search term (optional, defaults to empty for all assets)
   * @param {string} searchField - The field to search (optional, defaults to 'name')
   * @param {number} maxResults - Maximum number of results to display (optional, defaults to 50)
   * @returns {Promise<Array>} - Array of assets with resolved managed by information
   */
  async searchAssetsWithManagedBy(searchTerm = '', searchField = 'name', maxResults = 50) {
    console.log(`🔍 === SEARCHING ASSETS WITH MANAGED BY RESOLUTION ===`);
    console.log(`Search term: "${searchTerm}" | Field: "${searchField}" | Max results: ${maxResults}`);

    // Check for client availability
    if (!window.client || !window.client.request || !window.client.request.invokeTemplate) {
      console.log('⚠️ Client or invokeTemplate not available for asset search');
      return [];
    }

    try {
      let assets = [];
      
      if (searchTerm && searchTerm.trim().length >= 2) {
        // Use specific search if search term provided
        console.log(`🔍 Performing specific search for "${searchTerm}"`);
        assets = await this.searchAssets(searchTerm, searchField);
      } else {
        // Get all assets if no search term or search term too short
        console.log(`📋 Retrieving all assets (no specific search term)`);
        assets = await this.getAllAssets(maxResults);
      }

      if (assets.length === 0) {
        console.log(`⚠️ No assets found`);
        return [];
      }

      console.log(`📦 Processing ${assets.length} assets for managed by resolution...`);

      // Process each asset to resolve managed by information
      const assetsWithManagedBy = [];
      
      for (let i = 0; i < Math.min(assets.length, maxResults); i++) {
        const asset = assets[i];
        
        try {
          // Get basic asset info
          const assetInfo = {
            id: asset.id,
            name: asset.display_name || asset.name || 'Unknown Asset',
            asset_tag: asset.asset_tag || 'N/A',
            asset_type_id: asset.asset_type_id,
            location_id: asset.location_id,
            serial_number: asset.serial_number || 'N/A',
            impact: asset.impact || 'unknown',
            environment: this.getEnvironmentInfo(asset),
            // Raw managed by fields for debugging
            raw_agent_id: asset.agent_id,
            raw_user_id: asset.user_id,
            raw_managed_by: asset.managed_by,
            raw_managed_by_name: asset.managed_by_name
          };

          // Resolve managed by information
          console.log(`🔍 Processing asset "${assetInfo.name}" (ID: ${assetInfo.id})`);
          
          // Get managed by info with full resolution
          const managedByInfo = await this.getManagedByInfo(asset);
          assetInfo.managed_by_resolved = managedByInfo;

          // Get asset type name
          if (assetInfo.asset_type_id) {
            assetInfo.asset_type_name = await this.getAssetTypeName(assetInfo.asset_type_id);
          }

          // Get location name
          if (assetInfo.location_id) {
            assetInfo.location_name = await this.getLocationName(assetInfo.location_id);
          }

          // Determine the source of managed by information for debugging
          let managedBySource = 'N/A';
          if (asset.agent_id) {
            managedBySource = `agent_id: ${asset.agent_id}`;
          } else if (asset.user_id) {
            managedBySource = `user_id: ${asset.user_id}`;
          } else if (asset.managed_by) {
            managedBySource = `managed_by: ${asset.managed_by}`;
          } else if (asset.managed_by_name) {
            managedBySource = `managed_by_name: ${asset.managed_by_name}`;
          } else {
            const managedByField = this.getAssetTypeField(asset, 'managed_by');
            if (managedByField && managedByField !== 'N/A') {
              managedBySource = `type_fields.managed_by: ${managedByField}`;
            }
          }
          
          assetInfo.managed_by_source = managedBySource;

          assetsWithManagedBy.push(assetInfo);

          // Log progress every 10 assets
          if ((i + 1) % 10 === 0) {
            console.log(`📊 Processed ${i + 1}/${Math.min(assets.length, maxResults)} assets...`);
          }

        } catch (assetError) {
          console.warn(`⚠️ Error processing asset ${asset.id}:`, assetError);
          // Still add the asset with basic info
          assetsWithManagedBy.push({
            id: asset.id,
            name: asset.display_name || asset.name || 'Unknown Asset',
            managed_by_resolved: 'Error resolving',
            managed_by_source: 'Error',
            error: assetError.message
          });
        }
      }

      // Display results in a formatted table
      this.displayManagedByResults(assetsWithManagedBy);

      return assetsWithManagedBy;

    } catch (error) {
      console.error('❌ Error searching assets with managed by:', error);
      return [];
    }
  },

  /**
   * Get all assets (paginated) for managed by analysis
   * @param {number} maxResults - Maximum number of results to retrieve
   * @returns {Promise<Array>} - Array of assets
   */
  async getAllAssets(maxResults = 50) {
    console.log(`📋 Retrieving up to ${maxResults} assets from all pages...`);

    try {
      const allAssets = [];
      let page = 1;
      const maxPages = Math.ceil(maxResults / 30); // 30 per page
      
      while (page <= maxPages && allAssets.length < maxResults) {
        console.log(`📄 Fetching assets page ${page}...`);
        
        try {
          const response = await window.client.request.invokeTemplate("getAssets", {
            context: {
              page: page,
              per_page: 30,
              include_fields: "type_fields"
            }
          });
          
          if (!response || !response.response) {
            console.log(`⚠️ No response for assets page ${page}, stopping`);
            break;
          }
          
          const data = JSON.parse(response.response);
          const pageAssets = data.assets || [];
          
          console.log(`✅ Page ${page}: Retrieved ${pageAssets.length} assets`);
          
          if (pageAssets.length === 0) {
            console.log(`📄 No more assets found, stopping at page ${page}`);
            break;
          }
          
          // Add assets to collection (up to maxResults)
          const remainingSlots = maxResults - allAssets.length;
          const assetsToAdd = pageAssets.slice(0, remainingSlots);
          allAssets.push(...assetsToAdd);
          
          console.log(`📦 Total assets collected: ${allAssets.length}/${maxResults}`);
          
          // Stop if we have enough assets
          if (allAssets.length >= maxResults) {
            console.log(`✅ Reached maximum results (${maxResults}), stopping`);
            break;
          }
          
          // Stop if we didn't get a full page
          if (pageAssets.length < 30) {
            console.log(`📄 Partial page received, stopping`);
            break;
          }
          
          page++;
          
          // Add a small delay between pages to be API-friendly
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (pageError) {
          console.log(`⚠️ Error fetching assets page ${page}:`, pageError);
          break;
        }
      }
      
      console.log(`✅ Retrieved ${allAssets.length} total assets from ${page - 1} pages`);
      return allAssets;
      
    } catch (error) {
      console.error('❌ Error getting all assets:', error);
      return [];
    }
  },

  /**
   * Display managed by results in a formatted table
   * @param {Array} assets - Array of assets with managed by information
   */
  displayManagedByResults(assets) {
    console.log(`\n📊 === MANAGED BY ANALYSIS RESULTS ===`);
    console.log(`Total assets analyzed: ${assets.length}`);
    
    if (assets.length === 0) {
      console.log(`⚠️ No assets to display`);
      return;
    }

    // Group assets by managed by status
    const managedAssets = assets.filter(asset => 
      asset.managed_by_resolved && 
      asset.managed_by_resolved !== 'N/A' && 
      asset.managed_by_resolved !== 'Unknown' &&
      !asset.managed_by_resolved.startsWith('Agent ID:') &&
      !asset.managed_by_resolved.startsWith('User ID:')
    );
    
    const unmanagedAssets = assets.filter(asset => 
      !asset.managed_by_resolved || 
      asset.managed_by_resolved === 'N/A' || 
      asset.managed_by_resolved === 'Unknown'
    );
    
    const unresolvedAssets = assets.filter(asset => 
      asset.managed_by_resolved && (
        asset.managed_by_resolved.startsWith('Agent ID:') ||
        asset.managed_by_resolved.startsWith('User ID:')
      )
    );

    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Managed (resolved): ${managedAssets.length}`);
    console.log(`   ⚠️ Unresolved IDs: ${unresolvedAssets.length}`);
    console.log(`   ❌ Unmanaged: ${unmanagedAssets.length}`);

    // Display managed assets with resolved names
    if (managedAssets.length > 0) {
      console.log(`\n✅ === ASSETS WITH RESOLVED MANAGED BY ===`);
      console.log(`Found ${managedAssets.length} assets with resolved manager names:`);
      
      managedAssets.forEach((asset, index) => {
        console.log(`\n${index + 1}. "${asset.name}" (ID: ${asset.id})`);
        console.log(`   👤 Managed By: ${asset.managed_by_resolved}`);
        console.log(`   📋 Source: ${asset.managed_by_source}`);
        console.log(`   🏷️ Asset Type: ${asset.asset_type_name || asset.asset_type_id || 'Unknown'}`);
        console.log(`   📍 Location: ${asset.location_name || asset.location_id || 'Unknown'}`);
        console.log(`   🏷️ Asset Tag: ${asset.asset_tag}`);
        console.log(`   🌍 Environment: ${asset.environment}`);
        console.log(`   ⚡ Impact: ${asset.impact}`);
      });
    }

    // Display assets with unresolved IDs
    if (unresolvedAssets.length > 0) {
      console.log(`\n⚠️ === ASSETS WITH UNRESOLVED MANAGER IDS ===`);
      console.log(`Found ${unresolvedAssets.length} assets with manager IDs that couldn't be resolved:`);
      
      unresolvedAssets.forEach((asset, index) => {
        console.log(`\n${index + 1}. "${asset.name}" (ID: ${asset.id})`);
        console.log(`   🔍 Unresolved: ${asset.managed_by_resolved}`);
        console.log(`   📋 Source: ${asset.managed_by_source}`);
        console.log(`   🏷️ Asset Type: ${asset.asset_type_name || asset.asset_type_id || 'Unknown'}`);
        console.log(`   📍 Location: ${asset.location_name || asset.location_id || 'Unknown'}`);
        console.log(`   🏷️ Asset Tag: ${asset.asset_tag}`);
        
        // Show raw values for debugging
        if (asset.raw_agent_id) console.log(`   🔧 Raw agent_id: ${asset.raw_agent_id}`);
        if (asset.raw_user_id) console.log(`   🔧 Raw user_id: ${asset.raw_user_id}`);
        if (asset.raw_managed_by) console.log(`   🔧 Raw managed_by: ${asset.raw_managed_by}`);
      });
      
      console.log(`\n💡 Tip: These IDs might need to be added to the user cache, or the users might not exist in the system.`);
    }

    // Display unmanaged assets
    if (unmanagedAssets.length > 0) {
      console.log(`\n❌ === UNMANAGED ASSETS ===`);
      console.log(`Found ${unmanagedAssets.length} assets with no managed by information:`);
      
      unmanagedAssets.slice(0, 10).forEach((asset, index) => {
        console.log(`${index + 1}. "${asset.name}" (ID: ${asset.id}) - ${asset.asset_type_name || asset.asset_type_id || 'Unknown Type'}`);
      });
      
      if (unmanagedAssets.length > 10) {
        console.log(`   ... and ${unmanagedAssets.length - 10} more unmanaged assets`);
      }
    }

    // Show user cache statistics
    this.displayUserCacheStats();
  },

  /**
   * Display user cache statistics for debugging
   */
  async displayUserCacheStats() {
    try {
      console.log(`\n📊 === USER CACHE STATISTICS ===`);
      
      const userCache = await window.client.db.get('user_cache') || {};
      const userCount = Object.keys(userCache).length;
      
      if (userCount === 0) {
        console.log(`⚠️ User cache is empty - this may explain unresolved IDs`);
        console.log(`💡 Try running: await fetchUsers() to populate the user cache`);
        return;
      }
      
      console.log(`👥 Total cached users: ${userCount}`);
      
      // Count by type
      const typeStats = {};
      Object.values(userCache).forEach(user => {
        const type = user.type || 'unknown';
        typeStats[type] = (typeStats[type] || 0) + 1;
      });
      
      console.log(`📋 User types in cache:`);
      Object.entries(typeStats).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} users`);
      });
      
      // Show sample users
      const sampleUsers = Object.entries(userCache).slice(0, 5);
      if (sampleUsers.length > 0) {
        console.log(`\n📋 Sample cached users:`);
        sampleUsers.forEach(([id, user]) => {
          console.log(`   ID ${id}: "${user.name}" (${user.type || 'unknown type'})`);
        });
      }
      
    } catch (error) {
      console.warn(`⚠️ Error displaying user cache stats:`, error);
    }
  },
};

// Debug functions for testing
window.testUserIdResolution = async function(userId) {
  console.log(`🧪 Testing user ID resolution for: ${userId}`);
  
  if (!window.CacheManager) {
    console.error('❌ CacheManager not available');
    return;
  }
  
  try {
    const userName = await window.CacheManager.resolveUserName(userId);
    console.log(`✅ User ID ${userId} resolved to: "${userName}"`);
    return userName;
  } catch (error) {
    console.error(`❌ Error resolving user ID ${userId}:`, error);
    return null;
  }
};

window.testAssetManagedByResolution = async function(testAsset) {
  console.log(`🧪 Testing managed by resolution for asset:`, testAsset);
  
  if (!window.CacheManager) {
    console.error('❌ CacheManager not available');
    return;
  }
  
  try {
    const managedBy = await window.CacheManager.getManagedByInfo(testAsset);
    console.log(`✅ Managed by resolved to: "${managedBy}"`);
    return managedBy;
  } catch (error) {
    console.error(`❌ Error resolving managed by:`, error);
    return null;
  }
};

// Test function with real Active Directory asset structure
window.testActiveDirectoryAsset = async function() {
  console.log(`🧪 Testing with sample asset structure...`);
  
  // Generic test asset structure (no real sensitive data)
  const testAsset = {
    "type_fields": {
      "health_12345": "Operational",
      "hosting_model_12345": "Self-Hosted", 
      "vendor_12345": "Microsoft",
      "environment_12345": "PROD"
    },
    "name": "Sample Directory Service",
    "asset_type_id": 12345,
    "asset_tag": "ASSET-TEST",
    "impact": "high",
    "description": "Sample directory service for testing",
    "agent_id": 12345, // Sample agent ID for testing
    "user_id": null,
    "id": 12345,
    "display_id": 123
  };
  
  if (!window.CacheManager) {
    console.error('❌ CacheManager not available');
    return;
  }
  
  try {
    console.log(`📋 Asset details:`);
    console.log(`   Name: ${testAsset.name}`);
    console.log(`   Asset Type ID: ${testAsset.asset_type_id}`);
    console.log(`   Agent ID (Managed By): ${testAsset.agent_id}`);
    console.log(`   User ID: ${testAsset.user_id}`);
    console.log(`   Asset Tag: ${testAsset.asset_tag}`);
    
    console.log(`📋 Type fields structure:`, testAsset.type_fields);
    
    // Test environment extraction
    const environment = window.CacheManager.getEnvironmentInfo(testAsset);
    console.log(`🌍 Environment: "${environment}"`);
    
    // Test managed by resolution
    const managedBy = await window.CacheManager.getManagedByInfo(testAsset);
    console.log(`👤 Managed By: "${managedBy}"`);
    
    // Test individual field extraction
    const healthField = window.CacheManager.getAssetTypeField(testAsset, 'health');
    console.log(`💚 Health: "${healthField}"`);
    
    const vendorField = window.CacheManager.getAssetTypeField(testAsset, 'vendor'); 
    console.log(`🏢 Vendor: "${vendorField}"`);
    
    const hostingField = window.CacheManager.getAssetTypeField(testAsset, 'hosting_model');
    console.log(`🖥️ Hosting Model: "${hostingField}"`);
    
    console.log(`✅ Sample asset test complete`);
    
    return {
      environment,
      managedBy,
      health: healthField,
      vendor: vendorField,
      hostingModel: hostingField
    };
    
  } catch (error) {
    console.error(`❌ Error testing sample asset:`, error);
    return null;
  }
};

// Test function for managed by resolution with both requesters and agents
window.testManagedByResolution = async function() {
  console.log(`🧪 Testing managed by resolution for both requesters and agents...`);
  
  if (!window.CacheManager) {
    console.error('❌ CacheManager not available');
    return;
  }
  
  // Test asset with agent_id (most common case) - using generic test data
  const assetWithAgent = {
    "name": "Test Server",
    "asset_type_id": 12345,
    "agent_id": 11111, // Generic test agent ID
    "user_id": null,
    "type_fields": {
      "environment_12345": "PROD"
    }
  };
  
  // Test asset with user_id (requester managed asset) - using generic test data
  const assetWithUser = {
    "name": "Test Laptop", 
    "asset_type_id": 12345,
    "agent_id": null,
    "user_id": 22222, // Generic test user ID
    "type_fields": {
      "environment_12345": "DEV"
    }
  };
  
  // Test asset with managed_by in type_fields - using generic test data
  const assetWithTypeFieldsManaged = {
    "name": "Test Application",
    "asset_type_id": 12345, 
    "agent_id": null,
    "user_id": null,
    "type_fields": {
      "environment_12345": "TEST",
      "managed_by_12345": "33333" // Generic test managed by ID
    }
  };
  
  try {
    console.log(`\n📋 Testing asset with agent_id (${assetWithAgent.agent_id}):`);
    const agentManagedBy = await window.CacheManager.getManagedByInfo(assetWithAgent);
    console.log(`   Result: "${agentManagedBy}"`);
    
    console.log(`\n📋 Testing asset with user_id (${assetWithUser.user_id}):`);
    const userManagedBy = await window.CacheManager.getManagedByInfo(assetWithUser);
    console.log(`   Result: "${userManagedBy}"`);
    
    console.log(`\n📋 Testing asset with type_fields managed_by (${assetWithTypeFieldsManaged.type_fields.managed_by_12345}):`);
    const typeFieldsManagedBy = await window.CacheManager.getManagedByInfo(assetWithTypeFieldsManaged);
    console.log(`   Result: "${typeFieldsManagedBy}"`);
    
    // Test direct user resolution with generic test IDs
    console.log(`\n🔍 Testing direct user ID resolution:`);
    const testUserIds = [11111, 22222, 33333]; // Generic test user IDs
    
    for (const userId of testUserIds) {
      console.log(`   Testing user ID ${userId}:`);
      const resolvedName = await window.CacheManager.resolveUserName(userId);
      console.log(`     Resolved to: "${resolvedName}"`);
    }
    
    console.log(`\n✅ Managed by resolution test complete`);
    
    return {
      agentManaged: agentManagedBy,
      userManaged: userManagedBy,
      typeFieldsManaged: typeFieldsManagedBy
    };
    
  } catch (error) {
    console.error(`❌ Error testing managed by resolution:`, error);
    return null;
  }
};

// Global convenience function to search assets with managed by information
window.searchAssetsWithManagedBy = async function(searchTerm = '', searchField = 'name', maxResults = 50) {
  console.log(`🔍 === ASSET MANAGED BY SEARCH ===`);
  console.log(`🎯 This function will search for assets and resolve their managed by information`);
  console.log(`📋 Parameters: searchTerm="${searchTerm}", searchField="${searchField}", maxResults=${maxResults}`);
  
  if (!window.CacheManager) {
    console.error('❌ CacheManager not available');
    return [];
  }
  
  try {
    // First ensure user cache is populated
    console.log(`👥 Checking user cache status...`);
    await window.CacheManager.displayUserCacheStats();
    
    // Perform the search
    const results = await window.CacheManager.searchAssetsWithManagedBy(searchTerm, searchField, maxResults);
    
    console.log(`\n✅ Search complete! Found ${results.length} assets.`);
    console.log(`💡 Results are displayed above with full managed by resolution.`);
    
    return results;
    
  } catch (error) {
    console.error(`❌ Error in asset managed by search:`, error);
    return [];
  }
};

// Global convenience function to search for specific assets by name with managed by info
window.findAssetManagedBy = async function(assetName) {
  console.log(`🔍 === FIND SPECIFIC ASSET MANAGED BY ===`);
  console.log(`🎯 Searching for assets containing "${assetName}" and resolving managed by information`);
  
  if (!assetName || assetName.trim().length < 2) {
    console.log(`⚠️ Please provide an asset name with at least 2 characters`);
    return [];
  }
  
  return await window.searchAssetsWithManagedBy(assetName, 'name', 20);
};

// Global convenience function to get all assets with managed by info (limited results)
window.getAllAssetsManagedBy = async function(maxResults = 30) {
  console.log(`🔍 === GET ALL ASSETS WITH MANAGED BY INFO ===`);
  console.log(`🎯 Retrieving up to ${maxResults} assets and resolving their managed by information`);
  
  return await window.searchAssetsWithManagedBy('', 'name', maxResults);
};

// Global convenience function to populate user cache if needed
window.ensureUserCache = async function() {
  console.log(`👥 === ENSURING USER CACHE IS POPULATED ===`);
  
  try {
    // Check current cache status
    const userCache = await window.client.db.get('user_cache') || {};
    const userCount = Object.keys(userCache).length;
    
    console.log(`📊 Current user cache: ${userCount} users`);
    
    if (userCount < 10) {
      console.log(`⚠️ User cache appears to be empty or sparse. Fetching users...`);
      
      // Check if fetchUsers function is available
      if (typeof window.fetchUsers === 'function') {
        await window.fetchUsers();
        console.log(`✅ User cache populated via fetchUsers()`);
      } else if (typeof fetchUsers === 'function') {
        await fetchUsers();
        console.log(`✅ User cache populated via global fetchUsers()`);
      } else {
        console.log(`⚠️ fetchUsers() function not available. User resolution may be limited.`);
        console.log(`💡 Try running the app initialization to populate user cache.`);
      }
    } else {
      console.log(`✅ User cache appears to be populated with ${userCount} users`);
    }
    
    // Display final cache stats
    await window.CacheManager.displayUserCacheStats();
    
  } catch (error) {
    console.error(`❌ Error ensuring user cache:`, error);
  }
};

// Test function for asset ID to manager resolution
window.testAssetIdResolution = async function(assetId) {
  console.log(`🧪 === TESTING ASSET ID TO MANAGER RESOLUTION ===`);
  console.log(`🎯 Testing resolution of asset ID ${assetId} to its managing user`);
  
  if (!window.CacheManager) {
    console.error('❌ CacheManager not available');
    return;
  }
  
  if (!assetId) {
    console.log(`⚠️ Please provide an asset ID to test`);
    console.log(`💡 Usage: testAssetIdResolution(12345)`);
    return;
  }
  
  try {
    console.log(`🔍 Step 1: Resolving asset ID ${assetId} to find its managing user...`);
    const managerName = await window.CacheManager.resolveAssetToManager(assetId);
    
    console.log(`\n📊 === RESOLUTION RESULT ===`);
    console.log(`Asset ID: ${assetId}`);
    console.log(`Resolved Manager: "${managerName}"`);
    
    if (managerName && !managerName.startsWith('Asset ID:') && managerName !== 'Unknown') {
      console.log(`✅ Successfully resolved asset ID to manager name!`);
    } else {
      console.log(`⚠️ Could not resolve asset ID to a manager name`);
      console.log(`💡 This could mean:`);
      console.log(`   - Asset doesn't exist`);
      console.log(`   - Asset has no managing user assigned`);
      console.log(`   - Managing user is not in the user cache`);
    }
    
    return managerName;
    
  } catch (error) {
    console.error(`❌ Error testing asset ID resolution:`, error);
    return null;
  }
};

// Test function for managed by resolution with asset IDs
window.testManagedByWithAssetIds = async function() {
  console.log(`🧪 === TESTING MANAGED BY RESOLUTION WITH ASSET IDS ===`);
  console.log(`🎯 Testing assets that have asset IDs in their managed by fields`);
  
  if (!window.CacheManager) {
    console.error('❌ CacheManager not available');
    return;
  }
  
  // Test asset with agent_id that could be an asset ID
  const assetWithAssetIdManager = {
    "name": "Test Server Managed by Asset",
    "asset_type_id": 12345,
    "agent_id": 98765, // This could be an asset ID instead of user ID
    "user_id": null,
    "type_fields": {
      "environment_12345": "PROD"
    }
  };
  
  // Test asset with managed_by in type_fields that could be an asset ID
  const assetWithTypeFieldsAssetId = {
    "name": "Test Application Managed by Asset",
    "asset_type_id": 12345, 
    "agent_id": null,
    "user_id": null,
    "type_fields": {
      "environment_12345": "TEST",
      "managed_by_12345": "54321" // This could be an asset ID
    }
  };
  
  try {
    console.log(`\n📋 Testing asset with agent_id that could be asset ID (${assetWithAssetIdManager.agent_id}):`);
    const agentManagedBy = await window.CacheManager.getManagedByInfo(assetWithAssetIdManager);
    console.log(`   Result: "${agentManagedBy}"`);
    
    console.log(`\n📋 Testing asset with type_fields managed_by that could be asset ID (${assetWithTypeFieldsAssetId.type_fields.managed_by_12345}):`);
    const typeFieldsManagedBy = await window.CacheManager.getManagedByInfo(assetWithTypeFieldsAssetId);
    console.log(`   Result: "${typeFieldsManagedBy}"`);
    
    console.log(`\n✅ Asset ID managed by resolution test complete`);
    console.log(`💡 The system now tries both user ID and asset ID resolution for managed by fields`);
    
    return {
      assetIdManaged: agentManagedBy,
      typeFieldsAssetIdManaged: typeFieldsManagedBy
    };
    
  } catch (error) {
    console.error(`❌ Error testing managed by with asset IDs:`, error);
    return null;
  }
};

// Make CacheManager available globally
window.CacheManager = CacheManager; 