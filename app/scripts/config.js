/**
 * Configuration page JavaScript
 * This script handles loading and displaying configuration parameters
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize Freshworks app
  app.initialized()
    .then(function(client) {
      window.client = client;
      client.instance.resize({ height: "500px" });
      
      // Load configuration parameters
      loadConfigParameters();
    })
    .catch(function(error) {
      console.error('Error during app initialization:', error);
      showError('Failed to initialize app. Please refresh the page.');
    });
});

/**
 * Load and display configuration parameters
 */
function loadConfigParameters() {
  if (!window.client || !window.client.iparams) {
    showError('Client API not available');
    return;
  }
  
  window.client.iparams.get()
    .then(function(params) {
      // Create table with parameter values
      const paramsList = document.getElementById('params-list');
      if (!paramsList) return;
      
      // Clear existing content
      paramsList.innerHTML = '';
      
      // Add headers
      const headerRow = document.createElement('tr');
      headerRow.innerHTML = '<th>Parameter</th><th>Value</th><th>Description</th>';
      paramsList.appendChild(headerRow);
      
      // Add parameters
      const paramMap = {
        'freshservice_plan': {
          name: 'Freshservice Plan',
          description: 'API rate limits configuration based on plan level'
        },
        'api_safety_margin': {
          name: 'API Safety Margin',
          description: 'Percentage of API rate limit to use (0.1-1.0)'
        },
        'inventory_type_id': {
          name: 'Inventory Software/Services Type ID',
          description: 'Asset Type ID for filtering inventory assets'
        },
        'search_cache_timeout': {
          name: 'Search Cache Timeout',
          description: 'Time (ms) before refreshing cached search results'
        }
      };
      
      // Add each parameter to the table
      Object.keys(paramMap).forEach(function(key) {
        const value = params[key];
        
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${paramMap[key].name}</td>
          <td>${value || 'Not set'}</td>
          <td>${paramMap[key].description}</td>
        `;
        
        paramsList.appendChild(row);
      });
      
      // Show the table
      document.getElementById('params-container').style.display = 'block';
      document.getElementById('loading-message').style.display = 'none';
    })
    .catch(function(error) {
      console.error('Error loading parameters:', error);
      showError('Failed to load configuration parameters');
    });
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
  const errorContainer = document.getElementById('error-message');
  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
  }
  
  document.getElementById('loading-message').style.display = 'none';
} 