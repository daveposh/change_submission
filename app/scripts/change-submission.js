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
    createdApprovals: [],
    createdTasks: [],
    sentNotifications: [],
    associatedAssets: []
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

      // Step 4: Associate assets with the change request (early for stakeholder identification)
      console.log('🔗 Step 4: Associating assets with change request...');
      await this.associateAssets(changeRequest);

      // Step 5: Create approval workflow
      console.log('✅ Step 5: Setting up approval workflow...');
      await this.createApprovalWorkflow(changeRequest);

      // Step 6: Create stakeholder notification note (after change creation with change ID)
      console.log('📧 Step 6: Creating stakeholder notification note...');
      await this.sendStakeholderNotifications(changeRequest);

      // Step 7: Create peer review task if needed
      console.log('👥 Step 7: Creating peer review task if needed...');
      await this.createPeerReviewTasks(changeRequest);

      // Step 8: Update change request with additional metadata
      console.log('🔄 Step 8: Updating change request with workflow data...');
      await this.updateChangeRequestMetadata(changeRequest);

      // Step 9: Show success and redirect
      console.log('🎉 Step 9: Submission completed successfully!');
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
    const priority = this.calculatePriority(data.changeType, data.riskAssessment?.riskLevel);

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
      risks: riskSummary,                                      // Text summary of risk assessment
      lf_technical_owner: this.getTechnicalOwnerUserId(data.selectedAssets), // Primary technical owner
      risk_level: data.riskAssessment?.totalScore || null,     // Numerical risk score from questionnaire (5-15)
      // Additional approver fields (custom fields from Freshservice)
      lf_additional_approver_1: this.getAdditionalApprover(impactedData.approvers, 0),
      lf_additional_approver_2: this.getAdditionalApprover(impactedData.approvers, 1),
      lf_additional_approver_3: this.getAdditionalApprover(impactedData.approvers, 2)
    };

    // Debug: Log risk assessment values being added to custom fields
    console.log('🎯 RISK ASSESSMENT VALUES BEING ADDED:');
    console.log(`  Risk Level (Standard Field): ${risk} (${data.riskAssessment?.riskLevel})`);
    console.log(`  Risk Score (Custom Field): ${data.riskAssessment?.totalScore}`);
    console.log(`  Risk Summary Length: ${riskSummary?.length || 0} characters`);
    console.log(`  Individual Risk Factors:`, {
      businessImpact: data.riskAssessment?.businessImpact,
      affectedUsers: data.riskAssessment?.affectedUsers,
      complexity: data.riskAssessment?.complexity,
      testing: data.riskAssessment?.testing,
      rollback: data.riskAssessment?.rollback
    });

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
    console.log(`  • Additional Approver 1: ${changeRequestData.custom_fields.lf_additional_approver_1 || 'NULL'} (${changeRequestData.custom_fields.lf_additional_approver_1 ? '✅' : '❌'})`);
    console.log(`  • Additional Approver 2: ${changeRequestData.custom_fields.lf_additional_approver_2 || 'NULL'} (${changeRequestData.custom_fields.lf_additional_approver_2 ? '✅' : '❌'})`);
    console.log(`  • Additional Approver 3: ${changeRequestData.custom_fields.lf_additional_approver_3 || 'NULL'} (${changeRequestData.custom_fields.lf_additional_approver_3 ? '✅' : '❌'})`);
    
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

    // PROMINENT SCHEDULE SECTION - NEW ADDITION
    if (data.plannedStart || data.plannedEnd) {
      const startDate = data.plannedStart ? new Date(data.plannedStart) : null;
      const endDate = data.plannedEnd ? new Date(data.plannedEnd) : null;
      const isUrgent = data.changeType === 'emergency' || (startDate && startDate <= new Date(Date.now() + 48 * 60 * 60 * 1000));
      const scheduleColor = isUrgent ? '#dc3545' : '#28a745';
      
      description += `<div style="margin-bottom: 25px; padding: 20px; background: linear-gradient(135deg, ${scheduleColor}15 0%, ${scheduleColor}25 100%); border-radius: 8px; border: 2px solid ${scheduleColor}; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">`;
      description += `<h3 style="color: ${scheduleColor}; margin-top: 0; margin-bottom: 15px; display: flex; align-items: center; font-size: 18px;">`;
      description += `<span style="margin-right: 10px;">${isUrgent ? '⚡' : '📅'}</span>${isUrgent ? 'URGENT SCHEDULE' : 'CHANGE SCHEDULE'}`;
      description += `</h3>`;
      
      description += `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">`;
      
      // Calculate timeToStart outside the conditional block so it's available throughout
      const timeToStart = startDate ? Math.ceil((startDate - new Date()) / (1000 * 60 * 60 * 24)) : null;
      
      if (startDate) {
        description += `<div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid ${scheduleColor};">`;
        description += `<h4 style="margin: 0 0 8px 0; color: ${scheduleColor}; font-size: 14px;">🚀 START TIME</h4>`;
        description += `<div style="font-size: 16px; font-weight: bold; color: #333; margin-bottom: 5px;">${startDate.toLocaleDateString()}</div>`;
        description += `<div style="font-size: 14px; color: #666;">${startDate.toLocaleTimeString()}</div>`;
        if (timeToStart !== null && timeToStart >= 0) {
          description += `<div style="font-size: 12px; color: ${isUrgent ? '#dc3545' : '#28a745'}; font-weight: bold; margin-top: 5px;">`;
          description += `${timeToStart === 0 ? 'TODAY' : timeToStart === 1 ? 'TOMORROW' : `In ${timeToStart} days`}`;
          description += `</div>`;
        }
        description += `</div>`;
      }
      
      if (endDate) {
        const durationText = startDate && endDate ? this.calculateDuration(startDate, endDate) : null;
        description += `<div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid ${scheduleColor};">`;
        description += `<h4 style="margin: 0 0 8px 0; color: ${scheduleColor}; font-size: 14px;">🏁 END TIME</h4>`;
        description += `<div style="font-size: 16px; font-weight: bold; color: #333; margin-bottom: 5px;">${endDate.toLocaleDateString()}</div>`;
        description += `<div style="font-size: 14px; color: #666;">${endDate.toLocaleTimeString()}</div>`;
        if (durationText) {
          description += `<div style="font-size: 12px; color: #0066cc; font-weight: bold; margin-top: 5px;">`;
          description += `Duration: ${durationText}`;
          description += `</div>`;
        }
        description += `</div>`;
      }
      
      if (isUrgent) {
        description += `<div style="background: #fff3cd; padding: 15px; border-radius: 8px; border: 1px solid #ffc107;">`;
        description += `<h4 style="margin: 0 0 8px 0; color: #856404; font-size: 14px;">⚠️ URGENT NOTICE</h4>`;
        description += `<div style="font-size: 13px; color: #856404; line-height: 1.4;">`;
        description += `This change is scheduled to begin ${timeToStart !== null && timeToStart <= 2 ? 'very soon' : 'within the next few days'}. `;
        description += `Please review and approve promptly to avoid delays.`;
        description += `</div></div>`;
      }
      
      description += `</div></div>`;
    }

    // Comprehensive Review Section
    description += `<div style="margin-bottom: 25px; padding: 20px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 8px; border: 1px solid #dee2e6;">`;
    description += `<h3 style="color: #0066cc; margin-top: 0; margin-bottom: 20px; display: flex; align-items: center;">`;
    description += `<span style="margin-right: 10px;">🔍</span>Comprehensive Change Review`;
    description += `</h3>`;
    
    // Change Summary Grid
    description += `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-bottom: 20px;">`;
    
    // Change Details Card
    description += `<div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff;">`;
    description += `<h4 style="margin: 0 0 10px 0; color: #007bff; font-size: 14px;">📝 CHANGE DETAILS</h4>`;
    description += `<div style="font-size: 13px; line-height: 1.5;">`;
    description += `<strong>Type:</strong> ${data.changeType?.charAt(0).toUpperCase() + data.changeType?.slice(1) || 'Normal'}<br>`;
    description += `<strong>Scope:</strong> ${data.selectedAssets?.length || 0} Asset(s) Affected<br>`;
    description += `<strong>Timing:</strong> ${data.plannedStart ? new Date(data.plannedStart).toLocaleDateString() : 'TBD'}<br>`;
    description += `<strong>Duration:</strong> ${data.plannedStart && data.plannedEnd ? 
      this.calculateDuration(new Date(data.plannedStart), new Date(data.plannedEnd)) : 'TBD'}`;
    description += `</div></div>`;
    
    // Stakeholder Impact Card
    const approverCount = impactedData.approvers?.length || 0;
    const stakeholderCount = impactedData.stakeholders?.length || 0;
    description += `<div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #28a745;">`;
    description += `<h4 style="margin: 0 0 10px 0; color: #28a745; font-size: 14px;">👥 STAKEHOLDER IMPACT</h4>`;
    description += `<div style="font-size: 13px; line-height: 1.5;">`;
    description += `<strong>Technical Approvers:</strong> ${approverCount}<br>`;
    description += `<strong>Stakeholders:</strong> ${stakeholderCount}<br>`;
    description += `<strong>Requester:</strong> ${data.selectedRequester?.first_name || ''} ${data.selectedRequester?.last_name || ''}<br>`;
    description += `<strong>Agent:</strong> ${data.selectedAgent?.first_name || 'Unassigned'} ${data.selectedAgent?.last_name || ''}`;
    description += `</div></div>`;
    
    // Planning Overview Card
    description += `<div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107;">`;
    description += `<h4 style="margin: 0 0 10px 0; color: #e69500; font-size: 14px;">📋 PLANNING STATUS</h4>`;
    description += `<div style="font-size: 13px; line-height: 1.5;">`;
    description += `<strong>Implementation Plan:</strong> ${data.implementationPlan ? '✅ Complete' : '❌ Pending'}<br>`;
    description += `<strong>Validation Plan:</strong> ${data.validationPlan ? '✅ Complete' : '❌ Pending'}<br>`;
    description += `<strong>Backout Plan:</strong> ${data.backoutPlan ? '✅ Complete' : '❌ Pending'}<br>`;
    description += `<strong>Risk Assessment:</strong> ${riskAssessment?.riskLevel ? '✅ Complete' : '❌ Pending'}`;
    description += `</div></div>`;
    
    description += `</div>`; // End grid
    
    // Implementation Readiness Assessment
    const readinessScore = [
      data.implementationPlan ? 1 : 0,
      data.validationPlan ? 1 : 0,
      data.backoutPlan ? 1 : 0,
      riskAssessment?.riskLevel ? 1 : 0,
      (approverCount > 0) ? 1 : 0
    ].reduce((a, b) => a + b, 0);
    
    const readinessPercent = (readinessScore / 5) * 100;
    const readinessColor = readinessPercent >= 80 ? '#28a745' : readinessPercent >= 60 ? '#ffc107' : '#dc3545';
    
    description += `<div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #dee2e6;">`;
    description += `<h4 style="margin: 0 0 15px 0; color: #495057; font-size: 14px;">📊 IMPLEMENTATION READINESS</h4>`;
    description += `<div style="display: flex; align-items: center; margin-bottom: 10px;">`;
    description += `<div style="flex: 1; background: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden; margin-right: 15px;">`;
    description += `<div style="height: 100%; background: ${readinessColor}; width: ${readinessPercent}%; transition: width 0.3s ease; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">`;
    description += `${Math.round(readinessPercent)}%`;
    description += `</div></div>`;
    description += `<span style="font-weight: bold; color: ${readinessColor};">${readinessScore}/5 Complete</span>`;
    description += `</div>`;
    description += `<div style="font-size: 12px; color: #6c757d; font-style: italic;">`;
    description += `Assessment based on: Implementation Plan, Validation Plan, Backout Plan, Risk Assessment, and Stakeholder Identification`;
    description += `</div></div>`;
    
    description += `</div>`; // End comprehensive review section

    // Risk Assessment Section (Enhanced with detailed text descriptions)
    if (riskAssessment && riskAssessment.riskLevel) {
      const riskColor = {
        'Low': '#28a745',
        'Medium': '#ffc107', 
        'High': '#dc3545'
      }[riskAssessment.riskLevel] || '#6c757d';
      
      description += `<div style="margin-bottom: 20px; padding: 20px; background: white; border-radius: 8px; border: 1px solid ${riskColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">`;
      description += `<h3 style="color: #0066cc; margin-top: 0; margin-bottom: 15px; display: flex; align-items: center;">`;
      description += `<span style="margin-right: 10px;">⚠️</span>Risk Assessment`;
      description += `</h3>`;
      description += `<div style="display: flex; align-items: center; margin-bottom: 20px;">`;
      description += `<span style="background: linear-gradient(135deg, ${riskColor} 0%, ${riskColor}dd 100%); color: white; padding: 8px 20px; border-radius: 25px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${riskAssessment.riskLevel?.toUpperCase()} RISK</span>`;
      description += `<span style="margin-left: 20px; padding: 8px 15px; background: #f8f9fa; border-radius: 20px; color: #495057; font-weight: bold;">Score: ${riskAssessment.totalScore || 0}/15</span>`;
      description += `</div>`;
      
      // Add detailed risk level explanation
      description += `<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid ${riskColor};">`;
      description += `<h4 style="margin: 0 0 10px 0; color: ${riskColor}; font-size: 14px;">📝 RISK LEVEL EXPLANATION</h4>`;
      description += `<div style="font-size: 13px; line-height: 1.5; color: #495057;">`;
      
      if (riskAssessment.riskLevel === 'High') {
        description += `<strong>High Risk Change:</strong> This change has significant potential for business disruption and requires enhanced oversight. `;
        description += `Extended approval workflows, mandatory peer review periods, and additional stakeholder validation are required. `;
        description += `Implementation should be carefully planned with comprehensive rollback procedures.`;
      } else if (riskAssessment.riskLevel === 'Medium') {
        description += `<strong>Medium Risk Change:</strong> This change has moderate potential for impact and requires standard approval processes. `;
        description += `Peer review coordination will be initiated, and stakeholders will be notified for additional oversight. `;
        description += `Proper testing and rollback planning should be completed before implementation.`;
      } else {
        description += `<strong>Low Risk Change:</strong> This change has minimal potential for business disruption and follows standard approval processes. `;
        description += `While the risk is low, proper change management procedures will still be followed to ensure successful implementation.`;
      }
      
      description += `</div></div>`;
      
      // Risk factors breakdown with enhanced visuals and descriptions
      description += `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px; margin-top: 20px;">`;
      
      const riskFactors = [
        { key: 'businessImpact', label: 'Business Impact', value: riskAssessment.businessImpact, icon: '💼' },
        { key: 'affectedUsers', label: 'User Impact', value: riskAssessment.affectedUsers, icon: '👥' },
        { key: 'complexity', label: 'Complexity', value: riskAssessment.complexity, icon: '⚙️' },
        { key: 'testing', label: 'Testing Level', value: riskAssessment.testing, icon: '🧪' },
        { key: 'rollback', label: 'Rollback Risk', value: riskAssessment.rollback, icon: '↩️' }
      ];
      
      riskFactors.forEach(factor => {
        const score = factor.value || 0;
        const barColor = score >= 3 ? '#dc3545' : score >= 2 ? '#ffc107' : '#28a745';
        description += `<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e9ecef; transition: transform 0.2s ease;">`;
        description += `<div style="display: flex; align-items: center; margin-bottom: 10px;">`;
        description += `<span style="font-size: 16px; margin-right: 8px;">${factor.icon}</span>`;
        description += `<div style="font-size: 13px; color: #495057; font-weight: 600;">${factor.label}</div>`;
        description += `</div>`;
        description += `<div style="display: flex; align-items: center; margin-bottom: 8px;">`;
        description += `<div style="flex: 1; background: #e9ecef; height: 8px; border-radius: 4px; margin-right: 10px; overflow: hidden;">`;
        description += `<div style="height: 100%; background: linear-gradient(90deg, ${barColor} 0%, ${barColor}cc 100%); width: ${(score/3)*100}%; border-radius: 4px; transition: width 0.3s ease;"></div>`;
        description += `</div>`;
        description += `<span style="font-size: 14px; font-weight: bold; color: ${barColor}; min-width: 30px;">${score}/3</span>`;
        description += `</div>`;
        
        // Add text description for each factor
        description += `<div style="font-size: 12px; color: #6c757d; line-height: 1.3;">`;
        if (factor.key === 'businessImpact') {
          description += this.getBusinessImpactDescription(score);
        } else if (factor.key === 'affectedUsers') {
          description += this.getUserImpactDescription(score);
        } else if (factor.key === 'complexity') {
          description += this.getComplexityDescription(score);
        } else if (factor.key === 'testing') {
          description += this.getTestingDescription(score);
        } else if (factor.key === 'rollback') {
          description += this.getRollbackDescription(score);
        }
        description += `</div>`;
        description += `</div>`;
      });
      
      description += `</div></div>`;
    }

    // Service Impact Section with comprehensive risk and impact information
    description += `</div>`;
    
    console.log('✅ Enhanced description created with comprehensive review, detailed risk descriptions, and prominent scheduling');
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
      lf_technical_owner: this.getTechnicalOwnerUserId(data.selectedAssets),
      risk_level: data.riskAssessment?.totalScore || null,
      // Additional approver fields (custom fields from Freshservice)
      lf_additional_approver_1: this.getAdditionalApprover(impactedData.approvers, 0),
      lf_additional_approver_2: this.getAdditionalApprover(impactedData.approvers, 1),
      lf_additional_approver_3: this.getAdditionalApprover(impactedData.approvers, 2)
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
   * Calculate duration between two dates with appropriate units
   */
  calculateDuration(startDate, endDate) {
    if (!startDate || !endDate) return 'TBD';
    
    const diffMs = endDate - startDate;
    
    if (diffMs < 0) return 'Invalid duration';
    
    // Round to nearest 5 minutes
    const totalMinutes = Math.round(diffMs / (1000 * 60));
    const roundedMinutes = Math.round(totalMinutes / 5) * 5;
    
    // Less than 1 hour (show as minutes)
    if (roundedMinutes < 60) {
      return `${roundedMinutes} minute${roundedMinutes !== 1 ? 's' : ''}`;
    }
    // Less than 24 hours (show as hours and minutes)
    else if (roundedMinutes < 24 * 60) {
      const hours = Math.floor(roundedMinutes / 60);
      const minutes = roundedMinutes % 60;
      
      if (minutes === 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
      } else {
        return `${hours}h ${minutes}m`;
      }
    }
    // 24 hours or more (show as days and hours)
    else {
      const totalHours = Math.round(roundedMinutes / 60);
      const days = Math.floor(totalHours / 24);
      const hours = totalHours % 24;
      
      if (hours === 0) {
        return `${days} day${days !== 1 ? 's' : ''}`;
      } else {
        return `${days}d ${hours}h`;
      }
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
   * Generate enhanced impact summary based on questionnaire and assets (HTML formatted)
   */
  generateImpactSummary(riskAssessment, selectedAssets = [], impactedData = {}) {
    console.log('📊 Generating enhanced HTML impact summary from questionnaire and asset data...');
    
    if (!riskAssessment || !riskAssessment.riskLevel) {
      console.warn('⚠️ No risk assessment data available for impact summary');
      return '<p><strong>Impact assessment not completed.</strong> Please complete the risk questionnaire for detailed impact analysis.</p>';
    }

    // Create an HTML-formatted impact summary for better readability
    const riskColor = {
      'Low': '#28a745',
      'Medium': '#ffc107', 
      'High': '#dc3545'
    }[riskAssessment.riskLevel] || '#6c757d';

    let summary = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333;">
  
  <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 20px; border-radius: 8px; border-left: 4px solid ${riskColor}; margin-bottom: 20px;">
    <h3 style="margin: 0 0 15px 0; color: #0066cc; font-size: 18px;">📊 Change Impact Assessment Summary</h3>
    
    <div style="display: grid; grid-template-columns: auto 1fr; gap: 15px; align-items: center; margin-bottom: 15px;">
      <div style="background: ${riskColor}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; text-align: center;">
        ${riskAssessment.riskLevel?.toUpperCase()} RISK
      </div>
      <div style="font-size: 16px; font-weight: 600;">
        Risk Score: <span style="color: ${riskColor};">${riskAssessment.totalScore || 0}/15 Points</span>
      </div>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 15px; margin-bottom: 20px;">
    
    <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h4 style="margin: 0 0 8px 0; color: #007bff; font-size: 14px; display: flex; align-items: center;">
        💼 BUSINESS IMPACT
        <span style="margin-left: auto; background: #f8f9fa; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${this.formatImpactLevel(riskAssessment.businessImpact)}/3</span>
      </h4>
      <p style="margin: 0; font-size: 13px; color: #666;">${this.getBusinessImpactDescription(riskAssessment.businessImpact)}</p>
    </div>

    <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #28a745; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h4 style="margin: 0 0 8px 0; color: #28a745; font-size: 14px; display: flex; align-items: center;">
        👥 USER IMPACT
        <span style="margin-left: auto; background: #f8f9fa; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${this.formatImpactLevel(riskAssessment.affectedUsers)}/3</span>
      </h4>
      <p style="margin: 0; font-size: 13px; color: #666;">${this.getUserImpactDescription(riskAssessment.affectedUsers)}</p>
    </div>

    <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #17a2b8; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h4 style="margin: 0 0 8px 0; color: #17a2b8; font-size: 14px; display: flex; align-items: center;">
        ⚙️ COMPLEXITY
        <span style="margin-left: auto; background: #f8f9fa; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${this.formatImpactLevel(riskAssessment.complexity)}/3</span>
      </h4>
      <p style="margin: 0; font-size: 13px; color: #666;">${this.getComplexityDescription(riskAssessment.complexity)}</p>
    </div>

    <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h4 style="margin: 0 0 8px 0; color: #e69500; font-size: 14px; display: flex; align-items: center;">
        🧪 TESTING
        <span style="margin-left: auto; background: #f8f9fa; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${this.formatImpactLevel(riskAssessment.testing)}/3</span>
      </h4>
      <p style="margin: 0; font-size: 13px; color: #666;">${this.getTestingDescription(riskAssessment.testing)}</p>
    </div>

    <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #dc3545; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h4 style="margin: 0 0 8px 0; color: #dc3545; font-size: 14px; display: flex; align-items: center;">
        ↩️ ROLLBACK
        <span style="margin-left: auto; background: #f8f9fa; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${this.formatImpactLevel(riskAssessment.rollback)}/3</span>
      </h4>
      <p style="margin: 0; font-size: 13px; color: #666;">${this.getRollbackDescription(riskAssessment.rollback)}</p>
    </div>

  </div>

  <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6; margin-bottom: 20px;">
    <h4 style="margin: 0 0 15px 0; color: #495057; font-size: 16px; border-bottom: 2px solid #dee2e6; padding-bottom: 8px;">📋 Scope & Stakeholders</h4>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
      <div style="text-align: center; padding: 10px; background: #f8f9fa; border-radius: 6px;">
        <div style="font-size: 24px; font-weight: bold; color: #007bff;">${selectedAssets.length || 0}</div>
        <div style="font-size: 12px; color: #666;">🏢 Assets Affected</div>
      </div>
      <div style="text-align: center; padding: 10px; background: #f8f9fa; border-radius: 6px;">
        <div style="font-size: 24px; font-weight: bold; color: #28a745;">${impactedData.approvers?.length || 0}</div>
        <div style="font-size: 12px; color: #666;">👤 Technical Approvers</div>
      </div>
      <div style="text-align: center; padding: 10px; background: #f8f9fa; border-radius: 6px;">
        <div style="font-size: 24px; font-weight: bold; color: #17a2b8;">${impactedData.stakeholders?.length || 0}</div>
        <div style="font-size: 12px; color: #666;">👥 Stakeholders</div>
      </div>
      <div style="text-align: center; padding: 10px; background: #f8f9fa; border-radius: 6px;">
        <div style="font-size: 24px; font-weight: bold; color: #ffc107;">${(impactedData.approvers?.length || 0) + (impactedData.stakeholders?.length || 0)}</div>
        <div style="font-size: 12px; color: #666;">📧 Total Notifications</div>
      </div>
    </div>
  </div>

  <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6;">
    <h4 style="margin: 0 0 15px 0; color: #495057; font-size: 16px; border-bottom: 2px solid #dee2e6; padding-bottom: 8px;">⚡ Recommended Actions</h4>
    <div style="font-size: 14px; line-height: 1.8;">
      ${this.getRecommendedActionsHTML(riskAssessment)}
    </div>
  </div>

  <div style="text-align: center; margin-top: 20px; padding: 10px; background: #f8f9fa; border-radius: 6px;">
    <small style="color: #6c757d; font-style: italic;">
      Generated automatically from risk questionnaire and asset analysis on ${new Date().toLocaleDateString()}
    </small>
  </div>

</div>`;
    
    console.log('📋 Enhanced HTML impact summary generated');
    return summary;
  },

  /**
   * Format impact level with simple visual indicator
   */
  formatImpactLevel(level) {
    const score = level || 0;
    return `${score}`;
  },

  /**
   * Get business impact description based on level
   */
  getBusinessImpactDescription(level) {
    switch (level) {
      case 1: return 'Limited business disruption expected';
      case 2: return 'Noticeable impact on business operations';
      case 3: return 'Significant business impact anticipated';
      default: return 'Business impact level not assessed';
    }
  },

  /**
   * Get user impact description based on level
   */
  getUserImpactDescription(level) {
    switch (level) {
      case 1: return 'Minimal user disruption (< 50 users)';
      case 2: return 'Moderate user impact (50-200 users)';
      case 3: return 'Widespread user impact (> 200 users)';
      default: return 'User impact level not assessed';
    }
  },

  /**
   * Get complexity description based on level
   */
  getComplexityDescription(level) {
    switch (level) {
      case 1: return 'Simple change with straightforward implementation';
      case 2: return 'Moderate complexity requiring coordination';
      case 3: return 'Complex change with multiple dependencies';
      default: return 'Complexity level not assessed';
    }
  },

  /**
   * Get testing description based on level
   */
  getTestingDescription(level) {
    switch (level) {
      case 1: return 'Comprehensive testing completed';
      case 2: return 'Adequate testing performed';
      case 3: return 'Limited testing due to constraints';
      default: return 'Testing level not assessed';
    }
  },

  /**
   * Get rollback description based on level
   */
  getRollbackDescription(level) {
    switch (level) {
      case 1: return 'Detailed rollback plan with tested procedures';
      case 2: return 'Basic rollback steps documented';
      case 3: return 'No rollback plan available';
      default: return 'Rollback capability not assessed';
    }
  },

  /**
   * Get recommended actions based on risk assessment
   */
  getRecommendedActions(riskAssessment) {
    const actions = [];
    const riskLevel = riskAssessment.riskLevel?.toLowerCase();
    
    if (riskLevel === 'high') {
      actions.push('🔴 HIGH RISK - Extended approval workflow required');
      actions.push('⏰ Mandatory 24-hour peer review period');
      actions.push('📋 Additional stakeholder review recommended');
    } else if (riskLevel === 'medium') {
      actions.push('🟡 MEDIUM RISK - Standard approval workflow');
      actions.push('👥 Peer review coordination will be initiated');
    } else {
      actions.push('🟢 LOW RISK - Standard approval process');
    }
    
    if (riskAssessment.testing >= 3) {
      actions.push('🧪 Enhanced testing validation recommended');
    }
    
    if (riskAssessment.rollback >= 3) {
      actions.push('↩️  Rollback plan development required');
    }
    
    if (riskAssessment.complexity >= 3) {
      actions.push('⚙️  Technical architecture review suggested');
    }
    
    return actions.map(action => `• ${action}`).join('\n');
  },

  /**
   * Get recommended actions as HTML formatted list
   */
  getRecommendedActionsHTML(riskAssessment) {
    const actions = [];
    const riskLevel = riskAssessment.riskLevel?.toLowerCase();
    
    if (riskLevel === 'high') {
      actions.push({
        icon: '🔴',
        text: 'HIGH RISK - Extended approval workflow required',
        color: '#dc3545'
      });
      actions.push({
        icon: '⏰',
        text: 'Mandatory 24-hour peer review period',
        color: '#fd7e14'
      });
      actions.push({
        icon: '📋',
        text: 'Additional stakeholder review recommended',
        color: '#6f42c1'
      });
    } else if (riskLevel === 'medium') {
      actions.push({
        icon: '🟡',
        text: 'MEDIUM RISK - Standard approval workflow',
        color: '#ffc107'
      });
      actions.push({
        icon: '👥',
        text: 'Peer review coordination will be initiated',
        color: '#17a2b8'
      });
    } else {
      actions.push({
        icon: '🟢',
        text: 'LOW RISK - Standard approval process',
        color: '#28a745'
      });
    }
    
    if (riskAssessment.testing >= 3) {
      actions.push({
        icon: '🧪',
        text: 'Enhanced testing validation recommended',
        color: '#20c997'
      });
    }
    
    if (riskAssessment.rollback >= 3) {
      actions.push({
        icon: '↩️',
        text: 'Rollback plan development required',
        color: '#e83e8c'
      });
    }
    
    if (riskAssessment.complexity >= 3) {
      actions.push({
        icon: '⚙️',
        text: 'Technical architecture review suggested',
        color: '#6c757d'
      });
    }
    
    return actions.map(action => 
      `<div style="display: flex; align-items: center; margin-bottom: 8px; padding: 8px 12px; background: ${action.color}15; border-left: 3px solid ${action.color}; border-radius: 4px;">
        <span style="margin-right: 10px; font-size: 16px;">${action.icon}</span>
        <span style="color: ${action.color}; font-weight: 500;">${action.text}</span>
      </div>`
    ).join('');
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
   * Get additional approver ID based on index, excluding technical owner
   * @param {Array} approvers - Array of approvers from impacted services
   * @param {number} index - Index of the approver (0-based)
   * @returns {number|null} - Approver ID or null if not available
   */
  getAdditionalApprover(approvers = [], index) {
    if (!approvers || approvers.length === 0) {
      console.log(`📋 No approvers available for lf_additional_approver_${index + 1}`);
      return null;
    }
    
    // Get the technical owner ID to exclude from additional approvers
    const data = window.changeRequestData;
    const technicalOwnerUserId = this.getTechnicalOwnerUserId(data.selectedAssets);
    
    // Filter out approvers that match the technical owner
    const filteredApprovers = approvers.filter(approver => {
      if (!approver || !approver.id) return false;
      
      // Skip if this approver is the same as the technical owner
      if (technicalOwnerUserId && approver.id === technicalOwnerUserId) {
        console.log(`⚠️ Skipping approver ${approver.id} (${approver.name || 'Unknown'}) - same as technical owner`);
        return false;
      }
      
      return true;
    });
    
    console.log(`📋 Filtered approvers for additional fields: ${filteredApprovers.length} (excluded technical owner: ${technicalOwnerUserId})`);
    
    if (index >= filteredApprovers.length) {
      console.log(`📋 Index ${index} exceeds available filtered approvers (${filteredApprovers.length}) for lf_additional_approver_${index + 1}`);
      return null;
    }
    
    const approver = filteredApprovers[index];
    if (approver && approver.id) {
      console.log(`✅ Setting lf_additional_approver_${index + 1}: ${approver.id} (${approver.name || 'Unknown Name'})`);
      return approver.id;
    }
    
    console.log(`⚠️ Filtered approver at index ${index} has no valid ID for lf_additional_approver_${index + 1}`);
    return null;
  },

  /**
   * Create approval workflow for the change request
   */
  async createApprovalWorkflow(changeRequest) {
    console.log('✅ Setting up change approvals...');
    
    try {
      // Get impacted services data which contains approvers
      const impactedData = window.ImpactedServices?.getImpactedServicesData() || {};
      
      console.log('🔍 Impacted services data for approvals:', {
        hasApprovers: !!(impactedData.approvers && impactedData.approvers.length > 0),
        approverCount: impactedData.approvers?.length || 0,
        approvers: impactedData.approvers?.map(a => ({ id: a.id, name: a.name, source: a.source })) || []
      });
      
      if (!impactedData.approvers || impactedData.approvers.length === 0) {
        console.log('ℹ️ No approvers identified from impacted services analysis, skipping approval creation');
        return;
      }

      const data = window.changeRequestData;
      const riskAssessment = data?.riskAssessment;
      
      // Create individual approvals for each approver
      const createdApprovals = [];
      
      for (const approver of impactedData.approvers) {
        try {
          console.log(`📝 Creating approval for approver: ${approver.name} (${approver.id})`);
          
          // Prepare approval data according to Freshservice API docs
          const approvalData = {
            approver_id: approver.id,
            approval_type: 2, // Change approval type (1=Ticket, 2=Change)
            email_content: `
              <h3>Change Request Approval Required</h3>
              <p>A <strong>${riskAssessment?.riskLevel || 'Medium'} risk</strong> change request requires your approval:</p>
              <p><strong>Change:</strong> ${changeRequest.subject}</p>
              <p><strong>Description:</strong> ${changeRequest.description_text || 'No description provided'}</p>
              <p><strong>Risk Level:</strong> ${riskAssessment?.riskLevel || 'Medium'} (Score: ${riskAssessment?.totalScore || 'N/A'}/15)</p>
              <p><strong>Requester:</strong> ${data.selectedRequester?.first_name} ${data.selectedRequester?.last_name} (${data.selectedRequester?.email})</p>
              <p><strong>Planned Start:</strong> ${data.plannedStart ? new Date(data.plannedStart).toLocaleString() : 'TBD'}</p>
              <p><strong>Planned End:</strong> ${data.plannedEnd ? new Date(data.plannedEnd).toLocaleString() : 'TBD'}</p>
              <p>Your approval is required based on your role as a technical owner or stakeholder for the impacted assets.</p>
              <p>Please review and approve/reject this change request in Freshservice.</p>
            `
          };
          
          console.log('📋 Approval data prepared:', {
            approver_id: approver.id,
            approval_type: approvalData.approval_type,
            hasEmailContent: !!approvalData.email_content
          });
          
          // Note: Freshservice API v2 doesn't have direct change approval creation
          // Instead, create approval tickets - removed invalid fields that cause validation errors
          const approvalTicketData = {
            email: approver.email || `approver-${approver.id}@fallback.local`,
            subject: `Change Approval Required: ${changeRequest.subject}`,
            description: approvalData.email_content,
            status: 2, // Open
            priority: 2, // Medium priority for approvals
            source: 2, // Portal
            responder_id: approver.id
          };

          const response = await window.client.request.invokeTemplate('createChangeApproval', {
            body: JSON.stringify({
              helpdesk_ticket: approvalTicketData
            }),
            cache: false
          });
          
          console.log(`📡 Raw approval response for ${approver.name}:`, response);
          
          if (!response || !response.response) {
            throw new Error(`No response received from approval creation API for approver ${approver.id}`);
          }
          
          let approval;
          try {
            approval = JSON.parse(response.response);
            console.log(`📋 Parsed approval response for ${approver.name}:`, approval);
          } catch (parseError) {
            console.error(`❌ Failed to parse approval response JSON for ${approver.name}:`, response.response);
            throw new Error(`Invalid JSON response for approver ${approver.id}: ${parseError.message}`);
          }
          
          // Handle ticket response structure for approval tickets
          if (approval.helpdesk_ticket && approval.helpdesk_ticket.id) {
            const createdApproval = approval.helpdesk_ticket;
            createdApprovals.push(createdApproval);
            console.log(`✅ Approval ticket created successfully for ${approver.name}: ${createdApproval.id}`);
          } else if (approval.id) {
            createdApprovals.push(approval);
            console.log(`✅ Approval ticket created successfully for ${approver.name}: ${approval.id}`);
          } else {
            console.error(`❌ Unexpected approval ticket response structure for ${approver.name}:`, approval);
            console.warn(`⚠️ Continuing with other approvers despite failure for ${approver.name}`);
          }
          
        } catch (error) {
          console.error(`❌ Error creating approval for ${approver.name} (${approver.id}):`, error);
          // Continue with other approvers even if one fails
          console.warn(`⚠️ Continuing with other approvers despite failure for ${approver.name}`);
        }
      }
      
      console.log(`✅ Created ${createdApprovals.length} out of ${impactedData.approvers.length} approval tickets`);
      
      // Store created approvals in state
      this.state.createdApprovals = createdApprovals;
      
      return createdApprovals;
      
    } catch (error) {
      console.error('❌ Error in approval ticket creation process:', error);
      // Don't throw error - approval creation failure shouldn't stop the entire submission
      console.warn('⚠️ Continuing with submission despite approval ticket creation failure');
    }
  },

  /**
   * Send stakeholder notifications by creating change notes with recipients
   */
  async sendStakeholderNotifications(changeRequest) {
    console.log('📧 Creating stakeholder notification notes...');
    
    try {
      // Get impacted services data which contains stakeholders
      const impactedData = window.ImpactedServices?.getImpactedServicesData() || {};
      
      console.log('🔍 Impacted services data for notifications:', {
        hasStakeholders: !!(impactedData.stakeholders && impactedData.stakeholders.length > 0),
        stakeholderCount: impactedData.stakeholders?.length || 0,
        hasApprovers: !!(impactedData.approvers && impactedData.approvers.length > 0),
        approverCount: impactedData.approvers?.length || 0
      });
      
      // Combine stakeholders and approvers for notifications
      const notificationRecipients = [];
      
      // Add stakeholders
      if (impactedData.stakeholders && impactedData.stakeholders.length > 0) {
        impactedData.stakeholders.forEach(stakeholder => {
          if (stakeholder.email) {
            notificationRecipients.push({
              email: stakeholder.email,
              name: stakeholder.name || stakeholder.email,
              type: 'stakeholder',
              source: stakeholder.source || 'Impacted Services',
              id: stakeholder.id || null
            });
          }
        });
      }
      
      // Add approvers (who are also stakeholders for notification purposes)
      if (impactedData.approvers && impactedData.approvers.length > 0) {
        impactedData.approvers.forEach(approver => {
          if (approver.email && !notificationRecipients.find(r => r.email === approver.email)) {
            notificationRecipients.push({
              email: approver.email,
              name: approver.name || approver.email,
              type: 'approver',
              source: approver.source || 'Technical Owner',
              id: approver.id || null
            });
          }
        });
      }
      
      if (notificationRecipients.length === 0) {
        console.log('ℹ️ No stakeholders or approvers found, skipping stakeholder notification note');
        return { skipped: true, reason: 'No recipients found' };
      }
      
      // Validate that we have at least one valid email
      const validEmails = notificationRecipients
        .map(r => r.email)
        .filter(email => email && this.isValidEmail(email));
      
      if (validEmails.length === 0) {
        console.warn('⚠️ No valid email addresses found for stakeholders, skipping notification note');
        return { skipped: true, reason: 'No valid email addresses' };
      }
      
      console.log(`📝 Creating stakeholder notification note for ${notificationRecipients.length} recipients (${validEmails.length} valid emails)...`);
      
      // Create a single change note with all stakeholders as recipients
      const stakeholderNote = await this.createStakeholderNotificationNote(changeRequest, notificationRecipients);
      
      if (stakeholderNote) {
        this.state.sentNotifications.push({
          type: 'stakeholder_note',
          noteId: stakeholderNote.id,
          recipients: notificationRecipients,
          validEmails: validEmails,
          sentAt: new Date().toISOString()
        });
        
        console.log(`✅ Created stakeholder notification note ${stakeholderNote.id} for change ${changeRequest.id} with ${validEmails.length} email notifications`);
        return { 
          success: true, 
          note: stakeholderNote, 
          recipientCount: notificationRecipients.length,
          emailCount: validEmails.length 
        };
      } else {
        console.warn('⚠️ Stakeholder notification note creation returned null/undefined');
        return { success: false, reason: 'Note creation failed' };
      }
      
    } catch (error) {
      console.error('❌ Error creating stakeholder notification note:', error);
      // Don't throw error - notification failure shouldn't stop the entire submission
      console.warn('⚠️ Continuing with submission despite notification failure');
    }
  },

  /**
   * Create stakeholder notification note with recipients
   */
  async createStakeholderNotificationNote(changeRequest, recipients) {
    console.log(`📝 Creating stakeholder notification note for ${recipients.length} recipients...`);
    
    try {
      const data = window.changeRequestData;
      const riskAssessment = data?.riskAssessment;
      
      // Prepare note content
      const noteBody = this.generateStakeholderNotificationNoteBody(changeRequest, recipients, riskAssessment);
      
      // Extract valid email addresses for notifications
      const stakeholderEmails = recipients
        .map(r => r.email)
        .filter(email => email && this.isValidEmail(email));
      
      console.log('📧 Stakeholder emails for notification:', stakeholderEmails);
      
      // Prepare note data according to Freshservice API v2 format (based on official docs)
      const noteData = {
        body: noteBody,
        notify_emails: stakeholderEmails // Email addresses that will receive notifications
      };
      
      console.log('📋 Stakeholder note data prepared:', {
        hasBody: !!noteData.body,
        bodyLength: noteBody.length,
        recipientCount: recipients.length,
        validEmailCount: stakeholderEmails.length,
        notifyEmails: stakeholderEmails,
        changeId: changeRequest.id
      });
      
      const response = await window.client.request.invokeTemplate('createChangeNote', {
        context: {
          change_id: changeRequest.id
        },
        body: JSON.stringify(noteData),
        cache: false
      });
      
      console.log('📡 Raw stakeholder note response:', response);
      
      if (!response || !response.response) {
        throw new Error('No response received from change note creation API');
      }
      
      let noteResponse;
      try {
        noteResponse = JSON.parse(response.response);
        console.log('📋 Parsed note response:', noteResponse);
      } catch (parseError) {
        console.error('❌ Failed to parse note response JSON:', response.response);
        throw new Error(`Invalid JSON response: ${parseError.message}`);
      }
      
      // Handle different response structures
      const createdNote = noteResponse.note || noteResponse;
      
      console.log(`✅ Stakeholder notification note created successfully: ${createdNote.id}`);
      return createdNote;
      
    } catch (error) {
      console.error(`❌ Failed to create stakeholder notification note:`, error);
      throw error;
    }
  },

  /**
   * Generate stakeholder notification note body
   */
  generateStakeholderNotificationNoteBody(changeRequest, recipients, riskAssessment) {
    const data = window.changeRequestData;
    
    let body = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">`;
    
    // Header
    body += `<h3 style="color: #0066cc; margin-bottom: 20px;">📋 Stakeholder Notification</h3>`;
    
    // Greeting and explanation
    body += `<p><strong>Dear Stakeholders,</strong></p>`;
    body += `<p>You have been identified as a stakeholder for this change request because you manage or are responsible for systems that may be impacted.</p>`;
    body += `<div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #0dcaf0;">`;
    body += `<h4 style="margin-top: 0; color: #0c5460; font-size: 16px;">📋 Important Notice</h4>`;
    body += `<p style="margin-bottom: 0;"><strong>This notification is for your awareness and review only - no approval action is required from you.</strong> If you have any questions or concerns about this change, please contact the Request or Agent SME listed below.</p>`;
    body += `</div>`;
    
    // Important contacts section
    body += `<div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #0066cc;">`;
    body += `<h4 style="margin-top: 0; color: #0066cc;">📞 Contact Information</h4>`;
    body += `<p><strong>For questions or concerns, please contact:</strong></p>`;
    body += `<ul style="margin-bottom: 0;">`;
    body += `<li><strong>Change Requester:</strong> ${data.selectedRequester?.name || data.selectedRequester?.first_name + ' ' + data.selectedRequester?.last_name || 'Unknown'} (${data.selectedRequester?.email || 'No email available'})</li>`;
    if (data.selectedAgent?.name || data.selectedAgent?.email) {
      body += `<li><strong>Agent SME:</strong> ${data.selectedAgent.name || data.selectedAgent.first_name + ' ' + data.selectedAgent.last_name || 'Unknown'} (${data.selectedAgent.email || 'No email available'})</li>`;
    }
    body += `</ul>`;
    body += `</div>`;
    
    // Prominent schedule section
    if (data.plannedStart || data.plannedEnd) {
      const startDate = data.plannedStart ? new Date(data.plannedStart) : null;
      const endDate = data.plannedEnd ? new Date(data.plannedEnd) : null;
      const isUrgent = data.changeType === 'emergency' || (startDate && startDate <= new Date(Date.now() + 48 * 60 * 60 * 1000));
      const scheduleColor = isUrgent ? '#dc3545' : '#28a745';
      const timeToStart = startDate ? Math.ceil((startDate - new Date()) / (1000 * 60 * 60 * 24)) : null;
      
      body += `<div style="margin: 20px 0; padding: 20px; background: linear-gradient(135deg, ${scheduleColor}15 0%, ${scheduleColor}25 100%); border-radius: 8px; border: 2px solid ${scheduleColor};">`;
      body += `<h4 style="color: ${scheduleColor}; margin-top: 0; margin-bottom: 15px; font-size: 16px;">`;
      body += `${isUrgent ? '⚡ URGENT SCHEDULE NOTICE' : '📅 CHANGE SCHEDULE'}`;
      body += `</h4>`;
      
      if (startDate) {
        body += `<p><strong>🚀 Planned Start:</strong> ${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString()}`;
        if (timeToStart !== null && timeToStart >= 0) {
          body += ` <span style="color: ${isUrgent ? '#dc3545' : '#28a745'}; font-weight: bold;">(${timeToStart === 0 ? 'TODAY' : timeToStart === 1 ? 'TOMORROW' : `In ${timeToStart} days`})</span>`;
        }
        body += `</p>`;
      }
      
      if (endDate) {
        const duration = startDate && endDate ? this.calculateDuration(startDate, endDate) : null;
        body += `<p><strong>🏁 Planned End:</strong> ${endDate.toLocaleDateString()} at ${endDate.toLocaleTimeString()}`;
        if (duration) {
          body += ` <span style="color: #0066cc; font-weight: bold;">(Duration: ${duration})</span>`;
        }
        body += `</p>`;
      }
      
      if (isUrgent) {
        body += `<div style="background: #fff3cd; padding: 10px; border-radius: 6px; border: 1px solid #ffc107; margin-top: 15px;">`;
        body += `<div style="color: #856404; font-weight: bold; font-size: 14px;">⚠️ URGENT ATTENTION</div>`;
        body += `<div style="color: #856404; font-size: 13px; margin-top: 5px;">`;
        body += `This change is scheduled to begin ${timeToStart <= 2 ? 'very soon' : 'within the next few days'}. Please be prepared for potential service impacts.`;
        body += `</div></div>`;
      }
      
      body += `</div>`;
    }
    
    // Change details
    body += `<div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">`;
    body += `<h4 style="margin-top: 0; color: #333;">Change Request Details</h4>`;
    body += `<p><strong>Change ID:</strong> CR-${changeRequest.id}</p>`;
    body += `<p><strong>Title:</strong> ${changeRequest.subject}</p>`;
    body += `<p><strong>Requester:</strong> ${data.selectedRequester?.name || data.selectedRequester?.first_name + ' ' + data.selectedRequester?.last_name || 'Unknown'}</p>`;
    
    if (riskAssessment) {
      const riskColor = this.getRiskColor(riskAssessment.riskLevel);
      body += `<p><strong>Risk Level:</strong> <span style="background-color: ${riskColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${riskAssessment.riskLevel?.toUpperCase()}</span> (${riskAssessment.totalScore}/15)</p>`;
    }
    
    body += `</div>`;
    
    // Why you're receiving this notification
    body += `<div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; border-left: 4px solid #0dcaf0; margin: 20px 0;">`;
    body += `<h4 style="margin-top: 0; color: #0c5460;">🎯 Why You're Receiving This Notification</h4>`;
    body += `<p>You have been identified as a stakeholder because:</p>`;
    body += `<ul>`;
    
    // Group recipients by source/type and explain why they're notified
    const stakeholdersBySource = {};
    recipients.forEach(recipient => {
      const source = recipient.source || 'Manual Selection';
      if (!stakeholdersBySource[source]) {
        stakeholdersBySource[source] = [];
      }
      stakeholdersBySource[source].push(recipient);
    });
    
    Object.keys(stakeholdersBySource).forEach(source => {
      const count = stakeholdersBySource[source].length;
      if (source.includes('Asset')) {
        body += `<li>You manage or are responsible for ${count > 1 ? 'assets' : 'an asset'} that will be directly impacted by this change</li>`;
      } else if (source.includes('Service')) {
        body += `<li>You own or manage ${count > 1 ? 'services' : 'a service'} that may be affected by this change</li>`;
      } else if (source.includes('Technical')) {
        body += `<li>You are a technical owner or approver for systems involved in this change</li>`;
      } else {
        body += `<li>You have been manually identified as a stakeholder for this change</li>`;
      }
    });
    
    body += `</ul>`;
    body += `<p><strong>No action is required from you</strong> - this is purely informational. However, if you have concerns or questions about this change, please contact the requester or agent SME listed above.</p>`;
    body += `</div>`;
    
    // Implementation details
    if (data.implementationPlan) {
      body += `<div style="margin: 20px 0;">`;
      body += `<h4 style="color: #333;">📋 Implementation Plan</h4>`;
      body += `<div style="background-color: #fff; padding: 10px; border-left: 4px solid #0066cc;">${data.implementationPlan}</div>`;
      body += `</div>`;
    }
    
    // Reason for change
    if (data.reasonForChange) {
      body += `<div style="margin: 20px 0;">`;
      body += `<h4 style="color: #333;">💡 Reason for Change</h4>`;
      body += `<div style="background-color: #fff; padding: 10px; border-left: 4px solid #28a745;">${data.reasonForChange}</div>`;
      body += `</div>`;
    }
    
    // Impacted assets
    if (data.selectedAssets && data.selectedAssets.length > 0) {
      body += `<div style="margin: 20px 0;">`;
      body += `<h4 style="color: #333;">🖥️ Directly Impacted Assets</h4>`;
      body += `<ul>`;
      data.selectedAssets.forEach(asset => {
        body += `<li><strong>${asset.name}</strong> (${asset.asset_type_name || 'Unknown Type'})`;
        if (asset.location_name) {
          body += ` - Location: ${asset.location_name}`;
        }
        body += `</li>`;
      });
      body += `</ul>`;
      body += `</div>`;
    }
    
    // Backout plan
    if (data.backoutPlan) {
      body += `<div style="margin: 20px 0;">`;
      body += `<h4 style="color: #333;">↩️ Backout Plan</h4>`;
      body += `<div style="background-color: #fff; padding: 10px; border-left: 4px solid #ffc107;">${data.backoutPlan}</div>`;
      body += `</div>`;
    }
    
    // Footer
    body += `<div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 30px; border-top: 3px solid #0066cc;">`;
    body += `<h4 style="margin-top: 0; color: #0066cc;">📋 Next Steps</h4>`;
    body += `<ul style="margin-bottom: 0;">`;
    body += `<li><strong>Review the details</strong> provided in this notification</li>`;
    body += `<li><strong>Prepare for potential impacts</strong> during the scheduled time window</li>`;
    body += `<li><strong>Contact the requester or agent SME</strong> if you have any questions or concerns (contact information provided above)</li>`;
    body += `<li><strong>Monitor your systems</strong> during the change implementation if applicable</li>`;
    body += `</ul>`;
    body += `</div>`;
    
    body += `<div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 20px; border-left: 4px solid #ffc107;">`;
    body += `<h4 style="margin-top: 0; color: #856404;">🤔 Questions or Concerns?</h4>`;
    body += `<p style="margin-bottom: 10px;">If you have questions about this change or notice any issues:</p>`;
    body += `<ul style="margin-bottom: 10px;">`;
    body += `<li><strong>Technical questions:</strong> Contact the Agent SME listed above</li>`;
    body += `<li><strong>Business impact questions:</strong> Contact the Change Requester listed above</li>`;
    body += `<li><strong>Urgent issues:</strong> Contact both the Requester and Agent SME immediately</li>`;
    body += `</ul>`;
    body += `<p style="margin-bottom: 0;"><strong>Remember:</strong> You do not need to approve this change, but your feedback is valuable if you have concerns.</p>`;
    body += `</div>`;
    
    body += `<div style="text-align: center; margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">`;
    body += `<p style="margin-bottom: 10px;"><em>Thank you for your attention to this change request.</em></p>`;
    body += `<p style="margin: 0;"><strong>IT Change Management Team</strong></p>`;
    body += `</div>`;
    
    body += `</div>`;
    
    return body;
  },

  /**
   * Generate stakeholder notification email body (legacy method - kept for compatibility)
   */
  generateStakeholderNotificationBody(changeRequest, recipient, riskAssessment) {
    const data = window.changeRequestData;
    
    let body = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">`;
    
    // Header
    body += `<h3 style="color: #0066cc; margin-bottom: 20px;">📋 Change Request Notification</h3>`;
    
    // Greeting
    body += `<p>Dear ${recipient.name},</p>`;
    body += `<p>A new change request has been submitted that may impact systems you manage or are responsible for.</p>`;
    
    // PROMINENT SCHEDULE SECTION - NEW ADDITION
    if (data.plannedStart || data.plannedEnd) {
      const startDate = data.plannedStart ? new Date(data.plannedStart) : null;
      const endDate = data.plannedEnd ? new Date(data.plannedEnd) : null;
      const isUrgent = data.changeType === 'emergency' || (startDate && startDate <= new Date(Date.now() + 48 * 60 * 60 * 1000));
      const scheduleColor = isUrgent ? '#dc3545' : '#28a745';
      const timeToStart = startDate ? Math.ceil((startDate - new Date()) / (1000 * 60 * 60 * 24)) : null;
      
      body += `<div style="margin: 20px 0; padding: 20px; background: linear-gradient(135deg, ${scheduleColor}15 0%, ${scheduleColor}25 100%); border-radius: 8px; border: 2px solid ${scheduleColor};">`;
      body += `<h4 style="color: ${scheduleColor}; margin-top: 0; margin-bottom: 15px; font-size: 16px;">`;
      body += `${isUrgent ? '⚡ URGENT SCHEDULE NOTICE' : '📅 CHANGE SCHEDULE'}`;
      body += `</h4>`;
      
      body += `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">`;
      
      if (startDate) {
        body += `<div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid ${scheduleColor};">`;
        body += `<div style="font-weight: bold; color: ${scheduleColor}; margin-bottom: 5px;">🚀 START TIME</div>`;
        body += `<div style="font-size: 16px; font-weight: bold; color: #333;">${startDate.toLocaleDateString()}</div>`;
        body += `<div style="font-size: 14px; color: #666;">${startDate.toLocaleTimeString()}</div>`;
        if (timeToStart !== null && timeToStart >= 0) {
          body += `<div style="font-size: 12px; color: ${isUrgent ? '#dc3545' : '#28a745'}; font-weight: bold; margin-top: 5px;">`;
          body += `${timeToStart === 0 ? 'TODAY' : timeToStart === 1 ? 'TOMORROW' : `In ${timeToStart} days`}`;
          body += `</div>`;
        }
        body += `</div>`;
      }
      
      if (endDate) {
        const duration = startDate && endDate ? this.calculateDuration(startDate, endDate) : null;
        body += `<div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid ${scheduleColor};">`;
        body += `<div style="font-weight: bold; color: ${scheduleColor}; margin-bottom: 5px;">🏁 END TIME</div>`;
        body += `<div style="font-size: 16px; font-weight: bold; color: #333;">${endDate.toLocaleDateString()}</div>`;
        body += `<div style="font-size: 14px; color: #666;">${endDate.toLocaleTimeString()}</div>`;
        if (duration) {
          body += `<div style="font-size: 12px; color: #0066cc; font-weight: bold; margin-top: 5px;">`;
          body += `Duration: ${duration}`;
          body += `</div>`;
        }
        body += `</div>`;
      }
      
      body += `</div>`;
      
      if (isUrgent) {
        body += `<div style="background: #fff3cd; padding: 10px; border-radius: 6px; border: 1px solid #ffc107; margin-top: 15px;">`;
        body += `<div style="color: #856404; font-weight: bold; font-size: 14px;">⚠️ URGENT ATTENTION REQUIRED</div>`;
        body += `<div style="color: #856404; font-size: 13px; margin-top: 5px;">`;
        body += `This change is scheduled to begin ${timeToStart <= 2 ? 'very soon' : 'within the next few days'}. `;
        body += `${recipient.type === 'approver' ? 'Please review and approve promptly to avoid delays.' : 'Please be prepared for potential service impacts.'}`;
        body += `</div></div>`;
      }
      
      body += `</div>`;
    }
    
    // Change details
    body += `<div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">`;
    body += `<h4 style="margin-top: 0; color: #333;">Change Request Details</h4>`;
    body += `<p><strong>Change ID:</strong> CR-${changeRequest.id}</p>`;
    body += `<p><strong>Title:</strong> ${changeRequest.subject}</p>`;
    body += `<p><strong>Requester:</strong> ${data.selectedRequester?.name || data.selectedRequester?.first_name + ' ' + data.selectedRequester?.last_name || 'Unknown'}</p>`;
    
    if (riskAssessment) {
      const riskColor = this.getRiskColor(riskAssessment.riskLevel);
      body += `<p><strong>Risk Level:</strong> <span style="background-color: ${riskColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${riskAssessment.riskLevel?.toUpperCase()}</span> (${riskAssessment.totalScore}/15)</p>`;
      
      // Add risk level explanation in notifications
      body += `<div style="background: #f8f9fa; padding: 10px; border-radius: 4px; border-left: 3px solid ${riskColor}; margin-top: 10px;">`;
      body += `<div style="font-size: 13px; color: #495057;">`;
      if (riskAssessment.riskLevel === 'High') {
        body += `<strong>High Risk:</strong> This change requires enhanced oversight with extended approval workflows and mandatory peer review.`;
      } else if (riskAssessment.riskLevel === 'Medium') {
        body += `<strong>Medium Risk:</strong> This change follows standard approval processes with peer review coordination.`;
      } else {
        body += `<strong>Low Risk:</strong> This change has minimal business disruption potential but follows standard procedures.`;
      }
      body += `</div></div>`;
    }
    
    body += `</div>`;
    
    // Implementation details
    if (data.implementationPlan) {
      body += `<div style="margin: 20px 0;">`;
      body += `<h4 style="color: #333;">Implementation Plan</h4>`;
      body += `<div style="background-color: #fff; padding: 10px; border-left: 4px solid #0066cc;">${data.implementationPlan}</div>`;
      body += `</div>`;
    }
    
    // Reason for change
    if (data.reasonForChange) {
      body += `<div style="margin: 20px 0;">`;
      body += `<h4 style="color: #333;">Reason for Change</h4>`;
      body += `<p>${data.reasonForChange}</p>`;
      body += `</div>`;
    }
    
    // Impacted assets
    if (data.selectedAssets && data.selectedAssets.length > 0) {
      body += `<div style="margin: 20px 0;">`;
      body += `<h4 style="color: #333;">Impacted Assets</h4>`;
      body += `<ul>`;
      data.selectedAssets.forEach(asset => {
        body += `<li>${asset.name} (${asset.asset_type_name || 'Unknown Type'})</li>`;
      });
      body += `</ul>`;
      body += `</div>`;
    }
    
    // Action required based on recipient type
    if (recipient.type === 'approver') {
      body += `<div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;">`;
      body += `<h4 style="margin-top: 0; color: #856404;">Action Required</h4>`;
      body += `<p>As an identified approver, you will receive a separate approval request that requires your review and approval.</p>`;
      if (data.plannedStart) {
        const timeToStart = Math.ceil((new Date(data.plannedStart) - new Date()) / (1000 * 60 * 60 * 24));
        if (timeToStart <= 3) {
          body += `<p style="color: #dc3545; font-weight: bold;">⚠️ Please note the urgent timeline - approval needed promptly!</p>`;
        }
      }
      body += `</div>`;
    } else {
      body += `<div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; border-left: 4px solid #0dcaf0; margin: 20px 0;">`;
      body += `<h4 style="margin-top: 0; color: #0c5460;">For Your Information</h4>`;
      body += `<p>Please review this change request and provide any feedback or concerns to the change requester.</p>`;
      body += `</div>`;
    }
    
    // Footer
    body += `<p>If you have any questions or concerns about this change, please contact the change requester directly.</p>`;
    body += `<p>Best regards,<br>IT Change Management</p>`;
    body += `</div>`;
    
    return body;
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
      
      // Check if risk level requires peer review (score 8+ = Medium/High risk)
      // Risk scoring: 5-7 = Low, 8-11 = Medium, 12-15 = High
      // Peer review required for score 8+ (Medium and High risk changes)
      const requiresPeerReview = riskAssessment.totalScore >= 8;
      
              console.log(`📊 Risk threshold analysis:`, {
          totalScore: riskAssessment.totalScore,
          riskLevel: riskAssessment.riskLevel,
          threshold: 8,
          requiresPeerReview: requiresPeerReview,
          reasoning: requiresPeerReview 
            ? `Score ${riskAssessment.totalScore} >= 8 (${riskAssessment.riskLevel} risk) - Peer review required`
            : `Score ${riskAssessment.totalScore} < 8 (${riskAssessment.riskLevel} risk) - No peer review needed`
        });
      
              if (!requiresPeerReview) {
          console.log(`ℹ️ Risk score ${riskAssessment.totalScore} is below threshold (8+), no peer review required`);
          return;
        }
        
        console.log(`🎯 Risk score ${riskAssessment.totalScore} requires peer review task creation`);
      
      // Identify the agent SME who will coordinate peer review
      const agentSME = this.identifyAgentSME(data, changeRequest);
      
      if (!agentSME) {
        console.warn('⚠️ No agent SME identified, skipping peer review task creation');
        return;
      }
      
      // Create a single peer review coordination task for the agent SME
      try {
        const task = await this.createPeerReviewCoordinationTask(changeRequest, agentSME, riskAssessment);
        if (task) {
          this.state.createdTasks.push(task);
          console.log(`✅ Created peer review coordination task for agent SME ${agentSME.id}: Task ${task.id}`);
          return [task];
        }
      } catch (error) {
        console.error(`❌ Failed to create peer review coordination task for agent SME ${agentSME.id}:`, error);
        throw error;
      }
      
    } catch (error) {
      console.error('❌ Error creating peer review tasks:', error);
      throw error;
    }
  },

  /**
   * Identify the agent SME who will coordinate peer review
   */
  identifyAgentSME(data, changeRequest) {
    console.log('🔍 Identifying agent SME for peer review coordination...');
    
    try {
      // Debug: Log both the change request agent and form data
      console.log('🔍 DEBUG: Agent identification data:', {
        changeRequestAgentId: changeRequest.agent_id,
        selectedAgent: data.selectedAgent,
        hasSelectedAgentId: !!data.selectedAgent?.id,
        hasSelectedAgentName: !!data.selectedAgent?.name,
        hasSelectedAgentEmail: !!data.selectedAgent?.email,
        requesterId: changeRequest.requester_id
      });
      
      // Primary option: Use the agent from the created change request (most reliable)
      if (changeRequest.agent_id) {
        console.log(`✅ Using change request agent as SME: ${changeRequest.agent_id}`);
        
        // Try to get agent details from form data if available
        if (data.selectedAgent?.id === changeRequest.agent_id) {
          const isRequester = changeRequest.agent_id === changeRequest.requester_id;
          return {
            id: changeRequest.agent_id,
            name: data.selectedAgent.name || data.selectedAgent.email || `Agent ${changeRequest.agent_id}`,
            email: data.selectedAgent.email || null,
            source: isRequester ? 'Assigned Agent (Self-Requested)' : 'Assigned Agent (Change Request)'
          };
        } else {
          // Agent ID exists but no details available
          const isRequester = changeRequest.agent_id === changeRequest.requester_id;
          return {
            id: changeRequest.agent_id,
            name: `Agent ${changeRequest.agent_id}`,
            email: null,
            source: isRequester ? 'Assigned Agent (Self-Requested)' : 'Assigned Agent (Change Request)'
          };
        }
      }
      
      // Fallback: Use the assigned agent from form data
      if (data.selectedAgent?.id) {
        console.log(`✅ Using form data agent as SME: ${data.selectedAgent.id} (${data.selectedAgent.name || data.selectedAgent.email || 'Name not available'})`);
        const isRequester = data.selectedAgent.id === changeRequest.requester_id;
        return {
          id: data.selectedAgent.id,
          name: data.selectedAgent.name || data.selectedAgent.email || `Agent ${data.selectedAgent.id}`,
          email: data.selectedAgent.email || null,
          source: isRequester ? 'Assigned Agent (Self-Requested)' : 'Assigned Agent (Form Data)'
        };
      }
      
      // Secondary fallback: Use primary technical owner from impacted services
      const impactedData = window.ImpactedServices?.getImpactedServicesData() || {};
      if (impactedData.approvers && impactedData.approvers.length > 0) {
        const primaryApprover = impactedData.approvers[0];
        if (primaryApprover.id) {
          console.log(`⚠️ No assigned agent found, using primary technical owner as SME: ${primaryApprover.id} (${primaryApprover.name || 'Name not available'})`);
          const isRequester = primaryApprover.id === changeRequest.requester_id;
          return {
            id: primaryApprover.id,
            name: primaryApprover.name || primaryApprover.email || `User ${primaryApprover.id}`,
            email: primaryApprover.email || null,
            source: isRequester ? 'Primary Technical Owner (Self)' : 'Primary Technical Owner (Fallback)'
          };
        }
      }
      
      // Last resort: Use asset manager as SME
      if (data.selectedAssets && data.selectedAssets.length > 0) {
        for (const asset of data.selectedAssets) {
          if (asset.managed_by) {
            console.log(`⚠️ No assigned agent or technical owner found, using asset manager as SME: ${asset.managed_by} (from asset: ${asset.name})`);
            const isRequester = asset.managed_by === changeRequest.requester_id;
            return {
              id: asset.managed_by,
              name: `Asset Manager (${asset.name})`,
              email: null,
              source: isRequester ? 'Asset Manager (Self)' : 'Asset Manager (Last Resort)'
            };
          }
        }
      }
      
      console.warn('⚠️ No suitable agent SME identified for peer review coordination - no assigned agent, technical owners, or asset managers available');
      return null;
      
    } catch (error) {
      console.error('❌ Error identifying agent SME:', error);
      return null;
    }
  },

  /**
   * Create a peer review coordination task for the agent SME
   */
  async createPeerReviewCoordinationTask(changeRequest, agentSME, riskAssessment) {
    console.log(`📝 Creating peer review coordination task for agent SME ${agentSME.id}...`);
    
    try {
      // Calculate due date (24 hours from now for peer review coordination)
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + 24);
      
      // Create a ticket as task since change tasks API isn't available in v2
      // Using ticket creation - removed invalid fields that cause validation errors
      const taskData = {
        email: agentSME.email || `agent-${agentSME.id}@fallback.local`,
        subject: `Peer Review Coordination Required: ${changeRequest.subject}`,
        description: this.generatePeerReviewCoordinationTaskDescription(changeRequest, agentSME, riskAssessment),
        status: 2, // Open for tickets (2)
        priority: this.mapRiskToPriority(riskAssessment?.riskLevel || riskAssessment?.level),
        source: 2, // Portal
        responder_id: agentSME.id,
        due_by: dueDate.toISOString()
      };
      
      console.log('📋 Peer review coordination task data prepared:', {
        subject: taskData.subject,
        agentSMEId: agentSME.id,
        agentSMEName: agentSME.name,
        status: taskData.status,
        priority: taskData.priority,
        riskLevel: riskAssessment?.riskLevel || riskAssessment?.level,
        dueDate: taskData.due_by,
        changeId: changeRequest.id,
        email: taskData.email,
        ticketType: taskData.ticket_type
      });
      
      // Create the task as a ticket using the ticket creation endpoint
      console.log('📡 Sending task ticket creation request...');
      const response = await window.client.request.invokeTemplate('createChangeTask', {
        body: JSON.stringify(taskData),
        cache: false
      });
      
      console.log('📡 Raw change task creation response:', response);
      
      if (!response || !response.response) {
        throw new Error('No response received from change task creation API');
      }
      
      let createdTask;
      try {
        createdTask = JSON.parse(response.response);
        console.log('📋 Parsed change task response:', createdTask);
      } catch (parseError) {
        console.error('❌ Failed to parse change task response JSON:', response.response);
        throw new Error(`Invalid JSON response: ${parseError.message}`);
      }
      
      // Handle ticket creation response structure
      if (createdTask.helpdesk_ticket) {
        // Standard ticket response structure with wrapper
        console.log(`✅ Peer review coordination task ticket created successfully: ${createdTask.helpdesk_ticket.id}`);
        return createdTask.helpdesk_ticket;
      } else if (createdTask.ticket) {
        // Standard ticket response structure
        console.log(`✅ Peer review coordination task ticket created successfully: ${createdTask.ticket.id}`);
        return createdTask.ticket;
      } else if (createdTask.id) {
        // Direct response structure
        console.log(`✅ Peer review coordination task ticket created successfully: ${createdTask.id}`);
        return createdTask;
      } else {
        console.error('❌ Unexpected task ticket response structure:', createdTask);
        throw new Error(`Unexpected response structure: ${JSON.stringify(createdTask)}`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to create peer review coordination task for agent SME ${agentSME.id}:`, error);
      
      // Enhanced error logging for debugging
      if (error.status === 500 && error.response) {
        console.error('📋 500 Error Details:', {
          status: error.status,
          response: error.response,
          headers: error.headers,
          attempts: error.attempts,
          changeId: changeRequest.id,
          agentId: agentSME.id
        });
        
        // Try to parse error response for more details
        try {
          const errorData = JSON.parse(error.response);
          console.error('📋 Parsed error response:', errorData);
        } catch (parseErr) {
          console.error('📋 Could not parse error response as JSON');
        }
      }
      
      // For now, don't throw to prevent blocking submission
      console.warn('⚠️ Continuing submission despite task creation failure...');
      return null;
    }
  },

  /**
   * Generate peer review coordination task description for agent SME
   */
  generatePeerReviewCoordinationTaskDescription(changeRequest, agentSME, riskAssessment) {
    const data = window.changeRequestData;
    
    let description = `<div style="font-family: Arial, sans-serif; line-height: 1.6;">`;
    
    // Header
    description += `<h3 style="color: #0066cc; margin-bottom: 20px;">🎯 Peer Review Coordination Required</h3>`;
    
    // SME Assignment Notice
    description += `<div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #0066cc;">`;
    description += `<h4 style="margin-top: 0; color: #0066cc;">📋 SME Assignment</h4>`;
    description += `<p><strong>Assigned SME:</strong> ${agentSME.name} (${agentSME.source})</p>`;
    description += `<p><strong>Responsibility:</strong> You are responsible for coordinating the peer review process for this ${riskAssessment.riskLevel} risk change.</p>`;
    description += `</div>`;
    
    // Change request details
    description += `<div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">`;
    description += `<h4 style="margin-top: 0; color: #333;">Change Request Details</h4>`;
    description += `<p><strong>Change ID:</strong> CR-${changeRequest.id}</p>`;
    description += `<p><strong>Title:</strong> ${changeRequest.subject}</p>`;
    description += `<p><strong>Requester:</strong> ${data.selectedRequester?.name || 'Unknown'}</p>`;
    description += `<p><strong>Risk Level:</strong> <span style="background-color: ${this.getRiskColor(riskAssessment.riskLevel)}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${riskAssessment.riskLevel?.toUpperCase()}</span> (${riskAssessment.totalScore}/15)</p>`;
    
    if (data.plannedStart) {
      description += `<p><strong>Planned Start:</strong> ${new Date(data.plannedStart).toLocaleString()}</p>`;
    }
    if (data.plannedEnd) {
      description += `<p><strong>Planned End:</strong> ${new Date(data.plannedEnd).toLocaleString()}</p>`;
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
    
    // SME Responsibilities - Different instructions for self-requested vs. assigned agent
    const isSelfRequested = agentSME.source?.includes('Self') || agentSME.source?.includes('Self-Requested');
    
    description += `<div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin-bottom: 20px;">`;
    description += `<h4 style="margin-top: 0; color: #856404;">🎯 Your Responsibilities as SME Coordinator</h4>`;
    
    if (isSelfRequested) {
      description += `<p>As the <strong>requester and assigned SME</strong>, you must obtain an <strong>independent peer review</strong> since you cannot review your own work. Choose <strong>ONE</strong> of the following options:</p>`;
      description += `<ol style="margin-bottom: 0;">`;
      description += `<li><strong>Assign to Peer Reviewer:</strong> Reassign this task to a qualified technical peer who can perform an independent review of your change plan.</li>`;
      description += `<li><strong>Coordinate External Review:</strong> Ask a colleague to review your change and attach evidence of their completed review to this task.</li>`;
      description += `<li><strong>Escalate for Review Assignment:</strong> Contact your manager to assign an appropriate independent peer reviewer.</li>`;
      description += `</ol>`;
      description += `<p style="margin-top: 10px; margin-bottom: 0;"><strong>Important:</strong> Since you are both the requester and SME, independent review is mandatory. You cannot approve your own work.</p>`;
    } else {
      description += `<p>As the assigned Subject Matter Expert, you must coordinate an <strong>independent peer review</strong> by choosing <strong>ONE</strong> of the following options:</p>`;
      description += `<ol style="margin-bottom: 0;">`;
      description += `<li><strong>Conduct Review Yourself:</strong> If you have the expertise and were not involved in planning this change, you may perform the peer review yourself.</li>`;
      description += `<li><strong>Assign to Peer Reviewer:</strong> Reassign this task to a qualified technical peer who can perform an independent review.</li>`;
      description += `<li><strong>Coordinate External Review:</strong> Obtain peer review through other team members and attach evidence of the completed review.</li>`;
      description += `<li><strong>Escalate for Review Assignment:</strong> If unsure who should review, escalate to management to identify an appropriate peer reviewer.</li>`;
      description += `</ol>`;
      description += `<p style="margin-top: 10px; margin-bottom: 0;"><strong>Note:</strong> The goal is independent technical validation. If you were involved in planning this change, assign it to someone else for review.</p>`;
    }
    description += `</div>`;
    
    // Review checklist
    description += `<div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #6c757d; margin-bottom: 20px;">`;
    description += `<h4 style="margin-top: 0; color: #495057;">📝 Peer Review Checklist</h4>`;
    description += `<p>The peer review (whether conducted by you or a peer) should evaluate:</p>`;
    description += `<ul style="margin-bottom: 0;">`;
    description += `<li><strong>Technical Feasibility:</strong> Can this change be implemented as described?</li>`;
    description += `<li><strong>Risk Assessment:</strong> Are there additional risks or issues not considered?</li>`;
    description += `<li><strong>Alternative Approaches:</strong> Are there better or safer ways to achieve the same outcome?</li>`;
    description += `<li><strong>Testing Strategy:</strong> Is the testing approach adequate for the risk level?</li>`;
    description += `<li><strong>Rollback Plan:</strong> Is the rollback strategy sufficient and tested?</li>`;
    description += `<li><strong>Implementation Timeline:</strong> Is the proposed timeline realistic and appropriate?</li>`;
    description += `</ul>`;
    description += `</div>`;
    
    // Instructions
    description += `<div style="margin-top: 20px; padding: 15px; background-color: #d1ecf1; border-radius: 5px;">`;
    description += `<h4 style="margin-top: 0; color: #0c5460;">📋 Completion Instructions</h4>`;
    description += `<p><strong>Deadline:</strong> Complete peer review coordination within <strong>24 hours</strong>.</p>`;
    description += `<p><strong>Required Actions:</strong></p>`;
    description += `<ul>`;
    description += `<li>Identify and assign a qualified peer reviewer (not yourself) to perform independent technical review</li>`;
    description += `<li>Ensure the peer reviewer has access to all relevant documentation and plans</li>`;
    description += `<li>Collect and attach evidence of completed peer review (review notes, findings, recommendations)</li>`;
    description += `<li>Update this task with review results and any concerns identified</li>`;
    description += `<li>Coordinate with the change requester if issues are found that need resolution</li>`;
    description += `</ul>`;
    description += `<p><strong>Important:</strong> The peer review must be conducted by someone other than the original SME or change requester to ensure independent validation of the technical approach.</p>`;
    description += `</div>`;
    
    description += `</div>`;
    
    return description;
  },

  /**
   * Map risk level to ticket priority
   */
  mapRiskToPriority(riskLevel) {
    const mapping = {
      'Low': 1,    // Low priority
      'Medium': 2, // Medium priority 
      'High': 3    // High priority
    };
    return mapping[riskLevel] || 2; // Default to medium
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
   * Strip HTML tags from text for plain text version
   */
  stripHtmlTags(html) {
    if (!html) return '';
    
    try {
      // Create a temporary element to parse HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // Get text content and clean up whitespace
      let textContent = tempDiv.textContent || tempDiv.innerText || '';
      
      // Replace multiple whitespace with single space and trim
      textContent = textContent.replace(/\s+/g, ' ').trim();
      
      return textContent;
    } catch (error) {
      console.warn('⚠️ Error stripping HTML tags:', error);
      // Fallback: remove basic HTML tags with regex
      return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }
  },

  /**
   * Validate email address format
   */
  isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    
    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  },

  /**
   * Update change request with additional metadata
   */
  updateChangeRequestMetadata() {
    console.log('🔄 Updating change request with workflow metadata...');
    // Implementation would go here
  },

  /**
   * Show submission success in modal
   */
  async showSubmissionSuccess(changeRequest) {
    console.log('🎉 Showing submission success modal...');
    
    // Get risk assessment and peer review task information
    const data = window.changeRequestData;
    const riskAssessment = data?.riskAssessment;
    const createdTasksCount = this.state.createdTasks?.length || 0;
    
    // Get Freshservice domain from installation parameters
    const getFreshserviceDomain = async () => {
      try {
        // Get installation parameters using the client API
        const params = await window.client.iparams.get();
        console.log('🔍 Retrieved iparams:', params);
        
        if (params && params.freshservice_domain) {
          const domain = params.freshservice_domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
          console.log('✅ Using domain from iparams:', domain);
          return domain;
        }
        
        console.warn('⚠️ No freshservice_domain found in iparams');
        return 'your-domain.freshservice.com';
      } catch (error) {
        console.error('❌ Could not retrieve installation parameters:', error);
        return 'your-domain.freshservice.com';
      }
    };

    const freshserviceDomain = await getFreshserviceDomain();
    const changeUrl = `https://${freshserviceDomain}/a/changes/${changeRequest.id}?current_tab=details`;
    
    // Build success content
    let successContent = `
      <div class="text-center mb-4">
        <div class="display-4 mb-3">🎉</div>
        <h4 class="text-success mb-3">Change Request Created Successfully!</h4>
        <div class="card">
          <div class="card-body">
            <div class="row">
              <div class="col-md-6">
                <p><strong>Change Request ID:</strong></p>
                <p class="h5 text-primary">CR-${changeRequest.id}</p>
              </div>
              <div class="col-md-6">
                <p><strong>Title:</strong></p>
                <p class="h6">${changeRequest.subject}</p>
              </div>
            </div>
            
            <div class="mt-3">
              <small class="text-muted">
                <i class="fas fa-link me-1"></i>
                Direct link: <a href="${changeUrl}" target="_blank" class="text-decoration-none">${changeUrl}</a>
              </small>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add risk level information
    if (riskAssessment) {
      const riskColor = this.getRiskColor(riskAssessment.riskLevel);
      successContent += `
        <div class="card mb-3">
          <div class="card-body">
            <h6 class="card-title">
              <i class="fas fa-shield-alt me-2"></i>Risk Assessment
            </h6>
            <div class="d-flex align-items-center mb-3">
              <span class="badge me-3" style="background-color: ${riskColor}; font-size: 14px; padding: 8px 12px;">
                ${riskAssessment.riskLevel?.toUpperCase()} RISK
              </span>
              <span class="text-muted">Score: ${riskAssessment.totalScore}/15</span>
            </div>
      `;
      
      // Add peer review information
      if (riskAssessment.totalScore >= 8) {
        if (createdTasksCount > 0) {
          successContent += `
            <div class="alert alert-warning mb-0">
              <h6 class="alert-heading">
                <i class="fas fa-user-cog me-2"></i>Peer Review Coordination Required
              </h6>
              <p class="mb-0">
                Due to the ${riskAssessment.riskLevel} risk level, a <strong>peer review coordination task</strong> 
                has been assigned to the agent SME. They are responsible for obtaining peer review within 24 hours.
              </p>
            </div>
          `;
        } else {
          successContent += `
            <div class="alert alert-danger mb-0">
              <h6 class="alert-heading">
                <i class="fas fa-exclamation-triangle me-2"></i>Peer Review Required
              </h6>
              <p class="mb-0">
                Due to the ${riskAssessment.riskLevel} risk level, peer review is required but no agent SME could be automatically identified. 
                Please manually assign a Subject Matter Expert to coordinate the peer review process.
              </p>
            </div>
          `;
        }
      } else {
        successContent += `
          <div class="alert alert-info mb-0">
            <p class="mb-0">
              <i class="fas fa-info-circle me-2"></i>No peer review required for ${riskAssessment.riskLevel} risk changes.
            </p>
          </div>
        `;
      }
      
      successContent += `</div></div>`;
    }
    
    // Add impact details section
    successContent += this.generateImpactDetailsSection();
    
    // Update the success modal content
    const successContentDiv = document.getElementById('success-content');
    if (successContentDiv) {
      successContentDiv.innerHTML = successContent;
    }
    
    // Update the View Change button link
    const viewChangeBtn = document.getElementById('view-change-btn');
    if (viewChangeBtn) {
      viewChangeBtn.href = changeUrl;
    }
    
    // Setup event listeners for modal buttons
    this.setupSuccessModalEventListeners();
    
    // Setup impact section event listeners and popovers
    setTimeout(() => {
      // Initialize Bootstrap popovers
      const popoverElements = document.querySelectorAll('[data-bs-toggle="popover"]');
      popoverElements.forEach(element => {
        new bootstrap.Popover(element, {
          trigger: 'hover focus',
          delay: { show: 300, hide: 100 }
        });
      });
      console.log(`✅ Initialized ${popoverElements.length} popovers`);
      
      // Setup detailed report button
      const detailedReportBtn = document.getElementById('view-detailed-report-btn');
      if (detailedReportBtn) {
        detailedReportBtn.onclick = () => this.showImpactDetailsModal();
        console.log('✅ Detailed report button event listener added');
      }
      
      // Setup export summary button
      const exportSummaryBtn = document.getElementById('export-impact-summary-btn');
      if (exportSummaryBtn) {
        exportSummaryBtn.onclick = () => this.exportImpactReport();
        console.log('✅ Export summary button event listener added');
      }
    }, 100);
    
    // Hide any existing modals and show success modal
    const confirmationModal = bootstrap.Modal.getInstance(document.getElementById('confirmation-modal'));
    if (confirmationModal) {
      confirmationModal.hide();
    }
    
    // Show success modal with delay to ensure confirmation modal is hidden
    setTimeout(() => {
      const successModal = new bootstrap.Modal(document.getElementById('success-modal'));
      
      // Add event listener for when modal is hidden
      const successModalElement = document.getElementById('success-modal');
      if (successModalElement) {
        successModalElement.addEventListener('hidden.bs.modal', () => {
          console.log('🔧 Success modal hidden event triggered - ensuring page is enabled');
          this.ensurePageEnabled();
        }, { once: true }); // Only run once since we create new modal instances
      }
      
      successModal.show();
    }, 300);
  },

  /**
   * Generate impact details section for the success modal
   */
  generateImpactDetailsSection() {
    const data = window.changeRequestData;
    const impactedData = window.ImpactedServices?.getImpactedServicesData() || {};
    
    // Calculate metrics for summary
    const metrics = this.calculateImpactMetrics(data, impactedData);
    
    let impactSection = `
      <div class="card mb-3">
        <div class="card-body">
          <h6 class="card-title">
            <i class="fas fa-sitemap me-2"></i>Impact Analysis Summary
          </h6>
          
          <!-- Quick Summary Cards -->
          <div class="row text-center mb-3">
            <div class="col-4">
              <div class="border rounded p-2">
                <h5 class="text-primary mb-1">${metrics.totalAssets}</h5>
                <small class="text-muted">Assets</small>
                ${metrics.totalAssets > 0 ? `
                  <button type="button" class="btn btn-link btn-sm p-0" 
                          data-bs-toggle="popover" 
                          data-bs-placement="top"
                          data-bs-html="true"
                          data-bs-content="${this.generateAssetsPopoverContent(data.selectedAssets)}"
                          title="Affected Assets">
                    <i class="fas fa-info-circle text-info"></i>
                  </button>
                ` : ''}
              </div>
            </div>
            <div class="col-4">
              <div class="border rounded p-2">
                <h5 class="text-info mb-1">${metrics.totalStakeholders}</h5>
                <small class="text-muted">Stakeholders</small>
                ${metrics.totalStakeholders > 0 ? `
                  <button type="button" class="btn btn-link btn-sm p-0" 
                          data-bs-toggle="popover" 
                          data-bs-placement="top"
                          data-bs-html="true"
                          data-bs-content="${this.generateStakeholdersPopoverContent(impactedData.stakeholders)}"
                          title="Identified Stakeholders">
                    <i class="fas fa-info-circle text-info"></i>
                  </button>
                ` : ''}
              </div>
            </div>
            <div class="col-4">
              <div class="border rounded p-2">
                <h5 class="text-warning mb-1">${metrics.totalApprovers}</h5>
                <small class="text-muted">Approvers</small>
                ${metrics.totalApprovers > 0 ? `
                  <button type="button" class="btn btn-link btn-sm p-0" 
                          data-bs-toggle="popover" 
                          data-bs-placement="top"
                          data-bs-html="true"
                          data-bs-content="${this.generateApproversPopoverContent(impactedData.approvers)}"
                          title="Required Approvers">
                    <i class="fas fa-info-circle text-info"></i>
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
          
          <!-- Notification Status Summary -->
          <div class="row mb-3">
            <div class="col-md-6">
              <div class="d-flex align-items-center">
                <span class="badge ${metrics.totalNotified > 0 ? 'bg-success' : 'bg-warning'} me-2">
                  ${metrics.totalNotified} Notified
                </span>
                ${metrics.totalNotified > 0 ? `
                  <button type="button" class="btn btn-link btn-sm p-0" 
                          data-bs-toggle="popover" 
                          data-bs-placement="right"
                          data-bs-html="true"
                          data-bs-content="${this.generateNotificationPopoverContent()}"
                          title="Notification Details">
                    <i class="fas fa-envelope text-success"></i>
                  </button>
                ` : '<i class="fas fa-envelope-open text-muted"></i>'}
              </div>
            </div>
            <div class="col-md-6">
              <div class="d-flex align-items-center">
                <span class="badge ${metrics.createdApprovals > 0 ? 'bg-success' : 'bg-secondary'} me-2">
                  ${metrics.createdApprovals} Approvals
                </span>
                <span class="badge ${metrics.createdTasks > 0 ? 'bg-info' : 'bg-secondary'}">
                  ${metrics.createdTasks} Tasks
                </span>
              </div>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-outline-primary btn-sm" id="view-detailed-report-btn">
              <i class="fas fa-file-alt me-1"></i>Detailed Report
            </button>
            <button type="button" class="btn btn-outline-secondary btn-sm" id="export-impact-summary-btn">
              <i class="fas fa-download me-1"></i>Export
            </button>
          </div>
        </div>
      </div>
    `;
    
    return impactSection;
  },

  /**
   * Generate assets popover content
   */
  generateAssetsPopoverContent(assets) {
    if (!assets || assets.length === 0) {
      return '<div class="text-muted">No assets selected</div>';
    }
    
    let content = '<div style="max-width: 300px;">';
    assets.slice(0, 5).forEach((asset, index) => {
      content += `
        <div class="mb-2 ${index < assets.length - 1 ? 'border-bottom pb-2' : ''}">
          <div class="fw-bold">${asset.name}</div>
          <small class="text-muted">${asset.asset_type_name || 'Unknown Type'}</small>
          ${asset.location_name ? `<br><small class="text-secondary">📍 ${asset.location_name}</small>` : ''}
        </div>
      `;
    });
    
    if (assets.length > 5) {
      content += `<div class="text-muted text-center">... and ${assets.length - 5} more</div>`;
    }
    
    content += '</div>';
    return content.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  /**
   * Generate stakeholders popover content
   */
  generateStakeholdersPopoverContent(stakeholders) {
    if (!stakeholders || stakeholders.length === 0) {
      return '<div class="text-muted">No stakeholders identified</div>';
    }
    
    const notifiedEmails = this.state.sentNotifications?.reduce((emails, notification) => {
      return emails.concat(notification.validEmails || []);
    }, []) || [];
    
    let content = '<div style="max-width: 350px;">';
    stakeholders.slice(0, 6).forEach((stakeholder, index) => {
      const wasNotified = notifiedEmails.includes(stakeholder.email);
      content += `
        <div class="mb-2 ${index < stakeholders.length - 1 ? 'border-bottom pb-2' : ''}">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <div class="fw-bold">${stakeholder.name || 'N/A'}</div>
              <small class="text-muted">${stakeholder.email || 'No email'}</small>
              <br><small class="badge bg-info">${stakeholder.source || 'Manual'}</small>
            </div>
            <div>
              ${wasNotified ? 
                '<i class="fas fa-check-circle text-success" title="Notified"></i>' : 
                '<i class="fas fa-times-circle text-warning" title="Not Notified"></i>'}
            </div>
          </div>
        </div>
      `;
    });
    
    if (stakeholders.length > 6) {
      content += `<div class="text-muted text-center">... and ${stakeholders.length - 6} more</div>`;
    }
    
    content += '</div>';
    return content.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  /**
   * Generate approvers popover content
   */
  generateApproversPopoverContent(approvers) {
    if (!approvers || approvers.length === 0) {
      return '<div class="text-muted">No approvers required</div>';
    }
    
    const notifiedEmails = this.state.sentNotifications?.reduce((emails, notification) => {
      return emails.concat(notification.validEmails || []);
    }, []) || [];
    
    let content = '<div style="max-width: 350px;">';
    approvers.slice(0, 5).forEach((approver, index) => {
      const wasNotified = notifiedEmails.includes(approver.email);
      const hasApproval = this.state.createdApprovals?.some(approval => 
        approval.responder_id === approver.id
      );
      
      content += `
        <div class="mb-2 ${index < approvers.length - 1 ? 'border-bottom pb-2' : ''}">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <div class="fw-bold">${approver.name || 'N/A'}</div>
              <small class="text-muted">${approver.email || 'No email'}</small>
              <br><small class="badge bg-warning">${approver.source || 'Technical Owner'}</small>
            </div>
            <div class="text-end">
              ${hasApproval ? 
                '<i class="fas fa-ticket-alt text-success" title="Approval Created"></i>' : 
                '<i class="fas fa-times text-danger" title="Approval Failed"></i>'}
              <br>
              ${wasNotified ? 
                '<i class="fas fa-envelope text-success" title="Notified"></i>' : 
                '<i class="fas fa-envelope-open text-warning" title="Not Notified"></i>'}
            </div>
          </div>
        </div>
      `;
    });
    
    if (approvers.length > 5) {
      content += `<div class="text-muted text-center">... and ${approvers.length - 5} more</div>`;
    }
    
    content += '</div>';
    return content.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  /**
   * Generate notification popover content
   */
  generateNotificationPopoverContent() {
    if (!this.state.sentNotifications || this.state.sentNotifications.length === 0) {
      return '<div class="text-muted">No notifications sent</div>';
    }
    
    let content = '<div style="max-width: 300px;">';
    this.state.sentNotifications.forEach((notification, index) => {
      const successRate = notification.validEmails ? 
        `${notification.validEmails.length}/${notification.recipients?.length || 0}` : '0/0';
      
      content += `
        <div class="mb-2 ${index < this.state.sentNotifications.length - 1 ? 'border-bottom pb-2' : ''}">
          <div class="fw-bold">
            ${notification.type === 'stakeholder_note' ? 'Stakeholder Note' : 'Email Notification'}
          </div>
          <div class="d-flex justify-content-between">
            <small class="text-muted">Recipients:</small>
            <small class="fw-bold">${successRate}</small>
          </div>
          <div class="d-flex justify-content-between">
            <small class="text-muted">Sent:</small>
            <small>${new Date(notification.sentAt).toLocaleTimeString()}</small>
          </div>
          ${notification.noteId ? `
            <div class="d-flex justify-content-between">
              <small class="text-muted">Note ID:</small>
              <small class="font-monospace">${notification.noteId}</small>
            </div>
          ` : ''}
          <div class="text-center mt-1">
            <span class="badge ${notification.validEmails?.length > 0 ? 'bg-success' : 'bg-danger'}">
              ${notification.validEmails?.length > 0 ? 'Success' : 'Failed'}
            </span>
          </div>
        </div>
      `;
    });
    
    content += '</div>';
    return content.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  /**
   * Show detailed impact information modal
   */
  showImpactDetailsModal() {
    console.log('📊 Showing impact details modal...');
    
    const data = window.changeRequestData;
    const impactedData = window.ImpactedServices?.getImpactedServicesData() || {};
    
    // Generate detailed impact content
    const impactContent = this.generateDetailedImpactContent(data, impactedData);
    
    // Create or update impact details modal
    let impactModal = document.getElementById('impact-details-modal');
    if (!impactModal) {
      // Create the modal if it doesn't exist
      const modalHTML = `
        <div class="modal fade" id="impact-details-modal" tabindex="-1" aria-labelledby="impact-details-title" aria-hidden="true">
          <div class="modal-dialog modal-xl">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="impact-details-title">
                  <i class="fas fa-sitemap me-2"></i>Detailed Impact Analysis
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body" id="impact-details-content">
                <!-- Content will be populated here -->
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary" id="export-impact-btn">
                  <i class="fas fa-download me-1"></i>Export Report
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Add modal to DOM
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      impactModal = document.getElementById('impact-details-modal');
      
      // Setup export button
      document.getElementById('export-impact-btn').onclick = () => this.exportImpactReport();
    }
    
    // Update content
    const contentDiv = document.getElementById('impact-details-content');
    if (contentDiv) {
      contentDiv.innerHTML = impactContent;
    }
    
    // Show modal
    const modal = new bootstrap.Modal(impactModal);
    modal.show();
  },

  /**
   * Generate detailed impact content
   */
  generateDetailedImpactContent(data, impactedData) {
    let content = '';
    
    // Summary metrics
    const metricsData = this.calculateImpactMetrics(data, impactedData);
    content += this.generateImpactMetricsSection(metricsData);
    
    // Affected systems
    content += this.generateAffectedSystemsSection(data);
    
    // Stakeholders and notifications
    content += this.generateStakeholdersSection(impactedData);
    
    // Approvers and workflow
    content += this.generateApproversSection(impactedData);
    
    // Notification status
    content += this.generateNotificationStatusSection();
    
    // Risk assessment details
    content += this.generateRiskAssessmentSection(data.riskAssessment);
    
    return content;
  },

  /**
   * Calculate impact metrics
   */
  calculateImpactMetrics(data, impactedData) {
    return {
      totalAssets: data.selectedAssets?.length || 0,
      totalStakeholders: impactedData.stakeholders?.length || 0,
      totalApprovers: impactedData.approvers?.length || 0,
      totalNotified: this.state.sentNotifications?.reduce((total, notification) => {
        return total + (notification.emailCount || 0);
      }, 0) || 0,
      createdApprovals: this.state.createdApprovals?.length || 0,
      createdTasks: this.state.createdTasks?.length || 0
    };
  },

  /**
   * Generate impact metrics section
   */
  generateImpactMetricsSection(metrics) {
    return `
      <div class="row mb-4">
        <div class="col-12">
          <h6 class="text-primary mb-3">
            <i class="fas fa-chart-bar me-2"></i>Impact Overview
          </h6>
          <div class="row text-center">
            <div class="col-md-2">
              <div class="card border-primary h-100">
                <div class="card-body">
                  <h4 class="text-primary">${metrics.totalAssets}</h4>
                  <small class="text-muted">Assets</small>
                </div>
              </div>
            </div>
            <div class="col-md-2">
              <div class="card border-info h-100">
                <div class="card-body">
                  <h4 class="text-info">${metrics.totalStakeholders}</h4>
                  <small class="text-muted">Stakeholders</small>
                </div>
              </div>
            </div>
            <div class="col-md-2">
              <div class="card border-warning h-100">
                <div class="card-body">
                  <h4 class="text-warning">${metrics.totalApprovers}</h4>
                  <small class="text-muted">Approvers</small>
                </div>
              </div>
            </div>
            <div class="col-md-2">
              <div class="card border-success h-100">
                <div class="card-body">
                  <h4 class="text-success">${metrics.totalNotified}</h4>
                  <small class="text-muted">Notified</small>
                </div>
              </div>
            </div>
            <div class="col-md-2">
              <div class="card border-secondary h-100">
                <div class="card-body">
                  <h4 class="text-secondary">${metrics.createdApprovals}</h4>
                  <small class="text-muted">Approvals</small>
                </div>
              </div>
            </div>
            <div class="col-md-2">
              <div class="card border-dark h-100">
                <div class="card-body">
                  <h4 class="text-dark">${metrics.createdTasks}</h4>
                  <small class="text-muted">Tasks</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Generate affected systems section
   */
  generateAffectedSystemsSection(data) {
    if (!data.selectedAssets || data.selectedAssets.length === 0) {
      return `
        <div class="mb-4">
          <h6 class="text-primary mb-3">
            <i class="fas fa-server me-2"></i>Affected Systems
          </h6>
          <div class="alert alert-info">
            <i class="fas fa-info-circle me-2"></i>No assets were directly associated with this change.
          </div>
        </div>
      `;
    }
    
    let content = `
      <div class="mb-4">
        <h6 class="text-primary mb-3">
          <i class="fas fa-server me-2"></i>Affected Systems (${data.selectedAssets.length})
        </h6>
        <div class="table-responsive">
          <table class="table table-striped table-sm">
            <thead class="table-dark">
              <tr>
                <th>Asset Name</th>
                <th>Type</th>
                <th>Location</th>
                <th>Manager</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    data.selectedAssets.forEach(asset => {
      content += `
        <tr>
          <td>
            <strong>${asset.name}</strong>
            ${asset.description ? `<br><small class="text-muted">${asset.description}</small>` : ''}
          </td>
          <td>
            <span class="badge bg-secondary">${asset.asset_type_name || 'Unknown'}</span>
          </td>
          <td>${asset.location_name || 'N/A'}</td>
          <td>${asset.managed_by_name || 'Unassigned'}</td>
          <td>
            <span class="badge ${asset.asset_state === 'In Use' ? 'bg-success' : 'bg-warning'}">
              ${asset.asset_state || 'Unknown'}
            </span>
          </td>
        </tr>
      `;
    });
    
    content += `
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    return content;
  },

  /**
   * Generate stakeholders section
   */
  generateStakeholdersSection(impactedData) {
    if (!impactedData.stakeholders || impactedData.stakeholders.length === 0) {
      return `
        <div class="mb-4">
          <h6 class="text-primary mb-3">
            <i class="fas fa-users me-2"></i>Identified Stakeholders
          </h6>
          <div class="alert alert-info">
            <i class="fas fa-info-circle me-2"></i>No additional stakeholders were identified through impact analysis.
          </div>
        </div>
      `;
    }
    
    let content = `
      <div class="mb-4">
        <h6 class="text-primary mb-3">
          <i class="fas fa-users me-2"></i>Identified Stakeholders (${impactedData.stakeholders.length})
        </h6>
        <div class="table-responsive">
          <table class="table table-striped table-sm">
            <thead class="table-dark">
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Source</th>
                <th>Role</th>
                <th>Notification Status</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    const notifiedEmails = this.state.sentNotifications?.reduce((emails, notification) => {
      return emails.concat(notification.validEmails || []);
    }, []) || [];
    
    impactedData.stakeholders.forEach(stakeholder => {
      const wasNotified = notifiedEmails.includes(stakeholder.email);
      content += `
        <tr>
          <td>
            <strong>${stakeholder.name || 'N/A'}</strong>
            ${stakeholder.id ? `<br><small class="text-muted">ID: ${stakeholder.id}</small>` : ''}
          </td>
          <td>
            ${stakeholder.email || 'No email available'}
            ${stakeholder.email && !this.isValidEmail(stakeholder.email) ? 
              '<br><small class="text-danger">Invalid email format</small>' : ''}
          </td>
          <td>
            <span class="badge bg-info">${stakeholder.source || 'Manual'}</span>
          </td>
          <td>${stakeholder.role || 'Stakeholder'}</td>
          <td>
            ${wasNotified ? 
              '<span class="badge bg-success"><i class="fas fa-check me-1"></i>Notified</span>' : 
              '<span class="badge bg-warning"><i class="fas fa-times me-1"></i>Not Notified</span>'}
          </td>
        </tr>
      `;
    });
    
    content += `
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    return content;
  },

  /**
   * Generate approvers section
   */
  generateApproversSection(impactedData) {
    if (!impactedData.approvers || impactedData.approvers.length === 0) {
      return `
        <div class="mb-4">
          <h6 class="text-primary mb-3">
            <i class="fas fa-user-check me-2"></i>Required Approvers
          </h6>
          <div class="alert alert-info">
            <i class="fas fa-info-circle me-2"></i>No approvers were identified for this change.
          </div>
        </div>
      `;
    }
    
    let content = `
      <div class="mb-4">
        <h6 class="text-primary mb-3">
          <i class="fas fa-user-check me-2"></i>Required Approvers (${impactedData.approvers.length})
        </h6>
        <div class="table-responsive">
          <table class="table table-striped table-sm">
            <thead class="table-dark">
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Source</th>
                <th>Approval Status</th>
                <th>Notification Status</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    const notifiedEmails = this.state.sentNotifications?.reduce((emails, notification) => {
      return emails.concat(notification.validEmails || []);
    }, []) || [];
    
    impactedData.approvers.forEach(approver => {
      const wasNotified = notifiedEmails.includes(approver.email);
      const hasApproval = this.state.createdApprovals?.some(approval => 
        approval.responder_id === approver.id
      );
      
      content += `
        <tr>
          <td>
            <strong>${approver.name || 'N/A'}</strong>
            ${approver.id ? `<br><small class="text-muted">ID: ${approver.id}</small>` : ''}
          </td>
          <td>
            ${approver.email || 'No email available'}
            ${approver.email && !this.isValidEmail(approver.email) ? 
              '<br><small class="text-danger">Invalid email format</small>' : ''}
          </td>
          <td>
            <span class="badge bg-warning">${approver.source || 'Technical Owner'}</span>
          </td>
          <td>
            ${hasApproval ? 
              '<span class="badge bg-success"><i class="fas fa-ticket-alt me-1"></i>Approval Created</span>' : 
              '<span class="badge bg-danger"><i class="fas fa-times me-1"></i>Approval Failed</span>'}
          </td>
          <td>
            ${wasNotified ? 
              '<span class="badge bg-success"><i class="fas fa-check me-1"></i>Notified</span>' : 
              '<span class="badge bg-warning"><i class="fas fa-times me-1"></i>Not Notified</span>'}
          </td>
        </tr>
      `;
    });
    
    content += `
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    return content;
  },

  /**
   * Generate notification status section
   */
  generateNotificationStatusSection() {
    let content = `
      <div class="mb-4">
        <h6 class="text-primary mb-3">
          <i class="fas fa-envelope me-2"></i>Notification Status
        </h6>
    `;
    
    if (!this.state.sentNotifications || this.state.sentNotifications.length === 0) {
      content += `
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle me-2"></i>No notifications were sent.
        </div>
      `;
    } else {
      content += `
        <div class="row">
      `;
      
      this.state.sentNotifications.forEach((notification) => {
        const successRate = notification.validEmails ? 
          `${notification.validEmails.length}/${notification.recipients?.length || 0}` : '0/0';
        
        content += `
          <div class="col-md-6 mb-3">
            <div class="card">
              <div class="card-body">
                <h6 class="card-title">
                  <i class="fas fa-sticky-note me-2"></i>
                  ${notification.type === 'stakeholder_note' ? 'Stakeholder Notification' : 'Email Notification'}
                </h6>
                <div class="mb-2">
                  <strong>Recipients:</strong> ${successRate} emails sent
                </div>
                <div class="mb-2">
                  <strong>Sent:</strong> ${new Date(notification.sentAt).toLocaleString()}
                </div>
                ${notification.noteId ? `
                  <div class="mb-2">
                    <strong>Note ID:</strong> ${notification.noteId}
                  </div>
                ` : ''}
                <div class="mb-0">
                  <span class="badge ${notification.validEmails?.length > 0 ? 'bg-success' : 'bg-danger'}">
                    ${notification.validEmails?.length > 0 ? 'Success' : 'Failed'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        `;
      });
      
      content += `
        </div>
      `;
    }
    
    content += `</div>`;
    return content;
  },

  /**
   * Generate risk assessment section
   */
  generateRiskAssessmentSection(riskAssessment) {
    if (!riskAssessment) {
      return `
        <div class="mb-4">
          <h6 class="text-primary mb-3">
            <i class="fas fa-shield-alt me-2"></i>Risk Assessment
          </h6>
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle me-2"></i>No risk assessment data available.
          </div>
        </div>
      `;
    }
    
    const riskColor = this.getRiskColor(riskAssessment.riskLevel);
    
    return `
      <div class="mb-4">
        <h6 class="text-primary mb-3">
          <i class="fas fa-shield-alt me-2"></i>Risk Assessment Details
        </h6>
        <div class="card">
          <div class="card-body">
            <div class="row">
              <div class="col-md-4">
                <div class="text-center">
                  <h3 class="mb-1">
                    <span class="badge" style="background-color: ${riskColor}; font-size: 18px; padding: 12px 20px;">
                      ${riskAssessment.riskLevel?.toUpperCase()}
                    </span>
                  </h3>
                  <p class="text-muted">Overall Risk Level</p>
                  <h4 class="text-primary">${riskAssessment.totalScore}/15</h4>
                  <p class="text-muted">Total Score</p>
                </div>
              </div>
              <div class="col-md-8">
                <div class="row">
                  <div class="col-6 mb-3">
                    <strong>Business Impact:</strong>
                    <div class="progress mt-1" style="height: 8px;">
                      <div class="progress-bar" role="progressbar" 
                           style="width: ${(riskAssessment.businessImpact/3)*100}%; background-color: ${riskColor};">
                      </div>
                    </div>
                    <small class="text-muted">${riskAssessment.businessImpact}/3</small>
                  </div>
                  <div class="col-6 mb-3">
                    <strong>Affected Users:</strong>
                    <div class="progress mt-1" style="height: 8px;">
                      <div class="progress-bar" role="progressbar" 
                           style="width: ${(riskAssessment.affectedUsers/3)*100}%; background-color: ${riskColor};">
                      </div>
                    </div>
                    <small class="text-muted">${riskAssessment.affectedUsers}/3</small>
                  </div>
                  <div class="col-6 mb-3">
                    <strong>Complexity:</strong>
                    <div class="progress mt-1" style="height: 8px;">
                      <div class="progress-bar" role="progressbar" 
                           style="width: ${(riskAssessment.complexity/3)*100}%; background-color: ${riskColor};">
                      </div>
                    </div>
                    <small class="text-muted">${riskAssessment.complexity}/3</small>
                  </div>
                  <div class="col-6 mb-3">
                    <strong>Testing:</strong>
                    <div class="progress mt-1" style="height: 8px;">
                      <div class="progress-bar" role="progressbar" 
                           style="width: ${(riskAssessment.testing/3)*100}%; background-color: ${riskColor};">
                      </div>
                    </div>
                    <small class="text-muted">${riskAssessment.testing}/3</small>
                  </div>
                  <div class="col-12">
                    <strong>Rollback:</strong>
                    <div class="progress mt-1" style="height: 8px;">
                      <div class="progress-bar" role="progressbar" 
                           style="width: ${(riskAssessment.rollback/3)*100}%; background-color: ${riskColor};">
                      </div>
                    </div>
                    <small class="text-muted">${riskAssessment.rollback}/3</small>
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
   * Export impact report
   */
  exportImpactReport() {
    console.log('📄 Exporting impact report...');
    
    const data = window.changeRequestData;
    const impactedData = window.ImpactedServices?.getImpactedServicesData() || {};
    
    // Generate report content
    const reportContent = this.generateTextReport(data, impactedData);
    
    // Create and download file
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `change-impact-report-${this.state.submissionId || 'draft'}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    console.log('✅ Impact report exported successfully');
  },

  /**
   * Generate text report
   */
  generateTextReport(data, impactedData) {
    const metrics = this.calculateImpactMetrics(data, impactedData);
    
    let report = '';
    report += '='.repeat(80) + '\n';
    report += 'CHANGE REQUEST IMPACT ANALYSIS REPORT\n';
    report += '='.repeat(80) + '\n';
    report += `Generated: ${new Date().toLocaleString()}\n`;
    report += `Change ID: CR-${this.state.submissionId || 'DRAFT'}\n`;
    report += `Title: ${data.changeTitle || 'N/A'}\n`;
    report += `Requester: ${data.selectedRequester?.name || 'N/A'}\n`;
    report += '\n';
    
    // Summary metrics
    report += 'IMPACT SUMMARY\n';
    report += '-'.repeat(40) + '\n';
    report += `Total Assets Affected: ${metrics.totalAssets}\n`;
    report += `Total Stakeholders: ${metrics.totalStakeholders}\n`;
    report += `Total Approvers: ${metrics.totalApprovers}\n`;
    report += `Notifications Sent: ${metrics.totalNotified}\n`;
    report += `Approvals Created: ${metrics.createdApprovals}\n`;
    report += `Tasks Created: ${metrics.createdTasks}\n`;
    report += '\n';
    
    // Risk assessment
    if (data.riskAssessment) {
      report += 'RISK ASSESSMENT\n';
      report += '-'.repeat(40) + '\n';
      report += `Overall Risk Level: ${data.riskAssessment.riskLevel?.toUpperCase()}\n`;
      report += `Total Score: ${data.riskAssessment.totalScore}/15\n`;
      report += `Business Impact: ${data.riskAssessment.businessImpact}/3\n`;
      report += `Affected Users: ${data.riskAssessment.affectedUsers}/3\n`;
      report += `Complexity: ${data.riskAssessment.complexity}/3\n`;
      report += `Testing: ${data.riskAssessment.testing}/3\n`;
      report += `Rollback: ${data.riskAssessment.rollback}/3\n`;
      report += '\n';
    }
    
    // Affected systems
    if (data.selectedAssets && data.selectedAssets.length > 0) {
      report += 'AFFECTED SYSTEMS\n';
      report += '-'.repeat(40) + '\n';
      data.selectedAssets.forEach((asset, index) => {
        report += `${index + 1}. ${asset.name}\n`;
        report += `   Type: ${asset.asset_type_name || 'Unknown'}\n`;
        report += `   Location: ${asset.location_name || 'N/A'}\n`;
        report += `   Manager: ${asset.managed_by_name || 'Unassigned'}\n`;
        report += `   Status: ${asset.asset_state || 'Unknown'}\n`;
        report += '\n';
      });
    }
    
    // Stakeholders
    if (impactedData.stakeholders && impactedData.stakeholders.length > 0) {
      report += 'STAKEHOLDERS\n';
      report += '-'.repeat(40) + '\n';
      impactedData.stakeholders.forEach((stakeholder, index) => {
        report += `${index + 1}. ${stakeholder.name || 'N/A'}\n`;
        report += `   Email: ${stakeholder.email || 'Not available'}\n`;
        report += `   Source: ${stakeholder.source || 'Manual'}\n`;
        report += `   Role: ${stakeholder.role || 'Stakeholder'}\n`;
        report += '\n';
      });
    }
    
    // Approvers
    if (impactedData.approvers && impactedData.approvers.length > 0) {
      report += 'APPROVERS\n';
      report += '-'.repeat(40) + '\n';
      impactedData.approvers.forEach((approver, index) => {
        report += `${index + 1}. ${approver.name || 'N/A'}\n`;
        report += `   Email: ${approver.email || 'Not available'}\n`;
        report += `   Source: ${approver.source || 'Technical Owner'}\n`;
        report += '\n';
      });
    }
    
    // Notification status
    if (this.state.sentNotifications && this.state.sentNotifications.length > 0) {
      report += 'NOTIFICATION STATUS\n';
      report += '-'.repeat(40) + '\n';
      this.state.sentNotifications.forEach((notification, index) => {
        report += `${index + 1}. ${notification.type === 'stakeholder_note' ? 'Stakeholder Notification' : 'Email Notification'}\n`;
        report += `   Recipients: ${notification.validEmails?.length || 0}/${notification.recipients?.length || 0}\n`;
        report += `   Sent: ${new Date(notification.sentAt).toLocaleString()}\n`;
        if (notification.noteId) {
          report += `   Note ID: ${notification.noteId}\n`;
        }
        report += `   Status: ${notification.validEmails?.length > 0 ? 'Success' : 'Failed'}\n`;
        report += '\n';
      });
    }
    
    report += '='.repeat(80) + '\n';
    report += 'END OF REPORT\n';
    report += '='.repeat(80) + '\n';
    
    return report;
  },

  /**
   * Setup event listeners for success modal buttons
   */
  setupSuccessModalEventListeners() {
    console.log('🔧 Setting up success modal event listeners...');
    
    // New change button
    const newChangeBtn = document.getElementById('new-change-btn');
    if (newChangeBtn) {
      newChangeBtn.onclick = () => {
        console.log('🔄 User clicked "Create Another Change" - reloading page');
        const successModal = bootstrap.Modal.getInstance(document.getElementById('success-modal'));
        if (successModal) {
          successModal.hide();
        }
        
        // Ensure page is enabled before reload (in case reload is delayed)
        this.ensurePageEnabled();
        
        // Small delay to ensure modal closes before reload
        setTimeout(() => {
          window.location.reload();
        }, 100);
      };
      console.log('✅ New change button event listener set');
    } else {
      console.warn('⚠️ New change button not found');
    }
    
    // Close button - just closes modal to show the underlying page with details
    const closeBtn = document.getElementById('close-success-btn');
    if (closeBtn) {
      closeBtn.onclick = () => {
        console.log('❌ User clicked "Close & View Details" - closing modal');
        const successModal = bootstrap.Modal.getInstance(document.getElementById('success-modal'));
        if (successModal) {
          successModal.hide();
        }
        
        // Ensure page is re-enabled after modal closes
        this.ensurePageEnabled();
        
        // Optional: Show a brief notification that they can still access the change
        this.showBriefSuccessNotification();
      };
      console.log('✅ Close button event listener set');
    } else {
      console.warn('⚠️ Close button not found');
    }
    
    // View Change button is already set up with the correct href in showSubmissionSuccess
    const viewChangeBtn = document.getElementById('view-change-btn');
    if (viewChangeBtn) {
      console.log('✅ View change button found with href:', viewChangeBtn.href);
    } else {
      console.warn('⚠️ View change button not found');
    }
  },

  /**
   * Ensure the page is properly enabled and not dark/disabled
   */
  ensurePageEnabled() {
    console.log('🔧 Ensuring page is properly enabled...');
    
    // Remove any lingering modal backdrops
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => {
      console.log('🗑️ Removing modal backdrop:', backdrop);
      backdrop.remove();
    });
    
    // Ensure body doesn't have modal-open class
    if (document.body.classList.contains('modal-open')) {
      console.log('🔧 Removing modal-open class from body');
      document.body.classList.remove('modal-open');
    }
    
    // Restore body overflow
    if (document.body.style.overflow === 'hidden') {
      console.log('🔧 Restoring body overflow');
      document.body.style.overflow = '';
    }
    
    // Ensure app content is enabled
    const appContent = document.getElementById('app-content');
    if (appContent) {
      appContent.classList.remove('app-initializing');
      appContent.classList.add('app-ready');
      appContent.style.pointerEvents = 'auto';
      appContent.style.filter = 'none';
      console.log('✅ App content re-enabled');
    }
    
    // Check for any initialization overlay that might still be showing
    const initOverlay = document.getElementById('initialization-overlay');
    if (initOverlay && initOverlay.style.display !== 'none') {
      console.log('🔧 Hiding any lingering initialization overlay');
      initOverlay.style.display = 'none';
    }
    
    console.log('✅ Page enablement check complete');
  },

  /**
   * Show a brief success notification when modal is closed
   */
  showBriefSuccessNotification() {
    const notification = document.createElement('div');
    notification.className = 'alert alert-success alert-dismissible fade show';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1055;
      max-width: 350px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    notification.innerHTML = `
      <strong>✅ Change Request Submitted!</strong>
      <br>You can create another change or continue working with the form.
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
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

    // Generate and show the summary modal
    this.generateSubmissionSummary();
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('confirmation-modal'));
    modal.show();
    
    // Setup modal event listeners
    this.setupModalEventListeners();
  },

  /**
   * Generate comprehensive submission summary content
   */
  generateSubmissionSummary() {
    console.log('📝 Generating submission summary content...');
    
    const data = window.changeRequestData;
    const riskAssessment = data?.riskAssessment;
    const impactedData = window.ImpactedServices?.getImpactedServicesData() || {};
    
    // Helper function to format user name
    const formatUserName = (user) => {
      if (!user) return 'Unknown';
      if (user.name) return user.name;
      if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
      if (user.first_name) return user.first_name;
      if (user.email) return user.email;
      return 'Unknown';
    };
    
    let summaryHtml = `<div class="submission-summary">`;
    
    // Header with change overview
    summaryHtml += `<div class="row mb-4">
      <div class="col-12">
        <div class="card border-primary">
          <div class="card-header bg-primary text-white">
            <h5 class="mb-0"><i class="fas fa-info-circle me-2"></i>Change Request Overview</h5>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-8">
                <h6 class="fw-bold">${data.changeTitle || 'Untitled Change Request'}</h6>
                <p class="text-muted mb-2">${data.changeDescription || data.reasonForChange || 'No description provided'}</p>
                <div class="d-flex flex-wrap gap-2">
                  <span class="badge bg-secondary">${data.changeType?.toUpperCase() || 'NORMAL'} CHANGE</span>`;
    
    if (riskAssessment) {
      const riskColor = this.getRiskColor(riskAssessment.riskLevel);
      summaryHtml += `<span class="badge" style="background-color: ${riskColor};">${riskAssessment.riskLevel?.toUpperCase()} RISK</span>`;
    }
    
    summaryHtml += `</div>
              </div>
              <div class="col-md-4 text-end">
                <div class="text-muted small">
                  <div><strong>Requester:</strong> ${formatUserName(data.selectedRequester)}</div>
                  <div><strong>Agent:</strong> ${formatUserName(data.selectedAgent) || 'Unassigned'}</div>`;
    
    if (data.selectedRequester?.email) {
      summaryHtml += `<div class="text-truncate" title="${data.selectedRequester.email}"><i class="fas fa-envelope me-1"></i>${data.selectedRequester.email}</div>`;
    }
    
    if (data.plannedStart) {
      summaryHtml += `<div><strong>Start:</strong> ${new Date(data.plannedStart).toLocaleString()}</div>`;
    }
    if (data.plannedEnd) {
      summaryHtml += `<div><strong>End:</strong> ${new Date(data.plannedEnd).toLocaleString()}</div>`;
    }
    
    summaryHtml += `</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
    
    // Implementation details section
    summaryHtml += `<div class="row mb-4">
      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-header">
            <h6 class="mb-0"><i class="fas fa-cogs me-2"></i>Implementation Plan</h6>
          </div>
          <div class="card-body">
            <p class="small">${data.implementationPlan || 'No implementation plan provided'}</p>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-header">
            <h6 class="mb-0"><i class="fas fa-undo me-2"></i>Backout Plan</h6>
          </div>
          <div class="card-body">
            <p class="small">${data.backoutPlan || 'No backout plan provided'}</p>
          </div>
        </div>
      </div>
    </div>`;
    
    // Validation plan if available
    if (data.validationPlan) {
      summaryHtml += `<div class="row mb-4">
        <div class="col-12">
          <div class="card">
            <div class="card-header">
              <h6 class="mb-0"><i class="fas fa-check-circle me-2"></i>Validation Plan</h6>
            </div>
            <div class="card-body">
              <p class="small">${data.validationPlan}</p>
            </div>
          </div>
        </div>
      </div>`;
    }
    
    // Risk assessment details
    if (riskAssessment) {
      // Helper function to get risk criteria explanation
      const getRiskCriteriaExplanation = (criteria, score) => {
        const explanations = {
          businessImpact: {
            1: "Limited - Minor impact on business operations",
            2: "Noticeable - Moderate impact on business operations", 
            3: "Significant - Major impact on business operations"
          },
          affectedUsers: {
            1: "Less than 50 users affected",
            2: "50-200 users affected",
            3: "More than 200 users affected"
          },
          complexity: {
            1: "Simple - Low technical complexity",
            2: "Moderate - Medium technical complexity",
            3: "Complex - High technical complexity"
          },
          testing: {
            1: "Comprehensive - Thorough testing completed",
            2: "Adequate - Standard testing completed",
            3: "Limited - Minimal testing completed"
          },
          rollback: {
            1: "Detailed rollback plan available",
            2: "Basic rollback steps defined",
            3: "No clear rollback procedure"
          }
        };
        return explanations[criteria]?.[score] || `Score: ${score}/3`;
      };

      const riskColor = this.getRiskColor(riskAssessment.riskLevel);
      summaryHtml += `<div class="row mb-4">
        <div class="col-12">
          <div class="card border-warning">
            <div class="card-header bg-warning text-dark">
              <h6 class="mb-0"><i class="fas fa-exclamation-triangle me-2"></i>Risk Assessment Details</h6>
            </div>
            <div class="card-body">
              <div class="row mb-3">
                <div class="col-12 text-center">
                  <h5 class="mb-2">
                    <span class="badge fs-6" style="background-color: ${riskColor};">
                      ${riskAssessment.riskLevel?.toUpperCase()} RISK
                    </span>
                  </h5>
                  <p class="text-muted mb-0">Total Score: <strong>${riskAssessment.totalScore || 0}/15</strong></p>
                </div>
              </div>
              
              <div class="row">
                <div class="col-md-6">
                  <div class="mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <span class="fw-semibold">Business Impact:</span>
                      <span class="badge bg-secondary">${riskAssessment.businessImpact || 0}/3</span>
                    </div>
                    <small class="text-muted">${getRiskCriteriaExplanation('businessImpact', riskAssessment.businessImpact)}</small>
                  </div>
                  
                  <div class="mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <span class="fw-semibold">Affected Users:</span>
                      <span class="badge bg-secondary">${riskAssessment.affectedUsers || 0}/3</span>
                    </div>
                    <small class="text-muted">${getRiskCriteriaExplanation('affectedUsers', riskAssessment.affectedUsers)}</small>
                  </div>
                  
                  <div class="mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <span class="fw-semibold">Complexity:</span>
                      <span class="badge bg-secondary">${riskAssessment.complexity || 0}/3</span>
                    </div>
                    <small class="text-muted">${getRiskCriteriaExplanation('complexity', riskAssessment.complexity)}</small>
                  </div>
                </div>
                
                <div class="col-md-6">
                  <div class="mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <span class="fw-semibold">Testing Level:</span>
                      <span class="badge bg-secondary">${riskAssessment.testing || 0}/3</span>
                    </div>
                    <small class="text-muted">${getRiskCriteriaExplanation('testing', riskAssessment.testing)}</small>
                  </div>
                  
                  <div class="mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <span class="fw-semibold">Rollback Capability:</span>
                      <span class="badge bg-secondary">${riskAssessment.rollback || 0}/3</span>
                    </div>
                    <small class="text-muted">${getRiskCriteriaExplanation('rollback', riskAssessment.rollback)}</small>
                  </div>
                  
                  <div class="alert alert-info mb-0">
                    <small>
                      <strong>Risk Policy:</strong><br>
                      ${riskAssessment.totalScore >= 12 ? 'High Risk requires extensive review + mandatory 24hr peer review' :
                        riskAssessment.totalScore >= 8 ? 'Medium Risk requires additional review + 24hr peer review' :
                        'Low Risk follows standard approval process'}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    }
    
    // Assets and impact analysis section
    summaryHtml += `<div class="row mb-4">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h6 class="mb-0"><i class="fas fa-network-wired me-2"></i>Asset Impact Analysis</h6>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-6">
                <h6 class="text-primary mb-3"><i class="fas fa-server me-2"></i>Direct Assets (${data.selectedAssets?.length || 0})</h6>`;
    
    if (data.selectedAssets && data.selectedAssets.length > 0) {
      summaryHtml += `<div class="list-group list-group-flush">`;
      data.selectedAssets.slice(0, 3).forEach(asset => {
        // Get additional asset details
        const environment = asset.environment || 'Unknown';
        const location = asset.location_name || 'Unknown Location';
        const managedBy = asset.managed_by_name || asset.user_name || 'Unassigned';
        
        summaryHtml += `<div class="list-group-item px-0 py-2 border-0">
          <div class="d-flex justify-content-between align-items-start">
            <div class="flex-grow-1">
              <div class="fw-semibold">${asset.name}</div>
              <small class="text-muted d-block">${asset.asset_type_name || 'Unknown Type'}</small>
              <div class="d-flex flex-wrap gap-1 mt-1">
                <span class="badge bg-secondary">${environment}</span>
                <span class="badge bg-info">${location}</span>
                ${managedBy !== 'Unassigned' ? `<span class="badge bg-success" title="Managed By">${managedBy}</span>` : ''}
              </div>
            </div>
          </div>
        </div>`;
      });
      if (data.selectedAssets.length > 3) {
        summaryHtml += `<div class="list-group-item px-0 py-1 border-0">
          <small class="text-muted">... and ${data.selectedAssets.length - 3} more direct assets</small>
        </div>`;
      }
      summaryHtml += `</div>`;
    } else {
      summaryHtml += `<p class="text-muted small">No direct assets selected</p>`;
    }
    
    summaryHtml += `</div>
              <div class="col-md-6">
                <h6 class="text-success mb-3"><i class="fas fa-sitemap me-2"></i>Related Assets (${impactedData.relatedAssets?.length || 0})</h6>`;
    
    if (impactedData.relatedAssets && impactedData.relatedAssets.length > 0) {
      summaryHtml += `<div class="list-group list-group-flush">`;
      impactedData.relatedAssets.slice(0, 3).forEach(asset => {
        const environment = asset.environment || 'Unknown';
        const relationship = asset.relationship_type || 'Related';
        
        summaryHtml += `<div class="list-group-item px-0 py-2 border-0">
          <div class="fw-semibold">${asset.name}</div>
          <small class="text-muted d-block">${asset.asset_type_name || 'Unknown Type'}</small>
          <div class="d-flex flex-wrap gap-1 mt-1">
            <span class="badge bg-outline-secondary">${environment}</span>
            <span class="badge bg-warning text-dark" title="Relationship">${relationship}</span>
          </div>
        </div>`;
      });
      if (impactedData.relatedAssets.length > 3) {
        summaryHtml += `<div class="list-group-item px-0 py-1 border-0">
          <small class="text-muted">... and ${impactedData.relatedAssets.length - 3} more related assets</small>
        </div>`;
      }
      summaryHtml += `</div>`;
    } else {
      summaryHtml += `<p class="text-muted small">No related assets found</p>`;
    }
    
    summaryHtml += `</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

    // Stakeholders and approvers section
    const totalStakeholders = (impactedData.stakeholders?.length || 0) + (impactedData.approvers?.length || 0);
    summaryHtml += `<div class="row mb-4">
      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-header">
            <h6 class="mb-0"><i class="fas fa-user-check me-2"></i>Approvers (${impactedData.approvers?.length || 0})</h6>
          </div>
          <div class="card-body">`;
    
    if (impactedData.approvers && impactedData.approvers.length > 0) {
      summaryHtml += `<div class="list-group list-group-flush">`;
      impactedData.approvers.slice(0, 4).forEach(approver => {
        const source = approver.source || 'Manual';
        const role = approver.role || 'Approver';
        
        summaryHtml += `<div class="list-group-item px-0 py-2 border-0">
          <div class="d-flex justify-content-between align-items-start">
            <div class="flex-grow-1">
              <div class="fw-semibold">${approver.name}</div>
              <small class="text-muted d-block">${approver.email}</small>
              <div class="d-flex flex-wrap gap-1 mt-1">
                <span class="badge bg-primary">${role}</span>
                <span class="badge bg-secondary" title="Source">${source}</span>
              </div>
            </div>
          </div>
        </div>`;
      });
      if (impactedData.approvers.length > 4) {
        summaryHtml += `<div class="list-group-item px-0 py-1 border-0">
          <small class="text-muted">... and ${impactedData.approvers.length - 4} more approvers</small>
        </div>`;
      }
      summaryHtml += `</div>`;
    } else {
      summaryHtml += `<p class="text-muted small">No approvers identified</p>`;
    }
    
    summaryHtml += `</div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-header">
            <h6 class="mb-0"><i class="fas fa-users me-2"></i>Stakeholders (${impactedData.stakeholders?.length || 0})</h6>
          </div>
          <div class="card-body">`;
    
    if (impactedData.stakeholders && impactedData.stakeholders.length > 0) {
      summaryHtml += `<div class="list-group list-group-flush">`;
      impactedData.stakeholders.slice(0, 4).forEach(stakeholder => {
        const source = stakeholder.source || 'Manual';
        const role = stakeholder.role || 'Stakeholder';
        
        summaryHtml += `<div class="list-group-item px-0 py-2 border-0">
          <div class="d-flex justify-content-between align-items-start">
            <div class="flex-grow-1">
              <div class="fw-semibold">${stakeholder.name}</div>
              <small class="text-muted d-block">${stakeholder.email}</small>
              <div class="d-flex flex-wrap gap-1 mt-1">
                <span class="badge bg-info">${role}</span>
                <span class="badge bg-secondary" title="Source">${source}</span>
              </div>
            </div>
          </div>
        </div>`;
      });
      if (impactedData.stakeholders.length > 4) {
        summaryHtml += `<div class="list-group-item px-0 py-1 border-0">
          <small class="text-muted">... and ${impactedData.stakeholders.length - 4} more stakeholders</small>
        </div>`;
      }
      summaryHtml += `</div>`;
    } else {
      summaryHtml += `<p class="text-muted small">No stakeholders identified</p>`;
    }
    
    summaryHtml += `</div>
        </div>
      </div>
    </div>`;
    
    // Summary of automated processes
    if (totalStakeholders > 0 || (data.selectedAssets && data.selectedAssets.length > 0)) {
      summaryHtml += `<div class="row mb-4">
        <div class="col-12">
          <div class="alert alert-info">
            <h6 class="alert-heading"><i class="fas fa-robot me-2"></i>Automated Processes</h6>
            <ul class="mb-0">`;
              
      if (impactedData.approvers && impactedData.approvers.length > 0) {
        summaryHtml += `<li>Approval workflow will be created with ${impactedData.approvers.length} approver(s)</li>`;
      }
      
      if (totalStakeholders > 0) {
        summaryHtml += `<li>Stakeholder notification note will be created with ${totalStakeholders} recipient(s)</li>`;
      }
      
      if (data.selectedAssets && data.selectedAssets.length > 0) {
        summaryHtml += `<li>Assets will be automatically associated with the change request</li>`;
      }
              
      if (riskAssessment && (riskAssessment.riskLevel === 'Medium' || riskAssessment.riskLevel === 'High')) {
        summaryHtml += `<li>Peer review coordination task will be created (${riskAssessment.riskLevel} risk requires peer review)</li>`;
      }
      
      summaryHtml += `</ul>
          </div>
        </div>
      </div>`;
    }
    
    // Workflow summary
    summaryHtml += `<div class="row mb-4">
      <div class="col-12">
        <div class="card border-info">
          <div class="card-header bg-info text-white">
            <h6 class="mb-0"><i class="fas fa-workflow me-2"></i>What Will Happen After Submission</h6>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-6">
                <ul class="list-unstyled mb-0">
                  <li class="mb-2"><i class="fas fa-check text-success me-2"></i>Change request will be created in Freshservice</li>
                  <li class="mb-2"><i class="fas fa-check text-success me-2"></i>Assets will be associated with the change</li>`;
    
    if (impactedData.approvers && impactedData.approvers.length > 0) {
      summaryHtml += `<li class="mb-2"><i class="fas fa-check text-success me-2"></i>Approval workflow will be created for ${impactedData.approvers.length} approver(s)</li>`;
    }
    
    summaryHtml += `</ul>
              </div>
              <div class="col-md-6">
                <ul class="list-unstyled mb-0">`;
    
    if (totalStakeholders > 0) {
      summaryHtml += `<li class="mb-2"><i class="fas fa-check text-success me-2"></i>Stakeholder notification note will be created for ${totalStakeholders} recipient(s)</li>`;
    }
    
    if (riskAssessment && riskAssessment.totalScore >= 8) {
      summaryHtml += `<li class="mb-2"><i class="fas fa-check text-success me-2"></i>Peer review coordination task will be assigned to SME</li>`;
    }
    
    summaryHtml += `<li class="mb-2"><i class="fas fa-check text-success me-2"></i>You will receive confirmation and tracking information</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
    
    // Important notes
    summaryHtml += `<div class="row">
      <div class="col-12">
        <div class="alert alert-warning">
          <h6><i class="fas fa-exclamation-circle me-2"></i>Important Notes</h6>
          <ul class="mb-0">
            <li>Once submitted, this change request cannot be edited directly</li>
            <li>Any modifications will require creating a new change request or working with your assigned agent</li>
            <li>You will receive email notifications as the change progresses through the approval workflow</li>`;
    
    if (riskAssessment && riskAssessment.totalScore >= 8) {
      summaryHtml += `<li>This ${riskAssessment.riskLevel} risk change requires peer review coordination by the assigned SME</li>`;
    }
    
    summaryHtml += `</ul>
        </div>
      </div>
    </div>`;
    
    summaryHtml += `</div>`;
    
    // Update the modal content
    const summaryContent = document.getElementById('summary-content');
    if (summaryContent) {
      summaryContent.innerHTML = summaryHtml;
    }
    
    console.log('✅ Submission summary content generated and populated');
  },

  /**
   * Setup modal event listeners
   */
  setupModalEventListeners() {
    console.log('🔧 Setting up modal event listeners...');
    
    // Edit request button
    const editBtn = document.getElementById('edit-request');
    if (editBtn) {
      editBtn.onclick = () => {
        const modal = bootstrap.Modal.getInstance(document.getElementById('confirmation-modal'));
        modal.hide();
        console.log('📝 User chose to edit request - modal closed');
        
        // Re-enable the page so user can edit
        setTimeout(() => {
          this.ensurePageEnabled();
          console.log('✅ Page re-enabled for editing');
        }, 300); // Small delay to ensure modal closes properly
      };
    }
    
    // Confirm submit button
    const confirmBtn = document.getElementById('confirm-submit');
    if (confirmBtn) {
      confirmBtn.onclick = (e) => {
        e.preventDefault();
        const modal = bootstrap.Modal.getInstance(document.getElementById('confirmation-modal'));
        modal.hide();
        console.log('✅ User confirmed submission - proceeding with submission');
        this.handleSubmission();
      };
    }
    
    console.log('✅ Modal event listeners setup complete');
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
  },

  /**
   * Associate assets with the change request
   */
  async associateAssets(changeRequest) {
    console.log('🔗 Associating assets with change request...');
    
    try {
      const data = window.changeRequestData;
      
      if (!data.selectedAssets || data.selectedAssets.length === 0) {
        console.log('ℹ️ No assets selected for association, skipping asset association');
        return;
      }
      
      console.log(`🔍 Found ${data.selectedAssets.length} assets to associate:`, 
        data.selectedAssets.map(asset => ({ id: asset.id, name: asset.name, display_id: asset.display_id })));
      
      // Prepare asset association data
      const assetAssociationData = this.prepareAssetAssociationData(data.selectedAssets);
      
      console.log('📋 Asset association data prepared:', assetAssociationData);
      
      const response = await window.client.request.invokeTemplate('updateChange', {
        context: {
          change_id: changeRequest.id
        },
        body: JSON.stringify(assetAssociationData)
      });
      
      console.log('📡 Raw asset association response:', response);
      
      if (!response || !response.response) {
        throw new Error('No response received from asset association API');
      }
      
      let associationResponse;
      try {
        associationResponse = JSON.parse(response.response);
        console.log('📋 Parsed asset association response:', associationResponse);
      } catch (parseError) {
        console.error('❌ Failed to parse asset association response JSON:', response.response);
        throw new Error(`Invalid JSON response: ${parseError.message}`);
      }
      
      // Track associated assets
      this.state.associatedAssets = data.selectedAssets.map(asset => ({
        id: asset.id,
        display_id: asset.display_id,
        name: asset.name,
        asset_type_name: asset.asset_type_name
      }));
      
      console.log(`✅ Successfully associated ${data.selectedAssets.length} assets with change ${changeRequest.id}`);
      return associationResponse;
      
    } catch (error) {
      console.error('❌ Error associating assets with change request:', error);
      // Don't throw error - asset association failure shouldn't stop the entire submission
      console.warn('⚠️ Continuing with submission despite asset association failure');
    }
  },

  /**
   * Prepare asset association data for API call
   */
  prepareAssetAssociationData(selectedAssets) {
    console.log('📦 Preparing asset association data...');
    
    // For Freshservice API v2, we use the assets array with display_id
    const assetsData = selectedAssets.map(asset => ({
      display_id: asset.display_id || asset.id
    }));
    
    const associationData = {
      assets: assetsData
    };
    
    console.log('📋 Asset association data prepared:', {
      assetCount: assetsData.length,
      assets: assetsData
    });
    
    return associationData;
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

    
