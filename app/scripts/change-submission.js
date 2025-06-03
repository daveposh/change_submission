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

    // 2. Impact and Risk Summary (comprehensive summary from questionnaire)
    const comprehensiveRiskSummary = this.generateComprehensiveRiskAndImpactSummary(data.riskAssessment, data.selectedAssets, impactedData);
    if (comprehensiveRiskSummary?.trim()) {
      console.log('✅ Adding cfp_impact_risk_summary to planning_fields');
      changeRequestData.planning_fields.custom_fields.cfp_impact_risk_summary = {
        description_text: comprehensiveRiskSummary,
        description_html: `<div dir="ltr">${comprehensiveRiskSummary.replace(/\n/g, '<br>')}</div>`
      };
    }

    // 3. Service Impacted (formatted details from affected assets and services)
    const serviceImpactedSummary = this.generateServiceImpactedSummary(data.selectedAssets, impactedData);
    if (serviceImpactedSummary?.trim()) {
      console.log('✅ Adding cfp_service_impacted to planning_fields');
      changeRequestData.planning_fields.custom_fields.cfp_service_impacted = {
        description_text: serviceImpactedSummary,
        description_html: `<div dir="ltr">${serviceImpactedSummary.replace(/\n/g, '<br>')}</div>`
      };
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
   * Create a simplified description for change request
   */
  createSimplifiedDescription(data, impactedData) {
    // Create a very simple, text-only description for maximum compatibility
    let description = `${data.changeDescription || data.reasonForChange || 'No description specified'}

CHANGE DETAILS:
Description: ${data.changeDescription || 'Not specified'}
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
  async createMinimalChangeRequest(data) {
    console.log('📦 Creating minimal change request with only required fields...');
    
    // Calculate priority based on change type and risk level
    const priority = this.calculatePriority(data.changeType, data.riskAssessment?.riskLevel);
    
    // Generate risk summary based on questionnaire responses
    const riskSummary = this.generateRiskSummary(data.riskAssessment);
    
    // Generate impact summary (simplified for minimal request)
    const impactedData = window.ImpactedServices?.getImpactedServicesData() || {};
    const impactSummary = this.generateImpactSummary(data.riskAssessment, data.selectedAssets, impactedData);
    
    // Get technical owner from asset managers
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
        description_text: data.reasonForChange,
        description_html: `<div dir="ltr">${data.reasonForChange}</div>`
      };
    }

    if (impactSummary?.trim()) {
      minimalData.planning_fields.change_impact = {
        description_text: impactSummary,
        description_html: `<div dir="ltr">${impactSummary.replace(/\n/g, '<br>')}</div>`
      };
    }

    if (data.implementationPlan?.trim()) {
      minimalData.planning_fields.rollout_plan = {
        description_text: data.implementationPlan,
        description_html: `<div dir="ltr">${data.implementationPlan.replace(/\n/g, '<br>')}</div>`
      };
    }

    if (data.backoutPlan?.trim()) {
      minimalData.planning_fields.backout_plan = {
        description_text: data.backoutPlan,
        description_html: `<div dir="ltr">${data.backoutPlan.replace(/\n/g, '<br>')}</div>`
      };
    }

    // Add custom planning fields only if they have content
    if (data.validationPlan?.trim()) {
      if (!minimalData.planning_fields.custom_fields) {
        minimalData.planning_fields.custom_fields = {};
      }
      minimalData.planning_fields.custom_fields.cfp_validation = {
        description_text: data.validationPlan,
        description_html: `<div dir="ltr">${data.validationPlan.replace(/\n/g, '<br>')}</div>`
      };
    }

    // Add the same custom planning fields as the main function
    if (!minimalData.planning_fields.custom_fields) {
      minimalData.planning_fields.custom_fields = {};
    }

    // 2. Impact and Risk Summary (comprehensive summary from questionnaire)
    const comprehensiveRiskSummary = this.generateComprehensiveRiskAndImpactSummary(data.riskAssessment, data.selectedAssets, impactedData);
    if (comprehensiveRiskSummary?.trim()) {
      minimalData.planning_fields.custom_fields.cfp_impact_risk_summary = {
        description_text: comprehensiveRiskSummary,
        description_html: `<div dir="ltr">${comprehensiveRiskSummary.replace(/\n/g, '<br>')}</div>`
      };
    }

    // 3. Service Impacted (formatted details from affected assets and services)
    const serviceImpactedSummary = this.generateServiceImpactedSummary(data.selectedAssets, impactedData);
    if (serviceImpactedSummary?.trim()) {
      minimalData.planning_fields.custom_fields.cfp_service_impacted = {
        description_text: serviceImpactedSummary,
        description_html: `<div dir="ltr">${serviceImpactedSummary.replace(/\n/g, '<br>')}</div>`
      };
    }

    // Add custom fields
    minimalData.custom_fields = {
      risks: riskSummary,
      lf_technical_owner: await this.getTechnicalOwnerUserId(data.selectedAssets)
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
          const minimalData = await this.createMinimalChangeRequest(window.changeRequestData);
          const response = await this.attemptChangeRequestCreation(minimalData);
          console.log('✅ Change request created successfully with minimal fields');
          console.log('ℹ️ You may need to update the change request manually with additional details');
          return response;
        } catch (minimalError) {
          console.error('❌ Failed even with minimal fields:', minimalError);
          
          // If it still fails, try with an even simpler configuration
          console.warn('⚠️ Trying with ultra-minimal configuration...');
          try {
            // Calculate priority and risk summary for ultra-minimal as well
            const ultraPriority = this.calculatePriority(window.changeRequestData.changeType, window.changeRequestData.riskAssessment?.riskLevel);
            const ultraRiskSummary = this.generateRiskSummary(window.changeRequestData.riskAssessment);
            const ultraImpactedData = window.ImpactedServices?.getImpactedServicesData() || {};
            const ultraImpactSummary = this.generateImpactSummary(window.changeRequestData.riskAssessment, window.changeRequestData.selectedAssets, ultraImpactedData);
            
            const ultraMinimalData = {
              subject: 'Change Request',
              description: 'Change request created via app',
              change_type: 6, // Normal Change (based on actual field choices)
              priority: ultraPriority,
              status: 1,
              risk: 2,
              impact: 2,
              workspace_id: 2, // Required field - "CXI Change Management" workspace
              requester_id: window.changeRequestData.selectedRequester?.id,
              agent_id: window.changeRequestData.selectedAgent?.id,
              
              // Default fields (based on actual schema)
              change_reason: window.changeRequestData.reasonForChange || null,
              change_impact: ultraImpactSummary || null,
              change_plan: null,
              backout_plan: null,
              
              // Planning fields (only cfp_validation based on schema)
              planning_fields: {
                cfp_validation: null
              },
              
              custom_fields: {
                risks: ultraRiskSummary,
                lf_technical_owner: await this.getTechnicalOwnerUserId(window.changeRequestData.selectedAssets) || null
              }
            };
            
            console.log('📦 Ultra-minimal data:', JSON.stringify(ultraMinimalData, null, 2));
            const response = await this.attemptChangeRequestCreation(ultraMinimalData);
            console.log('✅ Change request created successfully with ultra-minimal fields');
            console.log('⚠️ You will need to update this change request manually with all the details');
            return response;
          } catch (ultraMinimalError) {
            console.error('❌ Failed even with ultra-minimal fields:', ultraMinimalError);
            
            // Final attempt: Remove all optional structures
            console.warn('⚠️ Final attempt - removing all optional field structures...');
            try {
              const bareMinimalData = {
                subject: 'Change Request',
                description: 'Change request created via app',
                change_type: 6,
                priority: 2,
                status: 1,
                risk: 2,
                impact: 2,
                workspace_id: 2,
                requester_id: window.changeRequestData.selectedRequester?.id,
                agent_id: window.changeRequestData.selectedAgent?.id,
                change_reason: window.changeRequestData.reasonForChange || null
              };
              
              console.log('📦 Bare minimal data (no planning_fields/custom_fields):', JSON.stringify(bareMinimalData, null, 2));
              const response = await this.attemptChangeRequestCreation(bareMinimalData);
              console.log('✅ Change request created successfully with bare minimal fields');
              console.log('⚠️ You will need to update this change request manually with all the details');
              return response;
            } catch (bareMinimalError) {
              console.error('❌ Failed even with bare minimal fields:', bareMinimalError);
              throw bareMinimalError;
            }
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

    // Clean up any modal remnants
    this.cleanupModal();

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

    // Clean up any modal remnants
    this.cleanupModal();

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
  showSubmissionSummary() {
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

    // Show the modal
    const modal = document.getElementById('confirmation-modal');
    if (modal) {
      // Update modal title
      const modalTitle = document.getElementById('confirmModalLabel');
      if (modalTitle) {
        modalTitle.textContent = 'Review Change Request Submission';
      }

      // Show modal using Bootstrap
      const bootstrapModal = new bootstrap.Modal(modal, {
        backdrop: true,  // Allow clicking backdrop to close
        keyboard: true   // Allow ESC key to close
      });
      
      bootstrapModal.show();

      // Store modal instance for cleanup
      this.currentModal = bootstrapModal;

      // Handle modal hidden event for cleanup
      modal.addEventListener('hidden.bs.modal', () => {
        console.log('🧹 Modal hidden - cleaning up...');
        this.cleanupModal();
      });

      // Handle confirm submission button
      const confirmBtn = document.getElementById('confirm-submit');
      if (confirmBtn) {
        // Remove any existing listeners
        confirmBtn.removeEventListener('click', this.handleSubmissionBound);
        // Add new listener
        this.handleSubmissionBound = (e) => {
          e.preventDefault();
          console.log('✅ User confirmed submission - proceeding...');
          
          // Hide modal and proceed with submission
          this.hideModalAndProceed(() => {
            this.handleSubmission();
          });
        };
        confirmBtn.addEventListener('click', this.handleSubmissionBound);
      }

      // Handle edit button
      const editBtn = document.getElementById('edit-request');
      if (editBtn) {
        // Remove any existing listeners
        editBtn.removeEventListener('click', this.handleEditBound);
        // Add new listener
        this.handleEditBound = (e) => {
          e.preventDefault();
          console.log('📝 User clicked Edit Request - returning to form...');
          
          // Hide modal and return to edit mode
          this.hideModalAndProceed(() => {
            this.returnToEditMode();
          });
        };
        editBtn.addEventListener('click', this.handleEditBound);
      }

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
                    ${data.changeDescription ? `
                      <p class="card-text">${data.changeDescription}</p>
                      <hr class="my-2">
                      <p class="text-muted"><strong>Reason:</strong> ${data.reasonForChange || 'No reason specified'}</p>
                    ` : `
                      <p class="card-text">${data.reasonForChange || 'No reason specified'}</p>
                    `}
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

  /**
   * Properly hide modal and proceed with callback
   */
  hideModalAndProceed(callback) {
    if (this.currentModal) {
      // Hide the modal
      this.currentModal.hide();
      
      // Wait for modal to be fully hidden before proceeding
      setTimeout(() => {
        if (callback && typeof callback === 'function') {
          callback();
        }
      }, 300); // Bootstrap modal transition time
    } else {
      // If no modal instance, just proceed
      if (callback && typeof callback === 'function') {
        callback();
      }
    }
  },

  /**
   * Clean up modal instances and backdrop
   */
  cleanupModal() {
    console.log('🧹 Cleaning up modal...');
    
    // Remove any lingering modal backdrops
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => {
      console.log('🗑️ Removing lingering backdrop...');
      backdrop.remove();
    });
    
    // Reset body classes
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
    // Clear modal instance
    if (this.currentModal) {
      try {
        this.currentModal.dispose();
      } catch (error) {
        console.warn('⚠️ Error disposing modal:', error);
      }
      this.currentModal = null;
    }
    
    console.log('✅ Modal cleanup complete');
  },

  /**
   * Return to edit mode after modal closes
   */
  returnToEditMode() {
    console.log('📝 Returning to edit mode...');
    
    // Switch to the first tab (change details)
    const firstTab = document.querySelector('.nav-tabs .nav-link[data-bs-target="#change-details"]');
    if (firstTab) {
      firstTab.click();
    } else {
      // Fallback: use switchTab function if available
      if (typeof window.switchTab === 'function') {
        window.switchTab('change-details');
      }
    }
    
    // Scroll to the top of the page
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    // Show a helpful message
    const statusElement = document.getElementById('submission-status');
    if (statusElement) {
      statusElement.innerHTML = `
        <div class="alert alert-info alert-dismissible fade show" role="alert">
          <i class="fas fa-info-circle me-2"></i>
          <strong>Edit Mode:</strong> You can now make changes to your change request. Click "Submit Change Request" when ready.
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
      `;
      statusElement.style.display = 'block';
      
      // Auto-hide the message after 5 seconds
      setTimeout(() => {
        if (statusElement.querySelector('.alert')) {
          const alert = statusElement.querySelector('.alert');
          if (alert) {
            alert.classList.remove('show');
            setTimeout(() => {
              statusElement.style.display = 'none';
            }, 150);
          }
        }
      }, 5000);
    }
    
    console.log('✅ Returned to edit mode successfully');
  },

  /**
   * Calculate priority based on change type and risk assessment
   * @param {string} changeType - Type of change (emergency, normal, etc.)
   * @param {string} riskLevel - Risk level from assessment (Low, Medium, High)
   * @returns {number} Priority level (1-4: Low, Medium, High, Urgent)
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
   * @param {Object} riskAssessment - Risk assessment data from questionnaire
   * @returns {string} Formatted risk summary
   */
  generateRiskSummary(riskAssessment) {
    console.log('📊 Generating risk summary from questionnaire responses...');
    
    if (!riskAssessment || !riskAssessment.riskLevel) {
      console.warn('⚠️ No risk assessment data available');
      return 'Risk assessment not completed.';
    }

    // Map numeric scores to descriptive text
    const getScoreDescription = (score, category) => {
      const descriptions = {
        businessImpact: {
          1: 'Limited impact on business operations',
          2: 'Noticeable impact on some business operations',
          3: 'Significant impact on business operations'
        },
        affectedUsers: {
          1: 'Few users affected (<50 users)',
          2: 'Some users affected (50-200 users)',
          3: 'Many users affected (>200 users)'
        },
        complexity: {
          1: 'Simple - Routine change with established procedures',
          2: 'Moderate - Some complexity but well understood',
          3: 'Complex - Multiple systems or uncommon procedures'
        },
        testing: {
          1: 'Comprehensive - Thoroughly tested in multiple environments',
          2: 'Adequate - Primary functions tested in test environment',
          3: 'Limited - Minimal testing or testing not possible'
        },
        rollback: {
          1: 'Yes - Detailed rollback plan with proven procedures',
          2: 'Partial - Basic rollback steps identified',
          3: 'No - No rollback possible or very difficult'
        }
      };
      
      return descriptions[category]?.[score] || `Score: ${score}`;
    };

    // Generate detailed risk summary
    let summary = `RISK ASSESSMENT SUMMARY\n`;
    summary += `Overall Risk Level: ${riskAssessment.riskLevel?.toUpperCase()}\n`;
    summary += `Risk Score: ${riskAssessment.totalScore || 0}/15\n\n`;
    
    summary += `DETAILED RISK FACTORS:\n\n`;
    
    summary += `1. BUSINESS IMPACT (Score: ${riskAssessment.businessImpact || 'N/A'}/3)\n`;
    summary += `   ${getScoreDescription(riskAssessment.businessImpact, 'businessImpact')}\n\n`;
    
    summary += `2. AFFECTED USERS (Score: ${riskAssessment.affectedUsers || 'N/A'}/3)\n`;
    summary += `   ${getScoreDescription(riskAssessment.affectedUsers, 'affectedUsers')}\n\n`;
    
    summary += `3. COMPLEXITY (Score: ${riskAssessment.complexity || 'N/A'}/3)\n`;
    summary += `   ${getScoreDescription(riskAssessment.complexity, 'complexity')}\n\n`;
    
    summary += `4. TESTING LEVEL (Score: ${riskAssessment.testing || 'N/A'}/3)\n`;
    summary += `   ${getScoreDescription(riskAssessment.testing, 'testing')}\n\n`;
    
    summary += `5. ROLLBACK CAPABILITY (Score: ${riskAssessment.rollback || 'N/A'}/3)\n`;
    summary += `   ${getScoreDescription(riskAssessment.rollback, 'rollback')}\n\n`;
    
    // Add risk level interpretation
    summary += `RISK LEVEL INTERPRETATION:\n`;
    switch (riskAssessment.riskLevel?.toLowerCase()) {
      case 'low':
        summary += `• Low risk changes are routine with minimal impact\n`;
        summary += `• Standard approval process applies\n`;
        summary += `• Can typically proceed with minimal oversight\n`;
        break;
      case 'medium':
        summary += `• Medium risk changes require careful planning\n`;
        summary += `• Additional review and approval may be required\n`;
        summary += `• Peer review task will be created for technical validation\n`;
        break;
      case 'high':
        summary += `• High risk changes require extensive oversight\n`;
        summary += `• All approvers must review and approve\n`;
        summary += `• Mandatory peer review with 24-hour deadline\n`;
        summary += `• Consider additional testing or phased implementation\n`;
        break;
    }
    
    summary += `\nGenerated automatically from risk questionnaire responses.`;
    
    console.log('📋 Risk summary generated:', summary.substring(0, 200) + '...');
    return summary;
  },

  /**
   * Generate comprehensive impact summary based on questionnaire and assets
   * @param {Object} riskAssessment - Risk assessment data from questionnaire
   * @param {Array} selectedAssets - Selected assets that will be impacted
   * @param {Object} impactedData - Impacted services data (approvers/stakeholders)
   * @returns {string} Formatted impact summary
   */
  generateImpactSummary(riskAssessment, selectedAssets = [], impactedData = {}) {
    console.log('📊 Generating impact summary from questionnaire and asset data...');
    
    if (!riskAssessment || !riskAssessment.riskLevel) {
      console.warn('⚠️ No risk assessment data available for impact summary');
      return 'Impact assessment not completed.';
    }

    let summary = `CHANGE IMPACT ASSESSMENT\n\n`;
    
    // Business Impact Section
    summary += `BUSINESS IMPACT:\n`;
    const businessImpactScore = riskAssessment.businessImpact || 0;
    switch (businessImpactScore) {
      case 1:
        summary += `• Limited impact on business operations\n`;
        summary += `• Minimal disruption expected during implementation\n`;
        summary += `• Standard business hours implementation acceptable\n`;
        break;
      case 2:
        summary += `• Noticeable impact on some business operations\n`;
        summary += `• Some operational disruption during implementation\n`;
        summary += `• Consider off-hours implementation window\n`;
        break;
      case 3:
        summary += `• Significant impact on business operations\n`;
        summary += `• Major operational disruption expected\n`;
        summary += `• Mandatory off-hours or maintenance window implementation\n`;
        break;
      default:
        summary += `• Business impact level not assessed\n`;
    }
    summary += `\n`;

    // User Impact Section  
    summary += `USER IMPACT:\n`;
    const userImpactScore = riskAssessment.affectedUsers || 0;
    switch (userImpactScore) {
      case 1:
        summary += `• Few users affected (<50 users)\n`;
        summary += `• Limited user communication required\n`;
        summary += `• Direct notification to affected users sufficient\n`;
        break;
      case 2:
        summary += `• Some users affected (50-200 users)\n`;
        summary += `• Moderate user communication required\n`;
        summary += `• Department-level notifications recommended\n`;
        break;
      case 3:
        summary += `• Many users affected (>200 users)\n`;
        summary += `• Extensive user communication required\n`;
        summary += `• Organization-wide notifications mandatory\n`;
        break;
      default:
        summary += `• User impact level not assessed\n`;
    }
    summary += `\n`;

    // Technical Impact Section
    summary += `TECHNICAL IMPACT:\n`;
    const complexityScore = riskAssessment.complexity || 0;
    switch (complexityScore) {
      case 1:
        summary += `• Simple change with established procedures\n`;
        summary += `• Standard technical implementation\n`;
        summary += `• Minimal technical coordination required\n`;
        break;
      case 2:
        summary += `• Moderate complexity with some coordination needed\n`;
        summary += `• Multiple technical components involved\n`;
        summary += `• Cross-team coordination recommended\n`;
        break;
      case 3:
        summary += `• Complex change affecting multiple systems\n`;
        summary += `• Extensive technical coordination required\n`;
        summary += `• Multiple technical teams must be involved\n`;
        break;
      default:
        summary += `• Technical complexity not assessed\n`;
    }
    summary += `\n`;

    // Asset Impact Section
    if (selectedAssets && selectedAssets.length > 0) {
      summary += `ASSET IMPACT:\n`;
      summary += `• ${selectedAssets.length} asset(s) directly affected\n`;
      
      // Group assets by type or show top assets
      const assetNames = selectedAssets.slice(0, 5).map(asset => asset.name).join(', ');
      summary += `• Primary assets: ${assetNames}`;
      if (selectedAssets.length > 5) {
        summary += ` and ${selectedAssets.length - 5} more`;
      }
      summary += `\n`;
      
      // Estimate cascade impact
      const totalStakeholders = (impactedData.approvers?.length || 0) + (impactedData.stakeholders?.length || 0);
      if (totalStakeholders > 0) {
        summary += `• ${totalStakeholders} stakeholder(s) identified through asset relationships\n`;
        summary += `• Potential cascade effects on related systems\n`;
      }
      summary += `\n`;
    }

    // Rollback Impact Section
    summary += `ROLLBACK CONSIDERATIONS:\n`;
    const rollbackScore = riskAssessment.rollback || 0;
    switch (rollbackScore) {
      case 1:
        summary += `• Detailed rollback plan available\n`;
        summary += `• Quick recovery possible if issues occur\n`;
        summary += `• Minimal downtime for rollback operations\n`;
        break;
      case 2:
        summary += `• Basic rollback steps identified\n`;
        summary += `• Moderate recovery time if rollback needed\n`;
        summary += `• Some manual intervention may be required\n`;
        break;
      case 3:
        summary += `• Limited or no rollback capability\n`;
        summary += `• Extended recovery time if issues occur\n`;
        summary += `• Forward-fix strategy required\n`;
        break;
      default:
        summary += `• Rollback capability not assessed\n`;
    }
    summary += `\n`;

    // Impact Level Summary
    const totalScore = riskAssessment.totalScore || 0;
    summary += `OVERALL IMPACT ASSESSMENT:\n`;
    if (totalScore <= 7) {
      summary += `• LOW IMPACT: Routine change with minimal business disruption\n`;
      summary += `• Standard implementation procedures apply\n`;
    } else if (totalScore <= 11) {
      summary += `• MEDIUM IMPACT: Moderate business disruption expected\n`;
      summary += `• Enhanced coordination and communication required\n`;
    } else {
      summary += `• HIGH IMPACT: Significant business disruption expected\n`;
      summary += `• Extensive planning, coordination, and communication mandatory\n`;
    }

    summary += `\nGenerated automatically from risk questionnaire and asset analysis.`;
    
    console.log('📋 Impact summary generated:', summary.substring(0, 200) + '...');
    return summary;
  },

  /**
   * Get technical owner email from asset managers (managed_by field)
   * @param {Array} selectedAssets - Selected assets to find managers for
   * @returns {string|null} Technical owner email address
   */
  async getTechnicalOwnerEmail(selectedAssets = []) {
    console.log('👤 Identifying technical owner from asset managers...');
    
    if (!selectedAssets || selectedAssets.length === 0) {
      console.log('ℹ️ No assets selected, cannot determine technical owner');
      return null;
    }

    try {
      // Debug: Log asset structure to understand available fields
      console.log('🔍 Analyzing asset structure for manager fields...');
      selectedAssets.forEach((asset, index) => {
        console.log(`Asset ${index + 1} (${asset.name}):`, {
          id: asset.id,
          managed_by: asset.managed_by,
          agent_id: asset.agent_id,
          user_id: asset.user_id,
          requester_id: asset.requester_id,
          created_by: asset.created_by,
          updated_by: asset.updated_by,
          hasManagerInfo: !!(asset.managed_by || asset.agent_id || asset.user_id)
        });
      });

      // Collect all potential manager/owner IDs from multiple fields
      const managerIds = new Set();
      const ownerSources = [];

      selectedAssets.forEach(asset => {
        // Check multiple potential fields for asset ownership/management
        if (asset.managed_by) {
          managerIds.add(asset.managed_by);
          ownerSources.push({ assetName: asset.name, source: 'managed_by', userId: asset.managed_by });
        }
        if (asset.agent_id && asset.agent_id !== asset.managed_by) {
          managerIds.add(asset.agent_id);
          ownerSources.push({ assetName: asset.name, source: 'agent_id', userId: asset.agent_id });
        }
        if (asset.user_id && asset.user_id !== asset.managed_by && asset.user_id !== asset.agent_id) {
          managerIds.add(asset.user_id);
          ownerSources.push({ assetName: asset.name, source: 'user_id', userId: asset.user_id });
        }
      });

      if (managerIds.size === 0) {
        console.log('ℹ️ No managers/owners found in selected assets - checking alternative sources...');
        
        // Fallback: Try to get the assigned agent from the change request
        if (window.changeRequestData?.selectedAgent?.email) {
          console.log(`🔄 Using assigned agent as technical owner: ${window.changeRequestData.selectedAgent.email}`);
          return window.changeRequestData.selectedAgent.email;
        }
        
        // Fallback: Try to get the requester email
        if (window.changeRequestData?.selectedRequester?.email) {
          console.log(`🔄 Using requester as technical owner: ${window.changeRequestData.selectedRequester.email}`);
          return window.changeRequestData.selectedRequester.email;
        }
        
        console.log('⚠️ No technical owner could be determined from any source');
        return null;
      }

      console.log(`🔍 Found ${managerIds.size} unique owner(s) from ${selectedAssets.length} assets`);
      console.log('📋 Owner sources:', ownerSources);

      // Try to get email from each manager ID until we find one with an email
      for (const managerId of managerIds) {
        console.log(`👤 Checking manager/owner ID: ${managerId}`);

        try {
          const managerDetails = await this.getUserDetails(managerId);
          
          if (managerDetails && managerDetails.email) {
            const sourceInfo = ownerSources.find(s => s.userId === managerId);
            console.log(`✅ Technical owner identified: ${managerDetails.name} (${managerDetails.email}) - Source: ${sourceInfo?.source || 'unknown'} from ${sourceInfo?.assetName || 'unknown asset'}`);
            return managerDetails.email;
          } else {
            console.warn(`⚠️ Manager ID ${managerId} found but no email available:`, managerDetails);
          }
        } catch (error) {
          console.warn(`⚠️ Error getting details for manager ID ${managerId}:`, error);
        }
      }

      // If we reach here, none of the manager IDs had valid email addresses
      console.log('⚠️ No valid email found for any asset managers - trying fallbacks...');
      
      // Fallback: Use assigned agent
      if (window.changeRequestData?.selectedAgent?.email) {
        console.log(`🔄 Fallback: Using assigned agent as technical owner: ${window.changeRequestData.selectedAgent.email}`);
        return window.changeRequestData.selectedAgent.email;
      }
      
      // Final fallback: Use requester
      if (window.changeRequestData?.selectedRequester?.email) {
        console.log(`🔄 Final fallback: Using requester as technical owner: ${window.changeRequestData.selectedRequester.email}`);
        return window.changeRequestData.selectedRequester.email;
      }

      console.log('❌ Could not determine technical owner from any source');
      return null;

    } catch (error) {
      console.error('❌ Error getting technical owner email:', error);
      
      // Error fallback: Use assigned agent or requester
      if (window.changeRequestData?.selectedAgent?.email) {
        console.log(`🔄 Error fallback: Using assigned agent: ${window.changeRequestData.selectedAgent.email}`);
        return window.changeRequestData.selectedAgent.email;
      }
      
      if (window.changeRequestData?.selectedRequester?.email) {
        console.log(`🔄 Error fallback: Using requester: ${window.changeRequestData.selectedRequester.email}`);
        return window.changeRequestData.selectedRequester.email;
      }
      
      return null;
    }
  },

  /**
   * Get user details by ID (uses existing user cache or API)
   * @param {number} userId - User ID to look up
   * @returns {Object|null} User details with name and email
   */
  async getUserDetails(userId) {
    try {
      // Try to get from existing user cache first
      if (window.getUserDetails && typeof window.getUserDetails === 'function') {
        return await window.getUserDetails(userId);
      }

      // Fallback: Try to get from global user cache
      if (window.getCachedUsers && typeof window.getCachedUsers === 'function') {
        const cachedUsers = await window.getCachedUsers();
        const user = cachedUsers.find(u => u.id === userId);
        if (user) {
          return user;
        }
      }

      // Last resort: Make direct API call
      const response = await window.client.request.invokeTemplate('getUser', {
        context: { user_id: userId },
        cache: true,
        ttl: 300000 // 5 minutes cache
      });

      if (response && response.response) {
        const userData = JSON.parse(response.response);
        return userData.user || userData;
      }

      return null;
    } catch (error) {
      console.error(`❌ Error getting user details for ID ${userId}:`, error);
      return null;
    }
  },

  /**
   * Get technical owner user ID from asset managers (for lf_technical_owner field)
   * @param {Array} selectedAssets - Selected assets to find managers for
   * @returns {number|null} Technical owner user ID
   */
  async getTechnicalOwnerUserId(selectedAssets = []) {
    console.log('👤 Identifying technical owner user ID from asset managers...');
    
    if (!selectedAssets || selectedAssets.length === 0) {
      console.log('ℹ️ No assets selected, cannot determine technical owner');
      return null;
    }

    try {
      // Debug: Log asset structure to understand available fields
      console.log('🔍 Analyzing asset structure for manager fields...');
      selectedAssets.forEach((asset, index) => {
        console.log(`Asset ${index + 1} (${asset.name}):`, {
          id: asset.id,
          managed_by: asset.managed_by,
          agent_id: asset.agent_id,
          user_id: asset.user_id,
          requester_id: asset.requester_id,
          created_by: asset.created_by,
          updated_by: asset.updated_by,
          hasManagerInfo: !!(asset.managed_by || asset.agent_id || asset.user_id)
        });
      });

      // Collect all potential manager/owner IDs from multiple fields
      const managerIds = new Set();
      const ownerSources = [];

      selectedAssets.forEach(asset => {
        // Check multiple potential fields for asset ownership/management
        if (asset.managed_by) {
          managerIds.add(asset.managed_by);
          ownerSources.push({ assetName: asset.name, source: 'managed_by', userId: asset.managed_by });
        }
        if (asset.agent_id && asset.agent_id !== asset.managed_by) {
          managerIds.add(asset.agent_id);
          ownerSources.push({ assetName: asset.name, source: 'agent_id', userId: asset.agent_id });
        }
        if (asset.user_id && asset.user_id !== asset.managed_by && asset.user_id !== asset.agent_id) {
          managerIds.add(asset.user_id);
          ownerSources.push({ assetName: asset.name, source: 'user_id', userId: asset.user_id });
        }
      });

      if (managerIds.size === 0) {
        console.log('ℹ️ No managers/owners found in selected assets - checking alternative sources...');
        
        // Fallback: Try to get the assigned agent from the change request
        if (window.changeRequestData?.selectedAgent?.id) {
          console.log(`🔄 Using assigned agent as technical owner: ${window.changeRequestData.selectedAgent.id}`);
          return window.changeRequestData.selectedAgent.id;
        }
        
        // Fallback: Try to get the requester ID
        if (window.changeRequestData?.selectedRequester?.id) {
          console.log(`🔄 Using requester as technical owner: ${window.changeRequestData.selectedRequester.id}`);
          return window.changeRequestData.selectedRequester.id;
        }
        
        console.log('⚠️ No technical owner could be determined from any source');
        return null;
      }

      console.log(`🔍 Found ${managerIds.size} unique owner(s) from ${selectedAssets.length} assets`);
      console.log('📋 Owner sources:', ownerSources);

      // Return the first valid manager ID (they're all valid user IDs)
      const primaryManagerId = Array.from(managerIds)[0];
      const sourceInfo = ownerSources.find(s => s.userId === primaryManagerId);
      
      // Verify the user exists to make sure the ID is valid
      try {
        const managerDetails = await this.getUserDetails(primaryManagerId);
        if (managerDetails && managerDetails.id) {
          console.log(`✅ Technical owner user ID identified: ${primaryManagerId} (${managerDetails.name || 'Unknown name'}) - Source: ${sourceInfo?.source || 'unknown'} from ${sourceInfo?.assetName || 'unknown asset'}`);
          return primaryManagerId;
        } else {
          console.warn(`⚠️ Manager ID ${primaryManagerId} found but user doesn't exist:`, managerDetails);
        }
      } catch (error) {
        console.warn(`⚠️ Error validating manager ID ${primaryManagerId}:`, error);
      }

      // If primary manager ID is invalid, try other manager IDs
      for (const managerId of managerIds) {
        if (managerId === primaryManagerId) continue; // Skip already tried one
        
        try {
          const managerDetails = await this.getUserDetails(managerId);
          if (managerDetails && managerDetails.id) {
            const sourceInfo = ownerSources.find(s => s.userId === managerId);
            console.log(`✅ Technical owner user ID identified (fallback): ${managerId} (${managerDetails.name || 'Unknown name'}) - Source: ${sourceInfo?.source || 'unknown'} from ${sourceInfo?.assetName || 'unknown asset'}`);
            return managerId;
          }
        } catch (error) {
          console.warn(`⚠️ Error validating manager ID ${managerId}:`, error);
        }
      }

      // If we reach here, none of the manager IDs were valid
      console.log('⚠️ No valid user ID found for any asset managers - trying fallbacks...');
      
      // Fallback: Use assigned agent
      if (window.changeRequestData?.selectedAgent?.id) {
        console.log(`🔄 Fallback: Using assigned agent as technical owner: ${window.changeRequestData.selectedAgent.id}`);
        return window.changeRequestData.selectedAgent.id;
      }
      
      // Final fallback: Use requester
      if (window.changeRequestData?.selectedRequester?.id) {
        console.log(`🔄 Final fallback: Using requester as technical owner: ${window.changeRequestData.selectedRequester.id}`);
        return window.changeRequestData.selectedRequester.id;
      }

      console.log('❌ Could not determine technical owner user ID from any source');
      return null;

    } catch (error) {
      console.error('❌ Error getting technical owner user ID:', error);
      
      // Error fallback: Use assigned agent or requester
      if (window.changeRequestData?.selectedAgent?.id) {
        console.log(`🔄 Error fallback: Using assigned agent: ${window.changeRequestData.selectedAgent.id}`);
        return window.changeRequestData.selectedAgent.id;
      }
      
      if (window.changeRequestData?.selectedRequester?.id) {
        console.log(`🔄 Error fallback: Using requester: ${window.changeRequestData.selectedRequester.id}`);
        return window.changeRequestData.selectedRequester.id;
      }
      
      return null;
    }
  },

  /**
   * Generate comprehensive risk and impact summary for planning fields
   * Combines risk assessment questionnaire data with impact analysis
   * @param {Object} riskAssessment - Risk assessment data from questionnaire
   * @param {Array} selectedAssets - Selected assets that will be impacted
   * @param {Object} impactedData - Impacted services data (approvers/stakeholders)
   * @returns {string} Comprehensive formatted risk and impact summary
   */
  generateComprehensiveRiskAndImpactSummary(riskAssessment, selectedAssets = [], impactedData = {}) {
    console.log('📊 Generating comprehensive risk and impact summary for planning fields...');
    
    if (!riskAssessment || !riskAssessment.riskLevel) {
      return 'Risk and impact assessment not completed.';
    }

    let summary = `COMPREHENSIVE RISK & IMPACT ASSESSMENT\n\n`;
    
    // Executive Summary
    summary += `EXECUTIVE SUMMARY:\n`;
    summary += `Risk Level: ${riskAssessment.riskLevel?.toUpperCase()} (Score: ${riskAssessment.totalScore || 0}/15)\n`;
    summary += `Assets Affected: ${selectedAssets.length} systems/services\n`;
    summary += `Stakeholders Involved: ${(impactedData.approvers?.length || 0) + (impactedData.stakeholders?.length || 0)} people\n`;
    
    // Risk level interpretation
    switch (riskAssessment.riskLevel?.toLowerCase()) {
      case 'low':
        summary += `Risk Assessment: Routine change with minimal business disruption expected.\n`;
        break;
      case 'medium':
        summary += `Risk Assessment: Moderate complexity requiring additional oversight and coordination.\n`;
        break;
      case 'high':
        summary += `Risk Assessment: Complex change requiring extensive planning and approval.\n`;
        break;
    }
    summary += `\n`;

    // Detailed Risk Breakdown
    summary += `DETAILED RISK ANALYSIS:\n\n`;
    
    summary += `1. BUSINESS IMPACT RISK (${riskAssessment.businessImpact || 'N/A'}/3):\n`;
    switch (riskAssessment.businessImpact) {
      case 1:
        summary += `   • Limited impact on business operations\n`;
        summary += `   • Standard business hours implementation acceptable\n`;
        summary += `   • Minimal operational disruption expected\n`;
        break;
      case 2:
        summary += `   • Noticeable impact on business operations\n`;
        summary += `   • Consider off-hours implementation window\n`;
        summary += `   • Some operational coordination required\n`;
        break;
      case 3:
        summary += `   • Significant impact on business operations\n`;
        summary += `   • Mandatory maintenance window implementation\n`;
        summary += `   • Extensive business continuity planning required\n`;
        break;
    }
    summary += `\n`;

    summary += `2. USER IMPACT RISK (${riskAssessment.affectedUsers || 'N/A'}/3):\n`;
    switch (riskAssessment.affectedUsers) {
      case 1:
        summary += `   • Few users affected (<50 users)\n`;
        summary += `   • Direct user communication sufficient\n`;
        summary += `   • Minimal training or support required\n`;
        break;
      case 2:
        summary += `   • Some users affected (50-200 users)\n`;
        summary += `   • Department-level communication required\n`;
        summary += `   • Support team coordination needed\n`;
        break;
      case 3:
        summary += `   • Many users affected (>200 users)\n`;
        summary += `   • Organization-wide communication mandatory\n`;
        summary += `   • Extensive user support and training required\n`;
        break;
    }
    summary += `\n`;

    summary += `3. TECHNICAL COMPLEXITY RISK (${riskAssessment.complexity || 'N/A'}/3):\n`;
    switch (riskAssessment.complexity) {
      case 1:
        summary += `   • Simple change with established procedures\n`;
        summary += `   • Standard technical implementation\n`;
        summary += `   • Single team can execute independently\n`;
        break;
      case 2:
        summary += `   • Moderate complexity requiring coordination\n`;
        summary += `   • Multiple technical components involved\n`;
        summary += `   • Cross-team collaboration required\n`;
        break;
      case 3:
        summary += `   • Complex change affecting multiple systems\n`;
        summary += `   • Extensive technical coordination required\n`;
        summary += `   • Multiple specialized teams must be involved\n`;
        break;
    }
    summary += `\n`;

    summary += `4. TESTING & VALIDATION RISK (${riskAssessment.testing || 'N/A'}/3):\n`;
    switch (riskAssessment.testing) {
      case 1:
        summary += `   • Comprehensive testing completed\n`;
        summary += `   • All critical functions validated\n`;
        summary += `   • High confidence in implementation success\n`;
        break;
      case 2:
        summary += `   • Adequate testing of primary functions\n`;
        summary += `   • Some edge cases may not be fully tested\n`;
        summary += `   • Monitor closely during implementation\n`;
        break;
      case 3:
        summary += `   • Limited testing or testing not possible\n`;
        summary += `   • Higher risk of unexpected issues\n`;
        summary += `   • Requires enhanced monitoring and rapid response\n`;
        break;
    }
    summary += `\n`;

    summary += `5. RECOVERY & ROLLBACK RISK (${riskAssessment.rollback || 'N/A'}/3):\n`;
    switch (riskAssessment.rollback) {
      case 1:
        summary += `   • Detailed rollback plan with proven procedures\n`;
        summary += `   • Quick recovery possible if issues occur\n`;
        summary += `   • Minimal additional downtime for rollback\n`;
        break;
      case 2:
        summary += `   • Basic rollback steps identified\n`;
        summary += `   • Moderate recovery time if rollback needed\n`;
        summary += `   • Some manual intervention may be required\n`;
        break;
      case 3:
        summary += `   • Limited or no rollback capability\n`;
        summary += `   • Extended recovery time if issues occur\n`;
        summary += `   • Forward-fix strategy must be primary approach\n`;
        break;
    }
    summary += `\n`;

    // Impact Scope Analysis
    if (selectedAssets.length > 0) {
      summary += `IMPACT SCOPE ANALYSIS:\n\n`;
      summary += `Asset Count: ${selectedAssets.length} systems/services directly affected\n`;
      
      // Categorize impact scope
      if (selectedAssets.length <= 2) {
        summary += `Scope Assessment: LIMITED - Focused change affecting few systems\n`;
      } else if (selectedAssets.length <= 5) {
        summary += `Scope Assessment: MODERATE - Multi-system change requiring coordination\n`;
      } else {
        summary += `Scope Assessment: EXTENSIVE - Large-scale change affecting many systems\n`;
      }
      
      summary += `\nAffected Systems:\n`;
      selectedAssets.forEach((asset, index) => {
        summary += `${index + 1}. ${asset.name} (ID: ${asset.display_id || asset.id})\n`;
        if (asset.asset_tag) {
          summary += `   Tag: ${asset.asset_tag}\n`;
        }
      });
      summary += `\n`;
    }

    // Stakeholder Impact
    const totalStakeholders = (impactedData.approvers?.length || 0) + (impactedData.stakeholders?.length || 0);
    if (totalStakeholders > 0) {
      summary += `STAKEHOLDER IMPACT:\n`;
      summary += `Total Stakeholders: ${totalStakeholders}\n`;
      summary += `Required Approvers: ${impactedData.approvers?.length || 0}\n`;
      summary += `Notification Recipients: ${impactedData.stakeholders?.length || 0}\n`;
      
      if (impactedData.approvers?.length > 0) {
        summary += `\nKey Approvers:\n`;
        impactedData.approvers.slice(0, 5).forEach((approver, index) => {
          summary += `${index + 1}. ${approver.name} - ${approver.source}\n`;
        });
        if (impactedData.approvers.length > 5) {
          summary += `... and ${impactedData.approvers.length - 5} more approvers\n`;
        }
      }
      summary += `\n`;
    }

    // Risk Mitigation Summary
    summary += `RISK MITIGATION RECOMMENDATIONS:\n\n`;
    
    // Based on overall risk level
    switch (riskAssessment.riskLevel?.toLowerCase()) {
      case 'low':
        summary += `• Standard change management procedures apply\n`;
        summary += `• Basic monitoring during implementation\n`;
        summary += `• Post-implementation validation recommended\n`;
        break;
      case 'medium':
        summary += `• Enhanced monitoring and coordination required\n`;
        summary += `• Consider phased implementation approach\n`;
        summary += `• Peer review mandatory before execution\n`;
        summary += `• Detailed post-implementation assessment\n`;
        break;
      case 'high':
        summary += `• Extensive pre-implementation planning required\n`;
        summary += `• Mandatory management approval and oversight\n`;
        summary += `• Consider pilot/limited rollout first\n`;
        summary += `• Dedicated support team during implementation\n`;
        summary += `• Comprehensive post-implementation review\n`;
        break;
    }

    // Specific recommendations based on weak areas
    if (riskAssessment.testing >= 3) {
      summary += `• CRITICAL: Enhance testing procedures before implementation\n`;
    }
    if (riskAssessment.rollback >= 3) {
      summary += `• CRITICAL: Develop detailed recovery procedures\n`;
    }
    if (riskAssessment.complexity >= 3) {
      summary += `• CRITICAL: Ensure adequate technical expertise available\n`;
    }

    summary += `\nThis assessment was generated automatically from the risk questionnaire responses and asset analysis.`;
    summary += `\nLast Updated: ${new Date().toISOString().split('T')[0]}`;
    
    console.log('📋 Comprehensive risk and impact summary generated');
    return summary;
  },

  /**
   * Generate service impacted summary for planning fields
   * Detailed breakdown of affected services, systems, and stakeholders
   * @param {Array} selectedAssets - Selected assets that will be impacted
   * @param {Object} impactedData - Impacted services data (approvers/stakeholders)
   * @returns {string} Formatted service impact summary
   */
  generateServiceImpactedSummary(selectedAssets = [], impactedData = {}) {
    console.log('🏢 Generating service impacted summary for planning fields...');
    
    if (!selectedAssets.length && !impactedData.approvers?.length && !impactedData.stakeholders?.length) {
      return 'No service impact analysis available.';
    }

    let summary = `IMPACTED SERVICES & SYSTEMS ANALYSIS\n\n`;
    
    // Executive Summary
    summary += `IMPACT OVERVIEW:\n`;
    summary += `• Directly Affected Assets: ${selectedAssets.length}\n`;
    summary += `• Service Owners/Managers: ${impactedData.approvers?.length || 0}\n`;
    summary += `• Additional Stakeholders: ${impactedData.stakeholders?.length || 0}\n`;
    summary += `• Total Impacted Personnel: ${(impactedData.approvers?.length || 0) + (impactedData.stakeholders?.length || 0)}\n\n`;

    // Detailed Asset Analysis
    if (selectedAssets.length > 0) {
      summary += `AFFECTED ASSETS & SYSTEMS:\n\n`;
      
      selectedAssets.forEach((asset, index) => {
        summary += `${index + 1}. ASSET: ${asset.name}\n`;
        summary += `   Asset ID: ${asset.display_id || asset.id}\n`;
        summary += `   Asset Tag: ${asset.asset_tag || 'Not assigned'}\n`;
        
        // Add asset type or category if available
        if (asset.asset_type_id || asset.product_id) {
          summary += `   Type/Product: ${asset.asset_type_id || asset.product_id}\n`;
        }
        
        // Add location if available
        if (asset.location_id || asset.department_id) {
          summary += `   Location/Dept: ${asset.location_id || asset.department_id}\n`;
        }
        
        // Add management info if available
        if (asset.managed_by || asset.agent_id || asset.user_id) {
          summary += `   Managed By: User ID ${asset.managed_by || asset.agent_id || asset.user_id}\n`;
        }
        
        // Add status/state if available
        if (asset.asset_state || asset.state) {
          summary += `   Current State: ${asset.asset_state || asset.state}\n`;
        }
        
        summary += `\n`;
      });
    }

    // Service Owners & Approvers
    if (impactedData.approvers?.length > 0) {
      summary += `SERVICE OWNERS & APPROVERS:\n\n`;
      
      impactedData.approvers.forEach((approver, index) => {
        summary += `${index + 1}. APPROVER: ${approver.name}\n`;
        summary += `   Email: ${approver.email}\n`;
        summary += `   Role/Source: ${approver.source}\n`;
        summary += `   Approval Level: ${approver.level || 'Standard'}\n`;
        
        // Add relationship to assets if available
        if (approver.assetNames && approver.assetNames.length > 0) {
          summary += `   Manages Assets: ${approver.assetNames.join(', ')}\n`;
        }
        
        summary += `\n`;
      });
    }

    // Additional Stakeholders
    if (impactedData.stakeholders?.length > 0) {
      summary += `ADDITIONAL STAKEHOLDERS:\n\n`;
      
      impactedData.stakeholders.forEach((stakeholder, index) => {
        summary += `${index + 1}. STAKEHOLDER: ${stakeholder.name}\n`;
        summary += `   Email: ${stakeholder.email}\n`;
        summary += `   Relationship: ${stakeholder.source}\n`;
        
        // Add notification method if specified
        if (stakeholder.notificationMethod) {
          summary += `   Notification: ${stakeholder.notificationMethod}\n`;
        }
        
        summary += `\n`;
      });
    }

    // Service Dependencies & Relationships
    if (selectedAssets.length > 1) {
      summary += `SERVICE DEPENDENCIES:\n\n`;
      summary += `• ${selectedAssets.length} interconnected systems identified\n`;
      summary += `• Potential cascade effects between systems\n`;
      summary += `• Coordination required across multiple service areas\n`;
      
      // Group assets by type or department if possible
      const assetsByType = {};
      selectedAssets.forEach(asset => {
        const type = asset.asset_type_id || asset.product_id || 'Unspecified';
        if (!assetsByType[type]) {
          assetsByType[type] = [];
        }
        assetsByType[type].push(asset.name);
      });
      
      if (Object.keys(assetsByType).length > 1) {
        summary += `\nAsset Categories Affected:\n`;
        Object.keys(assetsByType).forEach(type => {
          summary += `• ${type}: ${assetsByType[type].length} assets (${assetsByType[type].slice(0, 3).join(', ')}${assetsByType[type].length > 3 ? '...' : ''})\n`;
        });
      }
      summary += `\n`;
    }

    // Communication Plan
    const totalNotifications = (impactedData.approvers?.length || 0) + (impactedData.stakeholders?.length || 0);
    if (totalNotifications > 0) {
      summary += `COMMUNICATION REQUIREMENTS:\n\n`;
      
      if (impactedData.approvers?.length > 0) {
        summary += `APPROVAL NOTIFICATIONS (${impactedData.approvers.length}):\n`;
        summary += `• Formal approval requests to be sent\n`;
        summary += `• Response required before implementation\n`;
        summary += `• Escalation procedures apply for delays\n\n`;
      }
      
      if (impactedData.stakeholders?.length > 0) {
        summary += `STAKEHOLDER NOTIFICATIONS (${impactedData.stakeholders.length}):\n`;
        summary += `• Information-only notifications to be sent\n`;
        summary += `• Advance notice of potential service impact\n`;
        summary += `• Contact information provided for questions\n\n`;
      }
      
      // Timeline recommendations
      if (totalNotifications > 5) {
        summary += `RECOMMENDED NOTIFICATION TIMELINE:\n`;
        summary += `• T-72h: Initial stakeholder notification\n`;
        summary += `• T-48h: Formal approval requests sent\n`;
        summary += `• T-24h: Confirmation and final updates\n`;
        summary += `• T-0h: Implementation commencement notice\n\n`;
      }
    }

    // Service Impact Assessment
    summary += `SERVICE IMPACT ASSESSMENT:\n\n`;
    
    // Determine overall service impact level
    const assetCount = selectedAssets.length;
    const stakeholderCount = totalNotifications;
    
    let impactLevel = 'LOW';
    if (assetCount > 5 || stakeholderCount > 10) {
      impactLevel = 'HIGH';
    } else if (assetCount > 2 || stakeholderCount > 5) {
      impactLevel = 'MEDIUM';
    }
    
    summary += `Overall Service Impact Level: ${impactLevel}\n\n`;
    
    switch (impactLevel) {
      case 'LOW':
        summary += `• Limited service disruption expected\n`;
        summary += `• Standard communication procedures sufficient\n`;
        summary += `• Normal business hours implementation acceptable\n`;
        break;
      case 'MEDIUM':
        summary += `• Moderate service disruption possible\n`;
        summary += `• Enhanced communication and coordination required\n`;
        summary += `• Consider off-hours implementation window\n`;
        break;
      case 'HIGH':
        summary += `• Significant service disruption likely\n`;
        summary += `• Extensive coordination and communication mandatory\n`;
        summary += `• Maintenance window implementation required\n`;
        summary += `• Executive notification recommended\n`;
        break;
    }

    summary += `\nThis analysis was generated automatically from asset selections and stakeholder identification.`;
    summary += `\nGenerated: ${new Date().toLocaleString()}`;
    
    console.log('📋 Service impacted summary generated');
    return summary;
  },

  // ... [rest of the original file content remains unchanged]
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
