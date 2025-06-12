/**
 * Guided Tour Manager for Change Request Application
 * Using Shepherd.js library for interactive tour functionality
 */

class GuidedTourManager {
  constructor() {
    this.tour = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the guided tour
   */
  init() {
    if (this.isInitialized || typeof Shepherd === 'undefined') {
      return;
    }

    this.tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        cancelIcon: {
          enabled: true
        },
        scrollTo: { behavior: 'smooth', block: 'center' },
        modalOverlayOpeningPadding: 8,
        modalOverlayOpeningRadius: 8
      }
    });

    this.setupTourSteps();
    this.setupEventListeners();
    this.isInitialized = true;
    
    console.log('🎯 Guided tour initialized successfully');
  }

  /**
   * Setup all tour steps
   */
  setupTourSteps() {
    // Welcome step
    this.tour.addStep({
      title: 'Welcome to Change Request App',
      text: `This guided tour will walk you through creating a complete change request step-by-step. 
             You'll learn how to fill out each section, select assets, assess risks, and submit your request.
             <br><br><strong>We'll create a sample change request together!</strong>`,
      buttons: [
        {
          text: 'Skip Tour',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.cancel()
        },
        {
          text: 'Let\'s Start!',
          classes: 'shepherd-button-primary',
          action: () => this.tour.next()
        }
      ]
    });

    // Help button
    this.tour.addStep({
      title: 'Help & Guidance',
      text: 'Click this Help button anytime to restart the guided tour or get assistance.',
      attachTo: {
        element: '#start-guided-tour',
        on: 'bottom'
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.back()
        },
        {
          text: 'Next',
          classes: 'shepherd-button-primary',
          action: () => this.tour.next()
        }
      ]
    });

    // Theme selector
    this.tour.addStep({
      title: 'Theme Selection',
      text: 'Choose between Light, Dark, or Auto mode to match your preference. Auto mode follows your system settings.',
      attachTo: {
        element: '#theme-selector',
        on: 'bottom'
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.back()
        },
        {
          text: 'Next',
          classes: 'shepherd-button-primary',
          action: () => this.tour.next()
        }
      ]
    });

    // Main navigation tabs
    this.tour.addStep({
      title: 'Navigation Tabs',
      text: 'The application is organized into four main sections. You can navigate between them using these tabs.',
      attachTo: {
        element: '#change-tabs',
        on: 'bottom'
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.back()
        },
        {
          text: 'Next',
          classes: 'shepherd-button-primary',
          action: () => this.tour.next()
        }
      ]
    });

    // Change Details tab
    this.tour.addStep({
      title: 'Change Details',
      text: 'Start by filling out the basic information about your change request including title, description, and key personnel.',
      attachTo: {
        element: '#details-tab',
        on: 'bottom'
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.back()
        },
        {
          text: 'Next',
          classes: 'shepherd-button-primary',
          action: () => this.tour.next()
        }
      ]
    });

    // Change title field
    this.tour.addStep({
      title: 'Let\'s Fill Out the Title',
      text: 'First, let\'s add a sample title. I\'ll fill this in for you as an example.',
      attachTo: {
        element: '#change-title',
        on: 'right'
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.back()
        },
        {
          text: 'Fill Title & Continue',
          classes: 'shepherd-button-primary',
          action: () => {
            // Fill in a sample title
            document.getElementById('change-title').value = 'Update Production Database Server - Security Patches';
            // Trigger change event to ensure data is saved
            document.getElementById('change-title').dispatchEvent(new Event('input', { bubbles: true }));
            this.tour.next();
          }
        }
      ]
    });

    // Description field
    this.tour.addStep({
      title: 'Add a Description',
      text: 'Now let\'s add a description explaining what this change involves.',
      attachTo: {
        element: '#change-description',
        on: 'right'
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.back()
        },
        {
          text: 'Fill Description & Continue',
          classes: 'shepherd-button-primary',
          action: () => {
            // Fill in a sample description
            document.getElementById('change-description').value = 'Install latest security patches on the production database server to address recent vulnerabilities and maintain compliance with security standards.';
            document.getElementById('change-description').dispatchEvent(new Event('input', { bubbles: true }));
            this.tour.next();
          }
        }
      ]
    });

    // Live search feature
    this.tour.addStep({
      title: 'Live Search for Requester',
      text: 'Now let\'s select a requester. Start typing a name and watch the live search in action! Try typing "john" or any name.',
      attachTo: {
        element: '#requester-search',
        on: 'right'
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.back()
        },
        {
          text: 'I\'ll Skip For Now',
          classes: 'shepherd-button-primary',
          action: () => this.tour.next()
        }
      ]
    });

    // Change type selection
    this.tour.addStep({
      title: 'Select Change Type',
      text: `We have two change types available:
             <br><br><strong>Normal Change:</strong> Planned changes with proper lead time and approval workflow
             <br><strong>Emergency Change:</strong> Urgent changes requiring immediate implementation
             <br><br>Let's select "Normal Change" for our security patch example.`,
      attachTo: {
        element: '#change-type',
        on: 'left'
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.back()
        },
        {
          text: 'Select Normal Change',
          classes: 'shepherd-button-primary',
          action: () => {
            // Select normal change
            document.getElementById('change-type').value = 'normal';
            document.getElementById('change-type').dispatchEvent(new Event('change', { bubbles: true }));
            this.tour.next();
          }
        }
      ]
    });

    // Implementation plan
    this.tour.addStep({
      title: 'Implementation Plan',
      text: 'Now let\'s add implementation details. This is crucial for a successful change request.',
      attachTo: {
        element: '#implementation-plan',
        on: 'right'
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.back()
        },
        {
          text: 'Fill Implementation Plan',
          classes: 'shepherd-button-primary',
          action: () => {
            // Fill implementation plan
            const implPlan = document.getElementById('implementation-plan');
            if (implPlan) {
              implPlan.value = '1. Schedule maintenance window during off-peak hours\n2. Create database backup\n3. Apply security patches using automated deployment tools\n4. Verify system functionality\n5. Update documentation';
              implPlan.dispatchEvent(new Event('input', { bubbles: true }));
            }
            this.tour.next();
          }
        }
             ]
     });

    // Backout plan
    this.tour.addStep({
      title: 'Add Backout Plan',
      text: 'Every change needs a rollback plan. Let\'s add one for our security patch scenario.',
      attachTo: {
        element: '#backout-plan',
        on: 'right'
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.back()
        },
        {
          text: 'Fill Backout Plan',
          classes: 'shepherd-button-primary',
          action: () => {
            // Fill backout plan
            const backoutPlan = document.getElementById('backout-plan');
            if (backoutPlan) {
              backoutPlan.value = '1. Immediately restore from backup if system becomes unstable\n2. Rollback patches using system recovery tools\n3. Restart services and verify system functionality\n4. Notify stakeholders of any service disruption\n5. Document issues and plan remediation';
              backoutPlan.dispatchEvent(new Event('input', { bubbles: true }));
            }
            this.tour.next();
          }
        }
      ]
    });

    // Validation plan
    this.tour.addStep({
      title: 'Add Validation Plan',
      text: 'A validation plan helps ensure the change works correctly. Let\'s add testing steps for our security patch.',
      attachTo: {
        element: '#validation-plan',
        on: 'right'
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.back()
        },
        {
          text: 'Fill Validation Plan',
          classes: 'shepherd-button-primary',
          action: () => {
            // Fill validation plan
            const validationPlan = document.getElementById('validation-plan');
            if (validationPlan) {
              validationPlan.value = '1. Verify database connectivity and performance\n2. Run automated security scan to confirm patches applied\n3. Test critical business applications\n4. Monitor system logs for errors\n5. Validate backup and recovery procedures\n6. Confirm all security vulnerabilities are addressed';
              validationPlan.dispatchEvent(new Event('input', { bubbles: true }));
            }
            this.tour.next();
          }
        }
      ]
    });

    // Asset Association tab
    this.tour.addStep({
      title: 'Time for Asset Association',
      text: 'Great! Now let\'s associate the assets that will be affected by our database server security patch. Click to go to the Asset Association tab.',
      attachTo: {
        element: '#asset-association-tab',
        on: 'bottom'
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.back()
        },
        {
          text: 'Go to Asset Association',
          classes: 'shepherd-button-primary',
          action: () => {
            // Switch to asset association tab
            document.getElementById('asset-association-tab').click();
            setTimeout(() => this.tour.next(), 300);
          }
        }
      ]
    });

    // Asset search functionality
    this.tour.addStep({
      title: 'Search for Database Assets',
      text: 'Let\'s search for database-related assets. I\'ll search for "database" to find relevant assets for our security patch.',
      attachTo: {
        element: '#asset-search-input',
        on: 'bottom'
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.back()
        },
        {
          text: 'Search for Database Assets',
          classes: 'shepherd-button-primary',
          action: () => {
            // Fill search and trigger search
            const searchInput = document.getElementById('asset-search-input');
            if (searchInput) {
              searchInput.value = 'database';
              searchInput.dispatchEvent(new Event('input', { bubbles: true }));
              // Trigger search button if available
              const searchBtn = document.querySelector('#asset-search-form .btn');
              if (searchBtn) {
                setTimeout(() => searchBtn.click(), 500);
              }
            }
            this.tour.next();
          }
        }
      ]
    });

    // Services selection in asset association
    this.tour.addStep({
      title: 'Select Related Services',
      text: 'In addition to assets, you can also select services that will be impacted. This helps with comprehensive change planning and stakeholder notifications.',
      attachTo: {
        element: '.services-selection-section',
        on: 'top'
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.back()
        },
        {
          text: 'I Understand',
          classes: 'shepherd-button-primary',
          action: () => this.tour.next()
        }
      ]
    });

    // Services search and filters
    this.tour.addStep({
      title: 'Services Search & Filters',
      text: 'Use the search box and filters to find relevant services. You can filter by service type to narrow down results.',
      attachTo: {
        element: '#services-search',
        on: 'bottom'
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.back()
        },
        {
          text: 'Next',
          classes: 'shepherd-button-primary',
          action: () => this.tour.next()
        }
      ]
    });

    // Impacted Services tab
    this.tour.addStep({
      title: 'Impact Analysis Overview',
      text: 'Impact Analysis is critical for understanding who and what will be affected by your change. This drives approval workflows and stakeholder communication.',
      attachTo: {
        element: '#impacted-services-tab',
        on: 'bottom'
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.back()
        },
        {
          text: 'Learn Impact Analysis',
          classes: 'shepherd-button-primary',
          action: () => {
            // Switch to impacted services tab
            document.getElementById('impacted-services-tab').click();
            setTimeout(() => this.tour.next(), 300);
          }
        }
      ]
    });

    // Impact Analysis - What is it?
    this.tour.addStep({
      title: 'What is Impact Analysis?',
      text: `Impact Analysis identifies all services, systems, and people affected by your change:
             <br><br><strong>Key Components:</strong>
             <ul style="text-align: left; margin-top: 10px;">
               <li><strong>Service Dependencies:</strong> Which services rely on your changed assets</li>
               <li><strong>User Groups:</strong> Who will experience service disruption</li>
               <li><strong>Business Functions:</strong> Which business processes might be affected</li>
               <li><strong>Technical Dependencies:</strong> Upstream/downstream system impacts</li>
             </ul>
             <br>This analysis determines required approvals and notification lists.`,
      attachTo: {
        element: '.impacted-services-content',
        on: 'top'
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.back()
        },
        {
          text: 'Continue',
          classes: 'shepherd-button-primary',
          action: () => this.tour.next()
        }
      ]
    });

    // How Impact Analysis Works
    this.tour.addStep({
      title: 'How Impact Analysis Works',
      text: `The system automatically analyzes your selected assets to determine impacts:
             <br><br><strong>Automatic Analysis:</strong>
             <ul style="text-align: left; margin-top: 10px;">
               <li><strong>Service Mapping:</strong> Reviews CMDB relationships to find dependent services</li>
               <li><strong>User Impact:</strong> Calculates affected user counts based on service usage</li>
               <li><strong>Business Impact:</strong> Identifies critical business functions at risk</li>
               <li><strong>Technical Impact:</strong> Maps infrastructure dependencies</li>
             </ul>
             <br><strong>Pro Tip:</strong> More accurate asset selection = better impact analysis!`,
      attachTo: {
        element: '.services-impact-summary',
        on: 'left'
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.back()
        },
        {
          text: 'Learn About Stakeholders',
          classes: 'shepherd-button-primary',
          action: () => this.tour.next()
        }
      ]
    });

    // Stakeholders Explanation
    this.tour.addStep({
      title: 'Understanding Stakeholders',
      text: `Stakeholders are people who need to know about or approve your change:
             <br><br><strong>Types of Stakeholders:</strong>
             <ul style="text-align: left; margin-top: 10px;">
               <li><strong>Business Owners:</strong> Own the services being changed</li>
               <li><strong>Technical Owners:</strong> Responsible for the technical assets</li>
               <li><strong>End Users:</strong> Will experience the change impact</li>
               <li><strong>Support Teams:</strong> Handle incidents and user support</li>
               <li><strong>Compliance:</strong> Ensure regulatory requirements are met</li>
             </ul>
             <br>The system auto-identifies stakeholders based on asset ownership and service relationships.`,
      attachTo: {
        element: '.stakeholders-section',
        on: 'right'
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.back()
        },
        {
          text: 'Learn About Approvers',
          classes: 'shepherd-button-primary',
          action: () => this.tour.next()
        }
      ]
    });

    // Approvers Explanation
    this.tour.addStep({
      title: 'Understanding Approvers',
      text: `Approvers are specific stakeholders with decision-making authority:
             <br><br><strong>Approval Types:</strong>
             <ul style="text-align: left; margin-top: 10px;">
               <li><strong>Technical Owner Approval:</strong> Technical leads approve implementation details</li>
               <li><strong>Peer Review:</strong> SME coordination for medium/high risk changes</li>
               <li><strong>High Risk CAB:</strong> Change Advisory Board for high-risk changes</li>
               <li><strong>Emergency Authority:</strong> For emergency changes requiring immediate action</li>
             </ul>
             <br><strong>Workflow States:</strong>
             <ul style="text-align: left; margin-top: 5px;">
               <li><strong>Pending Review:</strong> Peer review coordination phase</li>
               <li><strong>Pending Approval:</strong> Technical owner approval phase</li>
               <li><strong>Scheduled:</strong> All approvals obtained, ready for implementation</li>
             </ul>`,
      attachTo: {
        element: '.approvers-section',
        on: 'left'
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.back()
        },
        {
          text: 'See Approval Matrix',
          classes: 'shepherd-button-primary',
          action: () => this.tour.next()
        }
      ]
    });

    // Approval Matrix Guide
    this.tour.addStep({
      title: 'Change Approval Matrix',
      text: `Our approval workflow is based on change type and risk level:
             <br><br><strong>Normal Changes:</strong>
             <ul style="text-align: left; margin-top: 10px;">
               <li><strong>Low Risk:</strong> Direct to "Pending Approval" → Technical Owner approval only</li>
               <li><strong>Medium Risk:</strong> "Pending Review" → Peer Review → Technical Owner approval</li>
               <li><strong>High Risk:</strong> "Pending Review" → Peer Review → Technical Owner + High Risk CAB approval</li>
             </ul>
             <br><strong>Emergency Changes:</strong>
             <ul style="text-align: left; margin-top: 10px;">
               <li>Emergency authority approval</li>
               <li>Post-implementation review required</li>
             </ul>
             <br><strong>Workflow Automation:</strong> Freshservice automator handles state transitions after peer review completion.`,
      buttons: [
        {
          text: 'Previous',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.back()
        },
        {
          text: 'Review Our Example',
          classes: 'shepherd-button-primary',
          action: () => this.tour.next()
        }
      ]
    });

    // Example Impact Analysis
    this.tour.addStep({
      title: 'Our Security Patch Example',
      text: `Let's review the impact and approval flow for our database security patch:
             <br><br><strong>Impacted Services:</strong> All services using the production database
             <br><strong>Affected Users:</strong> All application users during maintenance window
             <br><strong>Business Impact:</strong> Temporary service unavailability during patching
             <br><br><strong>Expected Approval Flow:</strong>
             <ul style="text-align: left; margin-top: 10px;">
               <li><strong>If Low Risk:</strong> Direct to Database Administrator (Technical Owner)</li>
               <li><strong>If Medium Risk:</strong> Peer Review → Database Administrator approval</li>
               <li><strong>If High Risk:</strong> Peer Review → Database Administrator + High Risk CAB</li>
             </ul>
             <br><strong>Notification List:</strong> End users, support teams, operations staff`,
      attachTo: {
        element: '.impact-summary-card',
        on: 'top'
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.back()
        },
        {
          text: 'Move to Risk Assessment',
          classes: 'shepherd-button-primary',
          action: () => this.tour.next()
        }
      ]
    });

    // Risk Assessment tab
    this.tour.addStep({
      title: 'Risk Assessment',
      text: 'Complete a comprehensive risk assessment that determines approval workflows and change scheduling.',
      attachTo: {
        element: '#risk-tab',
        on: 'bottom'
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.back()
        },
        {
          text: 'Next',
          classes: 'shepherd-button-primary',
          action: () => {
            // Switch to risk assessment tab
            document.getElementById('risk-tab').click();
            setTimeout(() => this.tour.next(), 300);
          }
        }
      ]
    });

    // Risk questions
    this.tour.addStep({
      title: 'Complete Risk Assessment',
      text: 'Now let\'s complete the risk assessment. I\'ll fill in typical answers for a security patch scenario.',
      attachTo: {
        element: '.risk-question',
        on: 'right'
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.back()
        },
        {
          text: 'Fill Risk Assessment',
          classes: 'shepherd-button-primary',
          action: () => {
            // Fill risk assessment with typical values for security patch
            // Business Impact: Limited (1)
            const businessImpact1 = document.getElementById('business-impact-1');
            if (businessImpact1) businessImpact1.checked = true;
            
            // Affected Users: Few (1)
            const users1 = document.getElementById('users-1');
            if (users1) users1.checked = true;
            
            // Complexity: Simple (1)
            const complexity1 = document.getElementById('complexity-1');
            if (complexity1) complexity1.checked = true;
            
            // Testing: Comprehensive (1)
            const testing1 = document.getElementById('testing-1');
            if (testing1) testing1.checked = true;
            
            // Rollback: Yes (1)
            const rollback1 = document.getElementById('rollback-1');
            if (rollback1) rollback1.checked = true;
            
            // Calculate risk
            setTimeout(() => {
              const calculateBtn = document.getElementById('calculate-risk');
              if (calculateBtn) calculateBtn.click();
            }, 500);
            
            this.tour.next();
          }
        }
      ]
    });

    // Submit button
    this.tour.addStep({
      title: 'Ready to Submit!',
      text: 'Perfect! Your sample change request is now complete. In a real scenario, you would click "Submit Change Request" to send it for approval. You\'ll see a detailed progress indicator during submission.',
      attachTo: {
        element: '#submit-change-btn',
        on: 'top'
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.back()
        },
        {
          text: 'See Final Tips',
          classes: 'shepherd-button-primary',
          action: () => this.tour.next()
        }
      ]
    });

    // Final step
    this.tour.addStep({
      title: 'Congratulations! 🎉',
      text: `You've successfully learned how to create a complete change request! 
             <br><br><strong>What you accomplished:</strong>
             <ul style="text-align: left; margin-top: 10px;">
               <li>✅ Filled out change details with clear title and description</li>
               <li>✅ Selected appropriate change type and filled implementation plan</li>
               <li>✅ Learned about asset association and search functionality</li>
               <li>✅ Understood impact analysis, stakeholders, and approvers</li>
               <li>✅ Learned approval workflows and stakeholder identification</li>
               <li>✅ Completed a comprehensive risk assessment</li>
               <li>✅ Prepared a change request ready for submission</li>
             </ul>
             <br><strong>Key Takeaways:</strong>
             <ul style="text-align: left; margin-top: 5px;">
               <li>🎯 Impact analysis drives approval requirements</li>
               <li>👥 Stakeholders vs. Approvers have different roles</li>
               <li>⚡ Change type and risk level determine approval workflow</li>
             </ul>
             <br><strong>Remember:</strong> The system automatically saves your progress, so you can always come back to finish a request later.
             <br><br>Click the <strong>Help button</strong> anytime to restart this tutorial!`,
      buttons: [
        {
          text: 'Previous',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.back()
        },
        {
          text: 'Finish & Start Creating!',
          classes: 'shepherd-button-primary',
          action: () => this.tour.complete()
        }
      ]
    });
  }

  /**
   * Setup event listeners for tour management
   */
  setupEventListeners() {
    // Help button click handler
    document.addEventListener('click', (e) => {
      if (e.target.closest('#start-guided-tour')) {
        e.preventDefault();
        this.startTour();
      }
    });

    // Tour completion tracking
    this.tour.on('complete', () => {
      console.log('🎉 Guided tour completed successfully');
      localStorage.setItem('tour-completed', 'true');
      this.showTourCompletionMessage();
    });

    this.tour.on('cancel', () => {
      console.log('🚫 Guided tour cancelled by user');
    });
  }

  /**
   * Start the guided tour
   */
  startTour() {
    if (!this.isInitialized) {
      console.warn('⚠️ Tour not initialized yet');
      return;
    }

    // Ensure we're on the first tab
    const firstTab = document.getElementById('details-tab');
    if (firstTab) {
      firstTab.click();
    }

    // Start the tour
    this.tour.start();
    console.log('🎯 Guided tour started');
  }

  /**
   * Show tour completion message
   */
  showTourCompletionMessage() {
    // Clear sample data from the tour
    this.clearSampleData();
    
    // Show a brief notification
    const notification = document.createElement('div');
    notification.className = 'alert alert-success alert-dismissible fade show position-fixed';
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 10001; max-width: 350px;';
    notification.innerHTML = `
      <i class="fas fa-graduation-cap me-2"></i>
      <strong>Tutorial Complete!</strong> Sample data cleared. Ready to create your real change request!
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 7 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 7000);
  }

  /**
   * Clear sample data added during the tour
   */
  clearSampleData() {
    // Clear form fields that were filled during the tour
    const fieldsTooClear = [
      'change-title',
      'change-description', 
      'implementation-plan',
      'backout-plan',
      'validation-plan',
      'asset-search-input'
    ];
    
    fieldsTooClear.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.value = '';
        field.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    // Clear change type selection
    const changeType = document.getElementById('change-type');
    if (changeType) {
      changeType.value = '';
      changeType.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Clear risk assessment radio buttons
    const riskInputs = document.querySelectorAll('input[type="radio"][name^="business-impact"], input[type="radio"][name^="affected-users"], input[type="radio"][name^="complexity"], input[type="radio"][name^="testing"], input[type="radio"][name^="rollback"]');
    riskInputs.forEach(input => {
      input.checked = false;
    });

    // Hide risk results if visible
    const riskResult = document.getElementById('risk-result');
    if (riskResult) {
      riskResult.classList.add('hidden');
    }

    // Return to first tab
    const firstTab = document.getElementById('details-tab');
    if (firstTab) {
      firstTab.click();
    }

    console.log('🧹 Sample data cleared after tour completion');
  }

  /**
   * Check if user has completed the tour
   */
  hasCompletedTour() {
    return localStorage.getItem('tour-completed') === 'true';
  }

  /**
   * Reset tour completion status
   */
  resetTourStatus() {
    localStorage.removeItem('tour-completed');
  }
}

// Initialize the guided tour when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Wait for Shepherd to be available
  const initTour = () => {
    if (typeof Shepherd !== 'undefined') {
      window.GuidedTour = new GuidedTourManager();
      window.GuidedTour.init();
    } else {
      // Retry after a short delay if Shepherd isn't loaded yet
      setTimeout(initTour, 100);
    }
  };
  
  initTour();
});

console.log('📚 Guided tour script loaded'); 