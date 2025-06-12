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
      text: `This guided tour will show you how to create and submit change requests effectively. 
             The tour covers all main features including change details, asset association, 
             impacted services analysis, and risk assessment.`,
      buttons: [
        {
          text: 'Skip Tour',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.cancel()
        },
        {
          text: 'Start Tour',
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
      title: 'Change Title',
      text: 'Provide a clear, descriptive title that summarizes what this change will accomplish.',
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
          text: 'Next',
          classes: 'shepherd-button-primary',
          action: () => this.tour.next()
        }
      ]
    });

    // Live search feature
    this.tour.addStep({
      title: 'Live Search for Users',
      text: 'These fields feature intelligent live search. Start typing (3+ characters) for instant results, or press Enter for manual search. Use arrow keys to navigate results.',
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
          text: 'Next',
          classes: 'shepherd-button-primary',
          action: () => this.tour.next()
        }
      ]
    });

    // Change type selection
    this.tour.addStep({
      title: 'Change Type',
      text: 'Select between Normal or Emergency change. This affects approval workflows and lead times.',
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
          text: 'Next',
          classes: 'shepherd-button-primary',
          action: () => this.tour.next()
        }
      ]
    });

    // Asset Association tab
    this.tour.addStep({
      title: 'Asset Association',
      text: 'Associate assets (servers, applications, services) that will be affected by your change.',
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
          text: 'Next',
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
      title: 'Asset Search',
      text: 'Search for assets by name, type, or description. The search supports intelligent filtering and provides real-time results.',
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
          text: 'Next',
          classes: 'shepherd-button-primary',
          action: () => this.tour.next()
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
      title: 'Risk Questions',
      text: 'Answer these questions to calculate the risk score. The system automatically determines approval requirements based on your responses.',
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
          text: 'Next',
          classes: 'shepherd-button-primary',
          action: () => this.tour.next()
        }
      ]
    });

    // Submit button
    this.tour.addStep({
      title: 'Submit Change Request',
      text: 'Once all sections are complete, click here to submit your change request. You\'ll see a detailed progress indicator during submission.',
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
          text: 'Next',
          classes: 'shepherd-button-primary',
          action: () => this.tour.next()
        }
      ]
    });

    // Final step
    this.tour.addStep({
      title: 'Tour Complete!',
      text: `You're now ready to create change requests efficiently! 
             <br><br><strong>Key Tips:</strong>
             <ul style="text-align: left; margin-top: 10px;">
               <li>Fill out all sections for better approval chances</li>
               <li>Use live search for quick user and asset selection</li>
               <li>Review the risk assessment carefully</li>
               <li>The system saves your progress automatically</li>
             </ul>
             <br>Click the Help button anytime to restart this tour.`,
      buttons: [
        {
          text: 'Previous',
          classes: 'shepherd-button-secondary',
          action: () => this.tour.back()
        },
        {
          text: 'Finish Tour',
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
    // Show a brief notification
    const notification = document.createElement('div');
    notification.className = 'alert alert-success alert-dismissible fade show position-fixed';
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 10001; max-width: 300px;';
    notification.innerHTML = `
      <i class="fas fa-check-circle me-2"></i>
      <strong>Tour Complete!</strong> You're ready to create change requests.
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
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