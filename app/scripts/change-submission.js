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
      agent_id: data.selectedAgent.id,
      planned_start_date: formatDateForAPI(data.plannedStart),
      planned_end_date: formatDateForAPI(data.plannedEnd)
    };

    // Add workspace_id if configured
    if (workspaceId && workspaceId !== null) {
      changeRequestData.workspace_id = workspaceId;
      console.log('🏢 Adding workspace_id to request:', workspaceId);
    }

    // Note: Custom fields don't exist in this Freshservice instance
    // All additional details are included in the description instead

    // Add assets if any are selected (now enabled since it's officially supported)
    if (assetIds.length > 0) {
      changeRequestData.assets = assetIds.map(id => ({ display_id: id }));
      console.log('🔗 Adding assets to change request:', assetIds);
    }

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
<div style="font-family: Arial, sans-serif; line-height: 1.6;">

<h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">📋 Change Request Details</h2>

<div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
  <h3 style="color: #2980b9; margin-top: 0;">📊 Change Information</h3>
  <table style="width: 100%; border-collapse: collapse;">
    <tr><td style="padding: 5px; font-weight: bold; width: 30%;">Change Type:</td><td style="padding: 5px;">${data.changeType || 'Normal'}</td></tr>
    <tr><td style="padding: 5px; font-weight: bold;">Risk Level:</td><td style="padding: 5px; color: ${data.riskAssessment?.riskLevel === 'High' ? '#e74c3c' : data.riskAssessment?.riskLevel === 'Medium' ? '#f39c12' : '#27ae60'}; font-weight: bold;">${data.riskAssessment?.riskLevel?.toUpperCase() || 'NOT ASSESSED'}</td></tr>
    <tr><td style="padding: 5px; font-weight: bold;">Risk Score:</td><td style="padding: 5px;">${data.riskAssessment?.totalScore || 0}/15</td></tr>
    <tr><td style="padding: 5px; font-weight: bold;">Priority:</td><td style="padding: 5px;">${data.riskAssessment?.riskLevel === 'High' ? 'High' : data.riskAssessment?.riskLevel === 'Low' ? 'Low' : 'Medium'}</td></tr>
  </table>
</div>

<div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #ffc107;">
  <h3 style="color: #856404; margin-top: 0;">🎯 Reason for Change</h3>
  <p style="margin: 0;">${data.reasonForChange}</p>
</div>

<div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #17a2b8;">
  <h3 style="color: #0c5460; margin-top: 0;">🔧 Implementation Plan</h3>
  <p style="margin: 0;">${data.implementationPlan}</p>
</div>

<div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #dc3545;">
  <h3 style="color: #721c24; margin-top: 0;">🔄 Backout Plan</h3>
  <p style="margin: 0;">${data.backoutPlan}</p>
</div>

<div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #28a745;">
  <h3 style="color: #155724; margin-top: 0;">✅ Validation Plan</h3>
  <p style="margin: 0;">${data.validationPlan || 'Not specified'}</p>
</div>

<div style="background-color: #e2e3e5; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #6c757d;">
  <h3 style="color: #383d41; margin-top: 0;">⚠️ Risk Assessment Details</h3>
  <table style="width: 100%; border-collapse: collapse;">
    <tr><td style="padding: 5px; font-weight: bold; width: 30%;">Overall Risk Level:</td><td style="padding: 5px; color: ${data.riskAssessment?.riskLevel === 'High' ? '#e74c3c' : data.riskAssessment?.riskLevel === 'Medium' ? '#f39c12' : '#27ae60'}; font-weight: bold;">${data.riskAssessment?.riskLevel?.toUpperCase() || 'Not assessed'}</td></tr>
    <tr><td style="padding: 5px; font-weight: bold;">Total Risk Score:</td><td style="padding: 5px;">${data.riskAssessment?.totalScore || 0}/15</td></tr>
  </table>
</div>
`;

    // Add associated assets with enhanced formatting
    if (data.selectedAssets?.length > 0) {
      description += `
<div style="background-color: #fff; padding: 15px; border-radius: 5px; margin: 10px 0; border: 1px solid #dee2e6;">
  <h3 style="color: #495057; margin-top: 0;">🖥️ Associated Assets (${data.selectedAssets.length})</h3>
  <table style="width: 100%; border-collapse: collapse; border: 1px solid #dee2e6;">
    <thead>
      <tr style="background-color: #f8f9fa;">
        <th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">Asset Name</th>
        <th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">Asset Tag</th>
        <th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">Type</th>
        <th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">Asset ID</th>
      </tr>
    </thead>
    <tbody>`;
      
      data.selectedAssets.forEach(asset => {
        description += `
      <tr>
        <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>${asset.name}</strong></td>
        <td style="padding: 10px; border: 1px solid #dee2e6;">${asset.asset_tag || 'No tag'}</td>
        <td style="padding: 10px; border: 1px solid #dee2e6;">${asset.asset_type_name || 'Unknown type'}</td>
        <td style="padding: 10px; border: 1px solid #dee2e6;">${asset.id}</td>
      </tr>`;
      });
      
      description += `
    </tbody>
  </table>
</div>`;
    }

    // Add approvers with enhanced formatting
    if (impactedData.approvers?.length > 0) {
      description += `
<div style="background-color: #fff; padding: 15px; border-radius: 5px; margin: 10px 0; border: 1px solid #28a745;">
  <h3 style="color: #155724; margin-top: 0;">✅ Identified Approvers (${impactedData.approvers.length})</h3>
  <table style="width: 100%; border-collapse: collapse; border: 1px solid #28a745;">
    <thead>
      <tr style="background-color: #d4edda;">
        <th style="padding: 10px; border: 1px solid #28a745; text-align: left;">Name</th>
        <th style="padding: 10px; border: 1px solid #28a745; text-align: left;">Email</th>
        <th style="padding: 10px; border: 1px solid #28a745; text-align: left;">Source</th>
      </tr>
    </thead>
    <tbody>`;
      
      impactedData.approvers.forEach(approver => {
        description += `
      <tr>
        <td style="padding: 10px; border: 1px solid #28a745;"><strong>${approver.name}</strong></td>
        <td style="padding: 10px; border: 1px solid #28a745;">${approver.email}</td>
        <td style="padding: 10px; border: 1px solid #28a745;">${approver.source}</td>
      </tr>`;
      });
      
      description += `
    </tbody>
  </table>
</div>`;
    }

    // Add stakeholders with enhanced formatting
    if (impactedData.stakeholders?.length > 0) {
      description += `
<div style="background-color: #fff; padding: 15px; border-radius: 5px; margin: 10px 0; border: 1px solid #17a2b8;">
  <h3 style="color: #0c5460; margin-top: 0;">👥 Identified Stakeholders (${impactedData.stakeholders.length})</h3>
  <table style="width: 100%; border-collapse: collapse; border: 1px solid #17a2b8;">
    <thead>
      <tr style="background-color: #d1ecf1;">
        <th style="padding: 10px; border: 1px solid #17a2b8; text-align: left;">Name</th>
        <th style="padding: 10px; border: 1px solid #17a2b8; text-align: left;">Email</th>
        <th style="padding: 10px; border: 1px solid #17a2b8; text-align: left;">Source</th>
      </tr>
    </thead>
    <tbody>`;
      
      impactedData.stakeholders.forEach(stakeholder => {
        description += `
      <tr>
        <td style="padding: 10px; border: 1px solid #17a2b8;"><strong>${stakeholder.name}</strong></td>
        <td style="padding: 10px; border: 1px solid #17a2b8;">${stakeholder.email}</td>
        <td style="padding: 10px; border: 1px solid #17a2b8;">${stakeholder.source}</td>
      </tr>`;
      });
      
      description += `
    </tbody>
  </table>
</div>`;
    }

    // Add summary statistics with enhanced formatting
    description += `
<div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0; border: 1px solid #6c757d;">
  <h3 style="color: #495057; margin-top: 0;">📈 Change Summary</h3>
  <div style="display: flex; flex-wrap: wrap; gap: 20px;">
    <div style="flex: 1; min-width: 200px;">
      <div style="background-color: #007bff; color: white; padding: 10px; border-radius: 5px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold;">${data.selectedAssets?.length || 0}</div>
        <div>Assets Affected</div>
      </div>
    </div>
    <div style="flex: 1; min-width: 200px;">
      <div style="background-color: #28a745; color: white; padding: 10px; border-radius: 5px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold;">${impactedData.approvers?.length || 0}</div>
        <div>Approvers Required</div>
      </div>
    </div>
    <div style="flex: 1; min-width: 200px;">
      <div style="background-color: #17a2b8; color: white; padding: 10px; border-radius: 5px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold;">${impactedData.stakeholders?.length || 0}</div>
        <div>Stakeholders to Notify</div>
      </div>
    </div>
    <div style="flex: 1; min-width: 200px;">
      <div style="background-color: #6c757d; color: white; padding: 10px; border-radius: 5px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold;">${data.changeType || 'Normal'}</div>
        <div>Change Category</div>
      </div>
    </div>
  </div>
</div>

<hr style="margin: 20px 0; border: none; border-top: 2px solid #dee2e6;">
<p style="text-align: center; color: #6c757d; font-style: italic; margin: 0;">
  <em>This change request was created using the Freshworks Change Management App.</em>
</p>

</div>
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
