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
    this.setupEventListeners();
    console.log('✅ Change Submission Module initialized');
  },

  /**
   * Setup event listeners for submission functionality
   */
  setupEventListeners() {
    console.log('🔧 Setting up Change Submission event listeners...');
    
    // Submit button
    const submitBtn = document.getElementById('submit-change-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleSubmission();
      });
      console.log('✅ Submit button listener added');
    } else {
      console.warn('⚠️ Submit button not found');
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
      await this.showSubmissionSuccess(changeRequest);

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
    try {
      const params = await window.client.iparams.get();
      workspaceId = params.workspace_id;
      console.log('🏢 Workspace ID from config:', workspaceId);
    } catch (error) {
      console.warn('⚠️ Could not retrieve installation parameters:', error);
    }

    // Calculate priority based on risk level
    let priority = this.config.priorities.medium; // default
    if (data.riskAssessment?.riskLevel === 'Low') {
      priority = this.config.priorities.low;
    } else if (data.riskAssessment?.riskLevel === 'High') {
      priority = this.config.priorities.high;
    }

    // Map change type to Freshservice values
    const changeTypeMapping = {
      'minor': 1,
      'major': 3,
      'normal': 2,
      'emergency': 4
    };
    const change_type = changeTypeMapping[data.changeType] || 2; // default to normal

    // Map risk level to Freshservice values
    const riskMapping = {
      'Low': 1,
      'Medium': 2,
      'High': 3
    };
    const risk = riskMapping[data.riskAssessment?.riskLevel] || 2; // default to medium

    // Map impact (assuming medium impact for now, can be enhanced later)
    const impact = 2; // Medium impact

    // Prepare asset associations
    const assetIds = data.selectedAssets?.map(asset => asset.id) || [];

    // Format description with all relevant details
    const description = this.formatChangeDescription(data, impactedData);

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

    // Prepare the change request data according to Freshservice API v2 format
    const changeRequestData = {
      subject: data.changeTitle,
      description: description,
      change_type: change_type,
      priority: priority,
      status: this.config.statuses.open, // Open status
      risk: risk,
      impact: impact,
      requester_id: data.selectedRequester.id,
      owner_id: data.selectedAgent.id,
      planned_start_date: formatDateForAPI(data.plannedStart),
      planned_end_date: formatDateForAPI(data.plannedEnd)
    };

    // Add workspace_id if configured (temporarily disabled for testing)
    // if (workspaceId && workspaceId !== null) {
    //   changeRequestData.workspace_id = workspaceId;
    //   console.log('🏢 Adding workspace_id to request:', workspaceId);
    // }

    // Note: Custom fields don't exist in this Freshservice instance
    // All additional details are included in the description instead

    // Add assets if any are selected (comment out temporarily to test)
    // if (assetIds.length > 0) {
    //   changeRequestData.assets = assetIds.map(id => ({ display_id: id }));
    // }

    console.log('✅ Change request data prepared:', {
      subject: changeRequestData.subject,
      change_type: changeRequestData.change_type,
      priority: changeRequestData.priority,
      risk: changeRequestData.risk,
      impact: changeRequestData.impact,
      assetCount: assetIds.length,
      approverCount: impactedData.approvers?.length || 0
    });

    return changeRequestData;
  },

  /**
   * Format change description with all relevant details
   */
  formatChangeDescription(data, impactedData) {
    let description = `
<h3>Change Request Details</h3>

<h4>Change Information:</h4>
<ul>
  <li><strong>Change Type:</strong> ${data.changeType || 'Normal'}</li>
  <li><strong>Risk Level:</strong> ${data.riskAssessment?.riskLevel?.toUpperCase() || 'NOT ASSESSED'}</li>
  <li><strong>Risk Score:</strong> ${data.riskAssessment?.totalScore || 0}/15</li>
  <li><strong>Priority:</strong> ${data.riskAssessment?.riskLevel === 'High' ? 'High' : data.riskAssessment?.riskLevel === 'Low' ? 'Low' : 'Medium'}</li>
</ul>

<h4>Reason for Change:</h4>
<p>${data.reasonForChange}</p>

<h4>Implementation Plan:</h4>
<p>${data.implementationPlan}</p>

<h4>Backout Plan:</h4>
<p>${data.backoutPlan}</p>

<h4>Validation Plan:</h4>
<p>${data.validationPlan || 'Not specified'}</p>

<h4>Risk Assessment Details:</h4>
<ul>
  <li><strong>Overall Risk Level:</strong> ${data.riskAssessment?.riskLevel?.toUpperCase() || 'Not assessed'}</li>
  <li><strong>Total Risk Score:</strong> ${data.riskAssessment?.totalScore || 0}/15</li>
</ul>
`;

    // Add associated assets
    if (data.selectedAssets?.length > 0) {
      description += `
<h4>Associated Assets (${data.selectedAssets.length}):</h4>
<ul>`;
      data.selectedAssets.forEach(asset => {
        description += `<li><strong>${asset.name}</strong> (${asset.asset_tag || 'No tag'}) - ${asset.asset_type_name || 'Unknown type'}</li>`;
      });
      description += '</ul>';
      
      // Add asset IDs for reference
      const assetIds = data.selectedAssets.map(asset => asset.id);
      description += `<p><strong>Asset IDs:</strong> ${assetIds.join(', ')}</p>`;
    }

    // Add approvers
    if (impactedData.approvers?.length > 0) {
      description += `
<h4>Identified Approvers (${impactedData.approvers.length}):</h4>
<ul>`;
      impactedData.approvers.forEach(approver => {
        description += `<li><strong>${approver.name}</strong> (${approver.email}) - ${approver.source}</li>`;
      });
      description += '</ul>';
    }

    // Add stakeholders
    if (impactedData.stakeholders?.length > 0) {
      description += `
<h4>Identified Stakeholders (${impactedData.stakeholders.length}):</h4>
<ul>`;
      impactedData.stakeholders.forEach(stakeholder => {
        description += `<li><strong>${stakeholder.name}</strong> (${stakeholder.email}) - ${stakeholder.source}</li>`;
      });
      description += '</ul>';
    }

    // Add summary statistics
    description += `
<h4>Change Summary:</h4>
<ul>
  <li><strong>Total Assets Affected:</strong> ${data.selectedAssets?.length || 0}</li>
  <li><strong>Approvers Required:</strong> ${impactedData.approvers?.length || 0}</li>
  <li><strong>Stakeholders to Notify:</strong> ${impactedData.stakeholders?.length || 0}</li>
  <li><strong>Change Category:</strong> ${data.changeType || 'Normal'}</li>
</ul>

<hr>
<p><em>This change request was created using the Freshworks Change Management App.</em></p>
`;

    return description;
  },

  /**
   * Create the change request in Freshservice
   */
  async createChangeRequest(changeRequestData) {
    console.log('🎯 Creating change request in Freshservice...');
    console.log('📦 Change request data being sent:', changeRequestData);

    try {
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
      
      // Provide more detailed error information
      let errorMessage = 'Unknown error occurred';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.status) {
        errorMessage = `HTTP ${error.status}: ${error.statusText || 'API request failed'}`;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        errorMessage = `Unexpected error type: ${JSON.stringify(error)}`;
      }
      
      throw new Error(`Failed to create change request: ${errorMessage}`);
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
  }
};
