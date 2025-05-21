/**
 * Change Request App
 * Full page application for managing change requests in Freshservice
 */

let changeRequestData = {
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
  DRAFT_ID: 'change_request_draft_id'
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

document.onreadystatechange = function() {
  if (document.readyState === 'interactive') initializeApp();
};

function initializeApp() {
  const onInit = app.initialized();
  
  onInit
    .then(function getClient(_client) {
      window.client = _client;
      setupEventListeners();
      setupChangeTypeTooltips();
      loadSavedData(); // Load data from storage if available
    })
    .catch(handleErr);
}

/**
 * Load saved change request data from the data storage
 */
async function loadSavedData() {
  try {
    const data = await client.db.get(STORAGE_KEYS.CHANGE_DATA);
    if (data) {
      // Update the global data object with saved values
      Object.keys(data).forEach(key => {
        changeRequestData[key] = data[key];
      });
      
      // Update the UI with saved data
      populateFormFields();
      showNotification('info', 'Draft change request data loaded');
    }
  } catch (error) {
    // No saved data or error, just continue with empty form
    console.log('No saved change request data found');
  }
}

/**
 * Save current change request data to the data storage
 */
async function saveCurrentData() {
  try {
    await client.db.set(STORAGE_KEYS.CHANGE_DATA, changeRequestData);
    showNotification('success', 'Change request draft saved');
  } catch (error) {
    handleErr(error);
    showNotification('error', 'Failed to save draft');
  }
}

/**
 * Clear saved data from storage
 */
async function clearSavedData() {
  try {
    await client.db.delete(STORAGE_KEYS.CHANGE_DATA);
    console.log('Saved data cleared');
  } catch (error) {
    console.error('Error clearing saved data', error);
  }
}

/**
 * Populate form fields with data from storage
 */
function populateFormFields() {
  // Populate requester if exists
  if (changeRequestData.requester) {
    const selectedContainer = document.getElementById('selected-requester');
    selectedContainer.textContent = `${changeRequestData.requester.first_name} ${changeRequestData.requester.last_name} (${changeRequestData.requester.email})`;
    selectedContainer.style.display = 'block';
  }
  
  // Populate agent if exists
  if (changeRequestData.agent) {
    const selectedContainer = document.getElementById('selected-agent');
    selectedContainer.textContent = `${changeRequestData.agent.first_name} ${changeRequestData.agent.last_name} (${changeRequestData.agent.email})`;
    selectedContainer.style.display = 'block';
  }
  
  // Populate Change Type
  const changeTypeSelect = document.getElementById('change-type');
  if (changeRequestData.changeType) {
    changeTypeSelect.value = changeRequestData.changeType;
  }
  document.getElementById('lead-time').textContent = changeRequestData.leadTime;
  
  // Populate dates
  if (changeRequestData.plannedStart) {
    document.getElementById('planned-start').value = changeRequestData.plannedStart;
  }
  
  if (changeRequestData.plannedEnd) {
    document.getElementById('planned-end').value = changeRequestData.plannedEnd;
  }
  
  // Populate text areas
  document.getElementById('implementation-plan').value = changeRequestData.implementationPlan || '';
  document.getElementById('backout-plan').value = changeRequestData.backoutPlan || '';
  document.getElementById('validation-plan').value = changeRequestData.validationPlan || '';
  
  // Populate risk assessment
  const riskAssessment = changeRequestData.riskAssessment;
  if (riskAssessment) {
    // Set radio buttons based on saved risk data
    if (riskAssessment.businessImpact > 0) {
      document.querySelector(`input[name="business-impact"][value="${riskAssessment.businessImpact}"]`).checked = true;
    }
    
    if (riskAssessment.affectedUsers > 0) {
      document.querySelector(`input[name="affected-users"][value="${riskAssessment.affectedUsers}"]`).checked = true;
    }
    
    if (riskAssessment.complexity > 0) {
      document.querySelector(`input[name="complexity"][value="${riskAssessment.complexity}"]`).checked = true;
    }
    
    if (riskAssessment.testing > 0) {
      document.querySelector(`input[name="testing"][value="${riskAssessment.testing}"]`).checked = true;
    }
    
    if (riskAssessment.rollback > 0) {
      document.querySelector(`input[name="rollback"][value="${riskAssessment.rollback}"]`).checked = true;
    }
    
    // Show risk results if they exist
    if (riskAssessment.totalScore > 0) {
      document.getElementById('risk-score-value').textContent = riskAssessment.totalScore;
      document.getElementById('risk-level-value').textContent = riskAssessment.riskLevel;
      
      let riskExplanation = '';
      if (riskAssessment.riskLevel === 'Low') {
        riskExplanation = 'This change poses minimal risk to business operations and is likely to be implemented successfully.';
      } else if (riskAssessment.riskLevel === 'Medium') {
        riskExplanation = 'This change poses moderate risk to business operations. Consider additional testing or verification steps.';
      } else {
        riskExplanation = 'This change poses significant risk to business operations. A detailed review is recommended before proceeding.';
      }
      
      document.getElementById('risk-explanation').textContent = riskExplanation;
      document.getElementById('risk-result').classList.remove('hidden');
    }
  }
  
  // Populate selected assets
  if (changeRequestData.selectedAssets && changeRequestData.selectedAssets.length > 0) {
    renderSelectedAssets();
  }
}

function setupEventListeners() {
  // Tab navigation
  const tabItems = document.querySelectorAll('.tab-item');
  tabItems.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

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
  // Hide all tab contents
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Deactivate all tabs
  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Activate the selected tab
  document.getElementById(tabId).classList.add('active');
  document.querySelector(`.tab-item[data-tab="${tabId}"]`).classList.add('active');
  
  // Save current tab in storage
  saveCurrentData();
}

function searchRequesters(e) {
  const searchTerm = e.target.value.trim();
  if (searchTerm.length < 2) return;

  client.request.invokeTemplate("getRequesters", {
    context: {
      requester_query: searchTerm
    }
  })
    .then(function(data) {
      const requesters = JSON.parse(data.response).requesters;
      displaySearchResults('requester-results', requesters, selectRequester);
    })
    .catch(handleErr);
}

function searchAgents(e) {
  const searchTerm = e.target.value.trim();
  if (searchTerm.length < 2) return;

  client.request.invokeTemplate("getAgents", {
    context: {
      agent_query: searchTerm
    }
  })
    .then(function(data) {
      const agents = JSON.parse(data.response).agents;
      displaySearchResults('agent-results', agents, selectAgent);
    })
    .catch(handleErr);
}

function displaySearchResults(containerId, results, selectionCallback) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  container.style.display = results.length ? 'block' : 'none';
  
  results.forEach(result => {
    const resultItem = document.createElement('div');
    resultItem.className = 'search-result-item';
    resultItem.textContent = `${result.first_name} ${result.last_name} (${result.email})`;
    resultItem.addEventListener('click', () => selectionCallback(result));
    container.appendChild(resultItem);
  });
}

function selectRequester(requester) {
  changeRequestData.requester = requester;
  const selectedContainer = document.getElementById('selected-requester');
  selectedContainer.textContent = `${requester.first_name} ${requester.last_name} (${requester.email})`;
  selectedContainer.style.display = 'block';
  
  document.getElementById('requester-results').style.display = 'none';
  document.getElementById('requester-search').value = '';
  
  // Save to data storage
  saveCurrentData();
}

function selectAgent(agent) {
  changeRequestData.agent = agent;
  const selectedContainer = document.getElementById('selected-agent');
  selectedContainer.textContent = `${agent.first_name} ${agent.last_name} (${agent.email})`;
  selectedContainer.style.display = 'block';
  
  document.getElementById('agent-results').style.display = 'none';
  document.getElementById('agent-search').value = '';
  
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
  
  // Proceed to the next tab
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
  
  // Determine risk level
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
  document.getElementById('risk-level-value').textContent = riskLevel;
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
  
  switchTab('impacted-assets');
}

function searchAssets(e) {
  const searchTerm = e.target.value.trim();
  if (searchTerm.length < 2) return;

  // Search for assets and services
  Promise.all([
    client.request.invokeTemplate("getAssets", {
      context: {
        asset_query: searchTerm
      }
    }),
    client.request.invokeTemplate("getServices", {
      context: {
        service_query: searchTerm
      }
    })
  ])
    .then(function([assetsResponse, servicesResponse]) {
      const assets = JSON.parse(assetsResponse.response).assets || [];
      const services = JSON.parse(servicesResponse.response).services || [];
      
      // Combine both results
      const combinedResults = [
        ...assets.map(item => ({ ...item, type: 'asset' })),
        ...services.map(item => ({ ...item, type: 'service' }))
      ];
      
      displayAssetResults('asset-results', combinedResults, selectAsset);
    })
    .catch(handleErr);
}

function displayAssetResults(containerId, results, selectionCallback) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  container.style.display = results.length ? 'block' : 'none';
  
  results.forEach(result => {
    const resultItem = document.createElement('div');
    resultItem.className = 'search-result-item';
    resultItem.textContent = `${result.name} (${result.type})`;
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
  const container = document.getElementById('selected-assets');
  container.innerHTML = '';
  
  if (changeRequestData.selectedAssets.length === 0) {
    container.innerHTML = '<div class="empty-message">No assets selected</div>';
    return;
  }
  
  changeRequestData.selectedAssets.forEach((asset, index) => {
    const assetItem = document.createElement('div');
    assetItem.className = 'asset-item';
    assetItem.innerHTML = `
      <span>${asset.name} (${asset.type})</span>
      <span class="remove-asset" data-index="${index}">✕</span>
    `;
    container.appendChild(assetItem);
  });
  
  // Add event listeners to remove buttons
  document.querySelectorAll('.remove-asset').forEach(button => {
    button.addEventListener('click', function() {
      const index = parseInt(this.dataset.index);
      changeRequestData.selectedAssets.splice(index, 1);
      renderSelectedAssets();
      saveCurrentData();
    });
  });
}

function showSummary() {
  if (changeRequestData.selectedAssets.length === 0) {
    showNotification('error', 'Please select at least one impacted asset');
    return;
  }
  
  const summaryContent = document.getElementById('summary-content');
  
  // Generate summary HTML
  summaryContent.innerHTML = `
    <div class="summary-section">
      <h4>Change Details</h4>
      <p><strong>Requester:</strong> ${changeRequestData.requester.first_name} ${changeRequestData.requester.last_name}</p>
      <p><strong>Agent (Technical SME):</strong> ${changeRequestData.agent.first_name} ${changeRequestData.agent.last_name}</p>
      <p><strong>Change Type:</strong> ${changeRequestData.changeType}</p>
      <p><strong>Lead Time:</strong> ${changeRequestData.leadTime}</p>
      <p><strong>Planned Start:</strong> ${formatDateTime(changeRequestData.plannedStart)}</p>
      <p><strong>Planned End:</strong> ${formatDateTime(changeRequestData.plannedEnd)}</p>
      
      <h5>Implementation Plan</h5>
      <p>${changeRequestData.implementationPlan || 'Not provided'}</p>
      
      <h5>Backout (Recovery) Plan</h5>
      <p>${changeRequestData.backoutPlan || 'Not provided'}</p>
      
      <h5>Validation Plan</h5>
      <p>${changeRequestData.validationPlan || 'Not provided'}</p>
    </div>
    
    <div class="summary-section">
      <h4>Risk Assessment</h4>
      <p><strong>Risk Score:</strong> ${changeRequestData.riskAssessment.totalScore}</p>
      <p><strong>Risk Level:</strong> ${changeRequestData.riskAssessment.riskLevel}</p>
    </div>
    
    <div class="summary-section">
      <h4>Impacted Assets (${changeRequestData.selectedAssets.length})</h4>
      <ul>
        ${changeRequestData.selectedAssets.map(asset => `<li>${asset.name} (${asset.type})</li>`).join('')}
      </ul>
    </div>
  `;
  
  // Show the confirmation modal
  document.getElementById('confirmation-modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('confirmation-modal').classList.add('hidden');
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
  let timeoutId;
  return function(...args) {
    const context = this;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(context, args);
    }, delay);
  };
}

// Helper function for showing notifications
function showNotification(type, message) {
  client.interface.trigger('showNotify', { 
    type: type === 'error' ? 'danger' : type,
    message: message
  });
}

function handleErr(err = 'None') {
  console.error(`Error occurred. Details:`, err);
  showNotification('error', 'An error occurred. Please try again.');
}
