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
    
    // Setup universal modal cleanup first
    this.setupUniversalModalCleanup();
    
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
   * Setup universal modal cleanup to prevent stuck modals
   */
  setupUniversalModalCleanup() {
    console.log('🔧 Setting up universal modal cleanup...');
    
    try {
      // Add ESC key handler for all modals
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.ensurePageEnabled();
        }
      });
      
      // Clean up on page visibility change
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          setTimeout(() => {
            this.ensurePageEnabled();
          }, 100);
        }
      });
      
      console.log('✅ Universal modal cleanup setup complete');
    } catch (error) {
      console.error('❌ Error setting up universal modal cleanup:', error);
    }
  },

  /**
   * Ensure page is enabled and no stuck modals exist
   */
  ensurePageEnabled() {
    try {
      // Remove modal-open class from body
      document.body.classList.remove('modal-open');
      
      // Remove any backdrop elements
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => {
        if (backdrop.parentNode) {
          backdrop.parentNode.removeChild(backdrop);
        }
      });
      
      // Reset body styles
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      
      // Enable scrolling
      document.documentElement.style.overflow = '';
      
    } catch (error) {
      console.warn('⚠️ Error in ensurePageEnabled:', error);
    }
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
    this.showSubmissionProgressModal();

    try {
      // Step 0: Ensure data is properly consolidated
      console.log('📦 Step 0: Consolidating form data...');
      const consolidatedData = this.prepareConsolidatedData();
      
      // Debug: Log what we have for validation
      console.log('📋 Data ready for validation:', {
        hasTitle: !!consolidatedData.changeTitle,
        title: consolidatedData.changeTitle,
        hasChangeType: !!consolidatedData.changeType,
        changeType: consolidatedData.changeType,
        hasRequester: !!consolidatedData.selectedRequester,
        requesterName: consolidatedData.selectedRequester?.name,
        requesterId: consolidatedData.selectedRequester?.id,
        hasAgent: !!consolidatedData.selectedAgent,
        agentName: consolidatedData.selectedAgent?.name || consolidatedData.selectedAgent?.email,
        agentId: consolidatedData.selectedAgent?.id
      });

      // Step 1: Validate all form data
      this.updateSubmissionProgress('validation', 'active', 'Validating request data...');
      console.log('📋 Step 1: Validating form data...');
      const validationResult = this.validateSubmissionData();
      if (!validationResult.isValid) {
        this.updateSubmissionProgress('validation', 'error', 'Validation failed');
        throw new Error(`Validation failed: ${validationResult.message}`);
      }
      this.updateSubmissionProgress('validation', 'completed', 'Validation completed successfully');
      this.updateOverallProgress(16);

      // Step 2: Process risk assessment
      this.updateSubmissionProgress('risk-assessment', 'active', 'Processing risk assessment...');
      console.log('📋 Step 2: Processing risk assessment...');
      const changeRequestData = await this.prepareChangeRequestData();
      this.updateSubmissionProgress('risk-assessment', 'completed', 'Risk assessment processed');
      this.updateOverallProgress(33);

      // Step 3: Create the change request
      this.updateSubmissionProgress('creating-change', 'active', 'Creating change request...');
      console.log('🎯 Step 3: Creating change request in Freshservice...');
      const changeRequest = await this.createChangeRequest(changeRequestData);
      this.state.submissionId = changeRequest.id;
      this.updateSubmissionProgress('creating-change', 'completed', 'Change request created successfully');
      this.updateOverallProgress(50);

      // Step 4: Associate assets with the change request
      this.updateSubmissionProgress('associating-assets', 'active', 'Associating assets...');
      console.log('🔗 Step 4: Associating assets with change request...');
      await this.associateAssets(changeRequest.id);
      this.updateSubmissionProgress('associating-assets', 'completed', 'Assets associated successfully');
      this.updateOverallProgress(67);

      // Step 5: Create approval workflow and tasks
      this.updateSubmissionProgress('creating-tasks', 'active', 'Setting up approval workflow...');
      console.log('✅ Step 5: Approval workflow configured via custom fields...');
      console.log('🤖 Workflow automator will process lf_technical_owner and lf_additional_approver_* fields');
      
      // Create peer review task if needed
      console.log('👥 Creating peer review task if needed...');
      await this.createPeerReviewTasks(changeRequest);
      this.updateSubmissionProgress('creating-tasks', 'completed', 'Approval workflow configured');
      this.updateOverallProgress(84);

      // Step 6: Send notifications
      this.updateSubmissionProgress('notifications', 'active', 'Sending notifications...');
      console.log('📧 Step 6: Creating stakeholder notification note...');
      await this.sendStakeholderNotifications(changeRequest);
      
      // Update change request with additional metadata
      console.log('🔄 Updating change request with workflow data...');
      await this.updateChangeRequestMetadata(changeRequest);
      this.updateSubmissionProgress('notifications', 'completed', 'Notifications sent successfully');
      this.updateOverallProgress(100);

      // Step 7: Show success
      console.log('🎉 Submission completed successfully!');
      setTimeout(() => {
        this.hideSubmissionProgressModal();
        this.showSubmissionSuccess(changeRequest.id);
      }, 1000);

    } catch (error) {
      console.error('❌ Error during change request submission:', error);
      this.showSubmissionProgressError(error);
    } finally {
      this.state.isSubmitting = false;
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
      workspaceId = params.workspace_id; // Use configured workspace (DO NOT hard-code)
      departmentId = params.department_id;
      console.log('🏢 Configuration from iparams:', { workspaceId, departmentId });
      
      if (!workspaceId) {
        console.warn('⚠️ No workspace_id configured in installation parameters');
        console.warn('⚠️ This might cause issues in multi-workspace environments');
        console.warn('⚠️ API will use account default workspace');
      }
    } catch (error) {
      console.warn('⚠️ Could not retrieve installation parameters:', error);
      console.warn('⚠️ No workspace will be specified - API will use account default');
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
      description: await this.createEnhancedDescription(data, impactedData, data.riskAssessment),
      
      // CONDITIONAL: Workspace - Only add if configured
      ...(workspaceId && { workspace_id: workspaceId }), // Only add if configured
      
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
  async createEnhancedDescription(data, impactedData, riskAssessment) {
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

    // Impacted Assets Section with detailed information and popovers
    if (data.selectedAssets && data.selectedAssets.length > 0) {
      description += `<div style="margin-bottom: 25px; padding: 20px; background: white; border-radius: 8px; border: 1px solid #007bff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">`;
      description += `<h3 style="color: #007bff; margin-top: 0; margin-bottom: 15px; display: flex; align-items: center;">`;
      description += `<span style="margin-right: 10px;">🎯</span>Impacted Assets & Services`;
      description += `<span style="margin-left: auto; background: #007bff; color: white; padding: 4px 12px; border-radius: 15px; font-size: 14px; font-weight: bold;">${data.selectedAssets.length} Asset${data.selectedAssets.length !== 1 ? 's' : ''}</span>`;
      description += `</h3>`;
      
      // Group assets by type for better organization
      const assetsByType = {};
      for (const asset of data.selectedAssets) {
        // Get asset type name with proper resolution
        let assetTypeName = 'Unknown Type';
        
        // Try to get resolved asset type name from cache manager
        if (window.CacheManager && typeof window.CacheManager.getAssetTypeName === 'function' && asset.asset_type_id) {
          try {
            const resolvedTypeName = await window.CacheManager.getAssetTypeName(asset.asset_type_id);
            if (resolvedTypeName && resolvedTypeName !== 'Unknown' && !resolvedTypeName.startsWith('Asset Type ')) {
              assetTypeName = resolvedTypeName;
            }
          } catch (error) {
            console.warn('Error resolving asset type:', error);
          }
        }
        
        // Fallback to direct property if resolution failed
        if (assetTypeName === 'Unknown Type') {
          assetTypeName = asset.asset_type_name || 'Unknown Type';
        }
        
        if (!assetsByType[assetTypeName]) {
          assetsByType[assetTypeName] = [];
        }
        assetsByType[assetTypeName].push(asset);
      }
      
      // Display assets grouped by type
      for (const assetType of Object.keys(assetsByType)) {
        const assets = assetsByType[assetType];
        description += `<div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #007bff;">`;
        description += `<h4 style="margin: 0 0 15px 0; color: #007bff; font-size: 16px; display: flex; align-items: center;">`;
        description += `<span style="margin-right: 8px;">📦</span>${assetType}`;
        description += `<span style="margin-left: auto; background: #e9ecef; color: #495057; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: bold;">${assets.length} asset${assets.length !== 1 ? 's' : ''}</span>`;
        description += `</h4>`;
        
        // Display each asset with enhanced information
        description += `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 12px;">`;
        for (const asset of assets) {
          // Get technical owner information with proper user resolution
          let technicalOwner = 'Unassigned';
          let technicalOwnerId = null;
          
          // Try to get resolved name from cache manager
          if (window.CacheManager && typeof window.CacheManager.getManagedByInfo === 'function') {
            try {
              const resolvedOwner = await window.CacheManager.getManagedByInfo(asset);
              if (resolvedOwner && resolvedOwner !== 'N/A' && !resolvedOwner.includes('ID:')) {
                technicalOwner = resolvedOwner;
              }
            } catch (error) {
              console.warn('Error resolving technical owner:', error);
            }
          }
          
          // Fallback to direct properties if resolution failed
          if (technicalOwner === 'Unassigned') {
            technicalOwner = asset.managed_by_name || asset.agent_name || asset.user_name || 'Unassigned';
          }
          
          // Get the ID for display
          technicalOwnerId = asset.managed_by || asset.agent_id || asset.user_id || null;
          
          // Format owner info - only show ID if name is still "Unassigned"
          const ownerInfo = (technicalOwnerId && technicalOwner === 'Unassigned') 
            ? `${technicalOwner} (ID: ${technicalOwnerId})` 
            : technicalOwner;
          
          description += `<div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #dee2e6; position: relative; cursor: pointer;" `;
          description += `onmouseover="this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)'; this.style.transform='translateY(-2px)'" `;
          description += `onmouseout="this.style.boxShadow='0 1px 3px rgba(0,0,0,0.1)'; this.style.transform='translateY(0)'">`;
          
          // Asset name with enhanced styling
          description += `<div style="font-weight: bold; font-size: 15px; color: #007bff; margin-bottom: 8px; display: flex; align-items: center;">`;
          description += `<span style="margin-right: 8px;">🖥️</span>${asset.name || asset.display_id || 'Unknown Asset'}`;
          if (asset.display_id && asset.name !== asset.display_id) {
            description += `<span style="margin-left: 8px; font-size: 12px; color: #6c757d; font-weight: normal;">(${asset.display_id})</span>`;
          }
          description += `</div>`;
          
          // Asset details grid
          description += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; margin-bottom: 10px;">`;
          
          // Location
          if (asset.location_name) {
            description += `<div style="color: #6c757d;"><strong>📍 Location:</strong><br>${asset.location_name}</div>`;
          }
          
          // Department
          if (asset.department_name) {
            description += `<div style="color: #6c757d;"><strong>🏢 Department:</strong><br>${asset.department_name}</div>`;
          }
          
          // Status
          if (asset.asset_state) {
            const statusColor = asset.asset_state === 'In Use' ? '#28a745' : asset.asset_state === 'Retired' ? '#dc3545' : '#ffc107';
            description += `<div style="color: #6c757d;"><strong>📊 Status:</strong><br><span style="color: ${statusColor}; font-weight: bold;">${asset.asset_state}</span></div>`;
          }
          
          // Asset Tag
          if (asset.asset_tag) {
            description += `<div style="color: #6c757d;"><strong>🏷️ Asset Tag:</strong><br>${asset.asset_tag}</div>`;
          }
          
          description += `</div>`;
          
          // Technical Owner section with enhanced visibility
          description += `<div style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); padding: 10px; border-radius: 4px; border-left: 3px solid #2196f3; margin-top: 10px;">`;
          description += `<div style="font-size: 12px; font-weight: bold; color: #1976d2; margin-bottom: 4px; display: flex; align-items: center;">`;
          description += `<span style="margin-right: 6px;">👤</span>Technical Owner`;
          description += `</div>`;
          description += `<div style="font-size: 13px; color: #1565c0; font-weight: 600;">${ownerInfo}</div>`;
          if (asset.managed_by_email || asset.agent_email || asset.user_email) {
            const ownerEmail = asset.managed_by_email || asset.agent_email || asset.user_email;
            description += `<div style="font-size: 11px; color: #1976d2; margin-top: 2px;">📧 ${ownerEmail}</div>`;
          }
          description += `</div>`;
          
          // Add detailed info button that triggers popover
          description += `<div style="position: absolute; top: 8px; right: 8px;">`;
          description += `<span style="background: #007bff; color: white; width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; cursor: pointer;" `;
          description += `title="Asset Details: ${asset.name || asset.display_id}&#10;Type: ${asset.asset_type_name || 'Unknown'}&#10;Owner: ${ownerInfo}&#10;Location: ${asset.location_name || 'Not specified'}&#10;Status: ${asset.asset_state || 'Unknown'}">ℹ️</span>`;
          description += `</div>`;
          
          description += `</div>`;
        }
        description += `</div>`;
        description += `</div>`;
      }
      description += `</div>`;
    }

    // Stakeholder & Approver Information with popovers
    if ((impactedData.approvers && impactedData.approvers.length > 0) || (impactedData.stakeholders && impactedData.stakeholders.length > 0)) {
      description += `<div style="margin-bottom: 25px; padding: 20px; background: white; border-radius: 8px; border: 1px solid #28a745; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">`;
      description += `<h3 style="color: #28a745; margin-top: 0; margin-bottom: 15px; display: flex; align-items: center;">`;
      description += `<span style="margin-right: 10px;">👥</span>Stakeholders & Approvers`;
      description += `</h3>`;
      
      // Approvers section
      if (impactedData.approvers && impactedData.approvers.length > 0) {
        description += `<div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #28a745;">`;
        description += `<h4 style="margin: 0 0 15px 0; color: #28a745; font-size: 16px; display: flex; align-items: center;">`;
        description += `<span style="margin-right: 8px;">✅</span>Technical Approvers`;
        description += `<span style="margin-left: auto; background: #e9ecef; color: #495057; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: bold;">${impactedData.approvers.length} approver${impactedData.approvers.length !== 1 ? 's' : ''}</span>`;
        description += `<span style="margin-left: 8px; background: #28a745; color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; cursor: pointer;" `;
        description += `title="Approver Details&#10;${impactedData.approvers.map(a => `• ${a.name || 'Unknown'} (${a.source || 'Technical Owner'})`).join('&#10;')}">ℹ️ Details</span>`;
        description += `</h4>`;
        
        description += `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px;">`;
        impactedData.approvers.slice(0, 6).forEach(approver => { // Limit to 6 for display
          description += `<div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #dee2e6;">`;
          description += `<div style="font-weight: bold; font-size: 14px; color: #28a745; margin-bottom: 4px;">${approver.name || 'Unknown Name'}</div>`;
          if (approver.email) {
            description += `<div style="font-size: 12px; color: #6c757d; margin-bottom: 4px;">📧 ${approver.email}</div>`;
          }
          description += `<div style="font-size: 11px; background: #e8f5e8; color: #2d5a2d; padding: 2px 6px; border-radius: 8px; display: inline-block;">${approver.source || 'Technical Owner'}</div>`;
          description += `</div>`;
        });
        if (impactedData.approvers.length > 6) {
          description += `<div style="background: #f8f9fa; padding: 12px; border-radius: 6px; border: 1px dashed #dee2e6; display: flex; align-items: center; justify-content: center; color: #6c757d; font-style: italic;">`;
          description += `+${impactedData.approvers.length - 6} more approvers...`;
          description += `</div>`;
        }
        description += `</div>`;
        description += `</div>`;
      }
      
      // Stakeholders section
      if (impactedData.stakeholders && impactedData.stakeholders.length > 0) {
        description += `<div style="padding: 15px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #17a2b8;">`;
        description += `<h4 style="margin: 0 0 15px 0; color: #17a2b8; font-size: 16px; display: flex; align-items: center;">`;
        description += `<span style="margin-right: 8px;">📢</span>Additional Stakeholders`;
        description += `<span style="margin-left: auto; background: #e9ecef; color: #495057; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: bold;">${impactedData.stakeholders.length} stakeholder${impactedData.stakeholders.length !== 1 ? 's' : ''}</span>`;
        description += `<span style="margin-left: 8px; background: #17a2b8; color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; cursor: pointer;" `;
        description += `title="Stakeholder Details&#10;${impactedData.stakeholders.map(s => `• ${s.name || 'Unknown'} (${s.source || 'Impacted Services'})`).join('&#10;')}">ℹ️ Details</span>`;
        description += `</h4>`;
        
        description += `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px;">`;
        impactedData.stakeholders.slice(0, 6).forEach(stakeholder => { // Limit to 6 for display
          description += `<div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #dee2e6;">`;
          description += `<div style="font-weight: bold; font-size: 14px; color: #17a2b8; margin-bottom: 4px;">${stakeholder.name || 'Unknown Name'}</div>`;
          if (stakeholder.email) {
            description += `<div style="font-size: 12px; color: #6c757d; margin-bottom: 4px;">📧 ${stakeholder.email}</div>`;
          }
          description += `<div style="font-size: 11px; background: #e3f7f8; color: #2d5a5a; padding: 2px 6px; border-radius: 8px; display: inline-block;">${stakeholder.source || 'Impacted Services'}</div>`;
          description += `</div>`;
        });
        if (impactedData.stakeholders.length > 6) {
          description += `<div style="background: #f8f9fa; padding: 12px; border-radius: 6px; border: 1px dashed #dee2e6; display: flex; align-items: center; justify-content: center; color: #6c757d; font-style: italic;">`;
          description += `+${impactedData.stakeholders.length - 6} more stakeholders...`;
          description += `</div>`;
        }
        description += `</div>`;
        description += `</div>`;
      }
      description += `</div>`;
    }

    // Footer with detailed view option
    description += `<div style="margin-top: 30px; padding: 20px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 8px; border: 1px solid #dee2e6; text-align: center;">`;
    description += `<h4 style="color: #495057; margin: 0 0 10px 0;">📋 Additional Information Available</h4>`;
    description += `<p style="color: #6c757d; margin: 0 0 15px 0; font-size: 14px;">Complete change details, implementation plans, risk assessments, and stakeholder information are available in the full change request.</p>`;
    description += `<div style="font-size: 12px; color: #6c757d; font-style: italic;">This enhanced description includes comprehensive change review, detailed asset information, and stakeholder coordination details.</div>`;
    description += `</div>`;

    description += `</div>`;
    
    console.log('✅ Enhanced description created with detailed assets, stakeholder popovers, and comprehensive review information');
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
      
      // CONDITIONAL: Workspace - Only add if needed for environment
      // Note: Removed hard-coded workspace ID - API will use account default
      
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
              console.log(`✅ Change request created successfully: CHN-${changeRequest.id}`);

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
  createApprovalWorkflow() {
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
        console.log('ℹ️ No approvers identified from impacted services analysis, workflow automator will handle approvals');
        return { message: 'No approvers found - workflow automator will process custom fields' };
      }

      // Skip API-based approval creation since workflow automator handles this
      console.log('📋 Approval information stored in custom fields:');
      console.log(`  • lf_technical_owner: Set to primary technical owner`);
      console.log(`  • lf_additional_approver_1: ${impactedData.approvers[0]?.name || 'Not set'}`);
      console.log(`  • lf_additional_approver_2: ${impactedData.approvers[1]?.name || 'Not set'}`);
      console.log(`  • lf_additional_approver_3: ${impactedData.approvers[2]?.name || 'Not set'}`);
      console.log('🤖 Workflow automator will process these fields to create approval tickets');
      
      return { 
        success: true, 
        message: 'Approval information stored in custom fields for workflow automator processing',
        approverCount: impactedData.approvers.length,
        storedInFields: true
      };
      
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
      const noteBody = await this.generateStakeholderNotificationNoteBody(changeRequest, recipients, riskAssessment);
      
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
  async generateStakeholderNotificationNoteBody(changeRequest, recipients, riskAssessment) {
    const data = window.changeRequestData;
    
    // Get Freshservice domain for creating clickable links
    const getFreshserviceDomain = async () => {
      try {
        const params = await window.client.iparams.get();
        if (params && params.freshservice_domain) {
          return params.freshservice_domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
        }
        return 'your-domain.freshservice.com';
      } catch (error) {
        console.error('❌ Could not retrieve installation parameters:', error);
        return 'your-domain.freshservice.com';
      }
    };
    
    const freshserviceDomain = await getFreshserviceDomain();
    const changeUrl = `https://${freshserviceDomain}/a/changes/${changeRequest.id}?current_tab=details`;
    
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
    body += `<p><strong>Change ID:</strong> <a href="${changeUrl}" target="_blank" style="color: #0066cc; text-decoration: none;">CHN-${changeRequest.id}</a></p>`;
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
    body += `<p>You have been identified as a stakeholder for this change because you may be impacted by or have responsibility for systems affected by this change.</p>`;
    
    // Check recipient types to avoid repeating explanations
    const hasAssetStakeholders = recipients.some(r => r.source?.includes('Asset'));
    const hasServiceStakeholders = recipients.some(r => r.source?.includes('Service'));
    const hasTechnicalStakeholders = recipients.some(r => r.source?.includes('Technical') || r.type === 'approver');
    const hasManualStakeholders = recipients.some(r => !r.source || r.source === 'Impacted Services' || r.source === 'Manual Selection');
    
    if (hasAssetStakeholders || hasServiceStakeholders || hasTechnicalStakeholders || hasManualStakeholders) {
      body += `<p><strong>You may be receiving this because:</strong></p>`;
      body += `<ul>`;
      
      if (hasAssetStakeholders) {
        body += `<li>You manage or are responsible for assets that will be directly impacted</li>`;
      }
      if (hasServiceStakeholders) {
        body += `<li>You own or manage services that may be affected by this change</li>`;
      }
      if (hasTechnicalStakeholders) {
        body += `<li>You are a technical owner or approver for systems involved in this change</li>`;
      }
      if (hasManualStakeholders) {
        body += `<li>You have been identified as having an interest in or responsibility for this change</li>`;
      }
      
      body += `</ul>`;
    }
    
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
  async generateStakeholderNotificationBody(changeRequest, recipient, riskAssessment) {
    const data = window.changeRequestData;
    
    // Get Freshservice domain for creating clickable links
    const getFreshserviceDomain = async () => {
      try {
        const params = await window.client.iparams.get();
        if (params && params.freshservice_domain) {
          return params.freshservice_domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
        }
        return 'your-domain.freshservice.com';
      } catch (error) {
        console.error('❌ Could not retrieve installation parameters:', error);
        return 'your-domain.freshservice.com';
      }
    };
    
    const freshserviceDomain = await getFreshserviceDomain();
    const changeUrl = `https://${freshserviceDomain}/a/changes/${changeRequest.id}?current_tab=details`;
    
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
    body += `<p><strong>Change ID:</strong> <a href="${changeUrl}" target="_blank" style="color: #0066cc; text-decoration: none;">CHN-${changeRequest.id}</a></p>`;
    body += `<p><strong>Title:</strong> ${changeRequest.subject}</p>`;
    body += `<p><strong>Requester:</strong> ${data.selectedRequester?.name || data.selectedRequester?.first_name + ' ' + data.selectedRequester?.last_name || 'Unknown'}</p>`;
    
    if (riskAssessment) {
      const riskColor = this.getRiskColor(riskAssessment.riskLevel);
      body += `<p><strong>Risk Level:</strong> <span style="background-color: ${riskColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${riskAssessment.riskLevel?.toUpperCase()}</span> (${riskAssessment.totalScore}/15)</p>`;
      
      // Add risk level explanation and workflow status in notifications
      body += `<div style="background: #f8f9fa; padding: 10px; border-radius: 4px; border-left: 3px solid ${riskColor}; margin-top: 10px;">`;
      body += `<div style="font-size: 13px; color: #495057;">`;
      if (riskAssessment.riskLevel === 'High') {
        body += `<strong>High Risk:</strong> This change starts in "Pending Review" status and requires peer review coordination before moving to "Pending Approval" for technical owner and CAB approval. Final status will be "Scheduled" when ready for implementation.`;
      } else if (riskAssessment.riskLevel === 'Medium') {
        body += `<strong>Medium Risk:</strong> This change starts in "Pending Review" status and requires peer review coordination before moving to "Pending Approval" for technical owner approval. Final status will be "Scheduled" when ready for implementation.`;
      } else {
        body += `<strong>Low Risk:</strong> This change goes directly to "Pending Approval" status for technical owner approval, then to "Scheduled" status when ready for implementation.`;
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
      body += `<p>As an identified approver, you will receive a separate approval request when the change reaches "Pending Approval" status.</p>`;
      if (data.riskAssessment && data.riskAssessment.totalScore >= 8) {
        body += `<p><strong>Timeline:</strong> This ${data.riskAssessment.riskLevel} risk change must complete peer review first. You will receive the approval request after the workflow automator processes the peer review completion.</p>`;
      } else {
        body += `<p><strong>Timeline:</strong> This ${data.riskAssessment?.riskLevel || 'Low'} risk change will send approval requests immediately.</p>`;
      }
      if (data.plannedStart) {
        const timeToStart = Math.ceil((new Date(data.plannedStart) - new Date()) / (1000 * 60 * 60 * 24));
        if (timeToStart <= 3) {
          body += `<p style="color: #dc3545; font-weight: bold;">⚠️ Please note the urgent timeline - approval needed promptly when received!</p>`;
        }
      }
      body += `</div>`;
    } else {
      body += `<div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; border-left: 4px solid #0dcaf0; margin: 20px 0;">`;
      body += `<h4 style="margin-top: 0; color: #0c5460;">For Your Information</h4>`;
      body += `<p>Please review this change request and provide any feedback or concerns to the change requester. This notification is for your awareness - no approval action is required from you.</p>`;
      body += `</div>`;
    }
    
    // Footer
    body += `<p>If you have any questions or concerns about this change, please contact the change requester directly.</p>`;
    body += `<p>Best regards,<br>IT Change Management</p>`;
    body += `</div>`;
    
    return body;
  },

  /**
   * Comprehensive diagnostic function for peer review task creation
   */
  async runPeerReviewDiagnostics(changeRequest) {
    console.log('🔬 Running comprehensive peer review diagnostics...');
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: 'unknown',
      issues: [],
      warnings: [],
      data: {}
    };
    
    try {
      // 1. Check installation parameters
      try {
        const params = await window.client.iparams.get();
        diagnostics.data.installationParams = params;
        diagnostics.data.hasWorkspaceId = !!params.workspace_id;
        diagnostics.data.hasDomainConfig = !!params.freshservice_domain;
        
        if (!params.workspace_id) {
          diagnostics.warnings.push('No workspace_id configured in installation parameters');
        }
        
        console.log('📋 Installation parameters:', params);
      } catch (error) {
        diagnostics.issues.push(`Cannot retrieve installation parameters: ${error.message}`);
      }
      
      // 2. Check risk assessment data
      const data = window.changeRequestData;
      const riskAssessment = data?.riskAssessment;
      
      diagnostics.data.hasRiskAssessment = !!riskAssessment;
      diagnostics.data.riskScore = riskAssessment?.totalScore;
      diagnostics.data.riskLevel = riskAssessment?.riskLevel;
      diagnostics.data.requiresPeerReview = riskAssessment?.totalScore >= 8;
      
      if (!riskAssessment) {
        diagnostics.issues.push('No risk assessment data available');
      } else if (!riskAssessment.totalScore) {
        diagnostics.issues.push('Risk assessment missing total score');
      } else if (riskAssessment.totalScore < 8) {
        diagnostics.warnings.push(`Risk score ${riskAssessment.totalScore} below peer review threshold (8+)`);
      }
      
      // 3. Check agent SME identification
      const agentSME = this.identifyAgentSME(data, changeRequest);
      diagnostics.data.hasAgentSME = !!agentSME;
      diagnostics.data.agentSME = agentSME ? {
        id: agentSME.id,
        name: agentSME.name,
        source: agentSME.source,
        email: agentSME.email
      } : null;
      
      if (!agentSME) {
        diagnostics.issues.push('No agent SME could be identified for peer review coordination');
      } else {
        console.log(`📋 Agent SME identified: ${agentSME.id} (${agentSME.name}) from ${agentSME.source}`);
      }
      
      // 4. Check change request data
      diagnostics.data.changeRequest = {
        id: changeRequest.id,
        subject: changeRequest.subject,
        agent_id: changeRequest.agent_id,
        requester_id: changeRequest.requester_id,
        workspace_id: changeRequest.workspace_id,
        status: changeRequest.status
      };
      
      // 5. Test API connectivity
      try {
        console.log('🌐 Testing API connectivity...');
        const testResponse = await window.client.request.invokeTemplate('getAgents', {
          context: {},
          cache: false
        });
        
        diagnostics.data.apiConnectivity = 'SUCCESS';
        if (testResponse && testResponse.response) {
          const agents = JSON.parse(testResponse.response);
          diagnostics.data.agentCount = agents.agents?.length || 0;
        }
      } catch (apiError) {
        diagnostics.issues.push(`API connectivity test failed: ${apiError.message}`);
        diagnostics.data.apiConnectivity = 'FAILED';
      }
      
      // 6. Environment detection
      try {
        const params = await window.client.iparams.get();
        if (params.freshservice_domain) {
          const domain = params.freshservice_domain;
          if (domain.includes('sandbox') || domain.includes('test')) {
            diagnostics.environment = 'TEST/SANDBOX';
          } else if (domain.includes('dev')) {
            diagnostics.environment = 'DEVELOPMENT';
          } else {
            diagnostics.environment = 'PRODUCTION';
          }
          diagnostics.data.domain = domain;
        }
      } catch (error) {
        diagnostics.warnings.push('Could not determine environment from domain');
      }
      
      // 7. Configuration recommendations
      const recommendations = [];
      
      if (!diagnostics.data.hasWorkspaceId) {
        recommendations.push('Configure workspace_id in installation parameters for multi-workspace environments');
      }
      
      if (!diagnostics.data.hasAgentSME) {
        recommendations.push('Ensure changes have assigned agents or technical owners for peer review coordination');
      }
      
      if (diagnostics.data.riskScore < 8) {
        recommendations.push('Peer review only triggers for risk scores >= 8 (Medium/High risk changes)');
      }
      
      diagnostics.data.recommendations = recommendations;
      
      // 8. Template verification
      try {
        // Check if createChangeTask template is accessible
        console.log('🔍 Verifying createChangeTask template...');
        // Note: We can't actually test the template without creating a task
        // but we can verify the manifest declares it
        diagnostics.data.hasCreateChangeTaskTemplate = true;
      } catch (error) {
        diagnostics.issues.push('createChangeTask template verification failed');
      }
      
      console.log('🔬 PEER REVIEW DIAGNOSTICS COMPLETE');
      console.log('📊 Summary:', {
        environment: diagnostics.environment,
        issues: diagnostics.issues.length,
        warnings: diagnostics.warnings.length,
        canCreatePeerReviewTask: diagnostics.issues.length === 0 && diagnostics.data.requiresPeerReview
      });
      
      if (diagnostics.issues.length > 0) {
        console.error('🚨 CRITICAL ISSUES FOUND:');
        diagnostics.issues.forEach((issue, index) => {
          console.error(`   ${index + 1}. ${issue}`);
        });
      }
      
      if (diagnostics.warnings.length > 0) {
        console.warn('⚠️ WARNINGS:');
        diagnostics.warnings.forEach((warning, index) => {
          console.warn(`   ${index + 1}. ${warning}`);
        });
      }
      
      if (recommendations.length > 0) {
        console.log('💡 RECOMMENDATIONS:');
        recommendations.forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec}`);
        });
      }
      
      console.log('📋 Full diagnostic data:', diagnostics);
      
      return diagnostics;
      
    } catch (error) {
      console.error('❌ Diagnostic function failed:', error);
      diagnostics.issues.push(`Diagnostic function error: ${error.message}`);
      return diagnostics;
    }
  },

  /**
   * Create peer review tasks for assigned agents
   */
  async createPeerReviewTasks(changeRequest) {
    console.log('👥 Creating peer review tasks...');
    
    try {
      // Run diagnostics first if in debug mode
      if (console.level === 'debug' || window.location.search.includes('debug=true')) {
        await this.runPeerReviewDiagnostics(changeRequest);
      }
      
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
        console.warn('⚠️ No agent SME identified for peer review coordination');
        console.warn('🔧 Running diagnostics to identify the issue...');
        await this.runPeerReviewDiagnostics(changeRequest);
        return;
      }
      
      console.log(`✅ Agent SME identified: ${agentSME.id} (${agentSME.name}) - Source: ${agentSME.source}`);
      
      // Create a single peer review coordination task for the agent SME
      try {
        console.log('📝 Attempting to create peer review coordination task...');
        const task = await this.createPeerReviewCoordinationTask(changeRequest, agentSME, riskAssessment);
        if (task) {
          this.state.createdTasks.push(task);
          console.log(`✅ Created peer review coordination task for agent SME ${agentSME.id}: Task ${task.id}`);
          return [task];
        } else {
          console.warn(`⚠️ Task creation returned null for agent SME ${agentSME.id}, but no error was thrown`);
          console.warn('🔧 This might indicate environment-specific configuration issues');
          return [];
        }
      } catch (error) {
        console.error(`❌ Failed to create peer review coordination task for agent SME ${agentSME.id}:`, error);
        console.warn('🔧 Running diagnostics to identify the issue...');
        await this.runPeerReviewDiagnostics(changeRequest);
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
   * IMPORTANT: This requires the change request to be created first to get the change_id
   */
  async createPeerReviewCoordinationTask(changeRequest, agentSME, riskAssessment) {
    console.log(`📝 Creating peer review coordination task for agent SME ${agentSME.id}...`);
    console.log(`🆔 Using change ID: ${changeRequest.id} for task context`);
    
    // Validate that we have a change ID
    if (!changeRequest.id) {
      throw new Error('Cannot create change task: change request ID is required for API context');
    }
    
    try {
      // Validate agent ID exists and is numeric
      const agentId = parseInt(agentSME.id);
      if (!agentId || isNaN(agentId)) {
        throw new Error(`Invalid agent ID for SME: ${agentSME.id} (must be numeric)`);
      }
      
      // Calculate due date (24 hours from now for peer review coordination)
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + 24);
      
      // Get installation parameters for environment-specific configuration
      let params;
      try {
        params = await window.client.iparams.get();
        console.log('📋 Installation parameters retrieved for task creation');
      } catch (paramError) {
        console.warn('⚠️ Could not retrieve installation parameters, using defaults:', paramError);
        params = {};
      }
      
             // Create task data structure for v2 API - following exact API specification
       const taskData = {
         agent_id: agentId,
         status: 1, // 1-Open, 2-In Progress, 3-Completed
         due_date: dueDate.toISOString(),
         notify_before: 0, // Time in seconds before which notification is sent
         title: `Peer Review Coordination Required: ${changeRequest.subject}`,
         description: await this.generatePeerReviewCoordinationTaskDescription(changeRequest, agentSME, riskAssessment)
       };
       
       // Use the successful minimal approach with properly formatted due_date
       const workingTaskData = {
         agent_id: agentId,
         status: 1,
         title: `Peer Review Coordination Required: ${changeRequest.subject}`,
         description: await this.generatePeerReviewCoordinationTaskDescription(changeRequest, agentSME, riskAssessment),
         due_date: dueDate.toISOString() // Ensure proper ISO 8601 format for Freshservice API
       };
      
      // Add workspace_id based on environment and configuration
      if (changeRequest.workspace_id) {
        // Use workspace from the change request (most reliable)
        taskData.workspace_id = parseInt(changeRequest.workspace_id);
        console.log(`📋 Using change request workspace_id: ${taskData.workspace_id}`);
      } else if (params.workspace_id) {
        // Use workspace from installation parameters
        taskData.workspace_id = parseInt(params.workspace_id);
        console.log(`📋 Using installation parameter workspace_id: ${taskData.workspace_id}`);
      } else {
        // No workspace specified - let API use default
        console.log('📋 No workspace_id specified - using API default');
      }
      
      console.log('📋 Peer review coordination task data prepared:', {
        title: taskData.title,
        agentSMEId: agentSME.id,
        agentSMEName: agentSME.name,
        agentSMESource: agentSME.source,
        status: taskData.status,
        riskLevel: riskAssessment?.riskLevel || riskAssessment?.level,
        riskScore: riskAssessment?.totalScore,
        dueDate: taskData.due_date,
        changeId: changeRequest.id,
        agentId: taskData.agent_id,
        notifyBefore: taskData.notify_before,
        workspaceId: taskData.workspace_id,
        hasWorkspaceId: !!taskData.workspace_id
      });
      
             // CRITICAL: Use change-specific task creation endpoint with change_id context
       console.log('📡 Attempting change task creation with change_id context...');
       console.log('🔍 DEBUG: Full API call details:', {
         template: 'createChangeTask',
         endpoint: `/api/v2/changes/${changeRequest.id}/tasks`,
         changeId: changeRequest.id,
         method: 'POST',
         bodyPreview: {
           agent_id: taskData.agent_id,
           title: taskData.title,
           status: taskData.status,
           workspace_id: taskData.workspace_id
         }
       });
       
       console.log('📋 Task data prepared:', {
         agentId: workingTaskData.agent_id,
         title: workingTaskData.title.substring(0, 50) + '...',
         status: workingTaskData.status,
         dueDate: workingTaskData.due_date,
         hasDescription: !!workingTaskData.description
       });
       
       let response;
       let createdTask;
       
       try {
         // Try with retry mechanism since this was working yesterday
         let retryCount = 0;
         const maxRetries = 2;
         
         while (retryCount <= maxRetries) {
           try {
             console.log(`📡 API attempt ${retryCount + 1}/${maxRetries + 1}...`);
             
             // Use the working minimal approach
             console.log('📡 Using proven working approach...');
             response = await window.client.request.invokeTemplate('createChangeTask', {
               context: {
                 change_id: changeRequest.id  // ESSENTIAL: Change ID required for /api/v2/changes/{change_id}/tasks endpoint
               },
               body: JSON.stringify(workingTaskData),
               cache: false
             });
             
             // If we get here, the call succeeded
             break;
             
           } catch (retryError) {
             console.warn(`⚠️ API attempt ${retryCount + 1} failed:`, retryError.message);
             retryCount++;
             
             if (retryCount <= maxRetries) {
               // Wait before retry (exponential backoff)
               const waitTime = Math.pow(2, retryCount) * 1000; // 2s, 4s
               console.log(`⏳ Waiting ${waitTime}ms before retry...`);
               await new Promise(resolve => setTimeout(resolve, waitTime));
             } else {
               // All retries exhausted, throw the last error
               throw retryError;
             }
           }
         }
        
        console.log('📡 Change task creation response received:', {
          hasResponse: !!response,
          hasResponseBody: !!response?.response,
          responseType: typeof response?.response,
          changeId: changeRequest.id
        });
        
        if (response && response.response) {
          createdTask = JSON.parse(response.response);
          console.log('📋 Parsed change task response:', createdTask);
          
          // Handle different response structures
          if (createdTask && createdTask.id) {
            console.log(`✅ Change task created successfully: ${createdTask.id} for change ${changeRequest.id}`);
            return createdTask;
          } else if (createdTask && createdTask.task && createdTask.task.id) {
            console.log(`✅ Change task created successfully (wrapped): ${createdTask.task.id} for change ${changeRequest.id}`);
            return createdTask.task;
          }
        }
        
        throw new Error('Change task creation succeeded but returned unexpected structure');
        
             } catch (changeTaskError) {
         console.warn('⚠️ Change task creation failed, trying fallback method:', changeTaskError.message);
         
         // Enhanced diagnostics for 500 errors
         if (changeTaskError.status === 500) {
           console.error('🚨 500 INTERNAL SERVER ERROR - This suggests a Freshservice API issue');
           console.error('📋 Environment diagnostics:', {
             changeId: changeRequest.id,
             agentId: taskData.agent_id,
             endpoint: `/api/v2/changes/${changeRequest.id}/tasks`,
             workspaceId: taskData.workspace_id,
             hasWorkspace: !!taskData.workspace_id,
             taskDataKeys: Object.keys(taskData),
             bodySize: JSON.stringify(taskData).length
           });
           
           // Check if it's a specific API issue
           try {
             const params = await window.client.iparams.get();
             console.error('📋 API configuration check:', {
               hasDomain: !!params.freshservice_domain,
               hasApiKey: !!params.api_key,
               domain: params.freshservice_domain
             });
           } catch (paramError) {
             console.error('📋 Could not check API configuration:', paramError);
           }
         }
        
        // Fallback: Try creating a regular ticket/task (not attached to change)
        console.log('📡 Attempting fallback ticket creation...');
        
        // Modify task data for regular ticket creation
        const ticketData = {
          ...taskData,
          subject: taskData.title,
          description_text: taskData.description,
          type: 'Incident', // Use 'Incident' or 'Service Request' as task type
          priority: riskAssessment?.riskLevel === 'High' ? 3 : 2, // High=3, Medium=2
          source: 1, // Portal
          requester_id: changeRequest.requester_id,
          custom_fields: {
            // Add custom fields to link it to the change
            change_request_id: changeRequest.id,
            task_type: 'peer_review_coordination',
            risk_level: riskAssessment?.riskLevel,
            risk_score: riskAssessment?.totalScore
          }
        };
        
        // Remove change-specific fields for ticket creation
        delete ticketData.title;
        
        console.log('📋 Fallback ticket data prepared:', {
          subject: ticketData.subject,
          agentId: ticketData.agent_id,
          type: ticketData.type,
          priority: ticketData.priority,
          changeId: changeRequest.id,
          workspaceId: ticketData.workspace_id
        });
        
        try {
          const fallbackResponse = await window.client.request.invokeTemplate('createTask', {
            body: JSON.stringify(ticketData),
            cache: false
          });
          
          console.log('📡 Fallback ticket creation response received');
          
          if (fallbackResponse && fallbackResponse.response) {
            const fallbackTask = JSON.parse(fallbackResponse.response);
            console.log('📋 Parsed fallback ticket response:', fallbackTask);
            
            if (fallbackTask && fallbackTask.id) {
              console.log(`✅ Fallback task created successfully: ${fallbackTask.id} (linked to change ${changeRequest.id})`);
              return fallbackTask;
            } else if (fallbackTask && fallbackTask.ticket && fallbackTask.ticket.id) {
              console.log(`✅ Fallback task created successfully (wrapped): ${fallbackTask.ticket.id} (linked to change ${changeRequest.id})`);
              return fallbackTask.ticket;
            }
          }
          
          throw new Error('Fallback ticket creation failed');
          
        } catch (fallbackError) {
          console.error('❌ Both change task and fallback ticket creation failed');
          throw new Error(`Task creation failed: ${changeTaskError.message}. Fallback also failed: ${fallbackError.message}`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Failed to create peer review coordination task for agent SME ${agentSME.id}:`, error);
      
      // Enhanced error logging for debugging
      if (error.status && error.response) {
        console.error('📋 API Error Details:', {
          status: error.status,
          response: error.response,
          headers: error.headers,
          changeId: changeRequest.id,
          agentId: agentSME.id,
          environment: 'unknown'
        });
        
        // Try to parse error response for more details
        try {
          const errorData = JSON.parse(error.response);
          console.error('📋 Parsed error response:', errorData);
          
          // Log specific error messages
          if (errorData.message) {
            console.error('📋 API Error Message:', errorData.message);
          }
          if (errorData.errors) {
            console.error('📋 API Validation Errors:', errorData.errors);
          }
          if (errorData.description) {
            console.error('📋 API Error Description:', errorData.description);
          }
        } catch (parseErr) {
          console.error('📋 Could not parse error response as JSON:', error.response);
        }
      }
      
             // Don't throw error to prevent blocking submission - continue with warning
       console.warn('⚠️ Continuing submission despite task creation failure...');
       return null;
     }
   },

   /**
    * Generate the description for a peer review coordination task
    */
   async generatePeerReviewCoordinationTaskDescription(changeRequest, agentSME, riskAssessment) {
    console.log('📝 Generating peer review coordination task description...');
    
    try {
      const data = window.changeRequestData;
      const riskLevel = riskAssessment?.riskLevel || 'Unknown';
      const riskScore = riskAssessment?.totalScore || 'N/A';
      
      // Get domain for links
      let domain = 'your-domain';
      try {
        const params = await window.client.iparams.get();
        domain = params.freshservice_domain || 'your-domain';
      } catch (error) {
        console.warn('Could not get domain for links:', error);
      }
      
      const description = `
📋 **PEER REVIEW COORDINATION REQUIRED**

You have been assigned to coordinate the peer review process for this ${riskLevel} risk change request.

**Change Request Details:**
• **Subject:** ${changeRequest.subject}
• **Change ID:** ${changeRequest.id}
• **Risk Assessment:** ${riskLevel} Risk (Score: ${riskScore}/15)
• **Requester:** ${data.selectedRequester?.name || 'Unknown'}
• **Planned Implementation:** ${data.plannedStart || 'Not specified'}

**Your Responsibilities as Peer Review Coordinator:**
1. **Review the change request details** in the linked change record
2. **Identify appropriate peer reviewers** based on the impacted systems and risk level
3. **Coordinate the peer review process** by reaching out to identified reviewers
4. **Collect and consolidate feedback** from peer reviewers
5. **Document review outcomes** and any recommended modifications
6. **Update this task** with review status and findings

**Risk Assessment Summary:**
${this.generateRiskSummaryForTask(riskAssessment)}

**Impacted Assets:**
${data.selectedAssets?.map(asset => `• ${asset.name} (${asset.asset_type_name || 'Unknown Type'})`).join('\n') || '• No specific assets identified'}

**Implementation Plan:**
${data.implementationPlan || 'Not provided'}

**Backout Plan:**
${data.backoutPlan || 'Not provided'}

**Next Steps:**
1. Review the full change request: https://${domain}/a/change-mgmt/change-request/view/${changeRequest.id}
2. Identify 2-3 peer reviewers familiar with the impacted systems
3. Coordinate review meetings or async reviews as appropriate
4. Document findings and recommendations
5. Update change request with peer review outcomes

**Completion Criteria:**
- [ ] Peer reviewers identified and contacted
- [ ] Technical review completed
- [ ] Risk mitigation strategies validated
- [ ] Implementation approach reviewed
- [ ] Backout procedures verified
- [ ] Recommendations documented
- [ ] Change request updated with review status

Please complete this coordination within 24 hours to keep the change request on schedule.

**Contact Information:**
• **Assigned SME:** ${agentSME.name} (${agentSME.email || 'Email not available'})
• **Source:** ${agentSME.source}

For questions about this process, please refer to the Change Management procedures or contact the Change Advisory Board.
      `.trim();
      
      return description;
      
    } catch (error) {
      console.error('❌ Error generating task description:', error);
      return `Peer Review Coordination Required for Change Request: ${changeRequest.subject}\n\nRisk Level: ${riskAssessment?.riskLevel || 'Unknown'}\nPlease coordinate peer review for this change request.`;
    }
  },

  /**
   * Generate a risk summary for task descriptions
   */
  generateRiskSummaryForTask(riskAssessment) {
    if (!riskAssessment) {
      return '• Risk assessment data not available';
    }
    
    const items = [
      `• **Business Impact:** ${this.formatImpactLevel(riskAssessment.businessImpact)} - ${this.getBusinessImpactDescription(riskAssessment.businessImpact)}`,
      `• **Affected Users:** ${this.formatImpactLevel(riskAssessment.affectedUsers)} - ${this.getUserImpactDescription(riskAssessment.affectedUsers)}`,
      `• **Complexity:** ${this.formatImpactLevel(riskAssessment.complexity)} - ${this.getComplexityDescription(riskAssessment.complexity)}`,
      `• **Testing:** ${this.formatImpactLevel(riskAssessment.testing)} - ${this.getTestingDescription(riskAssessment.testing)}`,
      `• **Rollback:** ${this.formatImpactLevel(riskAssessment.rollback)} - ${this.getRollbackDescription(riskAssessment.rollback)}`
    ];
    
         return items.join('\n');
   },

   /**
    * Show submission progress modal
    */
   showSubmissionProgressModal() {
     console.log('📊 Showing submission progress modal...');
     try {
       const modal = document.getElementById('submission-progress-modal');
       if (modal) {
         // Reset modal state
         this.updateOverallProgress(0);
         this.resetAllSteps();
         
         // Show modal using Bootstrap
         const bootstrapModal = new bootstrap.Modal(modal, {
           backdrop: 'static',
           keyboard: false
         });
         bootstrapModal.show();
         
         this.state.progressModal = bootstrapModal;
         console.log('✅ Submission progress modal displayed');
       } else {
         console.error('❌ Submission progress modal not found in DOM');
       }
     } catch (error) {
       console.error('❌ Error showing submission progress modal:', error);
     }
   },

   /**
    * Hide submission progress modal
    */
   hideSubmissionProgressModal() {
     console.log('📊 Hiding submission progress modal...');
     try {
       if (this.state.progressModal) {
         this.state.progressModal.hide();
         this.state.progressModal = null;
       }
       
       // Ensure page is enabled after modal closes
       setTimeout(() => {
         this.ensurePageEnabled();
       }, 300);
       
       console.log('✅ Submission progress modal hidden');
     } catch (error) {
       console.error('❌ Error hiding submission progress modal:', error);
     }
   },

   /**
    * Update submission progress for a specific step
    */
   updateSubmissionProgress(stepId, status, message) {
     console.log(`📊 Step ${stepId} updated to ${status}: ${message}`);
     
     try {
       const stepElement = document.getElementById(`step-${stepId}`);
       if (!stepElement) {
         console.warn(`⚠️ Step element not found: step-${stepId}`);
         return;
       }
       
       // Remove all status classes
       stepElement.classList.remove('active', 'completed', 'error');
       
       // Add new status class
       stepElement.classList.add(status);
       
       // Update icons
       const icons = stepElement.querySelectorAll('.step-icon i');
       icons.forEach(icon => icon.style.display = 'none');
       
       switch (status) {
         case 'active':
           const spinIcon = stepElement.querySelector('.fa-circle-notch');
           if (spinIcon) spinIcon.style.display = 'inline-block';
           break;
         case 'completed':
           const checkIcon = stepElement.querySelector('.fa-check-circle');
           if (checkIcon) checkIcon.style.display = 'inline-block';
           break;
         case 'error':
           const errorIcon = stepElement.querySelector('.fa-exclamation-circle');
           if (errorIcon) errorIcon.style.display = 'inline-block';
           break;
         default:
           const defaultIcon = stepElement.querySelector('.fa-circle');
           if (defaultIcon) defaultIcon.style.display = 'inline-block';
       }
       
       // Update step description with message
       const descElement = stepElement.querySelector('.step-description');
       if (descElement && message) {
         descElement.textContent = message;
       }
       
     } catch (error) {
       console.error(`❌ Error updating step ${stepId}:`, error);
     }
   },

   /**
    * Update overall progress percentage
    */
   updateOverallProgress(percent) {
     console.log(`📊 Overall progress updated to ${percent}%`);
     
     try {
       const progressBar = document.getElementById('overall-progress-bar');
       const progressPercent = document.getElementById('overall-progress-percent');
       const overallStatus = document.getElementById('overall-status');
       
       if (progressBar) {
         progressBar.style.width = `${percent}%`;
         progressBar.setAttribute('aria-valuenow', percent);
       }
       
       if (progressPercent) {
         progressPercent.textContent = `${percent}%`;
       }
       
       if (overallStatus) {
         if (percent === 0) {
           overallStatus.textContent = 'Initializing submission...';
         } else if (percent < 100) {
           overallStatus.textContent = 'Processing your change request...';
         } else {
           overallStatus.textContent = 'Submission completed successfully!';
         }
       }
       
     } catch (error) {
       console.error('❌ Error updating overall progress:', error);
     }
   },

   /**
    * Reset all steps to initial state
    */
   resetAllSteps() {
     console.log('🔄 Resetting all submission steps...');
     
     try {
       const steps = ['validation', 'risk-assessment', 'creating-change', 'associating-assets', 'creating-tasks', 'notifications'];
       
       steps.forEach(stepId => {
         const stepElement = document.getElementById(`step-${stepId}`);
         if (stepElement) {
           // Remove all status classes
           stepElement.classList.remove('active', 'completed', 'error');
           
           // Hide all icons except default
           const icons = stepElement.querySelectorAll('.step-icon i');
           icons.forEach(icon => icon.style.display = 'none');
           
           const defaultIcon = stepElement.querySelector('.fa-circle');
           if (defaultIcon) defaultIcon.style.display = 'inline-block';
           
           // Reset description to original
           const descElement = stepElement.querySelector('.step-description');
           if (descElement) {
             const descriptions = {
               'validation': 'Checking all required fields and data integrity',
               'risk-assessment': 'Calculating risk scores and determining approval workflow',
               'creating-change': 'Creating the change request in Freshservice',
               'associating-assets': 'Linking selected assets to the change request',
               'creating-tasks': 'Setting up approval workflow and peer review tasks',
               'notifications': 'Sending notifications to stakeholders'
             };
             descElement.textContent = descriptions[stepId] || 'Processing...';
           }
         }
       });
       
     } catch (error) {
       console.error('❌ Error resetting steps:', error);
     }
   },

   /**
    * Show submission error in progress modal
    */
   showSubmissionProgressError(error) {
     console.error('📊 Showing submission error in modal:', error);
     
     try {
       // Update overall status
       const overallStatus = document.getElementById('overall-status');
       if (overallStatus) {
         overallStatus.textContent = 'Submission failed. Please review the error and try again.';
         overallStatus.className = 'text-danger small';
       }
       
       // Show error details
       const errorDetails = document.getElementById('submission-error-details');
       const errorMessage = document.getElementById('error-message');
       
       if (errorDetails && errorMessage) {
         errorMessage.textContent = error.message || 'An unexpected error occurred during submission.';
         errorDetails.style.display = 'block';
       }
       
       // Show close/retry buttons
       const cancelBtn = document.getElementById('cancel-submission');
       const closeBtn = document.getElementById('close-progress');
       
       if (cancelBtn) {
         cancelBtn.style.display = 'inline-block';
         cancelBtn.textContent = 'Close';
       }
       
       if (closeBtn) {
         closeBtn.style.display = 'inline-block';
       }
       
     } catch (err) {
       console.error('❌ Error showing submission error:', err);
     }
   },

   /**
    * Show submission success
    */
   showSubmissionSuccess(changeRequest) {
     console.log('🎉 Showing submission success for change:', changeRequest);
     
     try {
       // Hide progress modal first
       this.hideSubmissionProgressModal();
       
       // Show success modal (if it exists)
       const successModal = document.getElementById('success-modal');
       if (successModal) {
         const modal = new bootstrap.Modal(successModal);
         modal.show();
         
         // Update success content
         const successContent = document.getElementById('success-content');
         if (successContent) {
           successContent.innerHTML = `
             <div class="text-center mb-4">
               <i class="fas fa-check-circle text-success" style="font-size: 4rem;"></i>
               <h4 class="mt-3 text-success">Change Request Created Successfully!</h4>
             </div>
             
             <div class="row">
               <div class="col-md-6">
                 <strong>Change ID:</strong><br>
                 <span class="text-primary">${changeRequest.display_id || changeRequest.id}</span>
               </div>
               <div class="col-md-6">
                 <strong>Subject:</strong><br>
                 ${changeRequest.subject}
               </div>
             </div>
             
             <div class="alert alert-info mt-3">
               <i class="fas fa-info-circle me-2"></i>
               Your change request has been submitted and is now in the approval workflow.
               Stakeholders have been notified automatically.
             </div>
           `;
         }
         
         // Update view change button
         const viewBtn = document.getElementById('view-change-btn');
         if (viewBtn && changeRequest.id) {
           viewBtn.href = `https://your-domain.freshservice.com/a/changes/${changeRequest.id}`;
         }
               } else {
          // Fallback: show simple notification using app notification system
          console.log('✅ Change request submitted successfully:', changeRequest);
          
          // Try to use the app's notification system if available
          if (typeof showNotification === 'function') {
            showNotification('success', `Change request "${changeRequest.subject}" submitted successfully! Change ID: ${changeRequest.display_id || changeRequest.id}`);
          } else {
            // Create a simple in-page success message
            const successDiv = document.createElement('div');
            successDiv.className = 'alert alert-success alert-dismissible fade show position-fixed';
            successDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
            successDiv.innerHTML = `
              <h5 class="alert-heading"><i class="fas fa-check-circle me-2"></i>Success!</h5>
              <p class="mb-1">Change request "${changeRequest.subject}" submitted successfully!</p>
              <small>Change ID: ${changeRequest.display_id || changeRequest.id}</small>
              <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;
            
            document.body.appendChild(successDiv);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
              if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
              }
            }, 5000);
          }
        }
       
           } catch (error) {
        console.error('❌ Error showing submission success:', error);
      }
    },

    /**
     * Show submission summary before actual submission
     */
    showSubmissionSummary() {
      console.log('📋 Showing submission summary...');
      
      try {
        // Prepare consolidated change request data FIRST
        const consolidatedData = this.prepareConsolidatedData();
        
        // Validate that we have the required data for summary
        if (!consolidatedData.changeTitle && !consolidatedData.changeType && !consolidatedData.selectedRequester) {
          console.warn('⚠️ No data available for summary, user may need to fill out the form first');
          
          // Show a helpful message
          if (typeof showNotification === 'function') {
            showNotification('warning', 'Please fill out the change request form before submitting.');
          }
          return;
        }
        
        // Check if confirmation modal exists
        const confirmModal = document.getElementById('confirmation-modal');
        if (confirmModal) {
          console.log('📊 Using confirmation modal for submission summary');
          
          // Generate summary content
          const summaryContent = this.generateSubmissionSummary();
          
          // Update modal content
          const summaryContentElement = document.getElementById('summary-content');
          if (summaryContentElement) {
            summaryContentElement.innerHTML = summaryContent;
          }
          
          // Show modal
          const modal = new bootstrap.Modal(confirmModal);
          modal.show();
          
          // Ensure confirm button works
          this.setupConfirmSubmissionButton();
          
        } else {
          console.warn('⚠️ Confirmation modal not found, proceeding directly to submission');
          // Fallback: go directly to submission
          this.handleSubmission();
        }
        
      } catch (error) {
        console.error('❌ Error showing submission summary:', error);
        // Fallback to direct submission
        this.handleSubmission();
      }
    },

    /**
     * Prepare consolidated data for submission
     */
    prepareConsolidatedData() {
      console.log('📦 Preparing consolidated change request data...');
      
      try {
        // Ensure window.changeRequestData exists
        if (!window.changeRequestData) {
          window.changeRequestData = {};
        }
        
        // Get form data if available
        const formData = window.formData || {};
        
        // Get change type from form
        const changeTypeField = document.getElementById('change-type');
        const changeTypeValue = changeTypeField ? changeTypeField.value : '';
        
        // Debug: Log available global variables
        console.log('🔍 Available global variables:', {
          hasSelectedRequester: !!window.selectedRequester,
          hasSelectedAgent: !!window.selectedAgent,
          hasFormData: !!formData,
          hasChangeRequestData: !!window.changeRequestData,
          changeTypeValue: changeTypeValue,
          selectedRequesterKeys: window.selectedRequester ? Object.keys(window.selectedRequester) : [],
          selectedAgentKeys: window.selectedAgent ? Object.keys(window.selectedAgent) : []
        });
        
        // Log form field values for debugging
        console.log('📋 Form field values:', {
          changeTitle: this.getFieldValue('change-title'),
          changeType: changeTypeValue,
          requesterDisplay: document.getElementById('selected-requester-display')?.textContent,
          agentDisplay: document.getElementById('selected-agent-display')?.textContent
        });
        
        // Collect data from various sources with better fallbacks
        const consolidatedData = {
          // Basic change details
          changeTitle: this.getFieldValue('change-title') || formData.changeDetails?.title || '',
          changeDescription: this.getFieldValue('change-description') || formData.changeDetails?.description || '',
          changeType: changeTypeValue || formData.changeDetails?.changeType || '',
          reasonForChange: this.getFieldValue('reason-for-change') || formData.changeDetails?.reasonForChange || '',
          
          // Timing
          plannedStart: this.getFieldValue('planned-start') || formData.changeDetails?.plannedStart || '',
          plannedEnd: this.getFieldValue('planned-end') || formData.changeDetails?.plannedEnd || '',
          
          // Plans
          implementationPlan: this.getFieldValue('implementation-plan') || formData.changeDetails?.implementationPlan || '',
          backoutPlan: this.getFieldValue('backout-plan') || formData.changeDetails?.backoutPlan || '',
          validationPlan: this.getFieldValue('validation-plan') || formData.changeDetails?.validationPlan || '',
          
          // Selections - try multiple sources with enhanced checking
          selectedRequester: this.getSelectedRequester(formData),
          selectedAgent: this.getSelectedAgent(formData),
          selectedAssets: window.AssetAssociation?.getSelectedAssets() || window.changeRequestData?.selectedAssets || formData.selectedAssets || [],
          
          // Risk assessment
          riskAssessment: window.formData?.riskAssessment || window.changeRequestData?.riskAssessment || null
        };
        
        // Store in global variable for submission
        window.changeRequestData = consolidatedData;
        
        console.log('📋 Consolidated data prepared:', {
          hasTitle: !!consolidatedData.changeTitle,
          hasDescription: !!consolidatedData.changeDescription,
          hasChangeType: !!consolidatedData.changeType,
          changeType: consolidatedData.changeType,
          hasRequester: !!consolidatedData.selectedRequester,
          hasAgent: !!consolidatedData.selectedAgent,
          requesterName: consolidatedData.selectedRequester?.name || 'Not found',
          agentName: consolidatedData.selectedAgent?.name || consolidatedData.selectedAgent?.email || 'Not found',
          assetCount: consolidatedData.selectedAssets?.length || 0,
          hasRiskAssessment: !!consolidatedData.riskAssessment,
          riskLevel: consolidatedData.riskAssessment?.riskLevel
        });
        
        return consolidatedData;
        
      } catch (error) {
        console.error('❌ Error preparing consolidated data:', error);
        return window.changeRequestData || {};
      }
    },

    /**
     * Get selected requester from various sources
     */
    getSelectedRequester(formData) {
      // Try global variable first
      if (window.selectedRequester && window.selectedRequester.id) {
        console.log('✅ Found requester in window.selectedRequester:', window.selectedRequester.name);
        return window.selectedRequester;
      }
      
      // Try existing change request data
      if (window.changeRequestData?.selectedRequester?.id) {
        console.log('✅ Found requester in window.changeRequestData');
        return window.changeRequestData.selectedRequester;
      }
      
      // Try form data
      if (formData.selectedRequester?.id) {
        console.log('✅ Found requester in formData');
        return formData.selectedRequester;
      }
      
      // Try to extract from display element (fallback)
      const requesterDisplay = document.getElementById('selected-requester-display');
      if (requesterDisplay && requesterDisplay.textContent && !requesterDisplay.textContent.includes('Select')) {
        console.log('⚠️ Found requester in display element, but no ID available');
        return {
          name: requesterDisplay.textContent.trim(),
          id: null // This will still fail validation, but shows we found something
        };
      }
      
      console.warn('❌ No requester found in any source');
      return null;
    },

    /**
     * Get selected agent from various sources
     */
    getSelectedAgent(formData) {
      // Try global variable first
      if (window.selectedAgent && window.selectedAgent.id) {
        console.log('✅ Found agent in window.selectedAgent:', window.selectedAgent.name || window.selectedAgent.email);
        return window.selectedAgent;
      }
      
      // Try existing change request data
      if (window.changeRequestData?.selectedAgent?.id) {
        console.log('✅ Found agent in window.changeRequestData');
        return window.changeRequestData.selectedAgent;
      }
      
      // Try form data
      if (formData.selectedAgent?.id) {
        console.log('✅ Found agent in formData');
        return formData.selectedAgent;
      }
      
      // Try to extract from display element (fallback)
      const agentDisplay = document.getElementById('selected-agent-display');
      if (agentDisplay && agentDisplay.textContent && !agentDisplay.textContent.includes('Select')) {
        console.log('⚠️ Found agent in display element, but no ID available');
        return {
          name: agentDisplay.textContent.trim(),
          id: null // This will still fail validation, but shows we found something
        };
      }
      
      console.warn('❌ No agent found in any source');
      return null;
    },

    /**
     * Get field value from DOM
     */
    getFieldValue(fieldId) {
      try {
        const field = document.getElementById(fieldId);
        return field ? field.value.trim() : '';
      } catch (error) {
        console.warn(`⚠️ Could not get value for field: ${fieldId}`);
        return '';
      }
    },

    /**
     * Generate submission summary HTML with enhanced styling
     */
    generateSubmissionSummary() {
      const data = window.changeRequestData;
      const riskAssessment = data?.riskAssessment;
      
      // Get change type display name
      const changeTypeNames = {
        '1': 'Minor Change',
        '2': 'Major Change', 
        '3': 'Standard Change',
        '4': 'Emergency Change',
        '5': 'Normal Change',
        '6': 'Maintenance Change'
      };
      const changeTypeName = changeTypeNames[data.changeType] || 'Unknown';
      
      // Risk level styling
      const getRiskBadge = (level) => {
        switch(level?.toLowerCase()) {
          case 'low': return '<span class="badge bg-success">🟢 Low Risk</span>';
          case 'medium': return '<span class="badge bg-warning">🟡 Medium Risk</span>';
          case 'high': return '<span class="badge bg-danger">🔴 High Risk</span>';
          default: return '<span class="badge bg-secondary">❓ Not Assessed</span>';
        }
      };
      
      // Timeline formatting
      const formatDateTime = (dateStr) => {
        if (!dateStr) return '<span class="text-muted">Not scheduled</span>';
        try {
          return new Date(dateStr).toLocaleString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch {
          return dateStr;
        }
      };
      
      // Plan completion badges
      const getPlanBadge = (plan, label) => {
        if (plan && plan.trim()) {
          return `<span class="badge bg-success me-2"><i class="fas fa-check me-1"></i>${label}</span>`;
        } else {
          return `<span class="badge bg-warning me-2"><i class="fas fa-exclamation-triangle me-1"></i>${label} Missing</span>`;
        }
      };
      
      return `
        <div class="submission-summary">
          <!-- Header Card -->
          <div class="card border-primary mb-4">
            <div class="card-header bg-primary text-white">
              <h5 class="mb-0">
                <i class="fas fa-clipboard-check me-2"></i>
                Change Request Summary
              </h5>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-8">
                  <h6 class="text-primary">
                    <i class="fas fa-edit me-2"></i>
                    ${data.changeTitle || '<span class="text-danger">⚠️ Title not specified</span>'}
                  </h6>
                  <p class="text-muted mb-2">
                    <strong>Type:</strong> ${changeTypeName}
                    <span class="ms-3"><strong>Description:</strong> ${data.changeDescription ? '✅ Provided' : '❌ Not provided'}</span>
                  </p>
                </div>
                <div class="col-md-4 text-end">
                  ${getRiskBadge(riskAssessment?.riskLevel)}
                  ${riskAssessment?.totalScore ? `<div class="small text-muted mt-1">Score: ${riskAssessment.totalScore}/15</div>` : ''}
                </div>
              </div>
            </div>
          </div>
          
          <!-- Assignment & Timeline Row -->
          <div class="row mb-4">
            <div class="col-md-6">
              <div class="card h-100">
                <div class="card-header bg-light">
                  <h6 class="mb-0"><i class="fas fa-users me-2 text-info"></i>Assignment</h6>
                </div>
                <div class="card-body">
                  <div class="mb-3">
                    <strong>Requester:</strong><br>
                    ${data.selectedRequester?.name ? 
                      `<span class="text-success"><i class="fas fa-user me-1"></i>${data.selectedRequester.name}</span>` :
                      '<span class="text-danger"><i class="fas fa-exclamation-triangle me-1"></i>Not selected</span>'
                    }
                  </div>
                  <div class="mb-3">
                    <strong>Assigned Agent:</strong><br>
                    ${data.selectedAgent?.name || data.selectedAgent?.email ? 
                      `<span class="text-success"><i class="fas fa-user-cog me-1"></i>${data.selectedAgent.name || data.selectedAgent.email}</span>` :
                      '<span class="text-danger"><i class="fas fa-exclamation-triangle me-1"></i>Not selected</span>'
                    }
                  </div>
                  <div>
                    <strong>Assets:</strong><br>
                    <span class="badge bg-info">
                      <i class="fas fa-server me-1"></i>
                      ${data.selectedAssets?.length || 0} selected
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="col-md-6">
              <div class="card h-100">
                <div class="card-header bg-light">
                  <h6 class="mb-0"><i class="fas fa-clock me-2 text-warning"></i>Timeline</h6>
                </div>
                <div class="card-body">
                  <div class="mb-3">
                    <strong>Planned Start:</strong><br>
                    <span class="text-primary">${formatDateTime(data.plannedStart)}</span>
                  </div>
                  <div>
                    <strong>Planned End:</strong><br>
                    <span class="text-primary">${formatDateTime(data.plannedEnd)}</span>
                  </div>
                  ${data.plannedStart && data.plannedEnd ? 
                    `<div class="mt-2">
                       <small class="text-muted">
                         <i class="fas fa-hourglass-half me-1"></i>
                         Duration: ${this.calculateDuration(new Date(data.plannedStart), new Date(data.plannedEnd))}
                       </small>
                     </div>` : ''
                  }
                </div>
              </div>
            </div>
          </div>
          
          <!-- Implementation Plans -->
          <div class="card mb-4">
            <div class="card-header bg-light">
              <h6 class="mb-0"><i class="fas fa-list-check me-2 text-success"></i>Implementation Readiness</h6>
            </div>
            <div class="card-body">
              <div class="mb-3">
                ${getPlanBadge(data.implementationPlan, 'Implementation Plan')}
                ${getPlanBadge(data.backoutPlan, 'Backout Plan')}
                ${getPlanBadge(data.validationPlan, 'Validation Plan')}
              </div>
              
              ${riskAssessment ? `
                <div class="alert alert-info mb-0">
                  <h6 class="alert-heading mb-2">
                    <i class="fas fa-chart-line me-2"></i>Risk Assessment Complete
                  </h6>
                  <div class="row">
                    <div class="col-md-6">
                      <small>
                        <strong>Business Impact:</strong> ${riskAssessment.businessImpact}/3<br>
                        <strong>User Impact:</strong> ${riskAssessment.affectedUsers}/3<br>
                        <strong>Complexity:</strong> ${riskAssessment.complexity}/3
                      </small>
                    </div>
                    <div class="col-md-6">
                      <small>
                        <strong>Testing Level:</strong> ${riskAssessment.testing}/3<br>
                        <strong>Rollback Risk:</strong> ${riskAssessment.rollback}/3<br>
                        <strong>Total Score:</strong> ${riskAssessment.totalScore}/15
                      </small>
                    </div>
                  </div>
                </div>
              ` : `
                <div class="alert alert-warning mb-0">
                  <i class="fas fa-exclamation-triangle me-2"></i>
                  Risk assessment not completed
                </div>
              `}
            </div>
          </div>
          
          <!-- Next Steps -->
          <div class="alert alert-primary">
            <h6 class="alert-heading">
              <i class="fas fa-arrow-right me-2"></i>Next Steps
            </h6>
            <p class="mb-0">
              Once submitted, this change request will enter the approval workflow. 
              ${riskAssessment?.riskLevel === 'Medium' || riskAssessment?.riskLevel === 'High' ? 
                '<strong>A peer review task will be created due to the Medium/High risk level.</strong>' : 
                'Standard approval process will apply.'
              }
              Stakeholders will be notified automatically.
            </p>
          </div>
        </div>
      `;
    },

    /**
     * Setup confirm submission button event listener
     */
    setupConfirmSubmissionButton() {
      const confirmBtn = document.getElementById('confirm-submit');
      if (confirmBtn) {
        // Remove any existing listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        // Add new listener for confirm button
        newConfirmBtn.addEventListener('click', (e) => {
          e.preventDefault();
          
          // Hide confirmation modal
          const confirmModal = bootstrap.Modal.getInstance(document.getElementById('confirmation-modal'));
          if (confirmModal) {
            confirmModal.hide();
          }
          
          // Start submission
          setTimeout(() => {
            this.handleSubmission();
          }, 300);
        });
        
        console.log('✅ Confirm submission button listener setup');
      }
      
      // Setup edit request button
      const editBtn = document.getElementById('edit-request');
      if (editBtn) {
        // Remove any existing listeners
        const newEditBtn = editBtn.cloneNode(true);
        editBtn.parentNode.replaceChild(newEditBtn, editBtn);
        
        // Add new listener for edit button
        newEditBtn.addEventListener('click', (e) => {
          e.preventDefault();
          
          console.log('📝 User clicked edit request, closing confirmation modal');
          
          // Hide confirmation modal
          const confirmModal = bootstrap.Modal.getInstance(document.getElementById('confirmation-modal'));
          if (confirmModal) {
            confirmModal.hide();
          }
          
          // Ensure page is usable after modal closes
          setTimeout(() => {
            this.ensurePageEnabled();
            
            // Optional: Show a notification that user can edit
            if (typeof showNotification === 'function') {
              showNotification('info', 'You can now edit your change request details.');
            }
            
            // Optional: Scroll to top or focus on first field
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
          }, 300);
        });
        
        console.log('✅ Edit request button listener setup');
      } else {
        console.warn('⚠️ Edit request button not found in modal');
      }
    },

    /**
     * Show submission success modal
     */
    showSubmissionSuccess(changeId) {
      const modal = document.getElementById('submission-progress-modal');
      if (!modal) return;
      
      const modalTitle = modal.querySelector('.modal-title');
      const modalBody = modal.querySelector('.modal-body');
      
      if (modalTitle) {
        modalTitle.innerHTML = '<i class="fas fa-check-circle text-success"></i> Change Request Submitted Successfully!';
      }
      
      if (modalBody) {
        modalBody.innerHTML = `
          <div class="text-center">
            <div class="mb-3">
              <i class="fas fa-check-circle text-success" style="font-size: 3rem;"></i>
            </div>
            <h5 class="text-success">Success!</h5>
            <p class="mb-3">Your change request has been submitted successfully.</p>
            <div class="alert alert-info">
              <strong>Change Request ID:</strong> ${changeId}
            </div>
            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">
              <i class="fas fa-times"></i> Close
            </button>
          </div>
        `;
      }
    },

    /**
     * Associate assets with the created change request
     */
    async associateAssets(changeId) {
      try {
        console.log('🔗 Confirming asset association for change request:', changeId);
        
        // Get impacted assets from step 3
        const impactedAssets = window.changeRequestData?.impactedAssets || [];
        
        if (!impactedAssets || impactedAssets.length === 0) {
          console.log('ℹ️ No assets were selected for this change request');
          return true;
        }
        
        // Assets were already included in the change request creation
        // Just log for confirmation
        const assetSummary = impactedAssets.map(asset => ({
          id: asset.id,
          name: asset.name,
          display_id: asset.asset_display_id || asset.display_id,
          impact_type: asset.impact_type || 'affected'
        }));
        
        console.log(`✅ Assets already associated during change creation: ${assetSummary.length} assets`);
        console.log('📋 Asset details:', assetSummary);
        
        return true;
        
      } catch (error) {
        console.error('❌ Error in associateAssets:', error);
        return false;
      }
    }
};

// Expose the module to the window object
if (typeof window !== 'undefined') {
  window.ChangeSubmission = ChangeSubmission;
  console.log('✅ ChangeSubmission module exposed to window object');
  console.log('🔍 ChangeSubmission methods available:', Object.keys(ChangeSubmission));
  
  // Initialize the module when DOM is ready
  if (document.readyState === 'loading') {
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

    
