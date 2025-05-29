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
   * Get managed by information from asset (helper method)
   * @param {Object} asset - The asset object
   * @returns {string} - The managed by information
   */
  async getManagedByInfo(asset) {
    try {
      // First check agent_id - this is the primary managed by field in Freshservice assets
      if (asset.agent_id) {
        const numericId = parseInt(asset.agent_id);
        if (!isNaN(numericId) && numericId > 0) {
          console.log(`🔍 Resolving agent_id (managed by): ${numericId}`);
          const userName = await this.resolveUserName(numericId);
          if (userName && userName !== 'Unknown' && !userName.startsWith('User ID:')) {
            return userName;
          }
        }
        // If resolution failed, return with ID label
        return `Agent ID: ${asset.agent_id}`;
      }
      
      // Try to get from type_fields with various field name patterns
      const managedByField = this.getAssetTypeField(asset, 'managed_by');
      if (managedByField && managedByField !== 'N/A') {
        // Check if it's a numeric user ID that needs resolution
        const numericId = parseInt(managedByField);
        if (!isNaN(numericId) && numericId > 0) {
          console.log(`🔍 Resolving managed_by from type_fields: ${numericId}`);
          const userName = await this.resolveUserName(numericId);
          if (userName && userName !== 'Unknown' && !userName.startsWith('User ID:')) {
            return userName;
          }
        }
        // If not a user ID or resolution failed, return the field value as-is
        return managedByField;
      }

      // Try various direct property names
      if (asset.managed_by_name) {
        return asset.managed_by_name;
      }
      
      if (asset.managed_by) {
        // Check if it's a numeric user ID that needs resolution
        const numericId = parseInt(asset.managed_by);
        if (!isNaN(numericId) && numericId > 0) {
          console.log(`🔍 Resolving direct managed_by user ID: ${numericId}`);
          const userName = await this.resolveUserName(numericId);
          if (userName && userName !== 'Unknown' && !userName.startsWith('User ID:')) {
            return userName;
          }
        }
        // If not a user ID or resolution failed, return with ID label
        return `User ID: ${asset.managed_by}`;
      }
      
      // Check user_id field as another possibility
      if (asset.user_id) {
        const numericId = parseInt(asset.user_id);
        if (!isNaN(numericId) && numericId > 0) {
          console.log(`🔍 Resolving user_id (alternative managed by): ${numericId}`);
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
          // Check if it's a numeric user ID that needs resolution
          const numericId = parseInt(value);
          if (!isNaN(numericId) && numericId > 0) {
            console.log(`🔍 Resolving ${fieldName} user ID: ${numericId}`);
            const userName = await this.resolveUserName(numericId);
            if (userName && userName !== 'Unknown' && !userName.startsWith('User ID:')) {
              return userName;
            }
          }
          // If not a user ID or resolution failed, return the value as-is
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
   * Resolve user ID to user name using global user functions
   * @param {number} userId - User ID to resolve
   * @returns {Promise<string>} - User name or 'Unknown'
   */
  async resolveUserName(userId) {
    try {
      if (!userId || isNaN(userId)) {
        return 'Unknown';
      }

      // Use the global getUserName function if available
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

      // If user resolution functions are not available, return with ID
      console.log(`⚠️ Could not resolve user ID ${userId} - user functions not available`);
      return `User ID: ${userId}`;
      
    } catch (error) {
      console.warn(`Error resolving user ID ${userId}:`, error);
      return `User ID: ${userId}`;
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
  }
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
  console.log(`🧪 Testing with real Active Directory asset structure...`);
  
  const testAsset = {
    "type_fields": {
      "health_37000374722": "Operational",
      "hosting_model_37000374722": "Self-Hosted", 
      "vendor_37000374722": "Microsoft",
      "environment_37000374722": "PROD",
      "sla_37000374726": null,
      "operational_status_37000374726": null,
      "service_support_hours_37000374726": null
    },
    "name": "Active Directory",
    "asset_type_id": 37000374726,
    "asset_tag": "ASSET-1081",
    "impact": "high",
    "description": "On premise active directory environment ceifx.local",
    "end_of_life": null,
    "discovery_enabled": true,
    "usage_type": "permanent",
    "created_by_source": "User",
    "created_by_user": 37000300002,
    "created_at": "2025-05-23T15:41:25Z",
    "last_updated_by_source": "Workflow",
    "last_updated_by_user": null,
    "updated_at": "2025-05-23T15:41:25Z",
    "sources": ["User", "Workflow"],
    "location_id": null,
    "department_id": null,
    "agent_id": 37000300103, // This is the managed by field
    "user_id": null,
    "group_id": null,
    "assigned_on": null,
    "workspace_id": 2,
    "author_type": "User",
    "id": 37000143103,
    "display_id": 333
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
    
    console.log(`✅ Active Directory asset test complete`);
    
    return {
      environment,
      managedBy,
      health: healthField,
      vendor: vendorField,
      hostingModel: hostingField
    };
    
  } catch (error) {
    console.error(`❌ Error testing Active Directory asset:`, error);
    return null;
  }
};

// Make CacheManager available globally
window.CacheManager = CacheManager; 