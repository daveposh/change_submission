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
      lf_technical_owner: this.getTechnicalOwnerUserId(data.selectedAssets)
    };

    // Add planning fields only if they have content (avoid null values)
    console.log('🔍 DEBUGGING PLANNING FIELDS POPULATION:');
    console.log(`  Raw data.reasonForChange: "${data.reasonForChange}"`);
    console.log(`  Trimmed data.reasonForChange: "${data.reasonForChange?.trim()}"`);
    console.log(`  Boolean check: ${!!data.reasonForChange?.trim()}`);
    
    if (data.reasonForChange?.trim()) {
      console.log('✅ Adding reason_for_change to planning_fields');
      changeRequestData.planning_fields.reason_for_change = {
        description: data.reasonForChange
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
        description: impactSummary
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
        description: data.implementationPlan
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
        description: data.backoutPlan
      };
    } else {
      console.log('❌ Skipping backout_plan - no content');
    }

    // Initialize custom_fields if needed
    if (!changeRequestData.planning_fields.custom_fields) {
      changeRequestData.planning_fields.custom_fields = {};
    }

    // 1. Validation Plan (custom planning field)
    if (data.validationPlan?.trim()) {
      console.log('✅ Adding cfp_validation to planning_fields');
      changeRequestData.planning_fields.custom_fields.cfp_validation = {
        description: data.validationPlan
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
      hasTechnicalOwner: !!(this.getTechnicalOwnerUserId(data.selectedAssets)),
      technicalOwnerUserId: this.getTechnicalOwnerUserId(data.selectedAssets) || 'None identified'
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
    const technicalOwnerUserId = this.getTechnicalOwnerUserId(data.selectedAssets);
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
    description += `</div>`;
    
    console.log('✅ Enhanced description created with rich formatting');
    return description;
  },

  /**
   * Create change request with minimal required fields only
   */
  createMinimalChangeRequest(data) {
    console.log('📦 Creating minimal change request with only required fields...');
    
    // Calculate priority based on change type and risk level
    const priority = this.calculatePriority(data.changeType, data.riskAssessment?.riskLevel);
    
    // Generate risk summary based on questionnaire responses
    const riskSummary = this.generateRiskSummary(data.riskAssessment);
    
    // Generate impact summary (simplified for minimal request)
    const impactedData = window.ImpactedServices?.getImpactedServicesData() || {};
    const impactSummary = this.generateImpactSummary(data.riskAssessment, data.selectedAssets, impactedData);
    
    // Only include the absolute minimum required fields
    const minimalData = {
      // REQUIRED: Subject (Title)
      subject: data.changeTitle || 'Untitled Change Request',
      
      // REQUIRED: Description
      description: data.changeDescription || data.reasonForChange || 'Change request created via app',
      
      // REQUIRED: Workspace
      workspace_id: 2, // Required field - "CXI Change Management" workspace
      
      // REQUIRED: Requester
      requester_id: data.selectedRequester?.id,
      
      // REQUIRED: Change Type
      change_type: 6, // Normal Change (based on actual field choices)
      
      // REQUIRED: Status
      status: 1,      // Open
      
      // REQUIRED: Priority (calculated)
      priority: priority,    // Calculated priority based on change type and risk
      
      // REQUIRED: Impact
      impact: 2,      // Medium impact
      
      // REQUIRED: Risk
      risk: 2,        // Medium risk
      
      // OPTIONAL: Agent assignment
      agent_id: data.selectedAgent?.id,
      
      // OPTIONAL: Planning fields (matching actual API structure)
      planning_fields: {}
    };

    // Add planning fields only if they have content (avoid null values)
    if (data.reasonForChange?.trim()) {
      minimalData.planning_fields.reason_for_change = {
        description: data.reasonForChange
      };
    }

    if (impactSummary?.trim()) {
      minimalData.planning_fields.change_impact = {
        description: impactSummary
      };
    }

    if (data.implementationPlan?.trim()) {
      minimalData.planning_fields.rollout_plan = {
        description: data.implementationPlan
      };
    }

    if (data.backoutPlan?.trim()) {
      minimalData.planning_fields.backout_plan = {
        description: data.backoutPlan
      };
    }

    // Add custom planning fields only if they have content
    if (data.validationPlan?.trim()) {
      if (!minimalData.planning_fields.custom_fields) {
        minimalData.planning_fields.custom_fields = {};
      }
      minimalData.planning_fields.custom_fields.cfp_validation = {
        description: data.validationPlan
      };
    }

    // Add custom fields
    minimalData.custom_fields = {
      risks: riskSummary,
      lf_technical_owner: this.getTechnicalOwnerUserId(data.selectedAssets)
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
          throw minimalError;
        }
      }
      
      // Re-throw the original error if it's not a server error
      throw error;
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

      if (!response || !response.response) {
        throw new Error('No response received from Freshservice API');
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
        
        throw new Error(`Invalid response format - expected 'change' object but got: ${JSON.stringify(data)}`);
      }

      const changeRequest = data.change;
      console.log(`✅ Change request created successfully: CR-${changeRequest.id}`);

      return changeRequest;

    } catch (error) {
      console.error('❌ Error creating change request:', error);
      throw error;
    }
  },

  /**
   * Calculate priority based on change type and risk assessment
   */
  calculatePriority(changeType, riskLevel) {
    console.log(`🎯 Calculating priority for changeType: ${changeType}, riskLevel: ${riskLevel}`);
    
    // Emergency changes are always high priority regardless of risk
    if (changeType === 'emergency') {
      console.log('⚡ Emergency change - setting priority to Urgent (4)');
      return 4; // Urgent
    }
    
    // For normal changes, base priority on risk level
    switch (riskLevel?.toLowerCase()) {
      case 'low':
        console.log('🟢 Low risk - setting priority to Low (1)');
        return 1; // Low priority
      case 'medium':
        console.log('🟡 Medium risk - setting priority to Medium (2)');
        return 2; // Medium priority
      case 'high':
        console.log('🔴 High risk - setting priority to High (3)');
        return 3; // High priority
      default:
        console.log('❓ Unknown risk level - defaulting to Medium priority (2)');
        return 2; // Default to medium
    }
  },

  /**
   * Generate comprehensive risk summary based on questionnaire responses
   */
  generateRiskSummary(riskAssessment) {
    console.log('📊 Generating risk summary from questionnaire responses...');
    
    if (!riskAssessment || !riskAssessment.riskLevel) {
      console.warn('⚠️ No risk assessment data available');
      return 'Risk assessment not completed.';
    }

    let summary = `RISK ASSESSMENT SUMMARY\n`;
    summary += `Overall Risk Level: ${riskAssessment.riskLevel?.toUpperCase()}\n`;
    summary += `Risk Score: ${riskAssessment.totalScore || 0}/15\n\n`;
    
    summary += `DETAILED RISK FACTORS:\n\n`;
    summary += `1. BUSINESS IMPACT (Score: ${riskAssessment.businessImpact || 'N/A'}/3)\n`;
    summary += `2. AFFECTED USERS (Score: ${riskAssessment.affectedUsers || 'N/A'}/3)\n`;
    summary += `3. COMPLEXITY (Score: ${riskAssessment.complexity || 'N/A'}/3)\n`;
    summary += `4. TESTING LEVEL (Score: ${riskAssessment.testing || 'N/A'}/3)\n`;
    summary += `5. ROLLBACK CAPABILITY (Score: ${riskAssessment.rollback || 'N/A'}/3)\n\n`;
    
    summary += `Generated automatically from risk questionnaire responses.`;
    
    console.log('📋 Risk summary generated:', summary.substring(0, 200) + '...');
    return summary;
  },

  /**
   * Generate comprehensive impact summary based on questionnaire and assets
   */
  generateImpactSummary(riskAssessment, selectedAssets = [], impactedData = {}) {
    console.log('📊 Generating impact summary from questionnaire and asset data...');
    
    if (!riskAssessment || !riskAssessment.riskLevel) {
      console.warn('⚠️ No risk assessment data available for impact summary');
      return 'Impact assessment not completed.';
    }

    let summary = `CHANGE IMPACT ASSESSMENT\n\n`;
    summary += `Business Impact: ${riskAssessment.businessImpact || 'N/A'}/3\n`;
    summary += `User Impact: ${riskAssessment.affectedUsers || 'N/A'}/3\n`;
    summary += `Technical Complexity: ${riskAssessment.complexity || 'N/A'}/3\n`;
    summary += `Assets Affected: ${selectedAssets.length || 0}\n`;
    summary += `Stakeholders: ${(impactedData.approvers?.length || 0) + (impactedData.stakeholders?.length || 0)}\n\n`;
    
    summary += `Generated automatically from risk questionnaire and asset analysis.`;
    
    console.log('📋 Impact summary generated:', summary.substring(0, 200) + '...');
    return summary;
  },

  /**
   * Get technical owner user ID from asset managers
   */
  getTechnicalOwnerUserId(selectedAssets = []) {
    console.log('👤 Identifying technical owner user ID from asset managers...');
    
    if (!selectedAssets || selectedAssets.length === 0) {
      console.log('ℹ️ No assets selected, cannot determine technical owner');
      return null;
    }

    try {
      // Collect all potential manager/owner IDs from multiple fields
      const managerIds = new Set();
      selectedAssets.forEach(asset => {
        if (asset.managed_by) managerIds.add(asset.managed_by);
        if (asset.agent_id && asset.agent_id !== asset.managed_by) managerIds.add(asset.agent_id);
        if (asset.user_id && asset.user_id !== asset.managed_by && asset.user_id !== asset.agent_id) managerIds.add(asset.user_id);
      });

      if (managerIds.size === 0) {
        // Fallback: Use assigned agent or requester
        if (window.changeRequestData?.selectedAgent?.id) {
          console.log(`🔄 Using assigned agent as technical owner: ${window.changeRequestData.selectedAgent.id}`);
          return window.changeRequestData.selectedAgent.id;
        }
        
        if (window.changeRequestData?.selectedRequester?.id) {
          console.log(`🔄 Using requester as technical owner: ${window.changeRequestData.selectedRequester.id}`);
          return window.changeRequestData.selectedRequester.id;
        }
        
        return null;
      }

      // Return the first valid manager ID
      const primaryManagerId = Array.from(managerIds)[0];
      console.log(`✅ Technical owner user ID identified: ${primaryManagerId}`);
      return primaryManagerId;

    } catch (error) {
      console.error('❌ Error getting technical owner user ID:', error);
      return null;
    }
  },

  /**
   * Create approval workflow for the change request
   */
  createApprovalWorkflow() {
    console.log('✅ Setting up approval workflow...');
    // Implementation would go here
  },

  /**
   * Send stakeholder notifications
   */
  sendStakeholderNotifications() {
    console.log('📧 Sending stakeholder notifications...');
    // Implementation would go here
  },

  /**
   * Create peer review tasks for assigned agents
   */
  async createPeerReviewTasks(changeRequest) {
    console.log('👥 Creating peer review tasks...');
    
    try {
      // Get the risk assessment data
      const data = window.changeRequestData;
      const riskAssessment = data?.riskAssessment;
      
      console.log('🔍 Risk assessment data:', {
        hasRiskAssessment: !!riskAssessment,
        totalScore: riskAssessment?.totalScore,
        riskLevel: riskAssessment?.riskLevel,
        businessImpact: riskAssessment?.businessImpact,
        affectedUsers: riskAssessment?.affectedUsers,
        complexity: riskAssessment?.complexity,
        testing: riskAssessment?.testing,
        rollback: riskAssessment?.rollback
      });
      
      if (!riskAssessment || !riskAssessment.totalScore) {
        console.log('ℹ️ No risk assessment data available, skipping peer review task creation');
        return;
      }
      
      // Check if risk level requires peer review (score 7+ = Medium/High risk)
      // Risk scoring: 5-7 = Low, 8-11 = Medium, 12-15 = High
      // Peer review required for score 7+ (Medium and High risk changes)
      const requiresPeerReview = riskAssessment.totalScore >= 7;
      
      console.log(`📊 Risk threshold analysis:`, {
        totalScore: riskAssessment.totalScore,
        riskLevel: riskAssessment.riskLevel,
        threshold: 7,
        requiresPeerReview: requiresPeerReview,
        reasoning: requiresPeerReview 
          ? `Score ${riskAssessment.totalScore} >= 7 (${riskAssessment.riskLevel} risk) - Peer review required`
          : `Score ${riskAssessment.totalScore} < 7 (${riskAssessment.riskLevel} risk) - No peer review needed`
      });
      
      if (!requiresPeerReview) {
        console.log(`ℹ️ Risk score ${riskAssessment.totalScore} is below threshold (7+), no peer review required`);
        return;
      }
      
      console.log(`🎯 Risk score ${riskAssessment.totalScore} requires peer review task creation`);
      
      // Determine who should perform the peer review
      const reviewerIds = this.identifyPeerReviewers(data, changeRequest);
      
      if (!reviewerIds || reviewerIds.length === 0) {
        console.warn('⚠️ No peer reviewers identified, skipping task creation');
        return;
      }
      
      // Create peer review tasks for each reviewer
      const createdTasks = [];
      for (const reviewerId of reviewerIds) {
        try {
          const task = await this.createPeerReviewTask(changeRequest, reviewerId, riskAssessment);
          if (task) {
            createdTasks.push(task);
            this.state.createdTasks.push(task);
          }
        } catch (error) {
          console.error(`❌ Failed to create peer review task for reviewer ${reviewerId}:`, error);
        }
      }
      
      console.log(`✅ Created ${createdTasks.length} peer review tasks for change ${changeRequest.id}`);
      return createdTasks;
      
    } catch (error) {
      console.error('❌ Error creating peer review tasks:', error);
      throw error;
    }
  },

  /**
   * Identify who should perform peer review
   */
  identifyPeerReviewers(data, changeRequest) {
    console.log('🔍 Identifying peer reviewers...');
    
    const reviewers = new Set();
    
    try {
      // Option 1: Use assigned agent if available
      if (data.selectedAgent?.id && data.selectedAgent.id !== changeRequest.requester_id) {
        reviewers.add(data.selectedAgent.id);
        console.log(`✅ Added assigned agent as peer reviewer: ${data.selectedAgent.id}`);
      }
      
      // Option 2: Use technical owners from impacted services
      const impactedData = window.ImpactedServices?.getImpactedServicesData() || {};
      if (impactedData.approvers && impactedData.approvers.length > 0) {
        impactedData.approvers.forEach(approver => {
          if (approver.id && approver.id !== changeRequest.requester_id) {
            reviewers.add(approver.id);
            console.log(`✅ Added technical owner as peer reviewer: ${approver.id}`);
          }
        });
      }
      
      // Option 3: Use asset managers/owners
      if (data.selectedAssets && data.selectedAssets.length > 0) {
        data.selectedAssets.forEach(asset => {
          if (asset.managed_by && asset.managed_by !== changeRequest.requester_id) {
            reviewers.add(asset.managed_by);
            console.log(`✅ Added asset manager as peer reviewer: ${asset.managed_by}`);
          }
          if (asset.agent_id && asset.agent_id !== changeRequest.requester_id && asset.agent_id !== asset.managed_by) {
            reviewers.add(asset.agent_id);
            console.log(`✅ Added asset agent as peer reviewer: ${asset.agent_id}`);
          }
        });
      }
      
      const reviewerArray = Array.from(reviewers);
      console.log(`🎯 Identified ${reviewerArray.length} peer reviewers:`, reviewerArray);
      
      return reviewerArray;
      
    } catch (error) {
      console.error('❌ Error identifying peer reviewers:', error);
      return [];
    }
  },

  /**
   * Create a single peer review task
   */
  async createPeerReviewTask(changeRequest, reviewerId, riskAssessment) {
    console.log(`📝 Creating peer review task for reviewer ${reviewerId}...`);
    
    try {
      // Calculate due date (24 hours from now for peer review)
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + 24);
      
      // Determine priority based on risk level
      let taskPriority = 2; // Medium priority default
      if (riskAssessment.riskLevel === 'High') {
        taskPriority = 3; // High priority for high-risk changes
      }
      
      // Prepare task data
      const taskData = {
        // Required fields for ticket/task creation
        subject: `Peer Review Required: ${changeRequest.subject}`,
        description: this.generatePeerReviewTaskDescription(changeRequest, riskAssessment),
        requester_id: changeRequest.requester_id,
        responder_id: reviewerId,
        priority: taskPriority,
        status: 2, // Open status
        type: 'Incident', // Task type
        source: 2, // Portal
        
        // Due date
        fr_due_by: dueDate.toISOString(),
        
        // Custom fields to link to change request
        custom_fields: {
          // Link to the change request if custom field exists
          related_change_id: changeRequest.id
        },
        
        // Tags to identify as peer review task
        tags: ['peer-review', 'change-management', `change-${changeRequest.id}`]
      };
      
      console.log('📋 Peer review task data prepared:', {
        subject: taskData.subject,
        reviewerId: reviewerId,
        priority: taskPriority,
        riskLevel: riskAssessment.riskLevel,
        dueDate: dueDate.toISOString()
      });
      
      // Create the task using the FDK request method
      const response = await window.client.request.invokeTemplate('createTask', {
        body: JSON.stringify(taskData)
      });
      
      if (!response || !response.response) {
        throw new Error('No response received from task creation API');
      }
      
      const createdTask = JSON.parse(response.response);
      console.log(`✅ Peer review task created successfully: ${createdTask.id}`);
      
      return createdTask;
      
    } catch (error) {
      console.error(`❌ Failed to create peer review task for reviewer ${reviewerId}:`, error);
      throw error;
    }
  },

  /**
   * Generate peer review task description
   */
  generatePeerReviewTaskDescription(changeRequest, riskAssessment) {
    const data = window.changeRequestData;
    
    let description = `<div style="font-family: Arial, sans-serif; line-height: 1.6;">`;
    
    // Header
    description += `<h3 style="color: #0066cc; margin-bottom: 20px;">🔍 Peer Review Required</h3>`;
    
    // Change request details
    description += `<div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">`;
    description += `<h4 style="margin-top: 0; color: #333;">Change Request Details</h4>`;
    description += `<p><strong>Change ID:</strong> CR-${changeRequest.id}</p>`;
    description += `<p><strong>Title:</strong> ${changeRequest.subject}</p>`;
    description += `<p><strong>Requester:</strong> ${data.selectedRequester?.name || 'Unknown'}</p>`;
    description += `<p><strong>Risk Level:</strong> <span style="background-color: ${this.getRiskColor(riskAssessment.riskLevel)}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${riskAssessment.riskLevel?.toUpperCase()}</span> (${riskAssessment.totalScore}/15)</p>`;
    
    if (data.plannedStartDate) {
      description += `<p><strong>Planned Start:</strong> ${new Date(data.plannedStartDate).toLocaleString()}</p>`;
    }
    if (data.plannedEndDate) {
      description += `<p><strong>Planned End:</strong> ${new Date(data.plannedEndDate).toLocaleString()}</p>`;
    }
    description += `</div>`;
    
    // Implementation details
    if (data.implementationPlan) {
      description += `<div style="margin-bottom: 20px;">`;
      description += `<h4 style="color: #333;">Implementation Plan</h4>`;
      description += `<div style="background-color: #fff; padding: 10px; border-left: 4px solid #0066cc;">${data.implementationPlan}</div>`;
      description += `</div>`;
    }
    
    // Validation plan
    if (data.validationPlan) {
      description += `<div style="margin-bottom: 20px;">`;
      description += `<h4 style="color: #333;">Validation Plan</h4>`;
      description += `<div style="background-color: #fff; padding: 10px; border-left: 4px solid #28a745;">${data.validationPlan}</div>`;
      description += `</div>`;
    }
    
    // Review checklist
    description += `<div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">`;
    description += `<h4 style="margin-top: 0; color: #856404;">Peer Review Checklist</h4>`;
    description += `<p>Please review the technical implementation details and provide feedback on:</p>`;
    description += `<ul style="margin-bottom: 0;">`;
    description += `<li><strong>Technical Feasibility:</strong> Can this change be implemented as described?</li>`;
    description += `<li><strong>Risk Assessment:</strong> Are there additional risks or issues not considered?</li>`;
    description += `<li><strong>Alternative Approaches:</strong> Are there better or safer ways to achieve the same outcome?</li>`;
    description += `<li><strong>Testing Strategy:</strong> Is the testing approach adequate for the risk level?</li>`;
    description += `<li><strong>Rollback Plan:</strong> Is the rollback strategy sufficient and tested?</li>`;
    description += `</ul>`;
    description += `</div>`;
    
    // Instructions
    description += `<div style="margin-top: 20px; padding: 15px; background-color: #d1ecf1; border-radius: 5px;">`;
    description += `<h4 style="margin-top: 0; color: #0c5460;">Review Instructions</h4>`;
    description += `<p>Please complete your peer review within <strong>24 hours</strong> and update this task with your findings.</p>`;
    description += `<p>If you identify any concerns, please coordinate with the change requester before the implementation window.</p>`;
    description += `</div>`;
    
    description += `</div>`;
    
    return description;
  },

  /**
   * Get color for risk level badge
   */
  getRiskColor(riskLevel) {
    const colors = {
      'Low': '#28a745',
      'Medium': '#ffc107',
      'High': '#dc3545'
    };
    return colors[riskLevel] || '#6c757d';
  },

  /**
   * Update change request with additional metadata
   */
  updateChangeRequestMetadata() {
    console.log('🔄 Updating change request with workflow metadata...');
    // Implementation would go here
  },

  /**
   * Show submission success and redirect
   */
  showSubmissionSuccess(changeRequest) {
    console.log('🎉 Showing submission success...');
    
    // Get risk assessment and peer review task information
    const data = window.changeRequestData;
    const riskAssessment = data?.riskAssessment;
    const createdTasksCount = this.state.createdTasks?.length || 0;
    
    let successMessage = `
      <div class="alert alert-success" role="alert">
        <h4 class="alert-heading">✅ Change Request Submitted Successfully!</h4>
        <p><strong>Change Request ID:</strong> CR-${changeRequest.id}</p>
        <p><strong>Title:</strong> ${changeRequest.subject}</p>
    `;
    
    // Add risk level information
    if (riskAssessment) {
      const riskColor = this.getRiskColor(riskAssessment.riskLevel);
      successMessage += `
        <p><strong>Risk Level:</strong> 
          <span style="background-color: ${riskColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">
            ${riskAssessment.riskLevel?.toUpperCase()}
          </span> 
          (Score: ${riskAssessment.totalScore}/15)
        </p>
      `;
      
      // Add peer review information
      if (riskAssessment.totalScore >= 7) {
        if (createdTasksCount > 0) {
          successMessage += `
            <div class="mt-3 p-3" style="background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
              <h6 style="color: #856404; margin-bottom: 8px;">
                <i class="fas fa-users me-2"></i>Peer Review Required
              </h6>
              <p style="margin-bottom: 0; color: #856404;">
                Due to the ${riskAssessment.riskLevel} risk level, <strong>${createdTasksCount} peer review task(s)</strong> 
                have been created and assigned to technical reviewers. They have 24 hours to complete their review.
              </p>
            </div>
          `;
        } else {
          successMessage += `
            <div class="mt-3 p-3" style="background-color: #f8d7da; border-left: 4px solid #dc3545; border-radius: 4px;">
              <h6 style="color: #721c24; margin-bottom: 8px;">
                <i class="fas fa-exclamation-triangle me-2"></i>Peer Review Required
              </h6>
              <p style="margin-bottom: 0; color: #721c24;">
                Due to the ${riskAssessment.riskLevel} risk level, peer review is required but no reviewers could be automatically identified. 
                Please manually assign peer reviewers.
              </p>
            </div>
          `;
        }
      } else {
        successMessage += `
          <div class="mt-3 p-3" style="background-color: #d1ecf1; border-left: 4px solid #0dcaf0; border-radius: 4px;">
            <p style="margin-bottom: 0; color: #055160;">
              <i class="fas fa-info-circle me-2"></i>No peer review required for ${riskAssessment.riskLevel} risk changes.
            </p>
          </div>
        `;
      }
    }
    
    successMessage += `</div>`;

    const container = document.querySelector('.container-fluid') || document.body;
    container.innerHTML = successMessage + `
      <div class="text-center mt-4">
        <button class="btn btn-primary" onclick="window.location.reload()">Create Another Change Request</button>
      </div>
    `;
  },

  /**
   * Show submission error
   */
  showSubmissionError(error) {
    console.error('❌ Showing submission error:', error);
    
    const errorMessage = `
      <div class="alert alert-danger" role="alert">
        <h4 class="alert-heading">❌ Change Request Submission Failed</h4>
        <p><strong>Error:</strong> ${error.message || 'Unknown error occurred'}</p>
      </div>
    `;

    const statusElement = document.getElementById('submission-status');
    if (statusElement) {
      statusElement.innerHTML = errorMessage;
      statusElement.className = 'alert alert-danger';
      statusElement.style.display = 'block';
    }
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
   * Show comprehensive submission summary modal
   */
  showSubmissionSummary() {
    console.log('📋 Showing comprehensive submission summary...');

    // First validate all data
    const validationResult = this.validateSubmissionData();
    if (!validationResult.isValid) {
      this.showValidationErrors(validationResult.errors);
      return;
    }

    // For now, just proceed directly to submission
    // TODO: Implement modal summary
    this.handleSubmission();
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

    const statusElement = document.getElementById('submission-status');
    if (statusElement) {
      statusElement.innerHTML = errorMessage;
      statusElement.style.display = 'block';
      
      statusElement.scrollIntoView({ behavior: 'smooth' });
      
      setTimeout(() => {
        statusElement.style.display = 'none';
      }, 10000);
    }
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

    
