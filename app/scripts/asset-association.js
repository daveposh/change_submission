/**
 * Asset Association Module
 * Handles asset search, selection, and association with change requests
 * Version: 1.0.0
 */

// Asset Association Module
const AssetAssociation = {
  // Module state
  state: {
    selectedAssets: [],
    searchResults: [],
    isSearching: false,
    currentSearchTerm: '',
    searchCache: {},
    liveSearchTimer: null, // Timer for debouncing live search
    isLiveSearchActive: false, // Track if live search is active
    pagination: {
      currentPage: 1,
      totalPages: 1,
      perPage: 30,
      hasMore: false
    },
    configuredAssetTypeId: null, // Add this to store the configured asset type ID
    // Services dropdown state
    services: [],
    servicesLoaded: false,
    isLoadingServices: false
  },

  // Configuration
  config: {
    searchCacheTimeout: 5 * 60 * 1000, // 5 minutes
    searchMinLength: 3, // Changed to 3 characters for live search
    liveSearchMinLength: 3, // Minimum characters for live search
    maxResults: 100,
    paginationDelay: 300,
    liveSearchDelay: 500, // Debounce delay for live search (500ms)
    enableLiveSearch: true // Enable live search functionality
  },

  /**
   * Initialize the asset association module
   */
  async init() {
    console.log('🔧 Initializing Asset Association Module...');
    this.setupEventListeners();
    await this.loadSelectedAssets();
    await this.initializeServicesDropdown();
    this.updateAssetCount();
    console.log('✅ Asset Association Module initialized');
  },

  /**
   * Initialize services dropdown
   */
  async initializeServicesDropdown() {
    console.log('🔧 Initializing services dropdown...');
    try {
      await this.loadServices();
      this.populateServicesDropdown();
      this.setupServicesEventListeners();
      console.log('✅ Services dropdown initialized');
    } catch (error) {
      console.error('❌ Error initializing services dropdown:', error);
      this.showServicesError('Failed to load services');
    }
  },

  /**
   * Load services from configured asset types
   */
  async loadServices() {
    if (this.state.isLoadingServices) {
      console.log('⏳ Services loading already in progress');
      return;
    }

    this.state.isLoadingServices = true;
    this.showServicesLoading();

    try {
      console.log('🔄 Loading services using intelligent caching...');
      
      // Check if CacheManager is available
      if (!window.CacheManager) {
        console.error('❌ CacheManager not available');
        throw new Error('CacheManager not available');
      }

      // Always try to get cached services first (they should be pre-loaded during app init)
      const cachedServices = await window.CacheManager.getCachedServices();
      
      if (cachedServices && cachedServices.length > 0) {
        console.log(`✅ Using cached services: ${cachedServices.length} services`);
        this.state.services = cachedServices;
        this.state.servicesLoaded = true;
      } else {
        console.log('🔄 No cached services, loading from API...');
        this.state.services = await window.CacheManager.loadServicesFromAssets();
        this.state.servicesLoaded = true;
      }

      // Ensure services is always an array
      if (!Array.isArray(this.state.services)) {
        console.warn('⚠️ Services result was not an array, defaulting to empty array');
        this.state.services = [];
      }

      console.log(`✅ Loaded ${this.state.services.length} services`);

    } catch (error) {
      console.error('❌ Error loading services:', error);
      this.state.services = [];
      this.showServicesError('Failed to load services. Please try refreshing.');
    } finally {
      this.state.isLoadingServices = false;
    }
  },

  /**
   * Populate services dropdown with loaded services
   */
  populateServicesDropdown() {
    const dropdown = document.getElementById('services-dropdown');
    if (!dropdown) return;

    if (this.state.services.length === 0) {
      dropdown.innerHTML = '<option value="">No services configured - Visit app configuration to set asset types</option>';
      return;
    }

    let html = '';
    this.state.services.forEach(service => {
      const name = service.name || `Service ${service.id}`;
      const description = service.description ? ` - ${service.description.substring(0, 50)}...` : '';
      const serviceJson = JSON.stringify(service).replace(/"/g, '&quot;');
      html += `<option value="${service.id}" data-service="${serviceJson}">${this.escapeHtml(name)}${this.escapeHtml(description)}</option>`;
    });

    dropdown.innerHTML = html;
    console.log(`✅ Populated services dropdown with ${this.state.services.length} services`);
  },

  /**
   * Setup event listeners for services functionality
   */
  setupServicesEventListeners() {
    // Add selected services button
    const addSelectedBtn = document.getElementById('add-selected-services-btn');
    if (addSelectedBtn) {
      addSelectedBtn.addEventListener('click', async () => {
        await this.addSelectedServices();
      });
    }

    // Refresh services button
    const refreshBtn = document.getElementById('refresh-services-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        await this.refreshServices();
      });
    }
  },

  /**
   * Add selected services from dropdown to selected assets
   */
  async addSelectedServices() {
    const dropdown = document.getElementById('services-dropdown');
    const addBtn = document.getElementById('add-selected-services-btn');
    if (!dropdown) return;

    const selectedOptions = Array.from(dropdown.selectedOptions);
    if (selectedOptions.length === 0) {
      this.showNotification('info', 'Please select one or more services to add');
      return;
    }

    // Show loading state
    if (addBtn) {
      addBtn.classList.add('loading');
      addBtn.disabled = true;
    }

    try {
      let addedCount = 0;
      for (const option of selectedOptions) {
        try {
          const serviceJsonString = option.dataset.service.replace(/&quot;/g, '"');
          const serviceData = JSON.parse(serviceJsonString);
          
          // Convert service to asset-like structure for consistency
          const assetLikeService = {
            id: serviceData.id,
            name: serviceData.name,
            description: serviceData.description || '',
            display_name: serviceData.name,
            asset_type_id: serviceData.category || null, // Use category as asset type
            location_id: null, // Services don't have physical locations
            agent_id: null, // Services don't have direct managed by
            user_id: null,
            asset_tag: 'SERVICE', // Mark as service
            serial_number: null,
            impact: 'unknown', // Default impact for services
            environment: 'N/A', // Services don't have environments like assets
            type_fields: {
              service_category: serviceData.category || 'General',
              service_visibility: serviceData.visibility || 1,
              service_type: 'Service',
              description: serviceData.description || ''
            },
            created_at: serviceData.created_at,
            updated_at: serviceData.updated_at,
            // Mark as service for special handling
            is_service: true,
            service_visibility: serviceData.visibility,
            service_category: serviceData.category
          };
          
          // Check if already selected
          if (!this.isAssetSelected(assetLikeService.id)) {
            await this.addAsset(assetLikeService);
            addedCount++;
          }
        } catch (error) {
          console.error('Error adding service:', error);
        }
      }

      if (addedCount > 0) {
        this.showNotification('success', `Added ${addedCount} service${addedCount > 1 ? 's' : ''} to selection`);
        // Clear dropdown selection
        dropdown.selectedIndex = -1;
      } else {
        this.showNotification('info', 'All selected services were already in your selection');
      }

    } catch (error) {
      console.error('❌ Error adding selected services:', error);
      this.showNotification('error', 'Failed to add services. Please try again.');
    } finally {
      // Remove loading state
      if (addBtn) {
        addBtn.classList.remove('loading');
        addBtn.disabled = false;
      }
    }
  },

  /**
   * Refresh services from API
   */
  async refreshServices() {
    console.log('🔄 Refreshing services...');
    
    const refreshBtn = document.getElementById('refresh-services-btn');
    if (refreshBtn) {
      refreshBtn.classList.add('loading');
      refreshBtn.disabled = true;
    }

    try {
      // Reset state
      this.state.services = [];
      this.state.servicesLoaded = false;
      
      // Force refresh from CacheManager
      if (window.CacheManager) {
        this.state.services = await window.CacheManager.loadServicesFromAssets();
        this.state.servicesLoaded = true;
        
        this.populateServicesDropdown();
        this.showNotification('success', `Refreshed ${this.state.services.length} services`);
        console.log('✅ Services refreshed successfully');
      } else {
        throw new Error('CacheManager not available');
      }
      
    } catch (error) {
      console.error('❌ Error refreshing services:', error);
      this.showServicesError('Failed to refresh services. Please try again.');
    } finally {
      if (refreshBtn) {
        refreshBtn.classList.remove('loading');
        refreshBtn.disabled = false;
      }
    }
  },

  /**
   * Show loading state in services dropdown
   */
  showServicesLoading() {
    const dropdown = document.getElementById('services-dropdown');
    if (dropdown) {
      dropdown.innerHTML = '<option value="">🔄 Loading services...</option>';
    }
  },

  /**
   * Show error state in services dropdown
   */
  showServicesError(message) {
    const dropdown = document.getElementById('services-dropdown');
    if (dropdown) {
      dropdown.innerHTML = `<option value="">❌ ${message}</option>`;
    }
  },

  /**
   * Show notification message (placeholder - implement based on your notification system)
   */
  showNotification(type, message) {
    console.log(`${type.toUpperCase()}: ${message}`);
    // You can implement your notification system here
  },

  /**
   * Setup event listeners for asset association functionality
   */
  setupEventListeners() {
    // Asset search input
    const assetSearchInput = document.getElementById('asset-search-input');
    if (assetSearchInput) {
      // Live search with debouncing - activates after 3 characters
      assetSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim();
        
        // Clear any existing timer
        if (this.state.liveSearchTimer) {
          clearTimeout(this.state.liveSearchTimer);
          this.state.liveSearchTimer = null;
        }
        
        // Clear results if input is empty
        if (searchTerm.length === 0) {
          this.clearSearchResults();
          this.state.isLiveSearchActive = false;
          return;
        }
        
        // Only start live search if we have enough characters and live search is enabled
        if (this.config.enableLiveSearch && searchTerm.length >= this.config.liveSearchMinLength) {
          // Show live search indicator
          this.showLiveSearchIndicator();
          this.state.isLiveSearchActive = true;
          
          // Set debounced search timer
          this.state.liveSearchTimer = setTimeout(() => {
            console.log(`🔍 Live search triggered for: "${searchTerm}"`);
            this.performAssetSearch(searchTerm, true); // true indicates live search
          }, this.config.liveSearchDelay);
        } else if (searchTerm.length > 0 && searchTerm.length < this.config.liveSearchMinLength) {
          // Show hint for minimum characters
          this.showSearchMessage(`Type ${this.config.liveSearchMinLength - searchTerm.length} more character(s) to start live search...`);
        }
      });

      // Keep Enter key functionality for immediate search
      assetSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const searchTerm = e.target.value.trim();
          
          // Clear live search timer if active
          if (this.state.liveSearchTimer) {
            clearTimeout(this.state.liveSearchTimer);
            this.state.liveSearchTimer = null;
          }
          
          this.performAssetSearch(searchTerm, false); // false indicates manual search
        }
      });
    }

    // Asset search button
    const assetSearchBtn = document.getElementById('asset-search-btn');
    if (assetSearchBtn) {
      assetSearchBtn.addEventListener('click', () => {
        const searchTerm = assetSearchInput ? assetSearchInput.value.trim() : '';
        
        // Clear live search timer if active
        if (this.state.liveSearchTimer) {
          clearTimeout(this.state.liveSearchTimer);
          this.state.liveSearchTimer = null;
        }
        
        this.performAssetSearch(searchTerm, false); // false indicates manual search
      });
    }

    // Clear all assets button
    const clearAllBtn = document.getElementById('clear-all-assets-btn');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', async () => {
        await this.clearAllAssets();
      });
    }

    console.log('✅ Asset association event listeners setup complete');
  },

  /**
   * Perform asset search
   * @param {string} searchTerm - The search term
   * @param {boolean} isLiveSearch - Whether this is a live search or manual search
   */
  async performAssetSearch(searchTerm, isLiveSearch = false) {
    if (!searchTerm || searchTerm.length < this.config.searchMinLength) {
      this.showSearchMessage('Please enter at least 3 characters to search for assets');
      return;
    }

    console.log(`🔍 ${isLiveSearch ? 'Live' : 'Manual'} search for assets: "${searchTerm}"`);
    this.state.currentSearchTerm = searchTerm;
    this.state.isSearching = true;
    
    // Show appropriate loading indicator
    if (isLiveSearch) {
      this.showLiveSearchIndicator();
    } else {
      this.showLoadingIndicator();
    }

    try {
      // Check cache first
      const cachedResults = this.getFromCache(searchTerm);
      if (cachedResults) {
        console.log(`📦 Using cached results for "${searchTerm}"`);
        await this.displaySearchResults(cachedResults);
        return;
      }

      // Perform API search
      const results = await this.searchAssetsFromAPI(searchTerm);
      
      // Cache results
      this.addToCache(searchTerm, results);
      
      // Display results
      await this.displaySearchResults(results);

      console.log(`✅ Found ${results.length} assets for "${searchTerm}"`);

    } catch (error) {
      console.error('❌ Error searching assets:', error);
      
      // Log the full error response for debugging
      if (error.response) {
        try {
          const errorData = JSON.parse(error.response);
          console.error(`📄 Full API error response:`, errorData);
          if (errorData.errors && errorData.errors.length > 0) {
            console.error(`🔍 API error details:`, errorData.errors[0]);
          }
        } catch (parseError) {
          console.error(`📄 Raw API error response:`, error.response);
        }
      }
      
      this.showSearchMessage('Error searching for assets. Please try again.');
    } finally {
      this.state.isSearching = false;
      this.state.isLiveSearchActive = false;
      
      // Remove live search form styling when search completes
      this.setLiveSearchFormState(false);
    }
  },

  /**
   * Determine the best search field based on the search term pattern
   * @param {string} searchTerm - The search term
   * @returns {string} - The field name to search
   */
  getSearchField(searchTerm) {
    // Simple pattern detection for different asset field types
    const term = searchTerm.trim();
    
    // MAC Address pattern (xx:xx:xx:xx:xx:xx or xx-xx-xx-xx-xx-xx)
    if (/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(term)) {
      return 'mac_addresses';
    }
    
    // IP Address pattern (xxx.xxx.xxx.xxx)
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(term)) {
      return 'ip_addresses';
    }
    
    // UUID pattern (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term)) {
      return 'uuid';
    }
    
    // IMEI pattern (15 digits)
    if (/^\d{15}$/.test(term)) {
      return 'imei_number';
    }
    
    // Default to name search for everything else (including what might look like serial numbers)
    return 'name';
  },

  /**
   * Search assets from API using the search endpoint with field-specific filtering
   * @param {string} searchTerm - The search term
   * @returns {Promise<Array>} - Array of matching assets
   */
  async searchAssetsFromAPI(searchTerm) {
    if (!window.client || !window.client.request) {
      throw new Error('Client not available for asset search');
    }

    try {
      // Determine the best field to search based on the search term pattern
      const searchField = this.getSearchField(searchTerm);
      
      // Build the search query without asset type filtering (search ALL assets)
      const fieldQuery = `${searchField}:'${searchTerm}'`;
      
      console.log(`🔍 Searching ALL assets with field query: "${fieldQuery}" (detected field: ${searchField})`);
      console.log(`📡 Will construct URL: /api/v2/assets?search=${fieldQuery}&include=type_fields`);
      
      const templateContext = {
        search_query: fieldQuery,
        include_fields: "type_fields"
      };
      
      console.log(`📦 Template context:`, templateContext);
      
      const response = await window.client.request.invokeTemplate("getAssets", {
        context: templateContext
      });

      if (!response || !response.response) {
        console.log(`⚠️ No response from asset search`);
        return [];
      }

      const data = JSON.parse(response.response);
      const assets = data.assets || [];

      console.log(`✅ Asset search returned ${assets.length} results`);

      // Sort results by name for better UX
      assets.sort((a, b) => {
        const nameA = (a.display_name || a.name || '').toLowerCase();
        const nameB = (b.display_name || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });

      // Limit results if needed
      return assets.slice(0, this.config.maxResults);

    } catch (error) {
      console.error('Error searching assets:', error);
      this.showSearchMessage('Error searching assets. Please try again.');
      return [];
    }
  },

  /**
   * Extract field value from asset type_fields
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
   * Get managed by information from asset
   * @param {Object} asset - The asset object
   * @returns {Promise<string>} - The managed by information
   */
  async getManagedByInfo(asset) {
    try {
      // Handle services specially - they don't have managed by in the same way
      if (asset && asset.is_service) {
        return 'Service (No Owner)';
      }
      
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
   * Get environment information from asset
   * @param {Object} asset - The asset object
   * @returns {string} - The environment information
   */
  getEnvironmentInfo(asset) {
    try {
      // Handle services specially - they might have different environment handling
      if (asset && asset.is_service) {
        const serviceVisibility = asset.service_visibility || asset.type_fields?.service_visibility;
        if (serviceVisibility === 1) {
          return 'Public Service';
        } else if (serviceVisibility === 2) {
          return 'Private Service';
        } else {
          return 'Service';
        }
      }
      
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
   * Display search results
   * @param {Array} assets - Array of assets to display
   */
  async displaySearchResults(assets) {
    const resultsContainer = document.getElementById('asset-search-results');
    if (!resultsContainer) return;

    // Store search results in state
    this.state.searchResults = assets;

    if (assets.length === 0) {
      this.showSearchMessage('No assets found matching your search criteria');
      return;
    }

    let html = '<div class="asset-results-list">';
    
    // Process assets with asset type and location name resolution
    for (const asset of assets) {
      // Log the asset structure for debugging
      console.log(`📦 Asset structure for "${asset.name}":`, {
        id: asset.id,
        name: asset.name,
        type_fields: asset.type_fields,
        environment: asset.environment,
        managed_by: asset.managed_by,
        managed_by_name: asset.managed_by_name,
        impact: asset.impact
      });
      
      const name = asset.display_name || asset.name || 'Unknown Asset';
      const description = asset.description || '';
      const assetTypeId = asset.asset_type_id;
      const assetTypeName = await this.getAssetTypeName(assetTypeId, asset);
      
      // Use the new helper methods to extract field values
      const environment = this.getEnvironmentInfo(asset);
      const managedBy = await this.getManagedByInfo(asset);
      
      const locationId = asset.location_id;
      const location = await this.getLocationName(locationId, asset);
      const assetTag = asset.asset_tag || 'N/A';
      const serialNumber = this.getSerialNumber(asset);
      const impact = asset.impact || 'unknown';
      const isSelected = this.isAssetSelected(asset.id);
      
      // Get impact badge styling
      const impactBadge = this.getImpactBadge(impact);
      const environmentBadge = this.getEnvironmentBadge(environment);
      const assetTypeIcon = this.getAssetTypeIcon(assetTypeName, asset);
      
      html += `
        <div class="asset-result-item ${isSelected ? 'selected' : ''}" data-asset-id="${asset.id}">
          <div class="asset-info">
            <div class="asset-header">
              <div class="asset-name-section">
                ${assetTypeIcon}
                <span class="asset-name">${this.escapeHtml(name)}</span>
                <div class="asset-badges">
                  ${impactBadge}
                  ${environmentBadge}
                </div>
              </div>
              <div class="asset-status">
                ${isSelected ? 
                  '<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>Selected</span>' :
                  '<span class="badge bg-primary text-white"><i class="fas fa-plus-circle me-1"></i>Available</span>'
                }
              </div>
            </div>
            ${this.createExpandableDescription(description, asset.id)}
            <div class="asset-details">
              <div class="asset-detail-row">
                <span class="asset-detail-label">
                  <i class="fas fa-layer-group me-1 text-muted"></i>Asset Type:
                </span>
                <span class="asset-detail-value">${this.escapeHtml(assetTypeName)}</span>
              </div>
              <div class="asset-detail-row">
                <span class="asset-detail-label">
                  <i class="fas fa-user-cog me-1 text-muted"></i>Managed By:
                </span>
                <span class="asset-detail-value">${this.escapeHtml(managedBy)}</span>
              </div>
              <div class="asset-detail-row">
                <span class="asset-detail-label">
                  <i class="fas fa-map-marker-alt me-1 text-muted"></i>Location:
                </span>
                <span class="asset-detail-value">${this.escapeHtml(location)}</span>
              </div>
              <div class="asset-detail-row">
                <span class="asset-detail-label">
                  <i class="fas fa-tag me-1 text-muted"></i>Asset Tag:
                </span>
                <span class="asset-detail-value">${this.escapeHtml(assetTag)}</span>
              </div>
              <div class="asset-detail-row">
                <span class="asset-detail-label">
                  <i class="fas fa-barcode me-1 text-muted"></i>Serial Number:
                </span>
                <span class="asset-detail-value">${this.escapeHtml(serialNumber)}</span>
              </div>
            </div>
            <div class="asset-meta">
              <small class="text-muted">
                <i class="fas fa-hashtag me-1"></i>Asset ID: ${asset.id}
                ${asset.display_id ? ` | Display ID: ${asset.display_id}` : ''}
              </small>
            </div>
          </div>
          <div class="asset-actions">
            ${isSelected ? 
              `<button type="button" class="btn btn-sm btn-outline-danger remove-asset-btn" data-asset-id="${asset.id}">
                <i class="fas fa-times me-1"></i>Remove
              </button>` :
              `<button type="button" class="btn btn-sm btn-primary add-asset-btn" data-asset-id="${asset.id}">
                <i class="fas fa-plus me-1"></i>Add Asset
              </button>`
            }
          </div>
        </div>
      `;
    }
    
    html += '</div>';
    
    // Add result count with icon
    const resultCount = `<div class="search-results-header">
      <h6><i class="fas fa-search me-2"></i>Search Results (${assets.length} found)</h6>
    </div>`;
    
    resultsContainer.innerHTML = resultCount + html;
    resultsContainer.style.display = 'block';

    // Add click handlers for add/remove buttons
    this.setupResultsEventListeners(assets);
    
    // Setup description toggle event listeners
    this.setupDescriptionToggles(resultsContainer);
  },

  /**
   * Setup event listeners for search results
   * @param {Array} assets - Array of assets for reference
   */
  setupResultsEventListeners(assets) {
    const resultsContainer = document.getElementById('asset-search-results');
    if (!resultsContainer) return;

    // Add asset buttons
    resultsContainer.querySelectorAll('.add-asset-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const assetId = parseInt(e.target.closest('.add-asset-btn').dataset.assetId);
        const asset = assets.find(a => a.id === assetId);
        if (asset) {
          await this.addAsset(asset);
        }
      });
    });

    // Remove asset buttons
    resultsContainer.querySelectorAll('.remove-asset-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const assetId = parseInt(e.target.closest('.remove-asset-btn').dataset.assetId);
        await this.removeAsset(assetId);
      });
    });
  },

  /**
   * Add an asset to the selected list
   * @param {Object} asset - Asset object to add
   */
  async addAsset(asset) {
    // Check if already selected
    if (this.isAssetSelected(asset.id)) {
      return;
    }

    // Add to selected assets
    this.state.selectedAssets.push(asset);
    
    // Update displays
    await this.updateSelectedAssetsDisplay();
    this.updateAssetCount();
    
    // Update the search results to show new state
    if (this.state.searchResults.length > 0) {
      await this.displaySearchResults(this.state.searchResults);
    }

    // Update main app state if available
    if (window.changeRequestData) {
      window.changeRequestData.selectedAssets = this.state.selectedAssets;
    }

    console.log(`✅ Added asset: ${asset.display_name || asset.name}`);
  },

  /**
   * Remove an asset from the selected list
   * @param {number} assetId - ID of asset to remove
   */
  async removeAsset(assetId) {
    const assetIndex = this.state.selectedAssets.findIndex(a => a.id === assetId);
    
    if (assetIndex === -1) {
      return;
    }

    const removedAsset = this.state.selectedAssets[assetIndex];
    this.state.selectedAssets.splice(assetIndex, 1);
    
    // Update displays
    await this.updateSelectedAssetsDisplay();
    this.updateAssetCount();
    
    // Update the search results to show new state
    if (this.state.searchResults.length > 0) {
      await this.displaySearchResults(this.state.searchResults);
    }

    // Update main app state if available
    if (window.changeRequestData) {
      window.changeRequestData.selectedAssets = this.state.selectedAssets;
    }

    console.log(`❌ Removed asset: ${removedAsset.display_name || removedAsset.name}`);
  },

  /**
   * Check if an asset is already selected
   * @param {number} assetId - Asset ID to check
   * @returns {boolean} - True if asset is selected
   */
  isAssetSelected(assetId) {
    return this.state.selectedAssets.some(a => a.id === assetId);
  },

  /**
   * Update the selected assets display
   */
  async updateSelectedAssetsDisplay() {
    const container = document.getElementById('selected-assets-list');
    if (!container) return;

    if (this.state.selectedAssets.length === 0) {
      container.innerHTML = `
        <div class="no-assets-message">
          <i class="fas fa-info-circle text-muted"></i>
          <span class="text-muted">No assets selected. Use the search above to find and add assets.</span>
        </div>
      `;
      return;
    }

    let html = '<div class="selected-assets-grid">';
    
    // Process assets with asset type and location name resolution
    for (const asset of this.state.selectedAssets) {
      const name = asset.display_name || asset.name || 'Unknown Asset';
      const description = asset.description || '';
      const assetTypeId = asset.asset_type_id;
      const assetTypeName = await this.getAssetTypeName(assetTypeId, asset);
      
      // Use the new helper methods to extract field values
      const environment = this.getEnvironmentInfo(asset);
      const managedBy = await this.getManagedByInfo(asset);
      
      const locationId = asset.location_id;
      const location = await this.getLocationName(locationId, asset);
      const assetTag = asset.asset_tag || 'N/A';
      const serialNumber = this.getSerialNumber(asset);
      const impact = asset.impact || 'unknown';
      
      // Get badge styling
      const impactBadge = this.getImpactBadge(impact);
      const environmentBadge = this.getEnvironmentBadge(environment);
      const assetTypeIcon = this.getAssetTypeIcon(assetTypeName, asset);
      
      html += `
        <div class="selected-asset-card" data-asset-id="${asset.id}">
          <div class="asset-card-header">
            <div class="asset-card-title-section">
              ${assetTypeIcon}
              <h6 class="asset-card-title">${this.escapeHtml(name)}</h6>
            </div>
            <div class="asset-card-actions">
              <span class="badge bg-success me-2">
                <i class="fas fa-check-circle me-1"></i>Selected
              </span>
              <button type="button" class="btn btn-sm btn-outline-danger remove-selected-asset-btn" 
                      data-asset-id="${asset.id}" title="Remove this asset">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
          <div class="asset-card-badges">
            ${impactBadge}
            ${environmentBadge}
          </div>
          <div class="asset-card-body">
            ${this.createExpandableDescription(description, asset.id)}
            <div class="asset-card-details">
              <div class="asset-detail-row">
                <span class="asset-detail-label">
                  <i class="fas fa-layer-group me-1 text-muted"></i>Type:
                </span>
                <span class="asset-detail-value">${this.escapeHtml(assetTypeName)}</span>
              </div>
              <div class="asset-detail-row">
                <span class="asset-detail-label">
                  <i class="fas fa-user-cog me-1 text-muted"></i>Managed By:
                </span>
                <span class="asset-detail-value">${this.escapeHtml(managedBy)}</span>
              </div>
              <div class="asset-detail-row">
                <span class="asset-detail-label">
                  <i class="fas fa-map-marker-alt me-1 text-muted"></i>Location:
                </span>
                <span class="asset-detail-value">${this.escapeHtml(location)}</span>
              </div>
              <div class="asset-detail-row">
                <span class="asset-detail-label">
                  <i class="fas fa-tag me-1 text-muted"></i>Asset Tag:
                </span>
                <span class="asset-detail-value">${this.escapeHtml(assetTag)}</span>
              </div>
              <div class="asset-detail-row">
                <span class="asset-detail-label">
                  <i class="fas fa-barcode me-1 text-muted"></i>Serial #:
                </span>
                <span class="asset-detail-value">${this.escapeHtml(serialNumber)}</span>
              </div>
            </div>
            <div class="asset-card-meta">
              <small class="text-muted">
                <i class="fas fa-hashtag me-1"></i>Asset ID: ${asset.id}
                ${asset.display_id ? ` | Display ID: ${asset.display_id}` : ''}
              </small>
            </div>
          </div>
        </div>
      `;
    }
    
    html += '</div>';
    container.innerHTML = html;

    // Add event listeners for remove buttons
    container.querySelectorAll('.remove-selected-asset-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const assetId = parseInt(e.target.closest('.remove-selected-asset-btn').dataset.assetId);
        await this.removeAsset(assetId);
      });
    });

    // Setup description toggle event listeners
    this.setupDescriptionToggles(container);
  },

  /**
   * Update the asset count display
   */
  updateAssetCount() {
    const countElement = document.getElementById('selected-assets-count');
    if (countElement) {
      countElement.textContent = this.state.selectedAssets.length;
    }

    // Update tab badge if it exists
    const tabBadge = document.querySelector('[data-bs-target="#asset-association"] .badge');
    if (tabBadge) {
      tabBadge.textContent = this.state.selectedAssets.length;
      tabBadge.style.display = this.state.selectedAssets.length > 0 ? 'inline' : 'none';
    }
  },

  /**
   * Clear all selected assets
   */
  async clearAllAssets() {
    if (this.state.selectedAssets.length === 0) {
      return;
    }

    // Create a custom confirmation modal instead of using browser confirm()
    const confirmClear = async () => {
      this.state.selectedAssets = [];
      
      // Update displays
      await this.updateSelectedAssetsDisplay();
      this.updateAssetCount();
      
      // Update the search results to show new state
      if (this.state.searchResults.length > 0) {
        await this.displaySearchResults(this.state.searchResults);
      }

      // Update main app state if available
      if (window.changeRequestData) {
        window.changeRequestData.selectedAssets = [];
      }

      console.log('🧹 Cleared all selected assets');
    };

    // Show a notification with confirmation instead of using confirm()
    if (window.showNotification) {
      window.showNotification('warning', 
        `This will remove all ${this.state.selectedAssets.length} selected assets. Click the Clear All button again to confirm.`, 
        false
      );
      
      // Add a temporary class to the button to indicate confirmation needed
      const clearBtn = document.getElementById('clear-all-assets-btn');
      if (clearBtn && !clearBtn.classList.contains('confirm-required')) {
        clearBtn.classList.add('confirm-required', 'btn-danger');
        clearBtn.classList.remove('btn-outline-danger');
        clearBtn.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i>Confirm Clear';
        
        // Reset button after 5 seconds if no second click
        setTimeout(() => {
          if (clearBtn.classList.contains('confirm-required')) {
            clearBtn.classList.remove('confirm-required', 'btn-danger');
            clearBtn.classList.add('btn-outline-danger');
            clearBtn.innerHTML = '<i class="fas fa-trash me-1"></i>Clear All';
          }
        }, 5000);
      } else if (clearBtn && clearBtn.classList.contains('confirm-required')) {
        // Second click - actually clear
        clearBtn.classList.remove('confirm-required', 'btn-danger');
        clearBtn.classList.add('btn-outline-danger');
        clearBtn.innerHTML = '<i class="fas fa-trash me-1"></i>Clear All';
        await confirmClear();
      }
    } else {
      // Fallback - just clear without confirmation
      await confirmClear();
    }
  },

  /**
   * Clear search results
   */
  clearSearchResults() {
    const resultsContainer = document.getElementById('asset-search-results');
    if (resultsContainer) {
      resultsContainer.style.display = 'none';
      resultsContainer.innerHTML = '';
    }
    
    // Clear live search timer if active
    if (this.state.liveSearchTimer) {
      clearTimeout(this.state.liveSearchTimer);
      this.state.liveSearchTimer = null;
    }
    
    // Reset state
    this.state.isLiveSearchActive = false;
    this.state.isSearching = false;
    this.state.currentSearchTerm = '';
    this.state.searchResults = [];
    this.state.servicesLoaded = false;
    this.state.services = [];
    this.state.isLoadingServices = false;
    
    // Remove live search form styling
    this.setLiveSearchFormState(false);
  },

  /**
   * Show loading indicator
   */
  showLoadingIndicator() {
    const resultsContainer = document.getElementById('asset-search-results');
    if (resultsContainer) {
      resultsContainer.innerHTML = `
        <div class="search-loading">
          <div class="d-flex align-items-center justify-content-center p-4">
            <div class="spinner-border spinner-border-sm me-2" role="status"></div>
            <span>Searching for assets...</span>
          </div>
        </div>
      `;
      resultsContainer.style.display = 'block';
    }
  },

  /**
   * Show live search indicator
   */
  showLiveSearchIndicator() {
    const resultsContainer = document.getElementById('asset-search-results');
    if (resultsContainer) {
      resultsContainer.innerHTML = `
        <div class="search-loading live-search">
          <div class="d-flex align-items-center justify-content-center p-3">
            <div class="spinner-border spinner-border-sm me-2 text-primary" role="status" style="width: 1rem; height: 1rem;"></div>
            <span class="text-primary"><i class="fas fa-bolt me-1"></i>Live searching...</span>
          </div>
        </div>
      `;
      resultsContainer.style.display = 'block';
    }
    
    // Add live search styling to form
    this.setLiveSearchFormState(true);
  },

  /**
   * Set live search form visual state
   * @param {boolean} isActive - Whether live search is active
   */
  setLiveSearchFormState(isActive) {
    const searchForm = document.querySelector('.asset-search-form');
    if (searchForm) {
      if (isActive) {
        searchForm.classList.add('live-search-active');
      } else {
        searchForm.classList.remove('live-search-active');
      }
    }
  },

  /**
   * Show search message
   * @param {string} message - Message to display
   */
  showSearchMessage(message) {
    const resultsContainer = document.getElementById('asset-search-results');
    if (resultsContainer) {
      resultsContainer.innerHTML = `
        <div class="search-message">
          <div class="text-center p-4 text-muted">
            <i class="fas fa-info-circle me-2"></i>
            ${message}
          </div>
        </div>
      `;
      resultsContainer.style.display = 'block';
    }
  },

  /**
   * Load selected assets from main app state
   */
  async loadSelectedAssets() {
    if (window.changeRequestData && window.changeRequestData.selectedAssets) {
      this.state.selectedAssets = [...window.changeRequestData.selectedAssets];
      await this.updateSelectedAssetsDisplay();
      console.log(`📦 Loaded ${this.state.selectedAssets.length} previously selected assets`);
    }
  },

  /**
   * Get search results from cache
   * @param {string} searchTerm - Search term
   * @returns {Array|null} - Cached results or null
   */
  getFromCache(searchTerm) {
    const cacheKey = searchTerm.toLowerCase();
    const cached = this.state.searchCache[cacheKey];
    
    if (!cached) {
      return null;
    }
    
    const now = Date.now();
    if (now - cached.timestamp > this.config.searchCacheTimeout) {
      delete this.state.searchCache[cacheKey];
      return null;
    }
    
    return cached.results;
  },

  /**
   * Add search results to cache
   * @param {string} searchTerm - Search term
   * @param {Array} results - Search results
   */
  addToCache(searchTerm, results) {
    const cacheKey = searchTerm.toLowerCase();
    this.state.searchCache[cacheKey] = {
      results: results,
      timestamp: Date.now()
    };
    
    // Clean old cache entries to prevent memory bloat
    this.cleanCache();
  },

  /**
   * Clean expired cache entries
   */
  cleanCache() {
    const now = Date.now();
    Object.keys(this.state.searchCache).forEach(key => {
      if (now - this.state.searchCache[key].timestamp > this.config.searchCacheTimeout) {
        delete this.state.searchCache[key];
      }
    });
  },

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} - Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Get selected assets for external access
   * @returns {Array} - Array of selected assets
   */
  getSelectedAssets() {
    return [...this.state.selectedAssets];
  },

  /**
   * Set selected assets (for external updates)
   * @param {Array} assets - Array of assets to set as selected
   */
  setSelectedAssets(assets) {
    this.state.selectedAssets = [...assets];
    this.updateSelectedAssetsDisplay();
    this.updateAssetCount();
  },

  /**
   * Validate that at least one asset is selected
   * @returns {Object} - Validation result
   */
  validateSelection() {
    const isValid = this.state.selectedAssets.length > 0;
    return {
      isValid,
      message: isValid ? '' : 'Please select at least one asset to associate with this change request.'
    };
  },

  /**
   * Get asset type name using the global function from main app
   * @param {number} assetTypeId - Asset type ID
   * @param {Object} asset - Asset object (optional, for service handling)
   * @returns {Promise<string>} - Asset type name
   */
  async getAssetTypeName(assetTypeId, asset = null) {
    // Handle services specially
    if (asset && asset.is_service) {
      const serviceCategory = asset.service_category || asset.type_fields?.service_category || 'General';
      return `Service (${serviceCategory})`;
    }
    
    if (!assetTypeId) return 'N/A';
    
    try {
      // Use the global getAssetTypeName function from main app if available
      if (typeof window.getAssetTypeName === 'function') {
        return await window.getAssetTypeName(assetTypeId);
      }
      
      // Fallback: try to call the function directly if it exists in global scope
      if (typeof getAssetTypeName === 'function') {
        return await getAssetTypeName(assetTypeId);
      }
      
      // If no function available, return the ID with a label
      console.warn('getAssetTypeName function not available, falling back to ID display');
      return `Asset Type ${assetTypeId}`;
    } catch (error) {
      console.error('Error getting asset type name:', error);
      return `Asset Type ${assetTypeId}`;
    }
  },

  /**
   * Get location name using the global function from main app
   * @param {number} locationId - Location ID
   * @param {Object} asset - Asset object (optional, for service handling)
   * @returns {Promise<string>} - Location name
   */
  async getLocationName(locationId, asset = null) {
    // Handle services specially - they don't have physical locations
    if (asset && asset.is_service) {
      return 'Virtual/Cloud Service';
    }
    
    if (!locationId) return 'N/A';
    
    try {
      // Use the global getLocationName function from main app if available
      if (typeof window.getLocationName === 'function') {
        return await window.getLocationName(locationId);
      }
      
      // Fallback: try to call the function directly if it exists in global scope
      if (typeof getLocationName === 'function') {
        return await getLocationName(locationId);
      }
      
      // If no function available, return the ID with a label
      console.warn('getLocationName function not available, falling back to ID display');
      return `Location ID: ${locationId}`;
    } catch (error) {
      console.error('Error getting location name:', error);
      return `Location ID: ${locationId}`;
    }
  },

  /**
   * Create expandable description HTML
   * @param {string} description - The description text
   * @param {string} containerId - Unique ID for this description container
   * @returns {string} - HTML with expandable description
   */
  createExpandableDescription(description, containerId) {
    if (!description || description.trim().length === 0) {
      return '';
    }

    // Check if description is long enough to need truncation (approximately 2 lines worth)
    const needsTruncation = description.length > 120; // ~60 chars per line
    
    if (!needsTruncation) {
      return `<div class="asset-description">${this.escapeHtml(description)}</div>`;
    }

    return `
      <div class="asset-description truncated" id="desc-${containerId}">
        ${this.escapeHtml(description)}
      </div>
      <button type="button" class="description-toggle" data-target="desc-${containerId}">
        Show more
      </button>
    `;
  },

  /**
   * Setup description toggle event listeners
   * @param {Element} container - Container element with description toggles
   */
  setupDescriptionToggles(container) {
    container.querySelectorAll('.description-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = toggle.dataset.target;
        const targetElement = container.querySelector(`#${targetId}`);
        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        
        if (targetElement) {
          if (isExpanded) {
            targetElement.style.display = 'none';
            toggle.setAttribute('aria-expanded', 'false');
            toggle.innerHTML = '<i class="fas fa-chevron-down"></i> Show Description';
          } else {
            targetElement.style.display = 'block';
            toggle.setAttribute('aria-expanded', 'true');
            toggle.innerHTML = '<i class="fas fa-chevron-up"></i> Hide Description';
          }
        }
      });
    });
  },

  /**
   * Debug function to test type_fields extraction for a specific asset
   * @param {Object} asset - Asset object to analyze
   */
  debugAssetTypeFields(asset) {
    console.log('🔧 === DEBUGGING ASSET TYPE FIELDS ===');
    console.log(`📦 Asset: ${asset.name} (ID: ${asset.id})`);
    console.log(`📋 Raw asset object:`, asset);
    
    if (asset.type_fields && Array.isArray(asset.type_fields)) {
      console.log(`✅ type_fields found with ${asset.type_fields.length} fields:`);
      asset.type_fields.forEach((field, index) => {
        console.log(`   ${index + 1}. Field:`, field);
        console.log(`      - field_name: "${field.field_name}"`);
        console.log(`      - name: "${field.name}"`);
        console.log(`      - label: "${field.label}"`);
        console.log(`      - field_label: "${field.field_label}"`);
        console.log(`      - value: "${field.value}"`);
        console.log(`      - field_value: "${field.field_value}"`);
        console.log(`      - display_value: "${field.display_value}"`);
      });
    } else {
      console.log(`❌ No type_fields found or not an array`);
    }
    
    // Test field extraction
    console.log(`🔍 Testing field extraction:`);
    console.log(`   Environment: "${this.getEnvironmentInfo(asset)}"`);
    console.log(`   Managed By: "${this.getManagedByInfo(asset)}"`);
    
    // Test various field name variations
    const fieldNames = ['environment', 'env', 'managed_by', 'managed_by_name', 'owner', 'assigned_to'];
    fieldNames.forEach(fieldName => {
      const value = this.getAssetTypeField(asset, fieldName);
      console.log(`   ${fieldName}: "${value}"`);
    });
  },

  /**
   * Get impact badge HTML with appropriate styling
   * @param {string} impact - Impact level (high, medium, low, unknown)
   * @returns {string} - HTML for impact badge
   */
  getImpactBadge(impact) {
    const impactLower = (impact || 'unknown').toLowerCase();
    
    switch (impactLower) {
      case 'high':
        return '<span class="badge bg-danger ms-2"><i class="fas fa-exclamation-triangle me-1"></i>High Impact</span>';
      case 'medium':
        return '<span class="badge bg-warning text-dark ms-2"><i class="fas fa-exclamation-circle me-1"></i>Medium Impact</span>';
      case 'low':
        return '<span class="badge bg-success ms-2"><i class="fas fa-info-circle me-1"></i>Low Impact</span>';
      case 'critical':
        return '<span class="badge bg-dark ms-2"><i class="fas fa-skull-crossbones me-1"></i>Critical Impact</span>';
      default:
        return '<span class="badge bg-secondary ms-2"><i class="fas fa-question-circle me-1"></i>Unknown Impact</span>';
    }
  },

  /**
   * Get environment badge HTML with appropriate styling
   * @param {string} environment - Environment (PROD, DEV, TEST, etc.)
   * @returns {string} - HTML for environment badge
   */
  getEnvironmentBadge(environment) {
    if (!environment || environment === 'N/A') {
      return '';
    }
    
    const envLower = environment.toLowerCase();
    
    switch (envLower) {
      case 'prod':
      case 'production':
        return '<span class="badge bg-danger ms-1"><i class="fas fa-server me-1"></i>PROD</span>';
      case 'dev':
      case 'development':
        return '<span class="badge bg-info ms-1"><i class="fas fa-code me-1"></i>DEV</span>';
      case 'test':
      case 'testing':
      case 'qa':
        return '<span class="badge bg-warning text-dark ms-1"><i class="fas fa-vial me-1"></i>TEST</span>';
      case 'stage':
      case 'staging':
        return '<span class="badge bg-purple ms-1"><i class="fas fa-theater-masks me-1"></i>STAGE</span>';
      case 'uat':
        return '<span class="badge bg-orange ms-1"><i class="fas fa-user-check me-1"></i>UAT</span>';
      default:
        return `<span class="badge bg-light text-dark ms-1"><i class="fas fa-cloud me-1"></i>${this.escapeHtml(environment)}</span>`;
    }
  },

  /**
   * Get asset type icon based on asset type name
   * @param {string} assetTypeName - Name of the asset type
   * @param {Object} asset - The asset object (optional, for special handling)
   * @returns {string} - HTML for asset type icon
   */
  getAssetTypeIcon(assetTypeName, asset = null) {
    // Special handling for services
    if (asset && asset.is_service) {
      return '<i class="fas fa-cogs text-info me-2"></i>';
    }
    
    if (!assetTypeName || assetTypeName === 'Unknown') {
      return '<i class="fas fa-cube text-muted me-2"></i>';
    }
    
    const typeLower = assetTypeName.toLowerCase();
    
    // Hardware icons
    if (typeLower.includes('laptop') || typeLower.includes('notebook')) {
      return '<i class="fas fa-laptop text-primary me-2"></i>';
    }
    if (typeLower.includes('desktop') || typeLower.includes('workstation')) {
      return '<i class="fas fa-desktop text-info me-2"></i>';
    }
    if (typeLower.includes('server')) {
      return '<i class="fas fa-server text-success me-2"></i>';
    }
    if (typeLower.includes('phone') || typeLower.includes('mobile')) {
      return '<i class="fas fa-mobile-alt text-warning me-2"></i>';
    }
    if (typeLower.includes('tablet') || typeLower.includes('ipad')) {
      return '<i class="fas fa-tablet-alt text-info me-2"></i>';
    }
    if (typeLower.includes('printer')) {
      return '<i class="fas fa-print text-secondary me-2"></i>';
    }
    if (typeLower.includes('monitor') || typeLower.includes('display')) {
      return '<i class="fas fa-tv text-dark me-2"></i>';
    }
    if (typeLower.includes('router') || typeLower.includes('switch') || typeLower.includes('network')) {
      return '<i class="fas fa-network-wired text-primary me-2"></i>';
    }
    
    // Software icons
    if (typeLower.includes('software') || typeLower.includes('application') || typeLower.includes('app')) {
      return '<i class="fas fa-code text-purple me-2"></i>';
    }
    if (typeLower.includes('license')) {
      return '<i class="fas fa-certificate text-warning me-2"></i>';
    }
    if (typeLower.includes('database') || typeLower.includes('db')) {
      return '<i class="fas fa-database text-success me-2"></i>';
    }
    if (typeLower.includes('service')) {
      return '<i class="fas fa-cogs text-info me-2"></i>';
    }
    
    // Infrastructure icons
    if (typeLower.includes('cloud')) {
      return '<i class="fas fa-cloud text-primary me-2"></i>';
    }
    if (typeLower.includes('virtual') || typeLower.includes('vm')) {
      return '<i class="fas fa-layer-group text-info me-2"></i>';
    }
    if (typeLower.includes('storage')) {
      return '<i class="fas fa-hdd text-secondary me-2"></i>';
    }
    
    // Default icon
    return '<i class="fas fa-cube text-muted me-2"></i>';
  },

  /**
   * Cleanup method - call when module is destroyed
   */
  cleanup() {
    console.log('🧹 Cleaning up Asset Association Module...');
    
    // Clear any active live search timer
    if (this.state.liveSearchTimer) {
      clearTimeout(this.state.liveSearchTimer);
      this.state.liveSearchTimer = null;
    }
    
    // Reset state
    this.state.isLiveSearchActive = false;
    this.state.isSearching = false;
    this.state.currentSearchTerm = '';
    this.state.searchResults = [];
    this.state.servicesLoaded = false;
    this.state.services = [];
    this.state.isLoadingServices = false;
    
    // Remove live search form styling
    this.setLiveSearchFormState(false);
    
    console.log('✅ Asset Association Module cleanup complete');
  },

  /**
   * Get serial number from asset
   * @param {Object} asset - The asset object
   * @returns {string} - The serial number
   */
  getSerialNumber(asset) {
    try {
      // Handle services specially - they don't have serial numbers
      if (asset && asset.is_service) {
        return 'Service ID: ' + asset.id;
      }
      
      // First check direct property
      if (asset.serial_number && asset.serial_number !== '') {
        return asset.serial_number;
      }
      
      // Check in type_fields with various field name patterns
      const serialField = this.getAssetTypeField(asset, 'serial_number');
      if (serialField && serialField !== 'N/A') {
        return serialField;
      }

      // Try alternative field variations in type_fields
      const alternativeFields = ['serial', 'serial_no', 'sn', 'device_serial', 'asset_serial'];
      for (const fieldName of alternativeFields) {
        const value = this.getAssetTypeField(asset, fieldName);
        if (value && value !== 'N/A') {
          return value;
        }
      }

      // Try direct property alternatives
      if (asset.serial && asset.serial !== '') {
        return asset.serial;
      }
      
      if (asset.sn && asset.sn !== '') {
        return asset.sn;
      }
      
      return 'N/A';
    } catch (error) {
      console.warn('Error getting serial number:', error);
      return 'N/A';
    }
  },
};

// Expose AssetAssociation module globally for debugging and external access
window.AssetAssociation = AssetAssociation;

// Global debug function to test asset type fields extraction
window.debugAssetTypeFields = function(assetId) {
  if (!window.AssetAssociation) {
    console.error('❌ AssetAssociation module not available');
    return;
  }
  
  // Find asset in search results or selected assets
  const asset = window.AssetAssociation.state.searchResults.find(a => a.id === assetId) ||
                window.AssetAssociation.state.selectedAssets.find(a => a.id === assetId);
  
  if (asset) {
    window.AssetAssociation.debugAssetTypeFields(asset);
  } else {
    console.error(`❌ Asset with ID ${assetId} not found in current results or selected assets`);
    console.log(`📋 Available search results:`, window.AssetAssociation.state.searchResults.map(a => `${a.id}: ${a.name}`));
    console.log(`📋 Available selected assets:`, window.AssetAssociation.state.selectedAssets.map(a => `${a.id}: ${a.name}`));
  }
};

// Test function to demonstrate enhanced asset display styling
window.testEnhancedAssetDisplay = function() {
  console.log('🎨 Testing Enhanced Asset Display with Badges and Icons...');
  
  if (!window.AssetAssociation) {
    console.error('❌ AssetAssociation module not available');
    return;
  }
  
  console.log('🏷️ Testing Badge Generation Functions:');
  
  // Test impact badges
  const impactLevels = ['high', 'medium', 'low', 'critical', 'unknown'];
  impactLevels.forEach(impact => {
    console.log(`   Impact "${impact}": ${window.AssetAssociation.getImpactBadge(impact)}`);
  });
  
  // Test environment badges
  const environments = ['PROD', 'DEV', 'TEST', 'STAGE', 'UAT'];
  environments.forEach(env => {
    console.log(`   Environment "${env}": ${window.AssetAssociation.getEnvironmentBadge(env)}`);
  });
  
  // Test asset type icons
  const assetTypes = ['Laptop', 'Server', 'Printer', 'Software License', 'Database'];
  assetTypes.forEach(type => {
    console.log(`   Asset Type "${type}": ${window.AssetAssociation.getAssetTypeIcon(type)}`);
  });
  
  console.log('✅ Enhanced asset display styling test complete!');
  console.log('💡 Use real asset search to see the enhanced display with badges and icons');
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AssetAssociation;
} else {
  window.AssetAssociation = AssetAssociation;
} 