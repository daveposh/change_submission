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
      const changeRequestData = this.prepareChangeRequestData();

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
  prepareChangeRequestData() {
    console.log('📦 Preparing change request data...');

    const data = window.changeRequestData;
    const impactedData = window.ImpactedServices?.getImpactedServicesData() || {};

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
      planned_start_date: data.plannedStart,
      planned_end_date: data.plannedEnd,
      custom_fields: {
        risk_level: data.riskAssessment?.riskLevel || 'Medium',
        risk_score: data.riskAssessment?.totalScore || 0,
        associated_asset_ids: assetIds.join(','),
        approver_count: impactedData.approvers?.length || 0,
        stakeholder_count: impactedData.stakeholders?.length || 0,
        change_category: data.changeType || 'normal',
        implementation_plan: data.implementationPlan,
        backout_plan: data.backoutPlan,
        validation_plan: data.validationPlan || 'Not specified'
      }
    };

    // Add assets if any are selected
    if (assetIds.length > 0) {
      changeRequestData.assets = assetIds.map(id => ({ display_id: id }));
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
<h3>Change Request Details</h3>

<h4>Reason for Change:</h4>
<p>${data.reasonForChange}</p>

<h4>Implementation Plan:</h4>
<p>${data.implementationPlan}</p>

<h4>Backout Plan:</h4>
<p>${data.backoutPlan}</p>

<h4>Validation Plan:</h4>
<p>${data.validationPlan || 'Not specified'}</p>

<h4>Risk Assessment:</h4>
<ul>
  <li><strong>Risk Level:</strong> ${data.riskAssessment?.riskLevel?.toUpperCase() || 'Not assessed'}</li>
  <li><strong>Risk Score:</strong> ${data.riskAssessment?.totalScore || 0}/15</li>
</ul>
`;

    // Add associated assets
    if (data.selectedAssets?.length > 0) {
      description += `
<h4>Associated Assets (${data.selectedAssets.length}):</h4>
<ul>`;
      data.selectedAssets.forEach(asset => {
        description += `<li><strong>${asset.name}</strong> (${asset.asset_tag || 'No tag'})</li>`;
      });
      description += '</ul>';
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

      if (!data.change) {
        console.error('❌ Response missing change object:', data);
        
        // Check for error messages in the response
        if (data.errors) {
          const errorMessages = Array.isArray(data.errors) 
            ? data.errors.map(err => err.message || err).join(', ')
            : JSON.stringify(data.errors);
          throw new Error(`API validation errors: ${errorMessages}`);
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
        console.warn(`⚠️ Failed to send approval notification to ${approver.email}:`, error);
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
    const impactedAssetsList = this.formatImpactedAssetsList();

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
        console.warn(`⚠️ Failed to send stakeholder notification to ${stakeholder.email}:`, error);
      }
    }

    console.log(`✅ Stakeholder notifications completed (${this.state.sentNotifications.filter(n => n.type === 'stakeholder').length} sent)`);
  },

  /**
   * Create peer review tasks for assigned agent
   */
  async createPeerReviewTasks(changeRequest) {
    console.log('👥 Creating peer review tasks...');

    const assignedAgent = window.changeRequestData.selectedAgent;
    if (!assignedAgent) {
      console.log('ℹ️ No assigned agent, skipping peer review task creation');
      return;
    }

    // Determine if peer review is needed based on risk level
    const riskLevel = window.changeRequestData.riskAssessment?.riskLevel || 'Medium';
    if (riskLevel === 'Low') {
      console.log('ℹ️ Low risk change, skipping peer review');
      return;
    }

    try {
      const changeUrl = await this.getChangeRequestUrl(changeRequest.id);
      
      const taskContent = this.renderEmailTemplate('peerReviewTask', {
        change_title: changeRequest.subject,
        requester_name: window.changeRequestData.selectedRequester.name,
        risk_level: riskLevel.toUpperCase(),
        planned_start: this.formatDate(changeRequest.planned_start_date),
        planned_end: this.formatDate(changeRequest.planned_end_date),
        implementation_plan: window.changeRequestData.implementationPlan,
        validation_plan: window.changeRequestData.validationPlan || 'Not specified',
        change_url: changeUrl
      });

      // Create task in Freshservice
      const taskData = {
        subject: taskContent.subject,
        description: taskContent.body,
        status: 2, // Open
        priority: riskLevel === 'High' ? 3 : 2, // High or Medium priority
        agent_id: assignedAgent.id,
        source: 2, // Email
        type: 'Peer Review',
        due_by: this.calculateTaskDueDate(changeRequest.planned_start_date),
        custom_fields: {
          change_request_id: changeRequest.id,
          task_type: 'peer_review'
        }
      };

      const taskResponse = await window.client.request.invokeTemplate('createTask', {
        context: {},
        body: JSON.stringify(taskData),
        cache: false
      });

      if (taskResponse && taskResponse.response) {
        const taskData = JSON.parse(taskResponse.response);
        this.state.createdTasks.push({
          id: taskData.ticket?.id || taskData.id,
          type: 'peer_review',
          assignee: assignedAgent.id,
          timestamp: new Date().toISOString()
        });

        console.log(`✅ Peer review task created: ${taskData.ticket?.id || taskData.id}`);
      }

    } catch (error) {
      console.warn('⚠️ Error creating peer review task:', error);
      // Don't fail submission for task creation issues
    }
  },

  /**
   * Update change request with additional metadata
   */
  async updateChangeRequestMetadata(changeRequest) {
    console.log('🔄 Updating change request with workflow metadata...');

    try {
      const updateData = {
        custom_fields: {
          ...changeRequest.custom_fields,
          approval_workflow_id: this.state.approvalWorkflowId,
          notifications_sent: this.state.sentNotifications.length,
          tasks_created: this.state.createdTasks.length,
          submission_timestamp: new Date().toISOString()
        }
      };

      await window.client.request.invokeTemplate('updateChangeRequest', {
        context: {
          change_id: changeRequest.id
        },
        body: JSON.stringify(updateData),
        cache: false
      });

      console.log('✅ Change request metadata updated');

    } catch (error) {
      console.warn('⚠️ Error updating change request metadata:', error);
      // Don't fail submission for metadata update issues
    }
  },

  /**
   * Render email template with variables
   */
  renderEmailTemplate(templateName, variables) {
    const template = this.config.emailTemplates[templateName];
    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    let subject = template.subject;
    let body = template.body;

    // Replace variables in both subject and body
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), value || '');
      body = body.replace(new RegExp(placeholder, 'g'), value || '');
    });

    return { subject, body };
  },

  /**
   * Send email notification
   */
  async sendEmail(toEmail, subject, body) {
    try {
      const emailData = {
        to: toEmail,
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
        console.log(`✅ Email sent to ${toEmail}`);
        return true;
      } else {
        throw new Error('No response from email API');
      }

    } catch (error) {
      console.error(`❌ Error sending email to ${toEmail}:`, error);
      throw error;
    }
  },

  /**
   * Get change request URL for notifications
   */
  async getChangeRequestUrl(changeId) {
    try {
      // Get installation parameters to build URL
      const params = await window.client.iparams.get();
      const domain = params.freshservice_domain;
      
      if (domain) {
        return `https://${domain}/itil/changes/${changeId}`;
      } else {
        return `#change-${changeId}`;
      }
    } catch (error) {
      console.warn('⚠️ Could not build change request URL:', error);
      return `#change-${changeId}`;
    }
  },

  /**
   * Format impacted assets list for email
   */
  formatImpactedAssetsList() {
    const assets = window.changeRequestData.selectedAssets || [];
    return assets.map(asset => 
      `<li><strong>${asset.name}</strong> (${asset.asset_tag || 'No tag'}) - ${asset.asset_type_name || 'Unknown type'}</li>`
    ).join('');
  },

  /**
   * Format date for display
   */
  formatDate(dateString) {
    if (!dateString) return 'Not specified';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  },

  /**
   * Calculate task due date (24 hours before change start)
   */
  calculateTaskDueDate(plannedStartDate) {
    try {
      const startDate = new Date(plannedStartDate);
      const dueDate = new Date(startDate.getTime() - (24 * 60 * 60 * 1000)); // 24 hours before
      return dueDate.toISOString();
    } catch (error) {
      // Default to 2 days from now
      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 2);
      return defaultDue.toISOString();
    }
  },

  /**
   * Show submission status
   */
  showSubmissionStatus(show) {
    const statusElement = document.getElementById('submission-status');
    if (statusElement) {
      statusElement.style.display = show ? 'block' : 'none';
    }

    const submitBtn = document.getElementById('submit-change-btn');
    if (submitBtn) {
      submitBtn.disabled = show;
      if (show) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Submitting...';
      } else {
        submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Submit Change Request';
      }
    }
  },

  /**
   * Show submission success
   */
  async showSubmissionSuccess(changeRequest) {
    console.log('🎉 Showing submission success...');

    const successData = {
      changeId: changeRequest.id,
      changeNumber: `CR-${changeRequest.id}`,
      approversNotified: this.state.sentNotifications.filter(n => n.type === 'approval').length,
      stakeholdersNotified: this.state.sentNotifications.filter(n => n.type === 'stakeholder').length,
      tasksCreated: this.state.createdTasks.length,
      changeUrl: await this.getChangeRequestUrl(changeRequest.id)
    };

    // Show success notification
    if (window.showNotification) {
      window.showNotification('success', 
        `Change request ${successData.changeNumber} submitted successfully! ` +
        `${successData.approversNotified} approvers and ${successData.stakeholdersNotified} stakeholders notified.`
      );
    }

    // Update UI with success details
    this.displaySubmissionSummary(successData);

    // Show option to view change request
    setTimeout(() => {
      if (window.showNotification) {
        window.showNotification('info', 
          `Would you like to view the change request in Freshservice? Click the "View Change Request" button above.`
        );
      }
    }, 2000);
  },

  /**
   * Show submission error
   */
  showSubmissionError(error) {
    console.error('❌ Showing submission error:', error);

    if (window.showNotification) {
      window.showNotification('danger', 
        `Failed to submit change request: ${error.message}`
      );
    }

    // Show detailed error information
    const errorDetails = {
      message: error.message,
      timestamp: new Date().toISOString(),
      submissionId: this.state.submissionId,
      notificationsSent: this.state.sentNotifications.length,
      tasksCreated: this.state.createdTasks.length
    };

    console.log('📊 Error details:', errorDetails);
  },

  /**
   * Display submission summary
   */
  displaySubmissionSummary(successData) {
    const summaryHtml = `
      <div class="alert alert-success">
        <h4><i class="fas fa-check-circle me-2"></i>Change Request Submitted Successfully!</h4>
        <hr>
        <div class="row">
          <div class="col-md-6">
            <p><strong>Change Number:</strong> ${successData.changeNumber}</p>
            <p><strong>Change ID:</strong> ${successData.changeId}</p>
          </div>
          <div class="col-md-6">
            <p><strong>Approvers Notified:</strong> ${successData.approversNotified}</p>
            <p><strong>Stakeholders Notified:</strong> ${successData.stakeholdersNotified}</p>
            <p><strong>Tasks Created:</strong> ${successData.tasksCreated}</p>
          </div>
        </div>
        <hr>
        <p class="mb-0">
          <a href="${successData.changeUrl}" target="_blank" class="btn btn-primary">
            <i class="fas fa-external-link-alt me-2"></i>View Change Request
          </a>
        </p>
      </div>
    `;

    // Find a container to show the summary
    const summaryContainer = document.getElementById('submission-summary') || 
                            document.querySelector('.tab-content');
    
    if (summaryContainer) {
      summaryContainer.innerHTML = summaryHtml;
    }
  },

  /**
   * Get submission status for external access
   */
  getSubmissionStatus() {
    return {
      isSubmitting: this.state.isSubmitting,
      submissionId: this.state.submissionId,
      approvalWorkflowId: this.state.approvalWorkflowId,
      notificationsSent: this.state.sentNotifications.length,
      tasksCreated: this.state.createdTasks.length
    };
  }
};

// Make ChangeSubmission available globally
window.ChangeSubmission = ChangeSubmission; 