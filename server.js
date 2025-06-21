/**
 * Freshworks FDK Serverless Functions for Change Request App
 * Handles user search functionality with proper server-side filtering
 */

const https = require('https');
const querystring = require('querystring');

/**
 * Main search function that searches both requesters and agents
 * @param {Object} options - Search parameters including iparams
 * @param {string} options.searchTerm - The search term
 * @param {number} options.maxPages - Maximum pages to search (default: 10)
 * @param {Object} options.iparams - Installation parameters (automatically added by FDK)
 */
async function searchUsers(options) {
  try {
    const { searchTerm, maxPages = 10, iparams } = options;
    
    // Store iparams globally for makeAPIRequest to access
    global.iparams = iparams;
    
    if (!searchTerm || searchTerm.trim().length === 0) {
      renderData(null, { 
        requesters: [], 
        agents: [], 
        total: 0,
        message: 'Empty search term' 
      });
      return;
    }

    console.log('🔍 Server-side search for:', searchTerm);

    // Search both requesters and agents in parallel
    const [requestersResult, agentsResult] = await Promise.all([
      searchRequestersServerSide(searchTerm, maxPages),
      searchAgentsServerSide(searchTerm, maxPages)
    ]);

    // Combine and deduplicate results
    const combinedResults = combineAndDeduplicateUsers(requestersResult, agentsResult);

    renderData(null, {
      requesters: requestersResult,
      agents: agentsResult,
      combined: combinedResults,
      total: combinedResults.length,
      searchTerm: searchTerm
    });

  } catch (error) {
    console.error('❌ Search users error:', error);
    renderData({
      status: 500,
      message: `Search failed: ${error.message}`
    });
  }
}

/**
 * Search requesters with server-side filtering
 */
async function searchRequestersServerSide(searchTerm, maxPages = 10) {
  const allRequesters = [];
  
  for (let page = 1; page <= maxPages; page++) {
    try {
      const requesters = await makeAPIRequest('/api/v2/requesters', {
        page: page,
        per_page: 30,
        query: `"~[first_name|last_name]:'${searchTerm}'"`
      });

      if (!requesters || requesters.length === 0) {
        console.log(`📄 No more requesters found on page ${page}`);
        break;
      }

      // Filter results manually as backup
      const filteredRequesters = requesters.filter(requester => {
        const firstName = (requester.first_name || '').toLowerCase();
        const lastName = (requester.last_name || '').toLowerCase();
        const email = (requester.primary_email || '').toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        
        return firstName.includes(searchLower) || 
               lastName.includes(searchLower) || 
               email.includes(searchLower);
      });

      allRequesters.push(...filteredRequesters);

      // If we got less than 30 results, we've reached the end
      if (requesters.length < 30) {
        console.log(`📄 Reached end of requesters on page ${page}`);
        break;
      }

    } catch (error) {
      console.error(`❌ Error fetching requesters page ${page}:`, error);
      break;
    }
  }

  console.log(`✅ Found ${allRequesters.length} requesters matching "${searchTerm}"`);
  return allRequesters;
}

/**
 * Search agents with server-side filtering
 */
async function searchAgentsServerSide(searchTerm, maxPages = 10) {
  const allAgents = [];
  
  for (let page = 1; page <= maxPages; page++) {
    try {
      const agents = await makeAPIRequest('/api/v2/agents', {
        page: page,
        per_page: 30,
        query: `"~[first_name|last_name]:'${searchTerm}'"`
      });

      if (!agents || agents.length === 0) {
        console.log(`📄 No more agents found on page ${page}`);
        break;
      }

      // Filter results manually as backup
      const filteredAgents = agents.filter(agent => {
        const firstName = (agent.first_name || '').toLowerCase();
        const lastName = (agent.last_name || '').toLowerCase();
        const email = (agent.email || '').toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        
        return firstName.includes(searchLower) || 
               lastName.includes(searchLower) || 
               email.includes(searchLower);
      });

      // Mark agents with _isAgent flag
      filteredAgents.forEach(agent => {
        agent._isAgent = true;
      });

      allAgents.push(...filteredAgents);

      // If we got less than 30 results, we've reached the end
      if (agents.length < 30) {
        console.log(`📄 Reached end of agents on page ${page}`);
        break;
      }

    } catch (error) {
      console.error(`❌ Error fetching agents page ${page}:`, error);
      break;
    }
  }

  console.log(`✅ Found ${allAgents.length} agents matching "${searchTerm}"`);
  return allAgents;
}

/**
 * Make HTTP request to Freshservice API
 */
function makeAPIRequest(path, queryParams = {}) {
  return new Promise((resolve, reject) => {
    // In FDK serverless environment, iparams are passed in the payload
    const domain = global.iparams?.freshservice_domain;
    const apiKey = global.iparams?.api_key;
    
    if (!domain || !apiKey) {
      console.error('Missing domain or API key in iparams:', { domain: !!domain, apiKey: !!apiKey });
      reject(new Error('Missing domain or API key in installation parameters'));
      return;
    }

    const queryString = querystring.stringify(queryParams);
    const fullPath = `${path}?${queryString}`;
    
    const options = {
      hostname: domain,
      port: 443,
      path: fullPath,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(apiKey + ':X').toString('base64')}`
      }
    };

    console.log(`🌐 API Request: https://${domain}${fullPath}`);

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const parsed = JSON.parse(data);
            
            // Extract the array from the response
            if (path.includes('/requesters')) {
              resolve(parsed.requesters || []);
            } else if (path.includes('/agents')) {
              resolve(parsed.agents || []);
            } else {
              resolve(parsed);
            }
          } else {
            console.error(`❌ API Error ${res.statusCode}:`, data);
            reject(new Error(`API request failed with status ${res.statusCode}`));
          }
        } catch (error) {
          console.error('❌ JSON Parse Error:', error);
          reject(new Error('Failed to parse API response'));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request Error:', error);
      reject(error);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Combine and deduplicate users from requesters and agents
 */
function combineAndDeduplicateUsers(requesters, agents) {
  const combined = [];
  const emailSet = new Set();

  // Add requesters first
  requesters.forEach(requester => {
    const email = requester.primary_email || requester.email;
    if (email && !emailSet.has(email.toLowerCase())) {
      emailSet.add(email.toLowerCase());
      combined.push({
        ...requester,
        _isAgent: false,
        _displayEmail: email
      });
    }
  });

  // Add agents, avoiding duplicates
  agents.forEach(agent => {
    const email = agent.email || agent.primary_email;
    if (email && !emailSet.has(email.toLowerCase())) {
      emailSet.add(email.toLowerCase());
      combined.push({
        ...agent,
        _isAgent: true,
        _displayEmail: email
      });
    }
  });

  return combined;
}

/**
 * Individual search functions for backward compatibility
 */
async function searchRequesters(options) {
  try {
    const { searchTerm, maxPages = 10, iparams } = options;
    
    // Store iparams globally for makeAPIRequest to access
    global.iparams = iparams;
    
    const requesters = await searchRequestersServerSide(searchTerm, maxPages);
    renderData(null, { requesters, total: requesters.length });
  } catch (error) {
    renderData({ status: 500, message: error.message });
  }
}

async function searchAgents(options) {
  try {
    const { searchTerm, maxPages = 10, iparams } = options;
    
    // Store iparams globally for makeAPIRequest to access
    global.iparams = iparams;
    
    const agents = await searchAgentsServerSide(searchTerm, maxPages);
    renderData(null, { agents, total: agents.length });
  } catch (error) {
    renderData({ status: 500, message: error.message });
  }
}

// Export the functions
exports = {
  searchUsers,
  searchRequesters,
  searchAgents
}; 