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
    // Analyze services button
    const analyzeBtn = document.getElementById('analyze-services-btn');
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', () => {
        this.analyzeServices();
      });
    }

    console.log('✅ Impacted services event listeners setup complete');
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
   * Find assets related to direct assets using the relationships API
   */
  async findRelatedAssets() {
    const relatedAssets = [];
    const processedAssetIds = new Set(); // Track processed assets to avoid duplicates
    
    console.log(`🔍 Finding related assets for ${this.state.directAssets.length} direct assets...`);
    
    // Check for client availability
    if (!window.client || !window.client.request || !window.client.request.invokeTemplate) {
      console.log('⚠️ Client or invokeTemplate not available for asset relationships fetch');
      return;
    }
    
    for (const directAsset of this.state.directAssets) {
      try {
        // Use the display_id for the API call - this is the key identifier for the relationships endpoint
        const assetId = directAsset.display_id || directAsset.id;
        console.log(`📡 Fetching relationships for asset ${directAsset.name} (Display ID: ${assetId})`);
        
        // Make API call using FDK invokeTemplate with correct parameter format
        // The API endpoint is: /api/v2/assets/{asset_id}/relationships
        const response = await window.client.request.invokeTemplate("getAssetRelationships", {
          context: {},
          body: JSON.stringify({}),
          headers: {},
          asset_id: assetId  // Pass asset_id directly as a path parameter
        });
        
        if (!response || !response.response) {
          console.warn(`⚠️ Failed to fetch relationships for asset ${directAsset.name}: No response data`);
          continue;
        }
        
        // Parse the response
        let relationshipData;
        try {
          relationshipData = JSON.parse(response.response);
        } catch (parseError) {
          console.warn(`⚠️ Failed to parse relationship data for asset ${directAsset.name}:`, parseError);
          continue;
        }
        
        console.log(`📊 Relationship data for ${directAsset.name}:`, relationshipData);
        
        // Process the relationship data
        if (relationshipData && Array.isArray(relationshipData.relationships)) {
          for (const relationship of relationshipData.relationships) {
            // Extract related asset information
            let relatedAsset = null;
            
            // Check if this relationship has a related asset
            if (relationship.child && relationship.child.id) {
              relatedAsset = relationship.child;
            } else if (relationship.parent && relationship.parent.id) {
              relatedAsset = relationship.parent;
            } else if (relationship.asset && relationship.asset.id) {
              relatedAsset = relationship.asset;
            }
            
            // Add the related asset if it's valid and not already processed
            if (relatedAsset && relatedAsset.id && !processedAssetIds.has(relatedAsset.id)) {
              // Don't include the direct asset itself or other direct assets
              if (relatedAsset.id !== directAsset.id && 
                  !this.state.directAssets.some(da => da.id === relatedAsset.id)) {
                
                processedAssetIds.add(relatedAsset.id);
                relatedAssets.push({
                  id: relatedAsset.id,
                  display_id: relatedAsset.display_id || relatedAsset.id,
                  name: relatedAsset.name || `Asset ${relatedAsset.id}`,
                  asset_type_id: relatedAsset.asset_type_id,
                  managed_by: relatedAsset.managed_by || relatedAsset.agent_id || relatedAsset.user_id,
                  relationship_type: relationship.relationship_type || 'Related',
                  source_asset: directAsset.name,
                  ...relatedAsset // Include all other asset properties
                });
                
                console.log(`✅ Added related asset: ${relatedAsset.name} (${relationship.relationship_type || 'Related'})`);
              }
            }
          }
        } else {
          console.log(`ℹ️ No relationships found for asset ${directAsset.name}`);
        }
        
      } catch (error) {
        console.error(`❌ Error fetching relationships for asset ${directAsset.name}:`, error);
        
        // If the API call fails, we could fall back to the search method as a backup
        console.log(`🔄 Attempting fallback search for ${directAsset.name}...`);
        try {
          if (window.CacheManager && window.CacheManager.searchAssets) {
            const baseName = directAsset.name.split(' ')[0];
            if (baseName.length >= 3) {
              const searchResults = await window.CacheManager.searchAssets(baseName, 'name');
              const filtered = searchResults.filter(asset => 
                asset.id !== directAsset.id && 
                !this.state.directAssets.some(da => da.id === asset.id) &&
                !processedAssetIds.has(asset.id)
              );
              
              filtered.forEach(asset => {
                processedAssetIds.add(asset.id);
                relatedAssets.push({
                  ...asset,
                  relationship_type: 'Similar Name',
                  source_asset: directAsset.name
                });
              });
              
              console.log(`🔄 Fallback search found ${filtered.length} potential related assets`);
            }
          }
        } catch (fallbackError) {
          console.warn(`⚠️ Fallback search also failed for ${directAsset.name}:`, fallbackError);
        }
      }
    }

    this.state.relatedAssets = relatedAssets;
    console.log(`✅ Found ${this.state.relatedAssets.length} total related assets`);
    
    // Log summary of relationship types
    const relationshipTypes = {};
    relatedAssets.forEach(asset => {
      const type = asset.relationship_type || 'Unknown';
      relationshipTypes[type] = (relationshipTypes[type] || 0) + 1;
    });
    
    if (Object.keys(relationshipTypes).length > 0) {
      console.log(`📊 Relationship types found:`, relationshipTypes);
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
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
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