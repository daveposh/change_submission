/**
 * Change Submission Module
 * Handles the complete workflow for submitting change requests including:
 * - Creating the change request in Freshservice
 * - Setting up approval workflows
 * - Sending email notifications to stakeholders
 * - Creating peer review tasks for assigned agents
 * Version 1.0.0
 */

const ChangeSubmission = {
  // Module state
  state: {
    isSubmitting: false,
    submissionId: null,
    approvalWorkflowId: null,
    createdTasks: [],
    sentNotifications: []
  },

  // Configuration
  config: {
    // Change request priorities
    priorities: {
      low: 1,
      medium: 2,
      high: 3,
      urgent: 4
    },
    
    // Change request statuses (Freshservice API v2 values)
    statuses: {
      open: 1,
      planning: 2,
      approval: 3,
      pending_release: 4,
      pending_review: 5,
      closed: 6
    },
    
    // Risk level mappings
    riskLevels: {
      low: 1,
      medium: 2,
      high: 3
    },
    
    // Email templates
    emailTemplates: {
      stakeholderNotification: {
        subject: 'Change Request Notification: {{change_title}}',
        body: `
          <h3>Change Request Notification</h3>
          <p>Dear {{stakeholder_name}},</p>
          <p>A new change request has been submitted that may impact systems you manage or are responsible for.</p>
          
          <h4>Change Details:</h4>
          <ul>
            <li><strong>Title:</strong> {{change_title}}</li>
            <li><strong>Requester:</strong> {{requester_name}}</li>
            <li><strong>Risk Level:</strong> {{risk_level}}</li>
            <li><strong>Planned Start:</strong> {{planned_start}}</li>
            <li><strong>Planned End:</strong> {{planned_end}}</li>
          </ul>
          
          <h4>Impacted Assets:</h4>
          <ul>{{impacted_assets_list}}</ul>
          
          <h4>Reason for Change:</h4>
          <p>{{reason_for_change}}</p>
          
          <p>Please review this change request and provide any feedback or concerns.</p>
          <p><a href="{{change_url}}">View Change Request</a></p>
          
          <p>Best regards,<br>IT Change Management</p>
        `
      },
      
      approverNotification: {
        subject: 'Change Request Approval Required: {{change_title}}',
        body: `
          <h3>Change Request Approval Required</h3>
          <p>Dear {{approver_name}},</p>
          <p>A change request requires your approval.</p>
          
          <h4>Change Details:</h4>
          <ul>
            <li><strong>Title:</strong> {{change_title}}</li>
            <li><strong>Requester:</strong> {{requester_name}}</li>
            <li><strong>Risk Level:</strong> {{risk_level}}</li>
            <li><strong>Planned Start:</strong> {{planned_start}}</li>
            <li><strong>Planned End:</strong> {{planned_end}}</li>
          </ul>
          
          <h4>Implementation Plan:</h4>
          <p>{{implementation_plan}}</p>
          
          <h4>Backout Plan:</h4>
          <p>{{backout_plan}}</p>
          
          <p><strong>Action Required:</strong> Please review and approve/reject this change request.</p>
          <p><a href="{{change_url}}">Review and Approve Change Request</a></p>
          
          <p>Best regards,<br>IT Change Management</p>
        `
      },
      
      peerReviewTask: {
        subject: 'Peer Review Required: {{change_title}}',
        description: `
          Peer Review Task for Change Request: {{change_title}}
          
          Change Details:
          - Requester: {{requester_name}}
          - Risk Level: {{risk_level}}
          - Planned Start: {{planned_start}}
          - Planned End: {{planned_end}}
          
          Implementation Plan:
          {{implementation_plan}}
          
          Validation Plan:
          {{validation_plan}}
          
          Please review the technical implementation details and provide feedback on:
          1. Technical feasibility
          2. Potential risks or issues
          3. Alternative approaches
          4. Testing recommendations
          
          Change Request Link: {{change_url}}
        `
      }
    }
  },

  /**
   * Initialize the Change Submission module
   */
  init() {
    console.log('🚀 Initializing Change Submission Module...');
    
    try {
    this.setupEventListeners();
      console.log('✅ Change Submission Module initialized successfully');
      
      // Verify module is accessible
      if (window.ChangeSubmission) {
        console.log('✅ ChangeSubmission module is accessible via window.ChangeSubmission');
      } else {
        console.error('❌ ChangeSubmission module is NOT accessible via window.ChangeSubmission');
      }
    } catch (error) {
      console.error('❌ Error initializing Change Submission Module:', error);
    }
  },

  /**
   * Setup event listeners for submission functionality
   */
  setupEventListeners() {
    console.log('🔧 Setting up Change Submission event listeners...');
    
    // Submit button - now shows summary first
    const submitBtn = document.getElementById('submit-change-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.showSubmissionSummary();
      });
      console.log('✅ Submit button listener added');
    } else {
      console.warn('⚠️ Submit button not found');
    }

    // Confirm submission button in modal
    const confirmBtn = document.getElementById('confirm-submit');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleSubmission();
      });
      console.log('✅ Confirm submit button listener added');
    } else {
      console.warn('⚠️ Confirm submit button not found - will try to add listener after modal creation');
    }

    console.log('✅ Change submission event listeners setup complete');
  },

  /**
   * Handle the complete change request submission workflow
   */
  async handleSubmission() {
    if (this.state.isSubmitting) {
      console.log('⚠️ Submission already in progress');
      return;
    }

    console.log('🚀 Starting change request submission workflow...');
    this.state.isSubmitting = true;
    this.showSubmissionStatus(true);

    try {
      // Step 1: Validate all form data
      console.log('📋 Step 1: Validating form data...');
      const validationResult = this.validateSubmissionData();
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.message}`);
      }

      // Step 2: Prepare change request data
      console.log('📦 Step 2: Preparing change request data...');
      const changeRequestData = await this.prepareChangeRequestData();

      // Step 3: Create the change request
      console.log('🎯 Step 3: Creating change request in Freshservice...');
      const changeRequest = await this.createChangeRequest(changeRequestData);
      this.state.submissionId = changeRequest.id;

      // Step 4: Create approval workflow
      console.log('✅ Step 4: Setting up approval workflow...');
      await this.createApprovalWorkflow(changeRequest);

      // Step 5: Send stakeholder notifications
      console.log('📧 Step 5: Sending stakeholder notifications...');
      await this.sendStakeholderNotifications(changeRequest);

      // Step 6: Create peer review tasks
      console.log('👥 Step 6: Creating peer review tasks...');
      await this.createPeerReviewTasks(changeRequest);

      // Step 7: Update change request with additional metadata
      console.log('🔄 Step 7: Updating change request with workflow data...');
      await this.updateChangeRequestMetadata(changeRequest);

      // Step 8: Show success and redirect
      console.log('🎉 Step 8: Submission completed successfully!');
      this.showSubmissionSuccess(changeRequest);

    } catch (error) {
      console.error('❌ Error during change request submission:', error);
      this.showSubmissionError(error);
    } finally {
      this.state.isSubmitting = false;
      this.showSubmissionStatus(false);
    }
  },

  /**
   * Validate all submission data
   */
  validateSubmissionData() {
    console.log('🔍 Validating submission data...');

    const errors = [];

    // Validate basic form fields
    if (!window.changeRequestData.changeTitle?.trim()) {
      errors.push('Change title is required');
    }

    if (!window.changeRequestData.reasonForChange?.trim()) {
      errors.push('Reason for change is required');
    }

    if (!window.changeRequestData.implementationPlan?.trim()) {
      errors.push('Implementation plan is required');
    }

    if (!window.changeRequestData.backoutPlan?.trim()) {
      errors.push('Backout plan is required');
    }

    if (!window.changeRequestData.plannedStart) {
      errors.push('Planned start date is required');
    }

    if (!window.changeRequestData.plannedEnd) {
      errors.push('Planned end date is required');
    }

    // Validate requester
    if (!window.changeRequestData.selectedRequester?.id) {
      errors.push('Requester must be selected');
    }

    // Validate assigned agent
    if (!window.changeRequestData.selectedAgent?.id) {
      errors.push('Assigned agent must be selected');
    }

    // Validate risk assessment - check for riskLevel property
    if (!window.changeRequestData.riskAssessment?.riskLevel) {
      errors.push('Risk assessment must be completed');
    }

    // Validate assets
    if (!window.changeRequestData.selectedAssets?.length) {
      errors.push('At least one asset must be associated');
    }

    // Validate impacted services
    if (window.ImpactedServices) {
      const impactedData = window.ImpactedServices.getImpactedServicesData();
      if (!impactedData.analysisComplete) {
        errors.push('Impacted services analysis must be completed');
      }
    }

    const isValid = errors.length === 0;
    return {
      isValid,
      message: errors.join(', '),
      errors
    };
  },

  /**
   * Prepare change request data for API submission
   */
  async prepareChangeRequestData() {
    console.log('📦 Preparing change request data...');

    const data = window.changeRequestData;
    const impactedData = window.ImpactedServices?.getImpactedServicesData() || {};

    // Get installation parameters for workspace configuration
    let workspaceId = null;
    let departmentId = null;
    try {
      const params = await window.client.iparams.get();
      workspaceId = params.workspace_id || 2; // Default to workspace 2 ("CXI Change Management")
      departmentId = params.department_id;
      console.log('🏢 Configuration from iparams:', { workspaceId, departmentId });
    } catch (error) {
      console.warn('⚠️ Could not retrieve installation parameters:', error);
      workspaceId = 2; // Fallback to default workspace
    }

    // Calculate priority based on risk level
    let priority = 2; // default to medium
    if (data.riskAssessment?.riskLevel === 'Low') {
      priority = 1; // Low priority
    } else if (data.riskAssessment?.riskLevel === 'High') {
      priority = 3; // High priority
    }

    // Map change type to Freshservice values (this instance supports 4=Emergency, 6=Normal Change)
    const changeTypeMapping = {
      'minor': 6,      // Normal Change
      'major': 6,      // Normal Change  
      'normal': 6,     // Normal Change
      'emergency': 4   // Emergency
    };
    const change_type = changeTypeMapping[data.changeType] || 6; // default to Normal Change (6)

    // Map risk level to Freshservice values (this instance supports 1-4: Low, Medium, High, Very High)
    const riskMapping = {
      'Low': 1,        // Low
      'Medium': 2,     // Medium
      'High': 3        // High (not using 4=Very High for now)
    };
    const risk = riskMapping[data.riskAssessment?.riskLevel] || 2; // default to medium

    // Map impact based on risk level and affected assets count
    let impact = 2; // Default to Medium impact
    const assetCount = data.selectedAssets?.length || 0;
    const riskLevel = data.riskAssessment?.riskLevel || 'Medium';
    
    // Calculate impact based on risk level and scope
    if (riskLevel === 'High' || assetCount > 5) {
      impact = 3; // High impact
    } else if (riskLevel === 'Low' && assetCount <= 2) {
      impact = 1; // Low impact
    }

    // Format dates properly for Freshservice API (ISO 8601 format)
    const formatDateForAPI = (dateString) => {
      if (!dateString) return null;
      try {
        const date = new Date(dateString);
        return date.toISOString();
      } catch (error) {
        console.warn('⚠️ Error formatting date:', dateString, error);
        return null;
      }
    };

    // Create simplified description (avoid complex HTML that might cause 500 errors)
    const description = this.createSimplifiedDescription(data, impactedData);

    // Prepare the change request data according to Freshservice API v2 format
    const changeRequestData = {
      subject: data.changeTitle,
      description: description,
      change_type: change_type,
      priority: priority,
      status: 1, // Open status
      risk: risk,
      impact: impact,
      requester_id: data.selectedRequester.id,
      agent_id: data.selectedAgent.id,
      planned_start_date: formatDateForAPI(data.plannedStart),
      planned_end_date: formatDateForAPI(data.plannedEnd),
      workspace_id: workspaceId, // Always include workspace_id (required field)
      // Include the standard planning fields that exist in this instance
      change_reason: data.reasonForChange,
      change_impact: data.implementationPlan, // Using implementation plan for impact description
      change_plan: data.implementationPlan,   // Rollout Plan field
      backout_plan: data.backoutPlan
    };

    // Add department_id if configured
    if (departmentId && departmentId !== null) {
      changeRequestData.department_id = departmentId;
      console.log('🏢 Adding department_id to request:', departmentId);
    } else {
      console.log('🏢 No department_id configured, skipping department assignment');
    }

    // Add custom fields structure to match the expected format
    changeRequestData.custom_fields = {
      risks: null,
      lf_technical_owner: null,
      cfp_validation: data.validationPlan || null // Map validation plan to the planning field
    };

    console.log('✅ Change request data prepared:', {
      subject: changeRequestData.subject,
      change_type: changeRequestData.change_type,
      priority: changeRequestData.priority,
      risk: changeRequestData.risk,
      impact: changeRequestData.impact,
      workspace_id: changeRequestData.workspace_id,
      assetCount: 0, // Not including assets in initial request to avoid 500 errors
      approverCount: impactedData.approvers?.length || 0,
      hasDepartment: !!changeRequestData.department_id,
      hasStandardFields: !!(changeRequestData.change_reason && changeRequestData.backout_plan),
      hasCustomFields: Object.keys(changeRequestData.custom_fields).length > 0
    });

    console.log('📦 Final change request data structure:', JSON.stringify(changeRequestData, null, 2));

    return changeRequestData;
  },

  /**
   * Create a simplified description for change request
   */
  createSimplifiedDescription(data, impactedData) {
    // Create a very simple, text-only description for maximum compatibility
    let description = `${data.reasonForChange || 'No reason specified'}

CHANGE DETAILS:
Reason for Change: ${data.reasonForChange || 'Not specified'}
Implementation Plan: ${data.implementationPlan || 'Not specified'}
Backout Plan: ${data.backoutPlan || 'Not specified'}
Validation Plan: ${data.validationPlan || 'Not specified'}

RISK ASSESSMENT:
Risk Level: ${data.riskAssessment?.riskLevel?.toUpperCase() || 'NOT ASSESSED'}
Risk Score: ${data.riskAssessment?.totalScore || 0}/15
Change Type: ${data.changeType || 'Normal'}

IMPACT ANALYSIS:
Assets Affected: ${data.selectedAssets?.length || 0}
Approvers Required: ${impactedData.approvers?.length || 0}
Stakeholders to Notify: ${impactedData.stakeholders?.length || 0}`;

    // Add asset details if any
    if (data.selectedAssets?.length > 0) {
      description += `

AFFECTED ASSETS:`;
      data.selectedAssets.forEach((asset, index) => {
        const displayId = asset.display_id || asset.id;
        description += `
${index + 1}. ${asset.name} (ID: ${displayId}, Tag: ${asset.asset_tag || 'No tag'})`;
      });
    }

    // Add approver details if any
    if (impactedData.approvers?.length > 0) {
      description += `

REQUIRED APPROVERS:`;
      impactedData.approvers.forEach((approver, index) => {
        description += `
${index + 1}. ${approver.name} (${approver.email}) - Source: ${approver.source}`;
      });
    }

    // Add stakeholder details if any
    if (impactedData.stakeholders?.length > 0) {
      description += `

STAKEHOLDERS TO NOTIFY:`;
      impactedData.stakeholders.forEach((stakeholder, index) => {
        description += `
${index + 1}. ${stakeholder.name} (${stakeholder.email}) - Source: ${stakeholder.source}`;
      });
    }

    description += `

---
Created with Freshworks Change Management App
Submission Time: ${new Date().toISOString()}`;

    return description;
  },

  /**
   * Create change request with minimal required fields only
   */
  createMinimalChangeRequest(data) {
    console.log('📦 Creating minimal change request with only required fields...');
    
    // Only include the absolute minimum required fields
    const minimalData = {
      subject: data.changeTitle || 'Test Change Request',
      description: data.reasonForChange || 'Change request created via app',
      change_type: 6, // Normal Change (based on actual field choices)
      priority: 2,    // Medium priority
      status: 1,      // Open
      risk: 2,        // Medium risk
      impact: 2,      // Medium impact
      workspace_id: 2, // Required field - "CXI Change Management" workspace
      requester_id: data.selectedRequester?.id,
      agent_id: data.selectedAgent?.id,
      custom_fields: {
        risks: null,
        lf_technical_owner: null
      }
    };

    // Add dates if available
    if (data.plannedStart) {
      try {
        minimalData.planned_start_date = new Date(data.plannedStart).toISOString();
      } catch (error) {
        console.warn('⚠️ Error formatting planned start date:', error);
      }
    }

    if (data.plannedEnd) {
      try {
        minimalData.planned_end_date = new Date(data.plannedEnd).toISOString();
      } catch (error) {
        console.warn('⚠️ Error formatting planned end date:', error);
      }
    }

    console.log('📦 Minimal change request data:', JSON.stringify(minimalData, null, 2));
    return minimalData;
  },

  /**
   * Create the change request in Freshservice
   */
  async createChangeRequest(changeRequestData) {
    console.log('🎯 Creating change request in Freshservice...');
    console.log('📦 Change request data being sent:', changeRequestData);

    try {
      const response = await this.attemptChangeRequestCreation(changeRequestData);
      return response;
    } catch (error) {
      console.error('❌ First attempt failed with error:', error);
      
      // Check if the error is a 500 server error
      if (error.status === 500) {
        console.warn('⚠️ Server error (500) detected - attempting with minimal required fields only...');
        
        try {
          const minimalData = this.createMinimalChangeRequest(window.changeRequestData);
          const response = await this.attemptChangeRequestCreation(minimalData);
          console.log('✅ Change request created successfully with minimal fields');
          console.log('ℹ️ You may need to update the change request manually with additional details');
          return response;
        } catch (minimalError) {
          console.error('❌ Failed even with minimal fields:', minimalError);
          
          // If it still fails, try with an even simpler configuration
          console.warn('⚠️ Trying with ultra-minimal configuration...');
          try {
            const ultraMinimalData = {
              subject: 'Change Request',
              description: 'Change request created via app',
              change_type: 6, // Normal Change (based on actual field choices)
              priority: 2,
              status: 1,
              risk: 2,
              impact: 2,
              workspace_id: 2, // Required field - "CXI Change Management" workspace
              requester_id: window.changeRequestData.selectedRequester?.id,
              agent_id: window.changeRequestData.selectedAgent?.id,
              custom_fields: {
                risks: null,
                lf_technical_owner: null
              }
            };
            
            console.log('📦 Ultra-minimal data:', JSON.stringify(ultraMinimalData, null, 2));
            const response = await this.attemptChangeRequestCreation(ultraMinimalData);
            console.log('✅ Change request created successfully with ultra-minimal fields');
            console.log('⚠️ You will need to update this change request manually with all the details');
            return response;
          } catch (ultraMinimalError) {
            console.error('❌ Failed even with ultra-minimal fields:', ultraMinimalError);
            throw ultraMinimalError;
          }
        }
      }
      
      // Check if the error is related to assets OR if it's a 500 server error
      let isAssetError = false;
      
      // Check for asset-related validation errors
      if (error.response) {
        try {
          const errorData = JSON.parse(error.response);
          if (errorData.errors && Array.isArray(errorData.errors)) {
            isAssetError = errorData.errors.some(err => err.field === 'assets');
          }
        } catch (parseError) {
          // Fallback to string check if JSON parsing fails
          isAssetError = error.response.includes('"field":"assets"');
        }
      }
      
      if (isAssetError && changeRequestData.assets) {
        console.warn('⚠️ Asset-related error detected, attempting to create change request without assets...');
        
        // Remove assets and try again
        const dataWithoutAssets = { ...changeRequestData };
        delete dataWithoutAssets.assets;
        
        console.log('🔄 Retrying without assets...');
        console.log('📦 Data without assets:', dataWithoutAssets);
        
        try {
          const response = await this.attemptChangeRequestCreation(dataWithoutAssets);
          console.log('✅ Change request created successfully without assets');
          console.log('ℹ️ Asset associations will be included in the description only');
          return response;
        } catch (retryError) {
          console.error('❌ Failed even without assets:', retryError);
          throw retryError;
        }
      } else {
        // Re-throw the original error if it's not asset-related or server error
        throw error;
      }
    }
  },

  /**
   * Attempt to create change request with given data
   */
  async attemptChangeRequestCreation(changeRequestData) {
    try {
      // Log the exact payload being sent to help debug 500 errors
      console.log('📡 Sending change request payload:', JSON.stringify(changeRequestData, null, 2));
      
      const response = await window.client.request.invokeTemplate('createChangeRequest', {
        context: {},
        body: JSON.stringify(changeRequestData),
        cache: false
      });

      console.log('📡 Raw API response:', response);

      if (!response) {
        throw new Error('No response received from Freshservice API');
      }

      if (!response.response) {
        console.error('❌ Response object missing response property:', response);
        throw new Error(`API call failed - Response status: ${response.status || 'unknown'}, Headers: ${JSON.stringify(response.headers || {})}`);
      }

      let data;
      try {
        data = JSON.parse(response.response);
        console.log('📋 Parsed response data:', data);
      } catch (parseError) {
        console.error('❌ Failed to parse response JSON:', response.response);
        throw new Error(`Invalid JSON response: ${parseError.message}`);
      }

      // Log the parsed response for debugging
      console.log('📋 Parsed API response:', data);

      if (!data.change) {
        console.error('❌ Response missing change object:', data);
        
        // Check for error messages in the response
        if (data.errors) {
          console.error('🔍 API Validation Errors:', data.errors);
          const errorMessages = Array.isArray(data.errors) 
            ? data.errors.map(err => {
                if (typeof err === 'object' && err.message) {
                  return `${err.field || 'Unknown field'}: ${err.message}`;
                }
                return err.message || err;
              }).join(', ')
            : JSON.stringify(data.errors);
          throw new Error(`API validation errors: ${errorMessages}`);
        }
        
        // Check for description field which might contain error details
        if (data.description) {
          console.error('🔍 API Error Description:', data.description);
          throw new Error(`API error: ${data.description}`);
        }
        
        throw new Error(`Invalid response format - expected 'change' object but got: ${JSON.stringify(data)}`);
      }

      const changeRequest = data.change;
      console.log(`✅ Change request created successfully: CR-${changeRequest.id}`);

      return changeRequest;

    } catch (error) {
      console.error('❌ Error creating change request:', error);
      
      // Enhanced error logging for 500 errors
      if (error.status === 500) {
        console.error('🔍 SERVER ERROR (500) - This is likely due to:');
        console.error('   - Invalid field values or data types');
        console.error('   - Required fields missing or incorrectly formatted');
        console.error('   - Custom fields that don\'t exist in your Freshservice instance');
        console.error('   - Department or workspace IDs that don\'t exist');
        console.error('   - Description content that is too long or contains invalid characters');
        
        console.error('🔍 Request payload that caused the error:');
        console.error(JSON.stringify(changeRequestData, null, 2));
      }
      
      // Log the full error object for debugging
      console.error('🔍 Full error object:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        response: error.response,
        headers: error.headers,
        stack: error.stack
      });
      
      // Try to parse and log the error response if it exists
      if (error.response) {
        try {
          const errorData = JSON.parse(error.response);
          console.error('🔍 Parsed API error response:', errorData);
          
          if (errorData.errors && Array.isArray(errorData.errors)) {
            console.error('🔍 API validation errors:');
            errorData.errors.forEach((err, index) => {
              console.error(`   ${index + 1}. Field: ${err.field || 'unknown'}`);
              console.error(`      Message: ${err.message || 'no message'}`);
              console.error(`      Code: ${err.code || 'no code'}`);
            });
          }
          
          if (errorData.description) {
            console.error('🔍 API error description:', errorData.description);
          }
        } catch (parseError) {
          console.error('🔍 Raw API error response (could not parse as JSON):', error.response);
        }
      }
      
      // Preserve the original error properties for retry logic
      if (error.status || error.response) {
        // This is likely an HTTP error from the API call - preserve it as-is
        throw error;
      } else {
        // This is a processing error - create a new error with detailed message
        let errorMessage = 'Unknown error occurred';
        
        if (error.message) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else {
          errorMessage = `Unexpected error type: ${JSON.stringify(error)}`;
        }
        
        throw new Error(`Failed to create change request: ${errorMessage}`);
      }
    }
  },

  /**
   * Create approval workflow for the change request
   */
  async createApprovalWorkflow(changeRequest) {
    console.log('✅ Setting up approval workflow...');

    const impactedData = window.ImpactedServices?.getImpactedServicesData() || {};
    const approvers = impactedData.approvers || [];

    if (approvers.length === 0) {
      console.log('ℹ️ No approvers identified, skipping approval workflow');
      return;
    }

    try {
      // Create approval workflow based on risk level
      const riskLevel = window.changeRequestData.riskAssessment?.riskLevel || 'Medium';
      const workflowType = this.determineWorkflowType(riskLevel, approvers.length);

      console.log(`📋 Creating ${workflowType} approval workflow for ${approvers.length} approvers`);

      // For high-risk changes, require all approvers
      // For medium/low-risk, require majority approval
      const approvalSettings = {
        change_id: changeRequest.id,
        workflow_type: workflowType,
        approvers: approvers.map(approver => ({
          approver_id: approver.id,
          approver_name: approver.name,
          approver_email: approver.email,
          level: 1, // All approvers at same level for parallel approval
          required: riskLevel === 'High' // High risk requires all, others allow majority
        }))
      };

      // Create the approval workflow
      const workflowResponse = await window.client.request.invokeTemplate('createApprovalWorkflow', {
        context: {
          change_id: changeRequest.id
        },
        body: JSON.stringify(approvalSettings),
        cache: false
      });

      if (workflowResponse && workflowResponse.response) {
        const workflowData = JSON.parse(workflowResponse.response);
        this.state.approvalWorkflowId = workflowData.id;
        console.log(`✅ Approval workflow created: ${workflowData.id}`);
      }

      // Send approval notifications
      await this.sendApprovalNotifications(changeRequest, approvers);

    } catch (error) {
      console.warn('⚠️ Error creating approval workflow:', error);
      // Don't fail the entire submission for approval workflow issues
      console.log('ℹ️ Continuing submission without formal approval workflow');
    }
  },

  /**
   * Determine workflow type based on risk and approver count
   */
  determineWorkflowType(riskLevel, approverCount) {
    if (riskLevel === 'High' || approverCount > 3) {
      return 'sequential'; // High risk or many approvers = sequential approval
    } else if (approverCount > 1) {
      return 'parallel'; // Multiple approvers = parallel approval
    } else {
      return 'single'; // Single approver = simple approval
    }
  },

  /**
   * Send approval notifications to approvers
   */
  async sendApprovalNotifications(changeRequest, approvers) {
    console.log(`📧 Sending approval notifications to ${approvers.length} approvers...`);

    const changeUrl = await this.getChangeRequestUrl(changeRequest.id);
    
    for (const approver of approvers) {
      try {
        const emailContent = this.renderEmailTemplate('approverNotification', {
          approver_name: approver.name,
          change_title: changeRequest.subject,
          requester_name: window.changeRequestData.selectedRequester.name,
          risk_level: window.changeRequestData.riskAssessment?.riskLevel?.toUpperCase() || 'MEDIUM',
          planned_start: this.formatDate(changeRequest.planned_start_date),
          planned_end: this.formatDate(changeRequest.planned_end_date),
          implementation_plan: window.changeRequestData.implementationPlan,
          backout_plan: window.changeRequestData.backoutPlan,
          change_url: changeUrl
        });

        await this.sendEmail(approver.email, emailContent.subject, emailContent.body);
        
        this.state.sentNotifications.push({
          type: 'approval',
          recipient: approver.email,
          timestamp: new Date().toISOString()
        });

        console.log(`✅ Approval notification sent to ${approver.name} (${approver.email})`);

      } catch (error) {
        console.warn(`⚠️ Error sending approval notification to ${approver.name} (${approver.email}):`, error);
      }
    }
  },

  /**
   * Send stakeholder notifications
   */
  async sendStakeholderNotifications(changeRequest) {
    console.log('📧 Sending stakeholder notifications...');

    const impactedData = window.ImpactedServices?.getImpactedServicesData() || {};
    const stakeholders = impactedData.stakeholders || [];

    if (stakeholders.length === 0) {
      console.log('ℹ️ No stakeholders identified, skipping notifications');
      return;
    }

    const changeUrl = await this.getChangeRequestUrl(changeRequest.id);
    const impactedAssetsList = window.changeRequestData.selectedAssets
      ?.map(asset => `<li>${asset.name} (${asset.asset_tag || 'No tag'})</li>`)
      .join('') || '<li>No assets specified</li>';

    for (const stakeholder of stakeholders) {
      try {
        const emailContent = this.renderEmailTemplate('stakeholderNotification', {
          stakeholder_name: stakeholder.name,
          change_title: changeRequest.subject,
          requester_name: window.changeRequestData.selectedRequester.name,
          risk_level: window.changeRequestData.riskAssessment?.riskLevel?.toUpperCase() || 'MEDIUM',
          planned_start: this.formatDate(changeRequest.planned_start_date),
          planned_end: this.formatDate(changeRequest.planned_end_date),
          impacted_assets_list: impactedAssetsList,
          reason_for_change: window.changeRequestData.reasonForChange,
          change_url: changeUrl
        });

        await this.sendEmail(stakeholder.email, emailContent.subject, emailContent.body);
        
        this.state.sentNotifications.push({
          type: 'stakeholder',
          recipient: stakeholder.email,
          timestamp: new Date().toISOString()
        });

        console.log(`✅ Stakeholder notification sent to ${stakeholder.name} (${stakeholder.email})`);

      } catch (error) {
        console.warn(`⚠️ Error sending stakeholder notification to ${stakeholder.name} (${stakeholder.email}):`, error);
      }
    }
  },

  /**
   * Create peer review tasks for assigned agents
   */
  async createPeerReviewTasks(changeRequest) {
    console.log('👥 Creating peer review tasks...');

    const riskLevel = window.changeRequestData.riskAssessment?.riskLevel || 'Medium';
    
    // Only create peer review tasks for Medium and High risk changes
    if (riskLevel === 'Low') {
      console.log('ℹ️ Low risk change - skipping peer review tasks');
      return;
    }

    try {
      const changeUrl = await this.getChangeRequestUrl(changeRequest.id);
      
      // Create a peer review task for the assigned agent
      const taskData = {
        subject: `Peer Review: ${changeRequest.subject}`,
        description: this.renderEmailTemplate('peerReviewTask', {
        change_title: changeRequest.subject,
        requester_name: window.changeRequestData.selectedRequester.name,
        risk_level: riskLevel.toUpperCase(),
        planned_start: this.formatDate(changeRequest.planned_start_date),
        planned_end: this.formatDate(changeRequest.planned_end_date),
        implementation_plan: window.changeRequestData.implementationPlan,
        validation_plan: window.changeRequestData.validationPlan || 'Not specified',
        change_url: changeUrl
        }).body,
        requester_id: window.changeRequestData.selectedRequester.id,
        agent_id: window.changeRequestData.selectedAgent.id,
        priority: riskLevel === 'High' ? 3 : 2, // High or Medium priority
        status: 2, // Open status
        task_type: 'peer_review',
        due_by: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString() // Due in 24 hours
      };

      const taskResponse = await window.client.request.invokeTemplate('createTask', {
        context: {},
        body: JSON.stringify(taskData),
        cache: false
      });

      if (taskResponse && taskResponse.response) {
        const taskResult = JSON.parse(taskResponse.response);
        this.state.createdTasks.push({
          id: taskResult.task?.id || taskResult.id,
          type: 'peer_review',
          assignee: window.changeRequestData.selectedAgent.name,
          timestamp: new Date().toISOString()
        });
        console.log(`✅ Peer review task created for ${window.changeRequestData.selectedAgent.name}`);
      }

    } catch (error) {
      console.warn('⚠️ Error creating peer review tasks:', error);
      // Don't fail the entire submission for task creation issues
      console.log('ℹ️ Continuing submission without peer review tasks');
    }
  },

  /**
   * Update change request with additional metadata
   */
  async updateChangeRequestMetadata(changeRequest) {
    console.log('🔄 Updating change request with workflow metadata...');

    try {
      const updateData = {
        // Add any additional metadata here
        notes: `Change request submitted via Freshworks Change Management App.
        
Workflow Summary:
- Approval Workflow ID: ${this.state.approvalWorkflowId || 'Not created'}
- Notifications Sent: ${this.state.sentNotifications.length}
- Tasks Created: ${this.state.createdTasks.length}
- Submission Timestamp: ${new Date().toISOString()}`
      };

      const updateResponse = await window.client.request.invokeTemplate('updateChangeRequest', {
        context: {
          change_id: changeRequest.id
        },
        body: JSON.stringify(updateData),
        cache: false
      });

      if (updateResponse && updateResponse.response) {
        console.log('✅ Change request metadata updated successfully');
      }

    } catch (error) {
      console.warn('⚠️ Error updating change request metadata:', error);
      // Don't fail the entire submission for metadata update issues
      console.log('ℹ️ Continuing submission without metadata update');
    }
  },

  /**
   * Show submission success and redirect
   */
  showSubmissionSuccess(changeRequest) {
    console.log('🎉 Showing submission success...');

    // Hide submission status
    this.showSubmissionStatus(false);

    // Show success notification
    const successMessage = `
      <div class="alert alert-success" role="alert">
        <h4 class="alert-heading">✅ Change Request Submitted Successfully!</h4>
        <p><strong>Change Request ID:</strong> CR-${changeRequest.id}</p>
        <p><strong>Title:</strong> ${changeRequest.subject}</p>
        <hr>
        <p class="mb-0">
          <strong>Summary:</strong><br>
          • ${this.state.sentNotifications.length} notifications sent<br>
          • ${this.state.createdTasks.length} tasks created<br>
          • ${window.changeRequestData.selectedAssets?.length || 0} assets associated
        </p>
      </div>
    `;

    // Show success message in a modal or replace page content
    const container = document.querySelector('.container-fluid') || document.body;
    container.innerHTML = successMessage + `
      <div class="text-center mt-4">
        <button class="btn btn-primary" onclick="window.location.reload()">Create Another Change Request</button>
        <a href="/helpdesk/changes/${changeRequest.id}" class="btn btn-outline-primary ms-2">View Change Request</a>
      </div>
    `;

    console.log('✅ Submission success displayed');
  },

  /**
   * Show submission error
   */
  showSubmissionError(error) {
    console.error('❌ Showing submission error:', error);

    // Hide submission status
    this.showSubmissionStatus(false);

    // Show error notification
    const errorMessage = `
      <div class="alert alert-danger" role="alert">
        <h4 class="alert-heading">❌ Change Request Submission Failed</h4>
        <p><strong>Error:</strong> ${error.message || 'Unknown error occurred'}</p>
        <hr>
        <p class="mb-0">Please check the details and try again. If the problem persists, contact your system administrator.</p>
      </div>
    `;

    // Show error message
    const statusElement = document.getElementById('submission-status');
    if (statusElement) {
      statusElement.innerHTML = errorMessage;
      statusElement.className = 'alert alert-danger';
      statusElement.style.display = 'block';
    }

    console.log('❌ Submission error displayed');
  },

  /**
   * Show/hide submission status
   */
  showSubmissionStatus(show) {
    const statusElement = document.getElementById('submission-status');
    if (statusElement) {
      statusElement.style.display = show ? 'block' : 'none';
    }
  },

  /**
   * Get change request URL for notifications
   */
  async getChangeRequestUrl(changeId) {
    try {
      const params = await window.client.iparams.get();
      const domain = params.freshservice_domain;
      return `https://${domain}/helpdesk/changes/${changeId}`;
    } catch (error) {
      console.warn('⚠️ Could not get domain for change URL:', error);
      return `#change-${changeId}`;
    }
  },

  /**
   * Render email template with variables
   */
  renderEmailTemplate(templateName, variables) {
    const template = this.config.emailTemplates[templateName];
    if (!template) {
      console.warn(`⚠️ Email template '${templateName}' not found`);
      return { subject: 'Change Request Notification', body: 'A change request notification.' };
    }

    let subject = template.subject;
    let body = template.body;

    // Replace variables in subject and body
    Object.keys(variables).forEach(key => {
      const placeholder = `{{${key}}}`;
      const value = variables[key] || '';
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      body = body.replace(new RegExp(placeholder, 'g'), value);
    });

    return { subject, body };
  },

  /**
   * Send email notification
   */
  async sendEmail(to, subject, body) {
    console.log(`📧 Sending email to ${to}: ${subject}`);

    try {
      const emailData = {
        to: to,
        subject: subject,
        body: body,
        body_type: 'html'
      };

      const response = await window.client.request.invokeTemplate('sendEmail', {
        context: {},
        body: JSON.stringify(emailData),
        cache: false
      });

      if (response && response.response) {
        console.log(`✅ Email sent successfully to ${to}`);
        return true;
      } else {
        console.warn(`⚠️ Email sending failed for ${to}`);
        return false;
      }

    } catch (error) {
      console.warn(`⚠️ Error sending email to ${to}:`, error);
      return false;
    }
  },

  /**
   * Format date for display
   */
  formatDate(dateString) {
    if (!dateString) return 'Not specified';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      console.warn('⚠️ Error formatting date:', dateString, error);
      return dateString;
    }
  },

  /**
   * Show comprehensive submission summary modal
   */
  async showSubmissionSummary() {
    console.log('📋 Showing comprehensive submission summary...');

    // First validate all data
    const validationResult = this.validateSubmissionData();
    if (!validationResult.isValid) {
      this.showValidationErrors(validationResult.errors);
      return;
    }

    // Get all the data
    const data = window.changeRequestData;
    const impactedData = window.ImpactedServices?.getImpactedServicesData() || {};
    const riskAssessment = data.riskAssessment || {};

    // Create the comprehensive summary content
    const summaryContent = this.createSummaryContent(data, impactedData, riskAssessment);

    // Update the modal content
    const modalBody = document.getElementById('summary-content');
    if (modalBody) {
      modalBody.innerHTML = summaryContent;
    }

    // Add backdrop blur effect
    const body = document.body;
    body.classList.add('modal-backdrop-blur');

    // Show the modal
    const modal = document.getElementById('confirmation-modal');
    if (modal) {
      // Update modal title
      const modalTitle = document.getElementById('confirmModalLabel');
      if (modalTitle) {
        modalTitle.textContent = 'Review Change Request Submission';
      }

      // Show modal using Bootstrap
      const bootstrapModal = new bootstrap.Modal(modal);
      bootstrapModal.show();

      // Add event listener for confirm button if not already added
      const confirmBtn = document.getElementById('confirm-submit');
      if (confirmBtn) {
        // Remove any existing listeners
        confirmBtn.removeEventListener('click', this.handleSubmissionBound);
        // Add new listener
        this.handleSubmissionBound = (e) => {
          e.preventDefault();
          bootstrapModal.hide();
          setTimeout(() => {
            body.classList.remove('modal-backdrop-blur');
            this.handleSubmission();
          }, 300);
        };
        confirmBtn.addEventListener('click', this.handleSubmissionBound);
      }

      // Add event listener for modal close to remove blur
      modal.addEventListener('hidden.bs.modal', () => {
        body.classList.remove('modal-backdrop-blur');
      }, { once: true });

      console.log('✅ Submission summary modal displayed');
    } else {
      console.error('❌ Confirmation modal not found');
      // Fallback to direct submission
      this.handleSubmission();
    }
  },

  /**
   * Create comprehensive summary content for the modal
   */
  createSummaryContent(data, impactedData, riskAssessment) {
    const formatDate = (dateString) => {
      if (!dateString) return 'Not specified';
      try {
        return new Date(dateString).toLocaleString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (error) {
        return dateString;
      }
    };

    const getRiskBadgeClass = (riskLevel) => {
      switch (riskLevel?.toLowerCase()) {
        case 'low': return 'bg-success';
        case 'medium': return 'bg-warning text-dark';
        case 'high': return 'bg-danger';
        default: return 'bg-secondary';
      }
    };

    const getChangeTypeBadge = (changeType) => {
      switch (changeType?.toLowerCase()) {
        case 'emergency': return '<span class="badge bg-danger">Emergency</span>';
        case 'major': return '<span class="badge bg-warning text-dark">Major</span>';
        case 'minor': return '<span class="badge bg-info">Minor</span>';
        default: return '<span class="badge bg-primary">Normal</span>';
      }
    };

    return `
      <div class="container-fluid">
        <!-- Header Section -->
        <div class="row mb-4">
          <div class="col-12">
            <div class="card border-primary">
              <div class="card-header bg-primary text-white">
                <h5 class="card-title mb-0">
                  <i class="fas fa-clipboard-check me-2"></i>${data.changeTitle || 'Untitled Change Request'}
                </h5>
              </div>
              <div class="card-body">
                <div class="row">
                  <div class="col-md-8">
                    <p class="card-text">${data.reasonForChange || 'No reason specified'}</p>
                  </div>
                  <div class="col-md-4 text-end">
                    <div class="mb-2">
                      ${getChangeTypeBadge(data.changeType)}
                      <span class="badge ${getRiskBadgeClass(riskAssessment.riskLevel)} ms-2">
                        ${riskAssessment.riskLevel?.toUpperCase() || 'UNKNOWN'} RISK
                      </span>
                    </div>
                    <div class="text-muted">
                      <small>Risk Score: ${riskAssessment.totalScore || 0}/15</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Key Details Row -->
        <div class="row mb-4">
          <!-- Timing Section -->
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-header">
                <h6><i class="fas fa-clock me-2"></i>Timing & Schedule</h6>
              </div>
              <div class="card-body">
                <div class="mb-2">
                  <strong>Planned Start:</strong><br>
                  <span class="text-primary">${formatDate(data.plannedStart)}</span>
                </div>
                <div>
                  <strong>Planned End:</strong><br>
                  <span class="text-primary">${formatDate(data.plannedEnd)}</span>
                </div>
                ${data.plannedStart && data.plannedEnd ? `
                <div class="mt-2 text-muted">
                  <small><i class="fas fa-hourglass-half me-1"></i>
                    Duration: ${this.calculateDuration(data.plannedStart, data.plannedEnd)}
                  </small>
                </div>` : ''}
              </div>
            </div>
          </div>

          <!-- People Section -->
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-header">
                <h6><i class="fas fa-users me-2"></i>People & Assignments</h6>
              </div>
              <div class="card-body">
                <div class="mb-2">
                  <strong>Requester:</strong><br>
                  <span class="text-info">${data.selectedRequester?.name || 'Not selected'}</span>
                  ${data.selectedRequester?.email ? `<br><small class="text-muted">${data.selectedRequester.email}</small>` : ''}
                </div>
                <div>
                  <strong>Assigned Agent:</strong><br>
                  <span class="text-info">${data.selectedAgent?.name || 'Not selected'}</span>
                  ${data.selectedAgent?.email ? `<br><small class="text-muted">${data.selectedAgent.email}</small>` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Impact Analysis Row -->
        <div class="row mb-4">
          <!-- Assets Section -->
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-header">
                <h6><i class="fas fa-server me-2"></i>Affected Assets (${data.selectedAssets?.length || 0})</h6>
              </div>
              <div class="card-body">
                ${data.selectedAssets?.length ? `
                  <div class="asset-list" style="max-height: 200px; overflow-y: auto;">
                    ${data.selectedAssets.map((asset, index) => `
                      <div class="d-flex justify-content-between align-items-center py-1 ${index > 0 ? 'border-top' : ''}">
                        <div>
                          <div class="fw-bold">${asset.name}</div>
                          <small class="text-muted">
                            ID: ${asset.display_id || asset.id} | 
                            Tag: ${asset.asset_tag || 'No tag'}
                          </small>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                ` : '<p class="text-muted">No assets selected</p>'}
              </div>
            </div>
          </div>

          <!-- Approvals Section -->
          <div class="col-md-6 mb-3">
            <div class="card h-100">
              <div class="card-header">
                <h6><i class="fas fa-check-circle me-2"></i>Approvals & Notifications</h6>
              </div>
              <div class="card-body">
                <div class="mb-3">
                  <strong>Required Approvers:</strong> ${impactedData.approvers?.length || 0}
                  ${impactedData.approvers?.length ? `
                    <div class="mt-1">
                      ${impactedData.approvers.slice(0, 3).map(approver => `
                        <div class="text-success small">
                          <i class="fas fa-user-check me-1"></i>${approver.name}
                        </div>
                      `).join('')}
                      ${impactedData.approvers.length > 3 ? `
                        <div class="text-muted small">
                          <i class="fas fa-ellipsis-h me-1"></i>and ${impactedData.approvers.length - 3} more
                        </div>
                      ` : ''}
                    </div>
                  ` : ''}
                </div>
                <div>
                  <strong>Stakeholders to Notify:</strong> ${impactedData.stakeholders?.length || 0}
                  ${impactedData.stakeholders?.length ? `
                    <div class="mt-1">
                      ${impactedData.stakeholders.slice(0, 2).map(stakeholder => `
                        <div class="text-info small">
                          <i class="fas fa-envelope me-1"></i>${stakeholder.name}
                        </div>
                      `).join('')}
                      ${impactedData.stakeholders.length > 2 ? `
                        <div class="text-muted small">
                          <i class="fas fa-ellipsis-h me-1"></i>and ${impactedData.stakeholders.length - 2} more
                        </div>
                      ` : ''}
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Implementation Plans Row -->
        <div class="row mb-4">
          <div class="col-12">
            <div class="card">
              <div class="card-header">
                <h6><i class="fas fa-tasks me-2"></i>Implementation & Recovery Plans</h6>
              </div>
              <div class="card-body">
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <div class="plan-section">
                      <h6 class="text-primary">
                        <i class="fas fa-play-circle me-1"></i>Implementation Plan
                      </h6>
                      <div class="plan-content p-2 bg-light rounded" style="max-height: 150px; overflow-y: auto;">
                        ${data.implementationPlan ? 
                          data.implementationPlan.split('\n').map(line => `<div>${line || '<br>'}</div>`).join('') : 
                          '<em class="text-muted">Not specified</em>'
                        }
                      </div>
                    </div>
                  </div>
                  <div class="col-md-6 mb-3">
                    <div class="plan-section">
                      <h6 class="text-warning">
                        <i class="fas fa-undo me-1"></i>Backout Plan
                      </h6>
                      <div class="plan-content p-2 bg-light rounded" style="max-height: 150px; overflow-y: auto;">
                        ${data.backoutPlan ? 
                          data.backoutPlan.split('\n').map(line => `<div>${line || '<br>'}</div>`).join('') : 
                          '<em class="text-muted">Not specified</em>'
                        }
                      </div>
                    </div>
                  </div>
                  <div class="col-md-6 mb-3">
                    <div class="plan-section">
                      <h6 class="text-success">
                        <i class="fas fa-check-double me-1"></i>Validation Plan
                      </h6>
                      <div class="plan-content p-2 bg-light rounded" style="max-height: 150px; overflow-y: auto;">
                        ${data.validationPlan ? 
                          data.validationPlan.split('\n').map(line => `<div>${line || '<br>'}</div>`).join('') : 
                          '<em class="text-muted">Not specified</em>'
                        }
                      </div>
                    </div>
                  </div>
                  <div class="col-md-6 mb-3">
                    <div class="plan-section">
                      <h6 class="text-info">
                        <i class="fas fa-clipboard-list me-1"></i>Risk Assessment Details
                      </h6>
                      <div class="plan-content p-2 bg-light rounded">
                        <div class="small">
                          <div><strong>Business Impact:</strong> ${riskAssessment.businessImpact || 'N/A'}/3</div>
                          <div><strong>Affected Users:</strong> ${riskAssessment.affectedUsers || 'N/A'}/3</div>
                          <div><strong>Complexity:</strong> ${riskAssessment.complexity || 'N/A'}/3</div>
                          <div><strong>Testing Level:</strong> ${riskAssessment.testing || 'N/A'}/3</div>
                          <div><strong>Rollback Capability:</strong> ${riskAssessment.rollback || 'N/A'}/3</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Submission Actions Summary -->
        <div class="row">
          <div class="col-12">
            <div class="card bg-light">
              <div class="card-header">
                <h6><i class="fas fa-cogs me-2"></i>What Will Happen After Submission</h6>
              </div>
              <div class="card-body">
                <div class="row">
                  <div class="col-md-6">
                    <h6 class="text-primary">Automatic Actions:</h6>
                    <ul class="list-unstyled">
                      <li><i class="fas fa-plus-circle text-success me-2"></i>Change request created in Freshservice</li>
                      <li><i class="fas fa-envelope text-info me-2"></i>Email notifications sent to ${(impactedData.approvers?.length || 0) + (impactedData.stakeholders?.length || 0)} people</li>
                      ${riskAssessment.riskLevel !== 'Low' ? 
                        '<li><i class="fas fa-tasks text-warning me-2"></i>Peer review task created (24-hour deadline)</li>' : ''
                      }
                      <li><i class="fas fa-workflow text-primary me-2"></i>Approval workflow initiated</li>
                    </ul>
                  </div>
                  <div class="col-md-6">
                    <h6 class="text-secondary">Next Steps:</h6>
                    <ul class="list-unstyled">
                      <li><i class="fas fa-clock text-muted me-2"></i>Approvers will receive email notifications</li>
                      <li><i class="fas fa-eye text-muted me-2"></i>Stakeholders will be notified of the change</li>
                      <li><i class="fas fa-check-circle text-muted me-2"></i>You'll receive a confirmation with the change ID</li>
                      <li><i class="fas fa-link text-muted me-2"></i>You can track progress in Freshservice</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Calculate duration between two dates
   */
  calculateDuration(startDate, endDate) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffMs = end - start;
      
      if (diffMs < 0) return 'Invalid duration';
      
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffHours < 24) {
        return `${diffHours}h ${diffMinutes}m`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        const remainingHours = diffHours % 24;
        return `${diffDays}d ${remainingHours}h`;
      }
    } catch (error) {
      return 'Unknown duration';
    }
  },

  /**
   * Show validation errors in a user-friendly way
   */
  showValidationErrors(errors) {
    const errorMessage = `
      <div class="alert alert-danger" role="alert">
        <h6><i class="fas fa-exclamation-triangle me-2"></i>Please complete the following before submitting:</h6>
        <ul class="mb-0 mt-2">
          ${errors.map(error => `<li>${error}</li>`).join('')}
        </ul>
      </div>
    `;

    // Show in the submission status area
    const statusElement = document.getElementById('submission-status');
    if (statusElement) {
      statusElement.innerHTML = errorMessage;
      statusElement.style.display = 'block';
      
      // Scroll to the error message
      statusElement.scrollIntoView({ behavior: 'smooth' });
      
      // Hide after 10 seconds
      setTimeout(() => {
        statusElement.style.display = 'none';
      }, 10000);
    }
  },
};

// Initialize the module when the script loads
if (typeof window !== 'undefined') {
  console.log('🔧 ChangeSubmission: Script loaded, initializing module...');
window.ChangeSubmission = ChangeSubmission; 
  console.log('🔧 ChangeSubmission: Module attached to window object');
  
  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    console.log('🔧 ChangeSubmission: DOM still loading, adding event listener...');
    document.addEventListener('DOMContentLoaded', () => {
      console.log('🔧 ChangeSubmission: DOM loaded, initializing...');
      ChangeSubmission.init();
    });
  } else {
    console.log('🔧 ChangeSubmission: DOM already loaded, initializing immediately...');
    ChangeSubmission.init();
  }
} else {
  console.error('❌ ChangeSubmission: Window object not available');
}
