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
    USER_CACHE: 'user_cache'
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
      console.log('✅ All caches cleared');
      return true;
    } catch (error) {
      console.error('❌ Error clearing caches:', error);
      return false;
    }
  }
};

// Make CacheManager available globally
window.CacheManager = CacheManager; 