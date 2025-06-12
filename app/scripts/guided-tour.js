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
      text: 'Let\'s select "Normal Change" for our security patch example. This affects approval workflows and lead times.',
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

    // Impacted Services tab
    this.tour.addStep({
      title: 'Impacted Services Analysis',
      text: 'This section automatically analyzes the services and stakeholders impacted by your selected assets.',
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
          text: 'Next',
          classes: 'shepherd-button-primary',
          action: () => {
            // Switch to impacted services tab
            document.getElementById('impacted-services-tab').click();
            setTimeout(() => this.tour.next(), 300);
          }
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
               <li>✅ Completed a comprehensive risk assessment</li>
               <li>✅ Prepared a change request ready for submission</li>
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