/**
 * Guided Tour System for Change Request Application
 * Provides interactive walkthrough of application features
 */

const GuidedTour = {
  currentStep: 0,
  isActive: false,
  overlay: null,
  tooltip: null,
  
  // Tour steps configuration
  steps: [
    {
      target: '#change-tabs',
      title: 'Welcome to the Change Request Application!',
      content: `This application helps you create comprehensive change requests with automated risk assessment and stakeholder identification. 
                <br><br>The process is organized into <strong>4 main tabs</strong> that guide you through each step.
                <br><br>Let's take a quick tour to show you how it works!`,
      position: 'bottom',
      showNext: true,
      showPrev: false,
      highlightPadding: 10
    },
    {
      target: '#details-tab',
      title: 'Step 1: Change Details',
      content: `Start here by providing the basic information about your change:
                <ul>
                  <li><strong>Title & Description</strong> - What you're changing</li>
                  <li><strong>Requester & Agent</strong> - Who's involved (with live search)</li>
                  <li><strong>Change Type</strong> - Normal or Emergency</li>
                  <li><strong>Timing</strong> - When the change will happen</li>
                  <li><strong>Implementation Plans</strong> - How you'll do it and roll it back</li>
                </ul>`,
      position: 'bottom',
      showNext: true,
      showPrev: true,
      action: () => GuidedTour.switchToTab('change-details')
    },
    {
      target: '#change-title',
      title: 'Change Title',
      content: `Provide a clear, descriptive title for your change request. This will be visible to all stakeholders and approvers.
                <br><br><strong>Tip:</strong> Include the system name and what you're changing (e.g., "Database Schema Update for Customer Portal")`,
      position: 'bottom',
      showNext: true,
      showPrev: true,
      highlightPadding: 5
    },
    {
      target: '#requester-search',
      title: 'Live Search for People',
      content: `Use the live search to find requesters and agents:
                <ul>
                  <li><strong>Type 3+ characters</strong> for instant results</li>
                  <li><strong>Arrow keys</strong> to navigate results</li>
                  <li><strong>Enter</strong> to select, <strong>Escape</strong> to close</li>
                  <li>Search by name or email address</li>
                </ul>`,
      position: 'right',
      showNext: true,
      showPrev: true,
      highlightPadding: 5
    },
    {
      target: '#change-type',
      title: 'Change Type Selection',
      content: `Select the appropriate change type:
                <br><br><strong>Normal Change:</strong> Standard changes with proper lead time
                <br><strong>Emergency Change:</strong> Urgent changes that can't wait for normal approval
                <br><br>The system will automatically calculate the required lead time based on your selection.`,
      position: 'left',
      showNext: true,
      showPrev: true,
      highlightPadding: 5
    },
    {
      target: '#asset-association-tab',
      title: 'Step 2: Asset Association',
      content: `Next, identify which systems and assets will be impacted by your change:
                <ul>
                  <li><strong>Search for assets</strong> by name or type</li>
                  <li><strong>Select multiple assets</strong> that will be affected</li>
                  <li><strong>Technical owners</strong> are automatically identified</li>
                  <li>This information drives the approval workflow</li>
                </ul>`,
      position: 'bottom',
      showNext: true,
      showPrev: true,
      action: () => GuidedTour.switchToTab('asset-association')
    },
    {
      target: '#asset-search-input',
      title: 'Asset Search',
      content: `Search for assets that will be impacted by your change:
                <br><br><strong>Search by:</strong> Asset name, type, or location
                <br><strong>Filter by:</strong> Asset types (configurable during app installation)
                <br><strong>Select multiple:</strong> Add all systems that will be affected
                <br><br>The system will automatically identify technical owners and stakeholders from your selections.`,
      position: 'bottom',
      showNext: true,
      showPrev: true,
      highlightPadding: 5
    },
    {
      target: '#impacted-services-tab',
      title: 'Step 3: Impacted Services Analysis',
      content: `This tab shows the automated analysis of your change impact:
                <ul>
                  <li><strong>Technical Owners</strong> - Who needs to approve</li>
                  <li><strong>Stakeholders</strong> - Who will be notified</li>
                  <li><strong>Service Dependencies</strong> - Related systems</li>
                  <li><strong>Impact Metrics</strong> - Scope of the change</li>
                </ul>
                This analysis drives the approval workflow and notifications.`,
      position: 'bottom',
      showNext: true,
      showPrev: true,
      action: () => GuidedTour.switchToTab('impacted-services')
    },
    {
      target: '#risk-tab',
      title: 'Step 4: Risk Assessment',
      content: `Finally, complete the risk assessment to determine the approval workflow:
                <ul>
                  <li><strong>5 risk factors</strong> - Each scored 1-3 points</li>
                  <li><strong>Automated scoring</strong> - Total score determines risk level</li>
                  <li><strong>Workflow routing</strong> - Risk level determines approval process</li>
                  <li><strong>Low Risk (5-7):</strong> Direct to approval</li>
                  <li><strong>Medium/High Risk (8-15):</strong> Peer review required first</li>
                </ul>`,
      position: 'bottom',
      showNext: true,
      showPrev: true,
      action: () => GuidedTour.switchToTab('risk-assessment')
    },
    {
      target: '.risk-question:first-child',
      title: 'Risk Assessment Questions',
      content: `Answer each question honestly to get an accurate risk assessment:
                <br><br><strong>Business Impact:</strong> How many people/processes are affected?
                <br><strong>User Impact:</strong> How many users will experience changes?
                <br><strong>Complexity:</strong> How complex is the technical implementation?
                <br><strong>Testing:</strong> How thoroughly has this been tested?
                <br><strong>Rollback:</strong> How easy is it to undo if something goes wrong?`,
      position: 'right',
      showNext: true,
      showPrev: true,
      highlightPadding: 10
    },
    {
      target: '#submit-change-btn',
      title: 'Submit Your Change Request',
      content: `Once you've completed all sections, click here to submit your change request.
                <br><br><strong>What happens next:</strong>
                <ul>
                  <li><strong>Low Risk:</strong> Goes to "Pending Approval" status immediately</li>
                  <li><strong>Medium/High Risk:</strong> Goes to "Pending Review" for peer review first</li>
                  <li><strong>Notifications:</strong> Stakeholders are automatically notified</li>
                  <li><strong>Approvals:</strong> Technical owners receive approval requests</li>
                  <li><strong>Workflow Automation:</strong> System manages state transitions</li>
                </ul>`,
      position: 'top',
      showNext: true,
      showPrev: true,
      highlightPadding: 5
    },
    {
      target: '#theme-selector',
      title: 'Customize Your Experience',
      content: `<strong>Pro Tip:</strong> You can customize the application appearance using the theme selector:
                <br><br><strong>Light Mode:</strong> Traditional light interface
                <br><strong>Dark Mode:</strong> Easy on the eyes for low-light environments
                <br><strong>Auto:</strong> Follows your system preference
                <br><br>Your preference is saved automatically for future sessions.`,
      position: 'left',
      showNext: true,
      showPrev: true,
      highlightPadding: 5
    },
    {
      target: '#app-content',
      title: 'Tour Complete!',
      content: `<strong>Congratulations!</strong> You've completed the guided tour.
                <br><br><strong>Key Takeaways:</strong>
                <ul>
                  <li>Follow the 4 tabs in order for best results</li>
                  <li>Use live search features for people and assets</li>
                  <li>Risk assessment determines your approval workflow</li>
                  <li>System automates stakeholder identification and notifications</li>
                  <li>Workflow automator manages state transitions</li>
                </ul>
                <br><strong>Ready to create your first change request?</strong>
                <br><br>You can restart this tour anytime by clicking the "Help" button.`,
      position: 'center',
      showNext: false,
      showPrev: true,
      highlightPadding: 20
    }
  ],

  /**
   * Initialize the guided tour system
   */
  init() {
    console.log('🎯 Initializing Guided Tour system...');
    this.createTourButton();
    this.createOverlay();
    this.createTooltip();
    this.setupEventListeners();
    console.log('✅ Guided Tour system initialized');
  },

  /**
   * Create the tour start button
   */
  createTourButton() {
    const button = document.createElement('button');
    button.id = 'start-tour-btn';
    button.className = 'btn btn-outline-info btn-sm position-fixed';
    button.style.cssText = `
      top: 20px;
      right: 20px;
      z-index: 1040;
      border-radius: 50px;
      padding: 8px 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      transition: all 0.3s ease;
    `;
    button.innerHTML = '<i class="fas fa-question-circle me-2"></i>Help & Tour';
    button.title = 'Start guided tour of the application';
    
    // Add hover effects
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    });
    
    button.addEventListener('click', () => this.startTour());
    
    document.body.appendChild(button);
  },

  /**
   * Create the overlay element
   */
  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'tour-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1050;
      display: none;
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(this.overlay);
  },

  /**
   * Create the tooltip element
   */
  createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.id = 'tour-tooltip';
    this.tooltip.className = 'tour-tooltip';
    this.tooltip.style.cssText = `
      position: fixed;
      background: white;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      padding: 0;
      max-width: 400px;
      z-index: 1060;
      display: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    this.tooltip.innerHTML = `
      <div class="tour-tooltip-header" style="
        background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
        color: white;
        padding: 16px 20px;
        border-radius: 8px 8px 0 0;
        font-weight: 600;
        font-size: 16px;
      ">
        <div class="d-flex justify-content-between align-items-center">
          <span id="tour-title">Tour Step</span>
          <button id="tour-close" style="
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background-color 0.2s;
          " title="Close tour">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      <div class="tour-tooltip-body" style="
        padding: 20px;
        line-height: 1.6;
        color: #333;
      ">
        <div id="tour-content">Content goes here</div>
      </div>
      <div class="tour-tooltip-footer" style="
        padding: 16px 20px;
        border-top: 1px solid #eee;
        display: flex;
        justify-content: between;
        align-items: center;
        background: #f8f9fa;
        border-radius: 0 0 8px 8px;
      ">
        <div class="tour-progress" style="
          font-size: 12px;
          color: #666;
          font-weight: 500;
        ">
          <span id="tour-step-current">1</span> of <span id="tour-step-total">12</span>
        </div>
        <div class="tour-buttons" style="margin-left: auto;">
          <button id="tour-prev" class="btn btn-outline-secondary btn-sm me-2" style="display: none;">
            <i class="fas fa-arrow-left me-1"></i>Previous
          </button>
          <button id="tour-next" class="btn btn-primary btn-sm">
            Next<i class="fas fa-arrow-right ms-1"></i>
          </button>
          <button id="tour-finish" class="btn btn-success btn-sm" style="display: none;">
            <i class="fas fa-check me-1"></i>Finish Tour
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.tooltip);
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Close button
    document.getElementById('tour-close').addEventListener('click', () => this.endTour());
    
    // Navigation buttons
    document.getElementById('tour-prev').addEventListener('click', () => this.previousStep());
    document.getElementById('tour-next').addEventListener('click', () => this.nextStep());
    document.getElementById('tour-finish').addEventListener('click', () => this.endTour());
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!this.isActive) return;
      
      switch(e.key) {
        case 'Escape':
          this.endTour();
          break;
        case 'ArrowLeft':
          if (this.currentStep > 0) this.previousStep();
          break;
        case 'ArrowRight':
          if (this.currentStep < this.steps.length - 1) this.nextStep();
          break;
      }
    });
    
    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.endTour();
      }
    });
  },

  /**
   * Start the guided tour
   */
  startTour() {
    console.log('🎯 Starting guided tour...');
    this.isActive = true;
    this.currentStep = 0;
    this.overlay.style.display = 'block';
    this.tooltip.style.display = 'block';
    
    // Fade in overlay
    setTimeout(() => {
      this.overlay.style.opacity = '1';
    }, 10);
    
    this.showStep(0);
    
    // Track tour start
    console.log('📊 Guided tour started');
  },

  /**
   * End the guided tour
   */
  endTour() {
    console.log('🎯 Ending guided tour...');
    this.isActive = false;
    
    // Fade out
    this.overlay.style.opacity = '0';
    setTimeout(() => {
      this.overlay.style.display = 'none';
      this.tooltip.style.display = 'none';
      this.clearHighlight();
    }, 300);
    
    // Track tour completion
    const completed = this.currentStep >= this.steps.length - 1;
    console.log(`📊 Guided tour ended - Completed: ${completed}, Step: ${this.currentStep + 1}/${this.steps.length}`);
  },

  /**
   * Show a specific step
   */
  showStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= this.steps.length) return;
    
    this.currentStep = stepIndex;
    const step = this.steps[stepIndex];
    
    console.log(`🎯 Showing tour step ${stepIndex + 1}: ${step.title}`);
    
    // Execute step action if any
    if (step.action) {
      step.action();
    }
    
    // Update tooltip content
    document.getElementById('tour-title').textContent = step.title;
    document.getElementById('tour-content').innerHTML = step.content;
    document.getElementById('tour-step-current').textContent = stepIndex + 1;
    document.getElementById('tour-step-total').textContent = this.steps.length;
    
    // Update navigation buttons
    const prevBtn = document.getElementById('tour-prev');
    const nextBtn = document.getElementById('tour-next');
    const finishBtn = document.getElementById('tour-finish');
    
    prevBtn.style.display = step.showPrev ? 'inline-block' : 'none';
    
    if (stepIndex === this.steps.length - 1) {
      nextBtn.style.display = 'none';
      finishBtn.style.display = 'inline-block';
    } else {
      nextBtn.style.display = step.showNext ? 'inline-block' : 'none';
      finishBtn.style.display = 'none';
    }
    
    // Highlight target element and position tooltip
    this.highlightElement(step);
    this.positionTooltip(step);
  },

  /**
   * Go to next step
   */
  nextStep() {
    if (this.currentStep < this.steps.length - 1) {
      this.showStep(this.currentStep + 1);
    }
  },

  /**
   * Go to previous step
   */
  previousStep() {
    if (this.currentStep > 0) {
      this.showStep(this.currentStep - 1);
    }
  },

  /**
   * Highlight the target element
   */
  highlightElement(step) {
    this.clearHighlight();
    
    const target = document.querySelector(step.target);
    if (!target) {
      console.warn(`🎯 Tour target not found: ${step.target}`);
      return;
    }
    
    // Scroll element into view
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Create highlight
    const rect = target.getBoundingClientRect();
    const padding = step.highlightPadding || 8;
    
    const highlight = document.createElement('div');
    highlight.id = 'tour-highlight';
    highlight.style.cssText = `
      position: fixed;
      top: ${rect.top - padding}px;
      left: ${rect.left - padding}px;
      width: ${rect.width + (padding * 2)}px;
      height: ${rect.height + (padding * 2)}px;
      border: 3px solid #007bff;
      border-radius: 8px;
      background: rgba(0, 123, 255, 0.1);
      z-index: 1055;
      pointer-events: none;
      animation: tourPulse 2s infinite;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.3);
    `;
    
    document.body.appendChild(highlight);
    
    // Add pulse animation
    if (!document.getElementById('tour-styles')) {
      const style = document.createElement('style');
      style.id = 'tour-styles';
      style.textContent = `
        @keyframes tourPulse {
          0% { box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.3); }
          50% { box-shadow: 0 0 0 8px rgba(0, 123, 255, 0.1); }
          100% { box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.3); }
        }
        
        #tour-close:hover {
          background-color: rgba(255, 255, 255, 0.2) !important;
        }
        
        .tour-tooltip {
          animation: tourSlideIn 0.3s ease-out;
        }
        
        @keyframes tourSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
      document.head.appendChild(style);
    }
  },

  /**
   * Clear element highlight
   */
  clearHighlight() {
    const highlight = document.getElementById('tour-highlight');
    if (highlight) {
      highlight.remove();
    }
  },

  /**
   * Position the tooltip relative to the target
   */
  positionTooltip(step) {
    const target = document.querySelector(step.target);
    if (!target) return;
    
    const rect = target.getBoundingClientRect();
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let top, left;
    
    switch (step.position) {
      case 'top':
        top = rect.top - tooltipRect.height - 20;
        left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'bottom':
        top = rect.bottom + 20;
        left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'left':
        top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
        left = rect.left - tooltipRect.width - 20;
        break;
      case 'right':
        top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
        left = rect.right + 20;
        break;
      case 'center':
      default:
        top = (viewportHeight / 2) - (tooltipRect.height / 2);
        left = (viewportWidth / 2) - (tooltipRect.width / 2);
        break;
    }
    
    // Ensure tooltip stays within viewport
    if (left < 20) left = 20;
    if (left + tooltipRect.width > viewportWidth - 20) {
      left = viewportWidth - tooltipRect.width - 20;
    }
    if (top < 20) top = 20;
    if (top + tooltipRect.height > viewportHeight - 20) {
      top = viewportHeight - tooltipRect.height - 20;
    }
    
    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.left = `${left}px`;
  },

  /**
   * Switch to a specific tab (helper for tour steps)
   */
  switchToTab(tabId) {
    const tab = document.querySelector(`[data-bs-target="#${tabId}"]`);
    if (tab) {
      // Use Bootstrap's tab API
      const tabInstance = new bootstrap.Tab(tab);
      tabInstance.show();
    }
  },

  /**
   * Check if user has seen the tour before
   */
  hasSeenTour() {
    return localStorage.getItem('change-app-tour-completed') === 'true';
  },

  /**
   * Mark tour as completed
   */
  markTourCompleted() {
    localStorage.setItem('change-app-tour-completed', 'true');
    localStorage.setItem('change-app-tour-completed-date', new Date().toISOString());
  },

  /**
   * Show tour prompt for first-time users
   */
  showFirstTimePrompt() {
    if (this.hasSeenTour()) return;
    
    setTimeout(() => {
      const shouldShow = confirm(
        'Welcome to the Change Request Application!\n\n' +
        'Would you like to take a quick guided tour to learn how to use the application?\n\n' +
        'The tour takes about 2-3 minutes and will show you all the key features.'
      );
      
      if (shouldShow) {
        this.startTour();
      } else {
        this.markTourCompleted();
      }
    }, 2000); // Show after 2 seconds
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  GuidedTour.init();
  
  // Show first-time prompt after app initialization
  setTimeout(() => {
    GuidedTour.showFirstTimePrompt();
  }, 3000);
});

// Export for global access
window.GuidedTour = GuidedTour; 