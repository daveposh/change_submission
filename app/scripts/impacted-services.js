/**
 * Impacted Services Module
 * Handles analysis of impacted services, approvers, and stakeholders
 * based on direct assets and their relationships
 */

const ImpactedServices = {
  // Module state
  state: {
    directAssets: [],
    relatedAssets: [],
    approvers: [],
    stakeholders: [],
    isAnalyzing: false,
    analysisComplete: false
  },

  /**
   * Initialize the Impacted Services module
   */
  init() {
    console.log('🔧 Initializing Impacted Services Module...');
    this.setupEventListeners();
    this.loadDirectAssets();
    console.log('✅ Impacted Services Module initialized');
  },

  /**
   * Setup event listeners for impacted services functionality
   */
  setupEventListeners() {
    console.log('🔧 Setting up Impacted Services event listeners...');
    
    // Analyze services button
    const analyzeBtn = document.getElementById('analyze-services-btn');
    console.log('🔍 Analyze button found:', analyzeBtn);
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', () => {
        console.log('🔧 Analyze services button clicked');
        this.analyzeServices();
      });
    } else {
      console.warn('⚠️ Analyze services button not found');
    }

    // Add approver button
    const addApproverBtn = document.getElementById('add-approver-btn');
    console.log('🔍 Add approver button found:', addApproverBtn);
    if (addApproverBtn) {
      addApproverBtn.addEventListener('click', () => {
        console.log('🔧 Add approver button clicked');
        this.toggleUserSearch('approver');
      });
    } else {
      console.warn('⚠️ Add approver button not found');
    }

    // Add stakeholder button
    const addStakeholderBtn = document.getElementById('add-stakeholder-btn');
    console.log('🔍 Add stakeholder button found:', addStakeholderBtn);
    if (addStakeholderBtn) {
      addStakeholderBtn.addEventListener('click', () => {
        console.log('🔧 Add stakeholder button clicked');
        this.toggleUserSearch('stakeholder');
      });
    } else {
      console.warn('⚠️ Add stakeholder button not found');
    }

    // Setup user search inputs
    this.setupUserSearchInputs();

    console.log('✅ Impacted services event listeners setup complete');
  },

  /**
   * Setup user search input event listeners
   */
  setupUserSearchInputs() {
    // Approver search
    const approverSearch = document.getElementById('approver-search');
    if (approverSearch) {
      approverSearch.addEventListener('input', (e) => {
        this.handleUserSearch(e.target.value, 'approver');
      });
    }

    // Stakeholder search
    const stakeholderSearch = document.getElementById('stakeholder-search');
    if (stakeholderSearch) {
      stakeholderSearch.addEventListener('input', (e) => {
        this.handleUserSearch(e.target.value, 'stakeholder');
      });
    }
  },

  /**
   * Toggle user search interface
   * @param {string} type - 'approver' or 'stakeholder'
   */
  toggleUserSearch(type) {
    console.log(`🔧 toggleUserSearch called with type: ${type}`);
    
    const container = document.getElementById(`${type}-search-container`);
    const input = document.getElementById(`${type}-search`);
    
    console.log(`🔍 Search container (${type}-search-container):`, container);
    console.log(`🔍 Search input (${type}-search):`, input);
    
    if (container && input) {
      const currentDisplay = container.style.display;
      console.log(`🔍 Current display style: "${currentDisplay}"`);
      
      if (container.style.display === 'none' || container.style.display === '') {
        console.log(`🔧 Showing search container for ${type}`);
        container.style.display = 'block';
        input.focus();
        console.log(`✅ Search container shown and input focused for ${type}`);
      } else {
        console.log(`🔧 Hiding search container for ${type}`);
        container.style.display = 'none';
        input.value = '';
        const resultsContainer = document.getElementById(`${type}-results`);
        if (resultsContainer) {
          resultsContainer.innerHTML = '';
        }
        console.log(`✅ Search container hidden for ${type}`);
      }
    } else {
      console.error(`❌ Missing elements for ${type} search:`, {
        container: !!container,
        input: !!input,
        containerId: `${type}-search-container`,
        inputId: `${type}-search`
      });
    }
  },

  /**
   * Handle user search
   * @param {string} searchTerm - Search term
   * @param {string} type - 'approver' or 'stakeholder'
   */
  async handleUserSearch(searchTerm, type) {
    if (!searchTerm || searchTerm.length < 3) {
      document.getElementById(`${type}-results`).innerHTML = '';
      return;
    }

    const resultsContainer = document.getElementById(`${type}-results`);
    if (!resultsContainer) return;

    // Show loading indicator
    resultsContainer.innerHTML = `
      <div class="list-group-item">
        <div class="d-flex align-items-center">
          <div class="spinner-border spinner-border-sm me-2" role="status"></div>
          <span>Searching users...</span>
        </div>
      </div>
    `;

    try {
      // Use the global user search functionality
      const results = await this.searchUsers(searchTerm);
      this.displayUserSearchResults(results, type);
    } catch (error) {
      console.error(`Error searching ${type}s:`, error);
      resultsContainer.innerHTML = `
        <div class="list-group-item text-danger">
          <i class="fas fa-exclamation-triangle me-2"></i>Error searching users: ${error.message}
        </div>
      `;
    }
  },

  /**
   * Search for users using the global search functionality
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} - Array of user objects
   */
  searchUsers(searchTerm) {
    return new Promise((resolve, reject) => {
      if (!window.client || !window.client.request) {
        reject(new Error('API client not available'));
        return;
      }

      let allResults = [];
      let requestersLoaded = false;
      let agentsLoaded = false;

      // Function to check if both searches are complete
      const checkComplete = () => {
        if (requestersLoaded && agentsLoaded) {
          // Remove duplicates based on email
          const uniqueResults = [];
          const seenEmails = new Set();
          
          allResults.forEach(user => {
            if (!seenEmails.has(user.email)) {
              seenEmails.add(user.email);
              uniqueResults.push({
                id: user.id,
                name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
                email: user.email,
                department: user.department_names ? user.department_names.join(', ') : 'N/A',
                role: user.role || (user._isAgent ? 'Agent' : 'Requester'),
                userDetails: user
              });
            }
          });

          resolve(uniqueResults);
        }
      };

      // Search requesters
      const userQuery = encodeURIComponent(`~[first_name|last_name|email]:'${searchTerm}'`);
      const requestUrl = `?query=${userQuery}&page=1&per_page=30`;

      // Search in requesters
      window.client.request.invokeTemplate("getRequesters", {
        path_suffix: requestUrl,
        cache: true,
        ttl: 300000
      })
      .then(function(data) {
        try {
          if (data && data.response) {
            const response = JSON.parse(data.response);
            const requesters = response.requesters || [];
            
            // Filter results manually for better accuracy
            const filteredRequesters = requesters.filter(user => {
              const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
              const email = (user.email || '').toLowerCase();
              const term = searchTerm.toLowerCase();
              return fullName.includes(term) || email.includes(term);
            });

            allResults = [...allResults, ...filteredRequesters];
          }
        } catch (error) {
          console.warn('Error parsing requesters response:', error);
        }
        requestersLoaded = true;
        checkComplete();
      })
      .catch(function(error) {
        console.warn('Requesters search failed:', error);
        requestersLoaded = true;
        checkComplete();
      });

      // Search in agents
      window.client.request.invokeTemplate("getAgents", {
        path_suffix: requestUrl,
        cache: true,
        ttl: 300000
      })
      .then(function(data) {
        try {
          if (data && data.response) {
            const response = JSON.parse(data.response);
            const agents = response.agents || [];
            
            // Filter results manually for better accuracy
            const filteredAgents = agents.filter(user => {
              const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
              const email = (user.email || '').toLowerCase();
              const term = searchTerm.toLowerCase();
              return fullName.includes(term) || email.includes(term);
            });

            // Mark as agents
            const agentsWithFlag = filteredAgents.map(agent => ({
              ...agent,
              _isAgent: true
            }));

            allResults = [...allResults, ...agentsWithFlag];
          }
        } catch (error) {
          console.warn('Error parsing agents response:', error);
        }
        agentsLoaded = true;
        checkComplete();
      })
      .catch(function(error) {
        console.warn('Agents search failed:', error);
        agentsLoaded = true;
        checkComplete();
      });
    });
  },

  /**
   * Display user search results
   * @param {Array} users - Array of user objects
   * @param {string} type - 'approver' or 'stakeholder'
   */
  displayUserSearchResults(users, type) {
    const resultsContainer = document.getElementById(`${type}-results`);
    if (!resultsContainer) return;

    if (users.length === 0) {
      resultsContainer.innerHTML = `
        <div class="list-group-item text-muted">
          <i class="fas fa-info-circle me-2"></i>No users found
        </div>
      `;
      return;
    }

    let html = '';
    users.forEach(user => {
      const isAlreadyAdded = type === 'approver' 
        ? this.state.approvers.some(a => a.id === user.id)
        : this.state.stakeholders.some(s => s.id === user.id);

      if (!isAlreadyAdded) {
        html += `
          <div class="list-group-item list-group-item-action user-search-result" 
               data-user-id="${user.id}" 
               data-user-name="${this.escapeHtml(user.name)}"
               data-user-email="${this.escapeHtml(user.email)}"
               data-user-department="${this.escapeHtml(user.department || 'N/A')}">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <strong>${this.escapeHtml(user.name)}</strong>
                <div class="small text-muted">
                  <i class="fas fa-envelope me-1"></i>${this.escapeHtml(user.email)}
                  ${user.department ? `<br><i class="fas fa-building me-1"></i>${this.escapeHtml(user.department)}` : ''}
                </div>
              </div>
              <button type="button" class="btn btn-sm btn-primary add-user-btn">
                <i class="fas fa-plus me-1"></i>Add
              </button>
            </div>
          </div>
        `;
      }
    });

    resultsContainer.innerHTML = html;

    // Add click handlers for add buttons
    resultsContainer.querySelectorAll('.add-user-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const resultItem = e.target.closest('.user-search-result');
        const userData = {
          id: resultItem.dataset.userId,
          name: resultItem.dataset.userName,
          email: resultItem.dataset.userEmail,
          department: resultItem.dataset.userDepartment,
          role: type === 'approver' ? 'Approver' : 'Stakeholder',
          source: 'Manually added',
          userDetails: null
        };
        this.addUser(userData, type);
      });
    });
  },

  /**
   * Add a user to approvers or stakeholders
   * @param {Object} user - User object
   * @param {string} type - 'approver' or 'stakeholder'
   */
  addUser(user, type) {
    // Check if user is already added
    const existingUser = type === 'approver'
      ? this.state.approvers.find(a => a.id === user.id)
      : this.state.stakeholders.find(s => s.id === user.id);

    if (existingUser) {
      this.showNotification('warning', `${user.name} is already added as a ${type}`);
      return;
    }

    // Add user to appropriate list
    if (type === 'approver') {
      this.state.approvers.push(user);
    } else {
      this.state.stakeholders.push(user);
    }

    // Update displays
    this.displayResults();
    this.updateServiceCount();

    // Hide search interface
    this.toggleUserSearch(type);

    // Show success message
    this.showNotification('success', `Added ${user.name} as a ${type}`);

    console.log(`✅ Added ${user.name} as ${type}`);
  },

  /**
   * Remove a user from approvers or stakeholders
   * @param {number} userId - User ID to remove
   * @param {string} type - 'approver' or 'stakeholder'
   */
  removeUser(userId, type) {
    const list = type === 'approver' ? this.state.approvers : this.state.stakeholders;
    const index = list.findIndex(u => u.id === userId);
    
    if (index === -1) return;

    const removedUser = list[index];
    list.splice(index, 1);

    // Update displays
    this.displayResults();
    this.updateServiceCount();

    // Show success message
    this.showNotification('success', `Removed ${removedUser.name} from ${type}s`);

    console.log(`❌ Removed ${removedUser.name} from ${type}s`);
  },

  /**
   * Load direct assets from the Asset Association module
   */
  loadDirectAssets() {
    if (window.AssetAssociation && window.AssetAssociation.getSelectedAssets) {
      this.state.directAssets = window.AssetAssociation.getSelectedAssets();
      console.log(`📦 Loaded ${this.state.directAssets.length} direct assets`);
      this.updateServiceCount();
    }
  },

  /**
   * Analyze services to build approver and stakeholder lists
   */
  async analyzeServices() {
    if (this.state.isAnalyzing) {
      console.log('⚠️ Analysis already in progress');
      return;
    }

    console.log('🔍 Starting impacted services analysis...');
    this.state.isAnalyzing = true;
    this.showAnalysisStatus(true);

    try {
      // Step 1: Load fresh direct assets
      this.loadDirectAssets();

      if (this.state.directAssets.length === 0) {
        console.log('⚠️ No direct assets to analyze');
        this.showNotification('warning', 'No assets selected. Please go back to Asset Association and select assets first.');
        return;
      }

      // Step 2: Preload users referenced in direct assets
      console.log('👥 Preloading users referenced in direct assets...');
      await preloadAssetUsers(this.state.directAssets);

      // Step 3: Extract approvers from direct assets
      console.log('👥 Extracting approvers from direct assets...');
      await this.extractApproversFromDirectAssets();

      // Step 4: Find related assets through asset relationships
      console.log('🔗 Finding related assets through relationships...');
      await this.findRelatedAssets();

      // Step 5: Preload users referenced in related assets
      if (this.state.relatedAssets.length > 0) {
        console.log('👥 Preloading users referenced in related assets...');
        await preloadAssetUsers(this.state.relatedAssets);
      }

      // Step 6: Extract stakeholders from related assets
      console.log('🤝 Extracting stakeholders from related assets...');
      await this.extractStakeholdersFromRelatedAssets();

      // Step 7: Display results
      this.displayResults();

      this.state.analysisComplete = true;
      console.log('✅ Impacted services analysis complete');

    } catch (error) {
      console.error('❌ Error during services analysis:', error);
      this.showNotification('danger', 'Error analyzing services: ' + error.message);
    } finally {
      this.state.isAnalyzing = false;
      this.showAnalysisStatus(false);
    }
  },

  /**
   * Extract approvers from direct assets (managed_by field)
   */
  async extractApproversFromDirectAssets() {
    const approvers = new Map(); // Use Map to avoid duplicates

    for (const asset of this.state.directAssets) {
      try {
        // Get managed by information using existing helper methods
        let managedById = null;

        // Try to get managed by ID from various fields
        if (asset.agent_id) {
          managedById = asset.agent_id;
        } else if (asset.user_id) {
          managedById = asset.user_id;
        } else if (asset.managed_by) {
          managedById = asset.managed_by;
        }

        // If we have an ID, resolve it to user details
        if (managedById && !isNaN(managedById)) {
          console.log(`🔍 Resolving approver ID ${managedById} for asset ${asset.name}`);
          
          const userDetails = await getUserDetails(managedById);
          if (userDetails) {
            const approverKey = userDetails.id || managedById;
            if (!approvers.has(approverKey)) {
              approvers.set(approverKey, {
                id: userDetails.id || managedById,
                name: `${userDetails.first_name || ''} ${userDetails.last_name || ''}`.trim() || 'Unknown',
                email: userDetails.email || userDetails.primary_email || 'N/A',
                department: userDetails.department_names ? userDetails.department_names.join(', ') : 'N/A',
                role: 'Approver',
                source: `Direct asset: ${asset.name}`,
                sourceAsset: asset,
                userDetails: userDetails
              });
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️ Error extracting approver from asset ${asset.name}:`, error);
      }
    }

    this.state.approvers = Array.from(approvers.values());
    console.log(`✅ Extracted ${this.state.approvers.length} unique approvers`);
  },

  /**
   * Find related assets using the relationships API with robust fallbacks
   */
  async findRelatedAssets() {
    const relatedAssets = [];
    const processedAssetIds = new Set(); // Track processed assets to avoid duplicates
    
    console.log(`🔍 Finding related assets for ${this.state.directAssets.length} direct assets...`);
    
    // Check for client availability
    if (!window.client || !window.client.request || !window.client.request.invokeTemplate) {
      console.log('⚠️ Client or invokeTemplate not available for asset relationships fetch');
      await this.findRelatedAssetsFallback(relatedAssets, processedAssetIds);
      return;
    }
    
    let relationshipsApiAvailable = true;
    
    for (const directAsset of this.state.directAssets) {
      let foundRelationships = false;
      
      // Only try relationships API if it's still considered available
      if (relationshipsApiAvailable) {
        try {
          // Use the display_id for the API call - this is the key identifier for the relationships endpoint
          const assetId = directAsset.display_id || directAsset.id;
          console.log(`📡 Fetching relationships for asset ${directAsset.name} (Display ID: ${assetId})`);
          console.log(`🔍 Asset details:`, { id: directAsset.id, display_id: directAsset.display_id, name: directAsset.name });
          
          // Make API call using FDK invokeTemplate with proper context approach
          // The API endpoint is: /api/v2/assets/{asset_id}/relationships
          const response = await window.client.request.invokeTemplate("getAssetRelationships", {
            context: {
              asset_id: assetId
            },
            cache: true,
            ttl: 300000 // 5 minutes cache for relationships (they don't change frequently)
          });
          
          if (!response || !response.response) {
            console.warn(`⚠️ Failed to fetch relationships for asset ${directAsset.name}: No response data`);
            console.warn(`📊 Response details:`, response);
            continue;
          }
          
          // Parse the response
          let relationshipData;
          try {
            relationshipData = JSON.parse(response.response);
          } catch (parseError) {
            console.warn(`⚠️ Failed to parse relationship data for asset ${directAsset.name}:`, parseError);
            console.warn(`📊 Raw response:`, response.response);
            continue;
          }
          
          console.log(`📊 Relationship data for ${directAsset.name}:`, relationshipData);
          
          // Process the relationship data based on actual API format
          if (relationshipData && Array.isArray(relationshipData.relationships)) {
            console.log(`📋 Found ${relationshipData.relationships.length} relationships for ${directAsset.name}`);
            foundRelationships = true;
            
            for (const relationship of relationshipData.relationships) {
              try {
                console.log(`🔗 Processing relationship:`, {
                  id: relationship.id,
                  relationship_type_id: relationship.relationship_type_id,
                  primary_id: relationship.primary_id,
                  primary_type: relationship.primary_type,
                  secondary_id: relationship.secondary_id,
                  secondary_type: relationship.secondary_type,
                  created_at: relationship.created_at,
                  updated_at: relationship.updated_at
                });
                
                // Extract related asset ID based on the actual API response format
                let relatedAssetId = null;
                
                // If this asset is the primary, get the secondary asset (if it's an asset)
                if (relationship.primary_id == assetId && relationship.secondary_type === 'asset') {
                  relatedAssetId = relationship.secondary_id;
                  console.log(`   → Asset ${assetId} is primary, related asset: ${relatedAssetId}`);
                }
                // If this asset is the secondary, get the primary asset (if it's an asset)
                else if (relationship.secondary_id == assetId && relationship.primary_type === 'asset') {
                  relatedAssetId = relationship.primary_id;
                  console.log(`   → Asset ${assetId} is secondary, related asset: ${relatedAssetId}`);
                }
                
                // Skip if no related asset ID found or already processed
                if (!relatedAssetId) {
                  console.log(`   ⚠️ No related asset found in relationship ${relationship.id}`);
                  continue;
                }
                
                if (processedAssetIds.has(relatedAssetId)) {
                  console.log(`   🔄 Related asset ${relatedAssetId} already processed, skipping`);
                  continue;
                }
                
                // Don't include the direct asset itself or other direct assets
                // Check both id and display_id since relationships might use either
                const isDirectAsset = this.state.directAssets.some(da => 
                  da.id == relatedAssetId || 
                  da.display_id == relatedAssetId ||
                  relatedAssetId == directAsset.id ||
                  relatedAssetId == directAsset.display_id
                );
                
                if (isDirectAsset) {
                  console.log(`   🔄 Skipping related asset ${relatedAssetId} as it's already a direct asset`);
                  continue;
                }
                
                console.log(`   ✅ Found valid related asset ID: ${relatedAssetId} for ${directAsset.name}`);
                
                // Fetch the full asset details for the related asset
                const relatedAssetDetails = await this.fetchAssetDetails(relatedAssetId);
                
                // Add the related asset if we have details
                if (relatedAssetDetails) {
                  // Track both id and display_id to avoid duplicates
                  processedAssetIds.add(relatedAssetId);
                  if (relatedAssetDetails.display_id && relatedAssetDetails.display_id !== relatedAssetId) {
                    processedAssetIds.add(relatedAssetDetails.display_id);
                  }
                  if (relatedAssetDetails.id && relatedAssetDetails.id !== relatedAssetId) {
                    processedAssetIds.add(relatedAssetDetails.id);
                  }
                  
                  // Get relationship type name if available
                  let relationshipTypeName = 'Related';
                  if (relationship.relationship_type_id && window.CacheManager && window.CacheManager.getRelationshipTypeName) {
                    relationshipTypeName = await window.CacheManager.getRelationshipTypeName(relationship.relationship_type_id) || 'Related';
                  }
                  
                  // Create the related asset object with all relationship metadata
                  const relatedAssetObj = {
                    id: relatedAssetDetails.id,
                    display_id: relatedAssetDetails.display_id || relatedAssetDetails.id,
                    name: relatedAssetDetails.name || `Asset ${relatedAssetDetails.id}`,
                    asset_type_id: relatedAssetDetails.asset_type_id,
                    managed_by: relatedAssetDetails.managed_by || relatedAssetDetails.agent_id || relatedAssetDetails.user_id,
                    relationship_type: relationshipTypeName,
                    relationship_type_id: relationship.relationship_type_id,
                    relationship_id: relationship.id,
                    relationship_created_at: relationship.created_at,
                    relationship_updated_at: relationship.updated_at,
                    source_asset: directAsset.name,
                    source_asset_id: assetId,
                    is_primary: relationship.primary_id == assetId,
                    is_secondary: relationship.secondary_id == assetId,
                    ...relatedAssetDetails // Include all other asset properties
                  };
                  
                  relatedAssets.push(relatedAssetObj);
                  
                  console.log(`   ✅ Added related asset: ${relatedAssetDetails.name} (${relationshipTypeName}) - Relationship ID: ${relationship.id}`);
                } else {
                  console.warn(`   ⚠️ Could not fetch details for related asset ${relatedAssetId}`);
                }
                
              } catch (relationshipError) {
                console.warn(`⚠️ Error processing relationship ${relationship.id || 'unknown'} for asset ${directAsset.name}:`, relationshipError);
              }
            }
          } else {
            console.log(`ℹ️ No relationships found for asset ${directAsset.name}`);
          }
          
        } catch (error) {
          console.error(`❌ Error fetching relationships for asset ${directAsset.name}:`, error);
          console.error(`📊 Error details:`, { 
            status: error.status, 
            message: error.message, 
            response: error.response,
            assetId: directAsset.display_id || directAsset.id,
            assetName: directAsset.name
          });
          
          // Check if this is a 404 error (relationships endpoint not available)
          if (error.status === 404) {
            console.log(`ℹ️ Asset relationships endpoint returned 404 for asset ${directAsset.name}`);
            console.log(`ℹ️ This could mean:`);
            console.log(`   1. Asset has no relationships defined`);
            console.log(`   2. Relationships feature not enabled for this asset type`);
            console.log(`   3. Asset relationships endpoint not supported in this Freshservice instance`);
            relationshipsApiAvailable = false; // Don't try for other assets
          } else {
            console.log(`ℹ️ Other error occurred (status: ${error.status}), will continue trying for other assets`);
          }
        }
      }
      
      // If relationships API failed or not available, try fallback methods
      if (!foundRelationships) {
        await this.findRelatedAssetsFallbackForAsset(directAsset, relatedAssets, processedAssetIds);
      }
    }

    this.state.relatedAssets = relatedAssets;
    console.log(`✅ Found ${this.state.relatedAssets.length} total related assets`);
    
    // Log summary of relationship types
    const relationshipTypes = {};
    const relationshipDetails = [];
    relatedAssets.forEach(asset => {
      const type = asset.relationship_type || 'Unknown';
      relationshipTypes[type] = (relationshipTypes[type] || 0) + 1;
      
      // Collect detailed relationship info for debugging
      relationshipDetails.push({
        asset_name: asset.name,
        asset_id: asset.display_id || asset.id,
        relationship_type: type,
        relationship_id: asset.relationship_id,
        source_asset: asset.source_asset,
        is_primary: asset.is_primary,
        is_secondary: asset.is_secondary,
        created_at: asset.relationship_created_at
      });
    });
    
    if (Object.keys(relationshipTypes).length > 0) {
      console.log(`📊 Relationship types found:`, relationshipTypes);
      console.log(`📋 Detailed relationship information:`);
      relationshipDetails.forEach((detail, index) => {
        console.log(`   ${index + 1}. ${detail.asset_name} (ID: ${detail.asset_id})`);
        console.log(`      → Type: ${detail.relationship_type}`);
        console.log(`      → Relationship ID: ${detail.relationship_id}`);
        console.log(`      → Source: ${detail.source_asset}`);
        console.log(`      → Role: ${detail.is_primary ? 'Primary' : 'Secondary'} in relationship`);
        console.log(`      → Created: ${detail.created_at}`);
      });
    }
  },

  /**
   * Fetch asset details by ID with fallback methods
   */
  async fetchAssetDetails(assetId) {
    // Try to get asset details from cache first
    if (window.CacheManager && window.CacheManager.getAssetById) {
      const cachedAsset = await window.CacheManager.getAssetById(assetId);
      if (cachedAsset) {
        console.log(`📦 Found asset ${assetId} in cache`);
        return cachedAsset;
      }
    }
    
    // If not in cache, fetch from API
    try {
      const assetResponse = await window.client.request.invokeTemplate("getAssetDetails", {
        context: {
          asset_id: assetId
        },
        cache: true,
        ttl: 180000 // 3 minutes cache for asset details
      });
      
      if (assetResponse && assetResponse.response) {
        const assetData = JSON.parse(assetResponse.response);
        if (assetData && assetData.asset) {
          console.log(`📡 Fetched asset ${assetId} from API`);
          return assetData.asset;
        }
      }
    } catch (fetchError) {
      console.warn(`⚠️ Failed to fetch details for asset ${assetId}:`, fetchError);
    }
    
    return null;
  },

  /**
   * Fallback method to find related assets using search and naming patterns
   */
  async findRelatedAssetsFallbackForAsset(directAsset, relatedAssets, processedAssetIds) {
    console.log(`🔄 Using fallback methods to find related assets for ${directAsset.name}...`);
    
    try {
      if (window.CacheManager && window.CacheManager.searchAssets) {
        // Method 1: Search by base name (first word)
        const baseName = directAsset.name.split(' ')[0];
        if (baseName.length >= 3) {
          try {
            const searchResults = await window.CacheManager.searchAssets(baseName, 'name');
            const filtered = searchResults.filter(asset => 
              asset.id !== directAsset.id && 
              asset.display_id !== directAsset.display_id &&
              !this.state.directAssets.some(da => da.id === asset.id || da.display_id === asset.display_id) &&
              !processedAssetIds.has(asset.id) &&
              !processedAssetIds.has(asset.display_id)
            );
            
            filtered.forEach(asset => {
              processedAssetIds.add(asset.id);
              if (asset.display_id && asset.display_id !== asset.id) {
                processedAssetIds.add(asset.display_id);
              }
              relatedAssets.push({
                ...asset,
                relationship_type: 'Similar Name',
                source_asset: directAsset.name
              });
            });
            
            console.log(`🔄 Fallback search by name found ${filtered.length} potential related assets`);
          } catch (nameSearchError) {
            console.warn(`⚠️ Name-based search failed for ${directAsset.name}:`, nameSearchError);
          }
        }
        
        // Method 2: Search by asset type (if same type, might be related)
        if (directAsset.asset_type_id) {
          try {
            // Convert asset_type_id to string for search
            const assetTypeIdString = String(directAsset.asset_type_id);
            console.log(`🔍 Searching for assets with type ID: ${assetTypeIdString}`);
            
            const typeResults = await window.CacheManager.searchAssets(assetTypeIdString, 'asset_type_id');
            const typeFiltered = typeResults.filter(asset => 
              asset.id !== directAsset.id && 
              asset.display_id !== directAsset.display_id &&
              !this.state.directAssets.some(da => da.id === asset.id || da.display_id === asset.display_id) &&
              !processedAssetIds.has(asset.id) &&
              !processedAssetIds.has(asset.display_id) &&
              asset.name && asset.name.toLowerCase().includes(directAsset.name.toLowerCase().split(' ')[0])
            ).slice(0, 3); // Limit to 3 to avoid too many results
            
            typeFiltered.forEach(asset => {
              processedAssetIds.add(asset.id);
              if (asset.display_id && asset.display_id !== asset.id) {
                processedAssetIds.add(asset.display_id);
              }
              relatedAssets.push({
                ...asset,
                relationship_type: 'Same Type',
                source_asset: directAsset.name
              });
            });
            
            console.log(`🔄 Fallback search by type found ${typeFiltered.length} potential related assets`);
          } catch (typeError) {
            console.warn(`⚠️ Type-based search failed for ${directAsset.name}:`, typeError);
          }
        }
        
        // Method 3: Search by environment (if available in type_fields)
        if (directAsset.type_fields) {
          try {
            // Look for environment field in type_fields
            const environmentField = Object.keys(directAsset.type_fields).find(key => 
              key.toLowerCase().includes('environment')
            );
            
            if (environmentField && directAsset.type_fields[environmentField]) {
              const environment = directAsset.type_fields[environmentField];
              console.log(`🔍 Searching for assets in environment: ${environment}`);
              
              const envResults = await window.CacheManager.searchAssets(environment, 'type_fields');
              const envFiltered = envResults.filter(asset => 
                asset.id !== directAsset.id && 
                asset.display_id !== directAsset.display_id &&
                !this.state.directAssets.some(da => da.id === asset.id || da.display_id === asset.display_id) &&
                !processedAssetIds.has(asset.id) &&
                !processedAssetIds.has(asset.display_id)
              ).slice(0, 2); // Limit to 2 to avoid too many results
              
              envFiltered.forEach(asset => {
                processedAssetIds.add(asset.id);
                if (asset.display_id && asset.display_id !== asset.id) {
                  processedAssetIds.add(asset.display_id);
                }
                relatedAssets.push({
                  ...asset,
                  relationship_type: 'Same Environment',
                  source_asset: directAsset.name
                });
              });
              
              console.log(`🔄 Fallback search by environment found ${envFiltered.length} potential related assets`);
            }
          } catch (envError) {
            console.warn(`⚠️ Environment-based search failed for ${directAsset.name}:`, envError);
          }
        }
      }
    } catch (fallbackError) {
      console.warn(`⚠️ Fallback search failed for ${directAsset.name}:`, fallbackError);
    }
  },

  /**
   * Complete fallback method when relationships API is not available
   */
  async findRelatedAssetsFallback(relatedAssets, processedAssetIds) {
    console.log(`🔄 Using complete fallback approach for asset relationships...`);
    
    for (const directAsset of this.state.directAssets) {
      await this.findRelatedAssetsFallbackForAsset(directAsset, relatedAssets, processedAssetIds);
    }
  },

  /**
   * Extract stakeholders from related assets (managed_by field)
   */
  async extractStakeholdersFromRelatedAssets() {
    const stakeholders = new Map(); // Use Map to avoid duplicates

    for (const asset of this.state.relatedAssets) {
      try {
        // Get managed by information using existing helper methods
        let managedById = null;

        // Try to get managed by ID from various fields
        if (asset.agent_id) {
          managedById = asset.agent_id;
        } else if (asset.user_id) {
          managedById = asset.user_id;
        } else if (asset.managed_by) {
          managedById = asset.managed_by;
        }

        // If we have an ID, resolve it to user details
        if (managedById && !isNaN(managedById)) {
          console.log(`🔍 Resolving stakeholder ID ${managedById} for asset ${asset.name}`);
          
          const userDetails = await getUserDetails(managedById);
          if (userDetails) {
            const stakeholderKey = userDetails.id || managedById;
            
            // Don't add if they're already an approver
            if (!this.state.approvers.some(a => a.id === stakeholderKey)) {
              if (!stakeholders.has(stakeholderKey)) {
                stakeholders.set(stakeholderKey, {
                  id: userDetails.id || managedById,
                  name: `${userDetails.first_name || ''} ${userDetails.last_name || ''}`.trim() || 'Unknown',
                  email: userDetails.email || userDetails.primary_email || 'N/A',
                  department: userDetails.department_names ? userDetails.department_names.join(', ') : 'N/A',
                  role: 'Stakeholder',
                  source: `Related asset: ${asset.name}`,
                  sourceAsset: asset,
                  userDetails: userDetails
                });
              }
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️ Error extracting stakeholder from asset ${asset.name}:`, error);
      }
    }

    this.state.stakeholders = Array.from(stakeholders.values());
    console.log(`✅ Extracted ${this.state.stakeholders.length} unique stakeholders`);
  },

  /**
   * Display analysis results
   */
  displayResults() {
    // Display approvers
    this.displayUserList('approvers-list', this.state.approvers, 'approver');
    
    // Display stakeholders
    this.displayUserList('stakeholders-list', this.state.stakeholders, 'stakeholder');
    
    // Update summary
    this.updateSummary();
    
    // Show summary section
    const summarySection = document.getElementById('impact-summary');
    if (summarySection) {
      summarySection.style.display = 'block';
    }
  },

  /**
   * Display a list of users (approvers or stakeholders)
   */
  displayUserList(containerId, users, userType) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (users.length === 0) {
      container.innerHTML = `
        <div class="no-data-message">
          <i class="fas fa-info-circle text-muted"></i>
          <span class="text-muted">No ${userType}s identified from the analysis.</span>
        </div>
      `;
      return;
    }

    let html = '';
    users.forEach((user) => {
      const badgeClass = userType === 'approver' ? 'bg-success' : 'bg-primary';
      const isManuallyAdded = user.source === 'Manually added';
      
      html += `
        <div class="user-item" data-user-id="${user.id}">
          <div class="user-info">
            <div class="user-name">${this.escapeHtml(user.name)}</div>
            <div class="user-details">
              <i class="fas fa-envelope me-1"></i>${this.escapeHtml(user.email)}
              ${user.department !== 'N/A' ? `<br><i class="fas fa-building me-1"></i>${this.escapeHtml(user.department)}` : ''}
            </div>
            <div class="user-badges">
              <span class="badge ${badgeClass} user-role-badge">${this.escapeHtml(user.role)}</span>
              <span class="badge bg-secondary user-role-badge" title="Source">${this.escapeHtml(user.source)}</span>
              ${isManuallyAdded ? '<span class="badge bg-info user-role-badge">Manually Added</span>' : ''}
            </div>
          </div>
          <div class="user-actions">
            <button type="button" class="btn btn-sm btn-outline-danger remove-user-btn" 
                    data-user-id="${user.id}" 
                    data-user-type="${userType}"
                    title="Remove this ${userType}">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // Add click handlers for remove buttons
    container.querySelectorAll('.remove-user-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const userId = parseInt(e.target.closest('.remove-user-btn').dataset.userId);
        const userType = e.target.closest('.remove-user-btn').dataset.userType;
        this.removeUser(userId, userType);
      });
    });
  },

  /**
   * Update the summary section with counts
   */
  updateSummary() {
    const summaryElements = {
      'direct-assets-count': this.state.directAssets.length,
      'related-assets-count': this.state.relatedAssets.length,
      'total-approvers-count': this.state.approvers.length,
      'total-stakeholders-count': this.state.stakeholders.length
    };

    Object.entries(summaryElements).forEach(([elementId, count]) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.textContent = count;
      }
    });
  },

  /**
   * Update service count in header
   */
  updateServiceCount() {
    const countElement = document.getElementById('impacted-services-count');
    if (countElement) {
      const totalImpacted = this.state.approvers.length + this.state.stakeholders.length;
      countElement.textContent = totalImpacted;
    }

    // Update tab badge
    const tabBadge = document.querySelector('[data-bs-target="#impacted-services"] .badge');
    if (tabBadge) {
      const totalImpacted = this.state.approvers.length + this.state.stakeholders.length;
      tabBadge.textContent = totalImpacted;
      tabBadge.style.display = totalImpacted > 0 ? 'inline' : 'none';
    }
  },

  /**
   * Show/hide analysis status
   */
  showAnalysisStatus(show) {
    const statusElement = document.getElementById('analysis-status');
    if (statusElement) {
      statusElement.style.display = show ? 'block' : 'none';
    }
  },

  /**
   * Show notification message
   */
  showNotification(type, message) {
    if (window.showNotification) {
      window.showNotification(type, message);
    } else {
      console.error('Notification:', type, message);
    }
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Get impacted services data for external access
   */
  getImpactedServicesData() {
    return {
      directAssets: this.state.directAssets,
      relatedAssets: this.state.relatedAssets,
      approvers: this.state.approvers,
      stakeholders: this.state.stakeholders,
      analysisComplete: this.state.analysisComplete
    };
  },

  /**
   * Validate that analysis has been completed
   */
  validateAnalysis() {
    const isValid = this.state.analysisComplete && 
                   (this.state.approvers.length > 0 || this.state.stakeholders.length > 0);
    return {
      isValid,
      message: isValid ? '' : 'Please run the services analysis to identify approvers and stakeholders.'
    };
  },

  /**
   * Debug method to analyze user cache status for current assets
   */
  async debugUserCache() {
    console.log('🔍 === IMPACTED SERVICES USER CACHE DEBUG ===');
    
    // Get all assets (direct + related)
    const allAssets = [...this.state.directAssets, ...this.state.relatedAssets];
    
    if (allAssets.length === 0) {
      console.log('⚠️ No assets loaded. Load assets first by running analysis.');
      return;
    }
    
    console.log(`📦 Analyzing user cache for ${this.state.directAssets.length} direct assets and ${this.state.relatedAssets.length} related assets`);
    
    // Use the global debug function
    await debugUserCacheStatus(allAssets);
    
    // Show current analysis state
    console.log(`\n📊 === CURRENT ANALYSIS STATE ===`);
    console.log(`✅ Analysis complete: ${this.state.analysisComplete}`);
    console.log(`👥 Approvers found: ${this.state.approvers.length}`);
    console.log(`🤝 Stakeholders found: ${this.state.stakeholders.length}`);
    
    if (this.state.approvers.length > 0) {
      console.log(`\n👥 === APPROVERS ===`);
      this.state.approvers.forEach((approver, index) => {
        console.log(`${index + 1}. ${approver.name} (${approver.email}) - ${approver.source}`);
      });
    }
    
    if (this.state.stakeholders.length > 0) {
      console.log(`\n🤝 === STAKEHOLDERS ===`);
      this.state.stakeholders.forEach((stakeholder, index) => {
        console.log(`${index + 1}. ${stakeholder.name} (${stakeholder.email}) - ${stakeholder.source}`);
      });
    }
  }
};

/**
 * Validate impacted services and proceed to next tab
 */
function validateServicesAndNext() {
  console.log('🔍 Validating impacted services...');
  
  // Clear any previous validation highlighting
  clearFieldHighlighting();
  
  // Check if ImpactedServices module is available
  if (!window.ImpactedServices) {
    showNotification('danger', 'Impacted Services module not available. Please refresh the page.');
    return;
  }
  
  // Validate the analysis
  const validation = window.ImpactedServices.validateAnalysis();
  
  if (!validation.isValid) {
    showNotification('danger', validation.message);
    return;
  }
  
  // If validation passes, switch to risk assessment tab
  console.log('✅ Impacted services validation passed');
  switchTab('risk-assessment');
}

// Make ImpactedServices available globally
window.ImpactedServices = ImpactedServices; 