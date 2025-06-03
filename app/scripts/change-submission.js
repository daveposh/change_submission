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

    // Map change type to Freshservice values (this instance only accepts 4 or 6)
    const changeTypeMapping = {
      'minor': 4,      // Minor change
      'major': 6,      // Major change  
      'normal': 4,     // Normal change (map to minor)
      'emergency': 6   // Emergency change (map to major)
    };
    const change_type = changeTypeMapping[data.changeType] || 4; // default to minor (4)

    // Map risk level to Freshservice values
    const riskMapping = {
      'Low': 1,
      'Medium': 2,
      'High': 3
    };
    const risk = riskMapping[data.riskAssessment?.riskLevel] || 2; // default to medium

    // Map impact (assuming medium impact for now, can be enhanced later)
    const impact = 2; // Medium impact

    // Prepare asset associations using display_id (not internal ID)
    const assetDisplayIds = [];
    if (data.selectedAssets?.length > 0) {
      data.selectedAssets.forEach(asset => {
        // Use display_id if available, otherwise fall back to ID
        const displayId = asset.display_id || asset.id;
        if (displayId) {
          assetDisplayIds.push(displayId);
        }
      });
    }

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
    } else {
      console.log('🏢 No workspace_id configured, skipping workspace assignment');
    }

    // Note: Custom fields don't exist in this Freshservice instance
    // All additional details are included in the description instead

    // Add assets if any are selected - try simpler format first
    if (assetDisplayIds.length > 0) {
      // Try different asset formats to see which one works
      // Format 1: Simple array of IDs
      changeRequestData.assets = assetDisplayIds;
      console.log('🔗 Adding assets to change request (simple format):', assetDisplayIds);
      
      // Log asset details for debugging
      console.log('🔍 Asset details being sent:');
      data.selectedAssets.forEach(asset => {
        const displayId = asset.display_id || asset.id;
        console.log(`   - Asset: ${asset.name}, Internal ID: ${asset.id}, Display ID: ${displayId}, Tag: ${asset.asset_tag || 'N/A'}`);
      });
      
      // Log the display IDs that will be sent to the API
      console.log('🔗 Display IDs being sent to API:', assetDisplayIds);
    } else {
      console.log('🔗 No assets selected, skipping asset association');
    }

    console.log('✅ Change request data prepared:', {
      subject: changeRequestData.subject,
      change_type: changeRequestData.change_type,
      priority: changeRequestData.priority,
      risk: changeRequestData.risk,
      impact: changeRequestData.impact,
      assetCount: assetDisplayIds.length,
      approverCount: impactedData.approvers?.length || 0,
      hasWorkspace: !!changeRequestData.workspace_id,
      hasAssets: !!changeRequestData.assets
    });

    console.log('📦 Final change request data structure:', JSON.stringify(changeRequestData, null, 2));

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
        <th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">Display ID</th>
        <th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">Asset Tag</th>
        <th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">Type</th>
      </tr>
    </thead>
    <tbody>`;
      
      data.selectedAssets.forEach(asset => {
        const displayId = asset.display_id || asset.id;
        description += `
      <tr>
        <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>${asset.name}</strong></td>
        <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>${displayId}</strong></td>
        <td style="padding: 10px; border: 1px solid #dee2e6;">${asset.asset_tag || 'No tag'}</td>
        <td style="padding: 10px; border: 1px solid #dee2e6;">${asset.asset_type_name || 'Unknown type'}</td>
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
      const response = await this.attemptChangeRequestCreation(changeRequestData);
      return response;
    } catch (error) {
      // Check if the error is related to assets OR if it's a 500 server error
      let isAssetError = false;
      let isServerError = false;
      
      // Check for HTTP 500 server errors
      if (error.status === 500) {
        isServerError = true;
        console.warn('⚠️ Server error (500) detected - this might be related to asset processing or server limitations');
      }
      
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
      
      if (isAssetError || (isServerError && changeRequestData.assets)) {
        console.warn('⚠️ Asset-related or server error detected, attempting to create change request without assets...');
        
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
          
          // If it's still a 500 error, try with a simplified description
          if (retryError.status === 500) {
            console.warn('⚠️ Still getting 500 error, trying with simplified description...');
            
            const dataWithSimpleDescription = { ...dataWithoutAssets };
            dataWithSimpleDescription.description = this.createSimplifiedDescription(window.changeRequestData, window.ImpactedServices?.getImpactedServicesData() || {});
            
            try {
              const response = await this.attemptChangeRequestCreation(dataWithSimpleDescription);
              console.log('✅ Change request created successfully with simplified description');
              console.log('ℹ️ Full details were simplified due to server limitations');
              return response;
            } catch (finalError) {
              console.error('❌ Failed even with simplified description:', finalError);
              throw finalError;
            }
          } else {
            throw retryError;
          }
        }
      } else if (isServerError) {
        // If it's a server error but no assets, try with simplified description
        console.warn('⚠️ Server error detected, trying with simplified description...');
        
        const dataWithSimpleDescription = { ...changeRequestData };
        dataWithSimpleDescription.description = this.createSimplifiedDescription(window.changeRequestData, window.ImpactedServices?.getImpactedServicesData() || {});
        
        try {
          const response = await this.attemptChangeRequestCreation(dataWithSimpleDescription);
          console.log('✅ Change request created successfully with simplified description');
          console.log('ℹ️ Full details were simplified due to server limitations');
          return response;
        } catch (finalError) {
          console.error('❌ Failed even with simplified description:', finalError);
          throw finalError;
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
   * Create a simplified description for change request
   */
  createSimplifiedDescription(data, impactedData) {
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
        <th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">Display ID</th>
        <th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">Asset Tag</th>
        <th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">Type</th>
      </tr>
    </thead>
    <tbody>`;
      
      data.selectedAssets.forEach(asset => {
        const displayId = asset.display_id || asset.id;
        description += `
      <tr>
        <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>${asset.name}</strong></td>
        <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>${displayId}</strong></td>
        <td style="padding: 10px; border: 1px solid #dee2e6;">${asset.asset_tag || 'No tag'}</td>
        <td style="padding: 10px; border: 1px solid #dee2e6;">${asset.asset_type_name || 'Unknown type'}</td>
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
  }
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
