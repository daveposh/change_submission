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
    pagination: {
      currentPage: 1,
      totalPages: 1,
      perPage: 30,
      hasMore: false
    }
  },

  // Configuration
  config: {
    searchCacheTimeout: 5 * 60 * 1000, // 5 minutes
    searchMinLength: 2,
    maxResults: 100,
    paginationDelay: 300
  },

  /**
   * Initialize the asset association module
   */
  init() {
    console.log('🔧 Initializing Asset Association Module...');
    this.setupEventListeners();
    this.loadSelectedAssets();
    this.updateAssetCount();
    console.log('✅ Asset Association Module initialized');
  },

  /**
   * Setup event listeners for asset association functionality
   */
  setupEventListeners() {
    // Asset search input
    const assetSearchInput = document.getElementById('asset-search-input');
    if (assetSearchInput) {
      // Use Enter key to trigger search (not on every keystroke)
      assetSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.performAssetSearch(e.target.value.trim());
        }
      });

      // Clear results when input is cleared
      assetSearchInput.addEventListener('input', (e) => {
        if (e.target.value.trim().length === 0) {
          this.clearSearchResults();
        }
      });
    }

    // Asset search button
    const assetSearchBtn = document.getElementById('asset-search-btn');
    if (assetSearchBtn) {
      assetSearchBtn.addEventListener('click', () => {
        const searchTerm = assetSearchInput ? assetSearchInput.value.trim() : '';
        this.performAssetSearch(searchTerm);
      });
    }

    // Clear all assets button
    const clearAllBtn = document.getElementById('clear-all-assets-btn');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        this.clearAllAssets();
      });
    }

    console.log('✅ Asset association event listeners setup complete');
  },

  /**
   * Perform asset search
   * @param {string} searchTerm - The search term
   */
  async performAssetSearch(searchTerm) {
    if (!searchTerm || searchTerm.length < this.config.searchMinLength) {
      this.showSearchMessage('Please enter at least 2 characters to search for assets');
      return;
    }

    console.log(`🔍 Searching for assets: "${searchTerm}"`);
    this.state.currentSearchTerm = searchTerm;
    this.state.isSearching = true;
    this.showLoadingIndicator();

    try {
      // Check cache first
      const cachedResults = this.getFromCache(searchTerm);
      if (cachedResults) {
        console.log(`📦 Using cached results for "${searchTerm}"`);
        this.displaySearchResults(cachedResults);
        return;
      }

      // Perform API search
      const results = await this.searchAssetsFromAPI(searchTerm);
      
      // Cache results
      this.addToCache(searchTerm, results);
      
      // Display results
      this.displaySearchResults(results);

      console.log(`✅ Found ${results.length} assets for "${searchTerm}"`);

    } catch (error) {
      console.error('❌ Error searching assets:', error);
      this.showSearchMessage('Error searching for assets. Please try again.');
    } finally {
      this.state.isSearching = false;
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
      
      // Use field-specific search format: field:'searchterm'
      // Supported fields: name, asset_tag, serial_number, mac_addresses, ip_addresses, uuid, item_id, imei_number
      const fieldQuery = `${searchField}:'${searchTerm}'`;
      
      // Encode the inner query and manually encode single quotes as %27
      let encodedQuery = encodeURIComponent(fieldQuery);
      encodedQuery = encodedQuery.replace(/'/g, '%27');
      
      // Add basic filters to get relevant assets only
      // Try to exclude archived/deleted assets if possible
      const requestUrl = `?search="${encodedQuery}"&include=type_fields`;
      
      console.log(`🔍 Searching assets with field query: "${fieldQuery}" (detected field: ${searchField})`);
      console.log(`📡 Request URL: /api/v2/assets${requestUrl}`);
      console.log(`📡 Encoded query: ${encodedQuery}`);
      
      const response = await window.client.request.invokeTemplate("getAssets", {
        path_suffix: requestUrl
      });

      if (!response || !response.response) {
        console.log(`⚠️ No response from asset search`);
        return [];
      }

      const data = JSON.parse(response.response);
      let assets = data.assets || [];

      console.log(`✅ Asset search returned ${assets.length} results (before filtering)`);

      // Client-side filtering to remove unwanted assets
      assets = assets.filter(asset => {
        // Filter out assets with certain states or conditions
        const assetState = asset.asset_state_id;
        const assetName = asset.display_name || asset.name || '';
        
        // Skip assets that are clearly disposed, retired, or deleted
        // You can adjust these conditions based on your specific needs
        if (!assetName || assetName.trim() === '') {
          return false;
        }
        
        // Skip assets with certain state names if available
        if (asset.asset_state && typeof asset.asset_state === 'string') {
          const stateLower = asset.asset_state.toLowerCase();
          if (stateLower.includes('disposed') || 
              stateLower.includes('retired') || 
              stateLower.includes('deleted') ||
              stateLower.includes('archived')) {
            return false;
          }
        }
        
        return true;
      });

      console.log(`✅ Asset search returned ${assets.length} results (after filtering)`);

      // Sort results by name for better UX
      assets.sort((a, b) => {
        const nameA = (a.display_name || a.name || '').toLowerCase();
        const nameB = (b.display_name || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });

      // Limit results if needed
      return assets.slice(0, this.config.maxResults);

    } catch (error) {
      console.error(`❌ Error searching assets:`, error);
      throw error;
    }
  },

  /**
   * Display search results
   * @param {Array} assets - Array of assets to display
   */
  displaySearchResults(assets) {
    const resultsContainer = document.getElementById('asset-search-results');
    if (!resultsContainer) return;

    // Store search results in state
    this.state.searchResults = assets;

    if (assets.length === 0) {
      this.showSearchMessage('No assets found matching your search criteria');
      return;
    }

    let html = '<div class="asset-results-list">';
    
    assets.forEach(asset => {
      const name = asset.display_name || asset.name || 'Unknown Asset';
      const description = asset.description || '';
      const assetTypeId = asset.asset_type_id || 'N/A';
      const isSelected = this.isAssetSelected(asset.id);
      
      html += `
        <div class="asset-result-item ${isSelected ? 'selected' : ''}" data-asset-id="${asset.id}">
          <div class="asset-info">
            <div class="asset-name">${this.escapeHtml(name)}</div>
            ${description ? `<div class="asset-description">${this.escapeHtml(description)}</div>` : ''}
            <div class="asset-meta">
              <span class="asset-id">ID: ${asset.id}</span>
              <span class="asset-type">Type: ${assetTypeId}</span>
            </div>
          </div>
          <div class="asset-actions">
            ${isSelected ? 
              `<button type="button" class="btn btn-sm btn-outline-danger remove-asset-btn" data-asset-id="${asset.id}">
                <i class="fas fa-times"></i> Remove
              </button>` :
              `<button type="button" class="btn btn-sm btn-primary add-asset-btn" data-asset-id="${asset.id}">
                <i class="fas fa-plus"></i> Add
              </button>`
            }
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    
    // Add result count
    const resultCount = `<div class="search-results-header">
      <h6>Search Results (${assets.length} found)</h6>
    </div>`;
    
    resultsContainer.innerHTML = resultCount + html;
    resultsContainer.style.display = 'block';

    // Add click handlers for add/remove buttons
    this.setupResultsEventListeners(assets);
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
      btn.addEventListener('click', (e) => {
        const assetId = parseInt(e.target.closest('.add-asset-btn').dataset.assetId);
        const asset = assets.find(a => a.id === assetId);
        if (asset) {
          this.addAsset(asset);
        }
      });
    });

    // Remove asset buttons
    resultsContainer.querySelectorAll('.remove-asset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const assetId = parseInt(e.target.closest('.remove-asset-btn').dataset.assetId);
        this.removeAsset(assetId);
      });
    });
  },

  /**
   * Add an asset to the selected list
   * @param {Object} asset - Asset object to add
   */
  addAsset(asset) {
    // Check if already selected
    if (this.isAssetSelected(asset.id)) {
      return;
    }

    // Add to selected assets
    this.state.selectedAssets.push(asset);
    
    // Update displays
    this.updateSelectedAssetsDisplay();
    this.updateAssetCount();
    
    // Update the search results to show new state
    if (this.state.searchResults.length > 0) {
      this.displaySearchResults(this.state.searchResults);
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
  removeAsset(assetId) {
    const assetIndex = this.state.selectedAssets.findIndex(a => a.id === assetId);
    
    if (assetIndex === -1) {
      return;
    }

    const removedAsset = this.state.selectedAssets[assetIndex];
    this.state.selectedAssets.splice(assetIndex, 1);
    
    // Update displays
    this.updateSelectedAssetsDisplay();
    this.updateAssetCount();
    
    // Update the search results to show new state
    if (this.state.searchResults.length > 0) {
      this.displaySearchResults(this.state.searchResults);
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
  updateSelectedAssetsDisplay() {
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
    
    this.state.selectedAssets.forEach(asset => {
      const name = asset.display_name || asset.name || 'Unknown Asset';
      const description = asset.description || '';
      const assetTypeId = asset.asset_type_id || 'N/A';
      
      html += `
        <div class="selected-asset-card" data-asset-id="${asset.id}">
          <div class="asset-card-header">
            <h6 class="asset-card-title">${this.escapeHtml(name)}</h6>
            <button type="button" class="btn btn-sm btn-outline-danger remove-selected-asset-btn" 
                    data-asset-id="${asset.id}" title="Remove this asset">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="asset-card-body">
            ${description ? `<p class="asset-card-description">${this.escapeHtml(description)}</p>` : ''}
            <div class="asset-card-meta">
              <small class="text-muted">ID: ${asset.id} | Type: ${assetTypeId}</small>
            </div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    container.innerHTML = html;

    // Add event listeners for remove buttons
    container.querySelectorAll('.remove-selected-asset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const assetId = parseInt(e.target.closest('.remove-selected-asset-btn').dataset.assetId);
        this.removeAsset(assetId);
      });
    });
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
  clearAllAssets() {
    if (this.state.selectedAssets.length === 0) {
      return;
    }

    // Create a custom confirmation modal instead of using browser confirm()
    const confirmClear = () => {
      this.state.selectedAssets = [];
      
      // Update displays
      this.updateSelectedAssetsDisplay();
      this.updateAssetCount();
      
      // Update the search results to show new state
      if (this.state.searchResults.length > 0) {
        this.displaySearchResults(this.state.searchResults);
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
        confirmClear();
      }
    } else {
      // Fallback - just clear without confirmation
      confirmClear();
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
    this.state.searchResults = [];
    this.state.currentSearchTerm = '';
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
  loadSelectedAssets() {
    if (window.changeRequestData && window.changeRequestData.selectedAssets) {
      this.state.selectedAssets = [...window.changeRequestData.selectedAssets];
      this.updateSelectedAssetsDisplay();
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
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AssetAssociation;
} else {
  window.AssetAssociation = AssetAssociation;
} 