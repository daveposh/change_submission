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
  SETTINGS_CACHE: 'settings_cache'
};

// Cache timeout in milliseconds (24 hours)
const CACHE_TIMEOUT = 24 * 60 * 60 * 1000;

// Default settings
const DEFAULT_SETTINGS = {
  freshservicePlan: 'enterprise', // 'starter', 'growth', 'pro', 'enterprise'
  rateLimits: {
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
  },
  // API usage percentage to use (safe margin to avoid hitting limits)
  apiSafetyMargin: 0.7,
  // Last settings update timestamp
  lastUpdated: Date.now()
};

const changeTypeTooltips = {
  'standard': 'Standard Changes: All changes to critical assets > automate predefined/repeatable changes as much as possible',
  'non-production': 'Non-Production Changes: used for non-prod designated assets, such as a dev server for ceifx, or amptest',
  'emergency': 'Emergency Changes: Changes arise from an unexpected error/issue and need to be addressed immediately to restore service for customers or employees, or to secure a system against a threat',
  'non-standard': 'Non-standard change: any change that requires an exception to the policy'
};

const leadTimeText = {
  'standard': '2 business days',
  'non-production': 'No lead time required, based on availability',
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
        // Use raw request instead of invokeTemplate to access locations API
        const response = await window.client.request.get(`/api/v2/locations?page=${pageNum}&per_page=100`);
        
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
        // Use direct API call instead of template
        const response = await window.client.request.get(`/api/v2/agents?page=${pageNum}&per_page=100`);
        
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
      // Use direct GET request since the template isn't available
      const response = await window.client.request.get(`/api/v2/agents/${userId}`);
      
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
  
  try {
    // Make sure window is defined
    if (typeof window === 'undefined') {
      console.error('Window object is not available');
      return;
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
            setupSettingsUI(); // Set up settings UI
            
            // Fetch and cache all locations and most frequently used users
            Promise.all([
              fetchAllLocations().catch(err => {
                console.error("Error in fetchAllLocations:", err);
              }),
              fetchUsers().catch(err => {
                console.error("Error in fetchUsers:", err);
              })
            ]);
            
            // Only attempt to load data after setup is complete
            setTimeout(() => {
              try {
                console.log('Loading saved data...');
                // Check for client before trying to load saved data
                if (!window.client) {
                  console.error('Client not available for loading data');
                  return;
                }
                
                loadSavedData().catch(err => {
                  console.error("Error in loadSavedData promise:", err);
                });
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
 */
async function loadSavedData() {
  console.log('Attempting to load saved data...');
  
  // First check if client is properly initialized
  if (!window.client || !window.client.db || typeof window.client.db.get !== 'function') {
    console.error('Client DB API not available for loading data');
    return;
  }
  
  try {
    // Try to get data with proper error handling
    console.log('Requesting data from storage...');
    const result = await window.client.db.get(STORAGE_KEYS.CHANGE_DATA);
    
    // Check if we have valid data
    if (result && typeof result === 'object') {
      console.log('Data retrieved successfully');
      
      // Update the global data object with saved values
      Object.keys(result).forEach(key => {
        changeRequestData[key] = result[key];
      });
      
      // Update the UI with saved data
      try {
        console.log('Populating form fields with saved data');
        populateFormFields();
        
        // Only show notification after successfully populating the form
        setTimeout(() => {
          showNotification('info', 'Draft change request data loaded');
        }, 500);
        
        return true; // Indicate success
      } catch (formError) {
        console.error('Error populating form with saved data:', formError);
      }
    } else {
      console.log('No saved data found in storage');
      return false;
    }
  } catch (error) {
    // Handle storage error but don't break the app
    console.log('Error accessing saved data:', error);
    // Don't show error notification as this is a normal condition for first-time users
    return false;
  }
}

/**
 * Save current change request data to the data storage
 */
async function saveCurrentData() {
  // Check if client DB is available before attempting to save
  if (!window.client || !window.client.db || typeof window.client.db.set !== 'function') {
    console.error('Client DB API not available for saving data');
    return false;
  }
  
  try {
    console.log('Saving current form data...');
    await window.client.db.set(STORAGE_KEYS.CHANGE_DATA, changeRequestData);
    console.log('Form data saved successfully');
    
    // Only show notification 20% of the time to avoid too many notifications
    if (Math.random() < 0.2) {
      setTimeout(() => {
        try {
          showNotification('success', 'Change request draft saved');
        } catch (notifyErr) {
          console.warn('Could not show save notification:', notifyErr);
        }
      }, 300);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to save draft:', error);
    // Don't show error notification every time to avoid flooding user
    if (Math.random() < 0.3) {
      try {
        showNotification('error', 'Failed to save draft');
      } catch (notifyErr) {
        console.warn('Could not show error notification:', notifyErr);
      }
    }
    return false;
  }
}

/**
 * Clear saved data from storage
 */
async function clearSavedData() {
  try {
    await window.client.db.delete(STORAGE_KEYS.CHANGE_DATA);
    console.log('Saved data cleared');
  } catch (error) {
    console.error('Error clearing saved data', error);
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
  document.getElementById('submit-change').addEventListener('click', showSummary);

  // Confirmation Modal
  document.getElementById('edit-request').addEventListener('click', closeModal);
  document.getElementById('confirm-submit').addEventListener('click', submitChangeRequest);
  
  // Settings toggle (if exists)
  const settingsToggle = document.getElementById('settings-toggle');
  if (settingsToggle) {
    settingsToggle.addEventListener('click', toggleSettingsPanel);
  }
  
  // Settings save button (if exists)
  const saveSettingsBtn = document.getElementById('save-settings');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', updateSettings);
  }
  
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
    assetSearch.placeholder = 'Search for assets or services...';
    assetSearch.classList.add('form-control');
  }
  
  // Add icon labels next to inputs using existing markup
  // This avoids complex DOM manipulation that might cause FDK issues
  addIconLabel('requester-search-label', 'fas fa-user', 'Requester');
  addIconLabel('agent-search-label', 'fas fa-user-tie', 'Agent');
  addIconLabel('asset-search-label', 'fas fa-desktop', 'Assets/Services');
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
  
  // Show tooltip for the default selected change type
  updateTooltipContent(changeTypeSelect.value);
  
  // Show tooltip on hover or focus
  changeTypeSelect.addEventListener('mouseenter', function() {
    changeTypeTooltip.style.display = 'block';
  });
  
  changeTypeSelect.addEventListener('mouseleave', function() {
    if (!changeTypeSelect.matches(':focus')) {
      changeTypeTooltip.style.display = 'none';
    }
  });
  
  changeTypeSelect.addEventListener('focus', function() {
    changeTypeTooltip.style.display = 'block';
  });
  
  changeTypeSelect.addEventListener('blur', function() {
    changeTypeTooltip.style.display = 'none';
  });
  
  function updateTooltipContent(changeType) {
    changeTypeTooltip.textContent = changeTypeTooltips[changeType] || '';
    changeTypeTooltip.style.display = 'block';
  }
  
  // Update tooltip when change type changes
  changeTypeSelect.addEventListener('change', function() {
    updateTooltipContent(this.value);
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
 * Search for requesters using Freshservice API
 */
function searchRequesters(e) {
  const searchTerm = e.target.value.trim();
  if (searchTerm.length < 2) return;

  // Ensure client is available
  if (!window.client || !window.client.request) {
    console.error('Client or request object not available for requester search');
    handleErr('API client not initialized. Please refresh the page.');
    return;
  }

  // Try a simpler approach - direct search by name
  // Format 1: Try direct contains search
  const encodedQuery = encodeURIComponent(`"${searchTerm}"`);
  console.log('Requester search with query:', encodedQuery);
  
  // Show loading indicator
  const resultsContainer = document.getElementById('requester-results');
  resultsContainer.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm" role="status"></div> Loading...</div>';
  resultsContainer.style.display = 'block';
  
  // Function to load results from a specific page
  function loadPage(page = 1, allResults = []) {
    // Use invokeTemplate with path suffix to add query parameter
    const requestUrl = `?query=${encodedQuery}&page=${page}&per_page=30`;
    console.log('Requester API URL:', requestUrl);
    
    window.client.request.invokeTemplate("getRequesters", {
      path_suffix: requestUrl
    })
    .then(function(data) {
      try {
        if (!data) {
          console.error('No data returned from requester search');
          displaySearchResults('requester-results', allResults, selectRequester);
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
          loadPage(page + 1, combinedResults);
        } else {
          // Display all results
          displaySearchResults('requester-results', combinedResults, selectRequester);
        }
      } catch (error) {
        console.error('Error parsing response:', error);
        displaySearchResults('requester-results', allResults, selectRequester);
      }
    })
    .catch(function(error) {
      console.error('API request failed:', error);
      displaySearchResults('requester-results', allResults, selectRequester);
      handleErr(error);
    });
  }
  
  // Start loading from page 1
  loadPage(1, []);
}

/**
 * Search for agents using Freshservice API
 */
function searchAgents(e) {
  const searchTerm = e.target.value.trim();
  if (searchTerm.length < 2) return;

  // Ensure client is available
  if (!window.client || !window.client.request) {
    console.error('Client or request object not available for agent search');
    handleErr('API client not initialized. Please refresh the page.');
    return;
  }

  // Try a simpler approach - direct search by name
  const encodedQuery = encodeURIComponent(`"${searchTerm}"`);
  console.log('Agent search with query:', encodedQuery);
  
  // Show loading indicator
  const resultsContainer = document.getElementById('agent-results');
  resultsContainer.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm" role="status"></div> Loading...</div>';
  resultsContainer.style.display = 'block';
  
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
        
        // Combine with previous results
        const combinedResults = [...allResults, ...filteredAgents];
        
        // If we got a full page of results, there might be more
        if (agents.length === 30 && page < 3) { // Limit to 3 pages (90 results) max
          // Load next page
          loadPage(page + 1, combinedResults);
        } else {
          // Display all results
          displaySearchResults('agent-results', combinedResults, selectAgent);
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
    const response = await window.client.request.get(`/api/v2/locations/${locationId}`);
    
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
      
      // Role/type badge
      const roleDiv = document.createElement('div');
      const type = containerId.includes('agent') ? 'Agent' : 'Requester';
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
 */
function searchAssets(e) {
  const searchTerm = e.target.value.trim();
  if (searchTerm.length < 2) return;

  // Ensure client is available
  if (!window.client || !window.client.request) {
    console.error('Client or request object not available for asset search');
    handleErr('API client not initialized. Please refresh the page.');
    return;
  }

  // Correctly encode the entire query string including quotes for Freshservice API
  const assetQueryStr = `~[name|display_name]:'${searchTerm}'`;
  const serviceQueryStr = `~[name|display_name]:'${searchTerm}'`;
  const encodedAssetQuery = encodeURIComponent(`"${assetQueryStr}"`);
  const encodedServiceQuery = encodeURIComponent(`"${serviceQueryStr}"`);
  
  // Show loading indicator
  const resultsContainer = document.getElementById('asset-results');
  resultsContainer.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm" role="status"></div> Loading...</div>';
  resultsContainer.style.display = 'block';
  
  // Arrays to store all results from pagination
  let allAssets = [];
  let allServices = [];
  
  // Function to load assets from a specific page
  function loadAssetsPage(page = 1) {
    return window.client.request.invokeTemplate("getAssets", {
      path_suffix: `?query=${encodedAssetQuery}&page=${page}&per_page=30`
    })
    .then(function(data) {
      if (!data || !data.response) {
        return { assets: [] };
      }
      
      try {
        const response = JSON.parse(data.response);
        const assets = response && response.assets ? response.assets : [];
        
        // Combine with previous results
        allAssets = [...allAssets, ...assets];
        
        // If we got a full page of results, there might be more
        if (assets.length === 30 && page < 2) { // Limit to 2 pages (60 results) max
          // Load next page
          return loadAssetsPage(page + 1);
        }
        
        return { assets: allAssets };
      } catch (error) {
        console.error('Error parsing assets response:', error);
        return { assets: allAssets };
      }
    })
    .catch(error => {
      console.error('Asset search failed:', error);
      return { assets: allAssets };
    });
  }
  
  // Function to load services from a specific page
  function loadServicesPage(page = 1) {
    return window.client.request.invokeTemplate("getServices", {
      path_suffix: `?query=${encodedServiceQuery}&page=${page}&per_page=30`
    })
    .then(function(data) {
      if (!data || !data.response) {
        return { services: [] };
      }
      
      try {
        const response = JSON.parse(data.response);
        const services = response && response.services ? response.services : [];
        
        // Combine with previous results
        allServices = [...allServices, ...services];
        
        // If we got a full page of results, there might be more
        if (services.length === 30 && page < 2) { // Limit to 2 pages (60 results) max
          // Load next page
          return loadServicesPage(page + 1);
        }
        
        return { services: allServices };
      } catch (error) {
        console.error('Error parsing services response:', error);
        return { services: allServices };
      }
    })
    .catch(error => {
      console.error('Service search failed:', error);
      return { services: allServices };
    });
  }
  
  // Start loading both assets and services from page 1
  Promise.all([
    loadAssetsPage(1),
    loadServicesPage(1)
  ])
  .then(function([assetsResponse, servicesResponse]) {
    try {
      // Get assets and services from the responses
      const assets = assetsResponse.assets || [];
      const services = servicesResponse.services || [];
      
      // Combine both results with type information
      const combinedResults = [
        ...assets.map(item => ({ ...item, type: 'asset' })),
        ...services.map(item => ({ ...item, type: 'service' }))
      ];
      
      displayAssetResults('asset-results', combinedResults, selectAsset);
    } catch (error) {
      console.error('Error processing search results:', error);
      displayAssetResults('asset-results', [], selectAsset);
    }
  })
  .catch(function(error) {
    console.error('Combined asset/service search failed:', error);
    displayAssetResults('asset-results', [], selectAsset);
    handleErr(error);
  });
}

function displayAssetResults(containerId, results, selectionCallback) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  container.style.display = results.length ? 'block' : 'none';
  
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
    
    // Name with proper styling
    const nameDiv = document.createElement('div');
    nameDiv.className = 'fw-bold';
    nameDiv.textContent = result.name || result.display_name || 'Unnamed';
    headerDiv.appendChild(nameDiv);
    
    // Type badge - different colors for asset vs service
    const typeDiv = document.createElement('div');
    const isAsset = result.type === 'asset';
    typeDiv.innerHTML = `<span class="badge ${isAsset ? 'bg-success' : 'bg-warning text-dark'}">${isAsset ? 'Asset' : 'Service'}</span>`;
    headerDiv.appendChild(typeDiv);
    
    resultItem.appendChild(headerDiv);
    
    // Additional information based on asset type
    const detailsContainer = document.createElement('div');
    detailsContainer.className = 'mt-2 d-flex flex-wrap gap-2';
    
    // Different badges for different properties
    if (result.asset_type_name) {
      const typeBadge = document.createElement('span');
      typeBadge.className = 'badge bg-light text-dark border';
      typeBadge.innerHTML = `<i class="fas fa-tag me-1"></i>${result.asset_type_name}`;
      detailsContainer.appendChild(typeBadge);
    }
    
    if (result.product_name) {
      const productBadge = document.createElement('span');
      productBadge.className = 'badge bg-light text-dark border';
      productBadge.innerHTML = `<i class="fas fa-box me-1"></i>${result.product_name}`;
      detailsContainer.appendChild(productBadge);
    }
    
    if (result.department_name) {
      const deptBadge = document.createElement('span');
      deptBadge.className = 'badge bg-light text-dark border';
      deptBadge.innerHTML = `<i class="fas fa-building me-1"></i>${result.department_name}`;
      detailsContainer.appendChild(deptBadge);
    }
    
    if (result.location_name) {
      const locBadge = document.createElement('span');
      locBadge.className = 'badge bg-light text-dark border';
      locBadge.innerHTML = `<i class="fas fa-map-marker-alt me-1"></i>${result.location_name}`;
      detailsContainer.appendChild(locBadge);
    }
    
    // Service-specific badges
    if (!isAsset && result.category_name) {
      const categoryBadge = document.createElement('span');
      categoryBadge.className = 'badge bg-light text-dark border';
      categoryBadge.innerHTML = `<i class="fas fa-folder me-1"></i>${result.category_name}`;
      detailsContainer.appendChild(categoryBadge);
    }
    
    // Status badge with appropriate color
    if (result.status) {
      const statusBadge = document.createElement('span');
      let statusClass = 'bg-secondary';
      
      if (result.status.toLowerCase().includes('active') || 
          result.status.toLowerCase().includes('in use')) {
        statusClass = 'bg-success';
      } else if (result.status.toLowerCase().includes('retired') || 
                result.status.toLowerCase().includes('end')) {
        statusClass = 'bg-danger';
      } else if (result.status.toLowerCase().includes('pending')) {
        statusClass = 'bg-warning text-dark';
      }
      
      statusBadge.className = `badge ${statusClass}`;
      statusBadge.innerHTML = `<i class="fas fa-circle me-1"></i>${result.status}`;
      detailsContainer.appendChild(statusBadge);
    }
    
    // Only add details container if we have any badges
    if (detailsContainer.children.length > 0) {
      resultItem.appendChild(detailsContainer);
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
      const assetName = asset.name || 'Unnamed Asset';
      const assetType = asset.type || 'unknown';
      const isAsset = assetType === 'asset';
      
      const assetItem = document.createElement('div');
      assetItem.className = 'asset-item mb-2 p-2 border rounded bg-light';
      
      const headerDiv = document.createElement('div');
      headerDiv.className = 'd-flex justify-content-between align-items-center';
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'fw-bold';
      nameSpan.textContent = assetName;
      
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
      
      if (asset.asset_type_name) {
        hasDetails = true;
        const badge = document.createElement('span');
        badge.className = 'badge bg-light text-dark border';
        badge.innerHTML = `<i class="fas fa-tag me-1"></i>${asset.asset_type_name}`;
        detailsContainer.appendChild(badge);
      }
      
      if (asset.product_name) {
        hasDetails = true;
        const badge = document.createElement('span');
        badge.className = 'badge bg-light text-dark border';
        badge.innerHTML = `<i class="fas fa-box me-1"></i>${asset.product_name}`;
        detailsContainer.appendChild(badge);
      }
      
      if (asset.location_name) {
        hasDetails = true;
        const badge = document.createElement('span');
        badge.className = 'badge bg-light text-dark border';
        badge.innerHTML = `<i class="fas fa-map-marker-alt me-1"></i>${asset.location_name}`;
        detailsContainer.appendChild(badge);
      }
      
      if (hasDetails) {
        assetItem.appendChild(detailsContainer);
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
    showNotification('error', 'Please select at least one impacted asset');
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
      <h5>Impacted Assets (${changeRequestData.selectedAssets.length})</h5>
      <hr>
      <ul class="list-group">
        ${changeRequestData.selectedAssets.map(asset => `<li class="list-group-item">${asset.name} <span class="badge bg-secondary">${asset.type}</span></li>`).join('')}
      </ul>
    </div>
  `;
  
  // Show the Bootstrap modal
  const modalElement = document.getElementById('confirmation-modal');
  const confirmationModal = new bootstrap.Modal(modalElement);
  confirmationModal.show();
}

function closeModal() {
  const modalElement = document.getElementById('confirmation-modal');
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
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.fallback-notification');
    existingNotifications.forEach(note => {
      if (note && note.parentNode) {
        note.parentNode.removeChild(note);
      }
    });
    
    // Create new notification element
    const notification = document.createElement('div');
    notification.className = `fallback-notification alert alert-${type === 'error' ? 'danger' : type}`;
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
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    };
    
    notification.prepend(closeBtn);
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
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
  console.error(`Error occurred. Details:`, err);
  
  // Try to extract a more specific error message if available
  try {
    if (typeof err === 'string') {
      errorMessage = err;
    } else if (err && err.message) {
      errorMessage = `Error: ${err.message}`;
    } else if (err && err.status && err.status.message) {
      errorMessage = `API Error: ${err.status.message}`;
    } else if (err && typeof err === 'object') {
      errorMessage = `Error: ${JSON.stringify(err).substring(0, 100)}...`;
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
  `;
  document.head.appendChild(style);
});

/**
 * Get current settings with fallback to defaults
 * @returns {Promise<Object>} - Current settings
 */
async function getSettings() {
  try {
    // Try to get settings from cache
    const settings = await window.client.db.get(STORAGE_KEYS.SETTINGS_CACHE);
    if (settings) {
      console.log('Retrieved settings from cache');
      return settings;
    }
    
    // If not in cache, use defaults and save them
    console.log('No settings found, using defaults');
    await saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error getting settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save settings to cache
 * @param {Object} settings - Settings to save
 * @returns {Promise<boolean>} - Success status
 */
async function saveSettings(settings) {
  try {
    // Update timestamp
    settings.lastUpdated = Date.now();
    await window.client.db.set(STORAGE_KEYS.SETTINGS_CACHE, settings);
    console.log('Settings saved to cache');
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}

/**
 * Calculate safe API request counts based on rate limits
 * @returns {Promise<Object>} - Object with calculated safe limits
 */
async function getSafeApiLimits() {
  const settings = await getSettings();
  const plan = settings.freshservicePlan.toLowerCase();
  const safetyMargin = settings.apiSafetyMargin;
  
  // Get rate limits for the current plan
  const limits = settings.rateLimits[plan] || settings.rateLimits.enterprise;
  
  // Calculate safe number of requests (applying safety margin)
  return {
    listAgentsPageLimit: Math.floor((limits.listAgents * safetyMargin) / 100), // Each page is 100 agents
    listRequestersPageLimit: Math.floor((limits.listRequesters * safetyMargin) / 100) // Each page is 100 requesters
  };
}

/**
 * Create and add settings UI components
 */
function setupSettingsUI() {
  console.log('Setting up settings UI');
  
  try {
    // Create settings toggle button
    const appContainer = document.querySelector('.app-container');
    if (!appContainer) {
      console.error('App container not found for settings UI');
      return;
    }
    
    // Add settings toggle button
    const settingsButton = document.createElement('button');
    settingsButton.id = 'settings-toggle';
    settingsButton.className = 'btn btn-sm btn-outline-secondary settings-toggle-btn';
    settingsButton.innerHTML = '<i class="fas fa-cog"></i> Settings';
    settingsButton.style.position = 'fixed';
    settingsButton.style.bottom = '20px';
    settingsButton.style.right = '20px';
    settingsButton.style.zIndex = '1000';
    appContainer.appendChild(settingsButton);
    
    // Create settings panel (initially hidden)
    const settingsPanel = document.createElement('div');
    settingsPanel.id = 'settings-panel';
    settingsPanel.className = 'card settings-panel';
    settingsPanel.style.position = 'fixed';
    settingsPanel.style.bottom = '70px';
    settingsPanel.style.right = '20px';
    settingsPanel.style.width = '300px';
    settingsPanel.style.zIndex = '1000';
    settingsPanel.style.display = 'none';
    settingsPanel.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    
    // Populate settings panel content
    settingsPanel.innerHTML = `
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">API Settings</h5>
        <button type="button" class="btn-close" aria-label="Close" id="close-settings"></button>
      </div>
      <div class="card-body">
        <form id="settings-form">
          <div class="mb-3">
            <label for="fs-plan" class="form-label">Freshservice Plan</label>
            <select class="form-select" id="fs-plan">
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <div class="form-text">Select your Freshservice plan to set appropriate rate limits</div>
          </div>
          
          <div class="mb-3">
            <label for="api-safety" class="form-label">API Safety Margin (${DEFAULT_SETTINGS.apiSafetyMargin * 100}%)</label>
            <input type="range" class="form-range" id="api-safety" min="0.1" max="0.9" step="0.1" value="${DEFAULT_SETTINGS.apiSafetyMargin}">
            <div class="form-text">Safety margin to prevent hitting API rate limits</div>
          </div>
          
          <div class="mb-3">
            <button type="button" class="btn btn-primary" id="save-settings">Save Settings</button>
          </div>
        </form>
      </div>
    `;
    
    appContainer.appendChild(settingsPanel);
    
    // Add close button listener
    const closeBtn = document.getElementById('close-settings');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        document.getElementById('settings-panel').style.display = 'none';
      });
    }
    
    // Load current settings
    loadSettingsIntoForm();
    
  } catch (error) {
    console.error('Error setting up settings UI:', error);
  }
}

/**
 * Toggle settings panel visibility
 */
function toggleSettingsPanel() {
  const panel = document.getElementById('settings-panel');
  if (panel) {
    if (panel.style.display === 'none') {
      panel.style.display = 'block';
      loadSettingsIntoForm();
    } else {
      panel.style.display = 'none';
    }
  }
}

/**
 * Load settings into the form
 */
async function loadSettingsIntoForm() {
  try {
    const settings = await getSettings();
    
    // Set plan dropdown
    const planSelect = document.getElementById('fs-plan');
    if (planSelect) {
      planSelect.value = settings.freshservicePlan;
    }
    
    // Set safety margin slider
    const safetySlider = document.getElementById('api-safety');
    if (safetySlider) {
      safetySlider.value = settings.apiSafetyMargin;
    }
    
  } catch (error) {
    console.error('Error loading settings into form:', error);
  }
}

/**
 * Update settings from form values
 */
async function updateSettings() {
  try {
    const settings = await getSettings();
    
    // Get plan from select
    const planSelect = document.getElementById('fs-plan');
    if (planSelect) {
      settings.freshservicePlan = planSelect.value;
    }
    
    // Get safety margin from slider
    const safetySlider = document.getElementById('api-safety');
    if (safetySlider) {
      settings.apiSafetyMargin = parseFloat(safetySlider.value);
    }
    
    // Save updated settings
    await saveSettings(settings);
    
    // Show success message
    showNotification('success', 'Settings updated successfully');
    
    // Hide settings panel
    const panel = document.getElementById('settings-panel');
    if (panel) {
      panel.style.display = 'none';
    }
    
  } catch (error) {
    console.error('Error updating settings:', error);
    showNotification('error', 'Failed to update settings');
  }
}
