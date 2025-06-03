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

    // REQUIRED FIELD VALIDATION - All fields specified as required

    // 1. Subject (Title) - REQUIRED
    if (!window.changeRequestData.changeTitle?.trim()) {
      errors.push('Subject (Change title) is required');
    }

    // 2. Description - REQUIRED (use new description field or fallback to reason)
    if (!window.changeRequestData.changeDescription?.trim() && !window.changeRequestData.reasonForChange?.trim()) {
      errors.push('Description is required (either in Description field or Reason for Change)');
    }

    // 3. Workspace - REQUIRED (handled automatically via configuration)
    // Note: workspace_id is set automatically from configuration, no validation needed

    // 4. Requester - REQUIRED
    if (!window.changeRequestData.selectedRequester?.id) {
      errors.push('Requester must be selected');
    }

    // 5. Change Type - REQUIRED
    if (!window.changeRequestData.changeType) {
      errors.push('Change Type must be selected');
    }

    // 6. Status - REQUIRED (handled automatically - defaults to Open)
    // Note: Status is set automatically to Open (1), no validation needed

    // 7. Priority - REQUIRED (calculated automatically from change type and risk)
    // Note: Priority is calculated automatically, but we need risk assessment for calculation

    // 8. Impact - REQUIRED (calculated automatically from risk assessment)
    // Note: Impact is calculated automatically, but we need risk assessment for calculation

    // 9. Risk - REQUIRED (from risk assessment)
    if (!window.changeRequestData.riskAssessment?.riskLevel) {
      errors.push('Risk assessment must be completed (required for Priority, Impact, and Risk fields)');
    }

    // ADDITIONAL REQUIRED FIELDS FOR BUSINESS LOGIC

    // Implementation plan - Business requirement
    if (!window.changeRequestData.implementationPlan?.trim()) {
      errors.push('Implementation plan is required');
    }

    // Backout plan - Business requirement
    if (!window.changeRequestData.backoutPlan?.trim()) {
      errors.push('Backout plan is required');
    }

    // Planned dates - Business requirement
    if (!window.changeRequestData.plannedStart) {
      errors.push('Planned start date is required');
    }

    if (!window.changeRequestData.plannedEnd) {
      errors.push('Planned end date is required');
    }

    // Agent assignment - Business requirement
    if (!window.changeRequestData.selectedAgent?.id) {
      errors.push('Assigned agent must be selected');
    }

    // Asset association - Business requirement
    if (!window.changeRequestData.selectedAssets?.length) {
      errors.push('At least one asset must be associated');
    }

    // Impacted services analysis - Business requirement
    if (window.ImpactedServices) {
      const impactedData = window.ImpactedServices.getImpactedServicesData();
      if (!impactedData.analysisComplete) {
        errors.push('Impacted services analysis must be completed');
      }
    }

    const isValid = errors.length === 0;
    
    console.log('🔍 Validation result:', {
      isValid,
      errorCount: errors.length,
      errors: errors
    });

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

    // Debug: Log the data sources being used
    console.log('🔍 DATA SOURCES DEBUG:');
    console.log('  window.changeRequestData:', window.changeRequestData);
    console.log('  data parameter:', data);
    console.log('  impactedData:', impactedData);
    
    // Debug: Log specific field values from different sources
    console.log('🔍 FIELD VALUES FROM DIFFERENT SOURCES:');
    console.log(`  window.changeRequestData.reasonForChange: "${window.changeRequestData?.reasonForChange}"`);
    console.log(`  data.reasonForChange: "${data?.reasonForChange}"`);
    console.log(`  window.changeRequestData.implementationPlan: "${window.changeRequestData?.implementationPlan}"`);
    console.log(`  data.implementationPlan: "${data?.implementationPlan}"`);
    console.log(`  window.changeRequestData.backoutPlan: "${window.changeRequestData?.backoutPlan}"`);
    console.log(`  data.backoutPlan: "${data?.backoutPlan}"`);
    console.log(`  window.changeRequestData.validationPlan: "${window.changeRequestData?.validationPlan}"`);
    console.log(`  data.validationPlan: "${data?.validationPlan}"`);

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

    // Calculate priority based on change type and risk level
    let priority = this.calculatePriority(data.changeType, data.riskAssessment?.riskLevel);

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

    // Generate risk summary based on questionnaire responses
    const riskSummary = this.generateRiskSummary(data.riskAssessment);

    // Generate impact summary based on questionnaire and assets
    const impactSummary = this.generateImpactSummary(data.riskAssessment, data.selectedAssets, impactedData);

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

    // Prepare the change request data according to Freshservice API v2 format
    // Mapping all REQUIRED fields as specified:
    const changeRequestData = {
      // REQUIRED: Subject (Title)
      subject: data.changeTitle || 'Untitled Change Request',
      
      // REQUIRED: Description - Enhanced with rich formatted information
      description: this.createEnhancedDescription(data, impactedData, data.riskAssessment),
      
      // REQUIRED: Workspace - Always required field
      workspace_id: workspaceId, // Default to workspace 2 ("CXI Change Management")
      
      // REQUIRED: Requester
      requester_id: data.selectedRequester?.id,
      
      // REQUIRED: Change Type - Map to Freshservice values
      change_type: change_type, // 4=Emergency, 6=Normal Change
      
      // REQUIRED: Status - Default to Open
      status: 1, // 1 = Open (required default)
      
      // REQUIRED: Priority - Calculated based on change type and risk
      priority: priority, // 1=Low, 2=Medium, 3=High, 4=Urgent
      
      // REQUIRED: Impact - Calculated based on risk and scope
      impact: impact, // 1=Low, 2=Medium, 3=High
      
      // REQUIRED: Risk - Based on risk assessment
      risk: risk, // 1=Low, 2=Medium, 3=High, 4=Very High
      
      // OPTIONAL: Agent assignment
      agent_id: data.selectedAgent?.id,
      
      // OPTIONAL: Dates
      planned_start_date: formatDateForAPI(data.plannedStart),
      planned_end_date: formatDateForAPI(data.plannedEnd),
      
      // OPTIONAL: Planning fields structure (matching actual API structure)
      planning_fields: {}
    };

    // Add department_id if configured
    if (departmentId && departmentId !== null) {
      changeRequestData.department_id = departmentId;
      console.log('🏢 Adding department_id to request:', departmentId);
    } else {
      console.log('🏢 No department_id configured, skipping department assignment');
    }

    // Add custom fields structure to match the expected format (based on actual schema)
    changeRequestData.custom_fields = {
      risks: riskSummary,
      lf_technical_owner: await this.getTechnicalOwnerUserId(data.selectedAssets)
    };

    // Add planning fields only if they have content (avoid null values)
    console.log('🔍 DEBUGGING PLANNING FIELDS POPULATION:');
    console.log(`  Raw data.reasonForChange: "${data.reasonForChange}"`);
    console.log(`  Trimmed data.reasonForChange: "${data.reasonForChange?.trim()}"`);
    console.log(`  Boolean check: ${!!data.reasonForChange?.trim()}`);
    
    if (data.reasonForChange?.trim()) {
      console.log('✅ Adding reason_for_change to planning_fields');
      changeRequestData.planning_fields.reason_for_change = {
        description_text: data.reasonForChange,
        description_html: `<div dir="ltr">${data.reasonForChange}</div>`
      };
    } else {
      console.log('❌ Skipping reason_for_change - no content');
    }

    console.log(`  Raw impactSummary: "${impactSummary}"`);
    console.log(`  Trimmed impactSummary: "${impactSummary?.trim()}"`);
    console.log(`  Boolean check: ${!!impactSummary?.trim()}`);
    
    if (impactSummary?.trim()) {
      console.log('✅ Adding change_impact to planning_fields');
      changeRequestData.planning_fields.change_impact = {
        description_text: impactSummary,
        description_html: `<div dir="ltr">${impactSummary.replace(/\n/g, '<br>')}</div>`
      };
    } else {
      console.log('❌ Skipping change_impact - no content');
    }

    console.log(`  Raw data.implementationPlan: "${data.implementationPlan}"`);
    console.log(`  Trimmed data.implementationPlan: "${data.implementationPlan?.trim()}"`);
    console.log(`  Boolean check: ${!!data.implementationPlan?.trim()}`);
    
    if (data.implementationPlan?.trim()) {
      console.log('✅ Adding rollout_plan to planning_fields');
      changeRequestData.planning_fields.rollout_plan = {
        description_text: data.implementationPlan,
        description_html: `<div dir="ltr">${data.implementationPlan.replace(/\n/g, '<br>')}</div>`
      };
    } else {
      console.log('❌ Skipping rollout_plan - no content');
    }

    console.log(`  Raw data.backoutPlan: "${data.backoutPlan}"`);
    console.log(`  Trimmed data.backoutPlan: "${data.backoutPlan?.trim()}"`);
    console.log(`  Boolean check: ${!!data.backoutPlan?.trim()}`);
    
    if (data.backoutPlan?.trim()) {
      console.log('✅ Adding backout_plan to planning_fields');
      changeRequestData.planning_fields.backout_plan = {
        description_text: data.backoutPlan,
        description_html: `<div dir="ltr">${data.backoutPlan.replace(/\n/g, '<br>')}</div>`
      };
    } else {
      console.log('❌ Skipping backout_plan - no content');
    }

    // Initialize custom_fields if needed
    if (!changeRequestData.planning_fields.custom_fields) {
      changeRequestData.planning_fields.custom_fields = {};
    }
    
    // 1. Validation Plan (only custom planning field)
    if (data.validationPlan?.trim()) {
      console.log('✅ Adding cfp_validation to planning_fields');
      changeRequestData.planning_fields.custom_fields.cfp_validation = {
        description_text: data.validationPlan,
        description_html: `<div dir="ltr">${data.validationPlan.replace(/\n/g, '<br>')}</div>`
      };
    } else {
      console.log('❌ Skipping cfp_validation - no content');
    }

    console.log('✅ Change request data prepared:', {
      subject: changeRequestData.subject,
      change_type: changeRequestData.change_type,
      priority: changeRequestData.priority,
      calculatedFromRisk: `${data.changeType}+${data.riskAssessment?.riskLevel}→${priority}`,
      risk: changeRequestData.risk,
      impact: changeRequestData.impact,
      workspace_id: changeRequestData.workspace_id,
      assetCount: data.selectedAssets?.length || 0,
      approverCount: impactedData.approvers?.length || 0,
      hasDepartment: !!changeRequestData.department_id,
      hasDefaultFields: !!(changeRequestData.change_reason || changeRequestData.change_impact || changeRequestData.change_plan || changeRequestData.backout_plan),
      hasPlanningFields: !!changeRequestData.planning_fields && Object.keys(changeRequestData.planning_fields).length > 0,
      planningFieldsCount: changeRequestData.planning_fields ? Object.keys(changeRequestData.planning_fields).length : 0,
      planningFieldsData: changeRequestData.planning_fields,
      hasCustomFields: Object.keys(changeRequestData.custom_fields).length > 0,
      hasRiskSummary: !!changeRequestData.custom_fields.risks,
      riskSummaryLength: changeRequestData.custom_fields.risks ? changeRequestData.custom_fields.risks.length : 0,
      hasImpactSummary: !!impactSummary,
      impactSummaryLength: impactSummary ? impactSummary.length : 0,
      hasTechnicalOwner: !!(await this.getTechnicalOwnerUserId(data.selectedAssets)),
      technicalOwnerUserId: await this.getTechnicalOwnerUserId(data.selectedAssets) || 'None identified'
    });

    // Log detailed mapping of all REQUIRED fields
    console.log('📋 REQUIRED FIELDS MAPPING:');
    console.log(`  1. Workspace: ${changeRequestData.workspace_id} (${changeRequestData.workspace_id ? '✅' : '❌'})`);
    console.log(`  2. Requester: ${changeRequestData.requester_id} (${changeRequestData.requester_id ? '✅' : '❌'})`);
    console.log(`  3. Subject: "${changeRequestData.subject}" (${changeRequestData.subject ? '✅' : '❌'})`);
    console.log(`  4. Change Type: ${changeRequestData.change_type} (${changeRequestData.change_type ? '✅' : '❌'})`);
    console.log(`  5. Status: ${changeRequestData.status} (${changeRequestData.status ? '✅' : '❌'})`);
    console.log(`  6. Priority: ${changeRequestData.priority} (${changeRequestData.priority ? '✅' : '❌'})`);
    console.log(`  7. Impact: ${changeRequestData.impact} (${changeRequestData.impact ? '✅' : '❌'})`);
    console.log(`  8. Risk: ${changeRequestData.risk} (${changeRequestData.risk ? '✅' : '❌'})`);
    console.log(`  9. Description: "${changeRequestData.description?.substring(0, 100)}..." (${changeRequestData.description ? '✅' : '❌'})`);

    // Log custom fields details
    console.log('📋 CUSTOM FIELDS:');
    const technicalOwnerUserId = await this.getTechnicalOwnerUserId(data.selectedAssets);
    console.log(`  • Technical Owner: ${technicalOwnerUserId || 'NULL'} (${technicalOwnerUserId ? '✅' : '❌'})`);
    console.log(`  • Risk Summary: ${changeRequestData.custom_fields.risks ? 'Present' : 'NULL'} (${changeRequestData.custom_fields.risks ? '✅' : '❌'})`);
    
    // Log planning fields details
    console.log('📋 PLANNING FIELDS:');
    console.log(`  • Reason for Change: ${changeRequestData.planning_fields.reason_for_change ? 'Present' : 'NULL'} (${changeRequestData.planning_fields.reason_for_change ? '✅' : '❌'})`);
    console.log(`  • Change Impact: ${changeRequestData.planning_fields.change_impact ? 'Present' : 'NULL'} (${changeRequestData.planning_fields.change_impact ? '✅' : '❌'})`);
    console.log(`  • Rollout Plan: ${changeRequestData.planning_fields.rollout_plan ? 'Present' : 'NULL'} (${changeRequestData.planning_fields.rollout_plan ? '✅' : '❌'})`);
    console.log(`  • Backout Plan: ${changeRequestData.planning_fields.backout_plan ? 'Present' : 'NULL'} (${changeRequestData.planning_fields.backout_plan ? '✅' : '❌'})`);
    console.log(`  • Validation Plan: ${changeRequestData.planning_fields.custom_fields?.cfp_validation ? 'Present' : 'NULL'} (${changeRequestData.planning_fields.custom_fields?.cfp_validation ? '✅' : '❌'})`);
    
    // Log source data for planning fields
    console.log('📋 SOURCE DATA FOR PLANNING FIELDS:');
    console.log(`  • data.reasonForChange: "${data.reasonForChange || 'NULL'}" (${data.reasonForChange?.trim() ? '✅' : '❌'})`);
    console.log(`  • impactSummary: "${impactSummary?.substring(0, 100) || 'NULL'}..." (${impactSummary?.trim() ? '✅' : '❌'})`);
    console.log(`  • data.implementationPlan: "${data.implementationPlan?.substring(0, 100) || 'NULL'}..." (${data.implementationPlan?.trim() ? '✅' : '❌'})`);
    console.log(`  • data.backoutPlan: "${data.backoutPlan?.substring(0, 100) || 'NULL'}..." (${data.backoutPlan?.trim() ? '✅' : '❌'})`);
    console.log(`  • data.validationPlan: "${data.validationPlan?.substring(0, 100) || 'NULL'}..." (${data.validationPlan?.trim() ? '✅' : '❌'})`);
    
    // Log technical owner identification process
    if (!technicalOwnerUserId) {
      console.warn('⚠️ TECHNICAL OWNER WARNING: No technical owner user ID identified');
      console.warn('   This will result in lf_technical_owner being set to null in the change request');
      console.warn('   Reasons this might happen:');
      console.warn('   1. Selected assets have no managed_by, agent_id, or user_id fields populated');
      console.warn('   2. Asset manager user IDs exist but users don\'t exist in the system');
      console.warn('   3. User lookup failed for asset manager IDs');
      console.warn('   4. No assigned agent or requester ID available as fallback');
    } else {
      console.log(`✅ Technical owner user ID successfully identified: ${technicalOwnerUserId}`);
    }

    console.log('📦 Final change request data structure:', JSON.stringify(changeRequestData, null, 2));

    return changeRequestData;
  },

  /**
   * Create enhanced description with rich formatting for change request
   * Incorporates risk assessment and service impact information
   */
  createEnhancedDescription(data, impactedData, riskAssessment) {
    console.log('📝 Creating enhanced description with risk and impact information...');
    
    // Start with user-provided description
    let description = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">`;
    
    // Main description section
    description += `<div style="margin-bottom: 20px;">`;
    description += `<h3 style="color: #0066cc; border-bottom: 2px solid #0066cc; padding-bottom: 5px; margin-bottom: 15px;">📋 Change Description</h3>`;
    description += `<p><strong>${data.changeDescription || data.reasonForChange || 'No description provided'}</strong></p>`;
    if (data.changeDescription && data.reasonForChange && data.changeDescription !== data.reasonForChange) {
      description += `<p><em>Reason for Change:</em> ${data.reasonForChange}</p>`;
    }
    description += `</div>`;

    // Risk Assessment Section (if available)
    if (riskAssessment && riskAssessment.riskLevel) {
      const riskColor = {
        'Low': '#28a745',
        'Medium': '#ffc107', 
        'High': '#dc3545'
      }[riskAssessment.riskLevel] || '#6c757d';
      
      description += `<div style="margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-left: 4px solid ${riskColor};">`;
      description += `<h3 style="color: #0066cc; margin-top: 0; margin-bottom: 15px;">⚠️ Risk Assessment</h3>`;
      description += `<div style="display: flex; align-items: center; margin-bottom: 10px;">`;
      description += `<span style="background-color: ${riskColor}; color: white; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 14px;">${riskAssessment.riskLevel?.toUpperCase()} RISK</span>`;
      description += `<span style="margin-left: 15px; color: #666;">Score: ${riskAssessment.totalScore || 0}/15</span>`;
      description += `</div>`;
      
      // Risk factors breakdown
      description += `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-top: 15px;">`;
      
      const riskFactors = [
        { key: 'businessImpact', label: 'Business Impact', value: riskAssessment.businessImpact },
        { key: 'affectedUsers', label: 'User Impact', value: riskAssessment.affectedUsers },
        { key: 'complexity', label: 'Complexity', value: riskAssessment.complexity },
        { key: 'testing', label: 'Testing Level', value: riskAssessment.testing },
        { key: 'rollback', label: 'Rollback Risk', value: riskAssessment.rollback }
      ];
      
      riskFactors.forEach(factor => {
        const score = factor.value || 0;
        const barColor = score >= 3 ? '#dc3545' : score >= 2 ? '#ffc107' : '#28a745';
        description += `<div style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #ddd;">`;
        description += `<div style="font-size: 12px; color: #666; margin-bottom: 4px;">${factor.label}</div>`;
        description += `<div style="display: flex; align-items: center;">`;
        description += `<div style="flex: 1; background: #e9ecef; height: 6px; border-radius: 3px; margin-right: 8px;">`;
        description += `<div style="height: 100%; background: ${barColor}; width: ${(score/3)*100}%; border-radius: 3px;"></div>`;
        description += `</div>`;
        description += `<span style="font-size: 12px; font-weight: bold;">${score}/3</span>`;
        description += `</div></div>`;
      });
      
      description += `</div></div>`;
    }

    // Service Impact Section with comprehensive risk and impact information
    
