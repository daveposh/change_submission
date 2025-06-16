import ChangeRequestValidator from './validation.js';

class ChangeRequest {
  constructor() {
    this.validator = new ChangeRequestValidator();
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    const form = document.getElementById('change-request-form');
    if (form) {
      form.addEventListener('submit', this.handleSubmit.bind(this));
    }
  }

  handleSubmit(event) {
    event.preventDefault();
    const { errors, warnings } = this.validator.validateChangeRequest();
    
    if (errors.length > 0) {
      this.displayErrors(errors);
      return;
    }

    if (warnings.length > 0) {
      this.displayWarnings(warnings);
    }

    // Proceed with form submission
    this.submitForm();
  }

  displayErrors(errors) {
    const errorContainer = document.getElementById('error-container');
    if (!errorContainer) return;

    errorContainer.innerHTML = errors.map(error => `
      <div class="error-message" data-field="${error.field}">
        ${error.message}
      </div>
    `).join('');
  }

  displayWarnings(warnings) {
    const warningContainer = document.getElementById('warning-container');
    if (!warningContainer) return;

    warningContainer.innerHTML = warnings.map(warning => `
      <div class="warning-message" data-field="${warning.field}">
        ${warning.message}
      </div>
    `).join('');
  }

  submitForm() {
    const form = document.getElementById('change-request-form');
    if (!form) return;

    // Add loading state
    form.classList.add('submitting');

    // Submit the form
    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: {
        'Accept': 'application/json'
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        this.handleSuccess(data);
      } else {
        this.handleError(data);
      }
    })
    .catch(error => {
      this.handleError({ message: 'An error occurred while submitting the form.' });
    })
    .finally(() => {
      form.classList.remove('submitting');
    });
  }

  handleSuccess(data) {
    // Clear any existing messages
    this.clearMessages();

    // Show success message
    const successContainer = document.getElementById('success-container');
    if (successContainer) {
      successContainer.innerHTML = `
        <div class="success-message">
          ${data.message || 'Change request submitted successfully.'}
        </div>
      `;
    }

    // Reset form
    const form = document.getElementById('change-request-form');
    if (form) {
      form.reset();
    }
  }

  handleError(data) {
    // Clear any existing messages
    this.clearMessages();

    // Show error message
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
      errorContainer.innerHTML = `
        <div class="error-message">
          ${data.message || 'An error occurred while submitting the form.'}
        </div>
      `;
    }
  }

  clearMessages() {
    const containers = [
      'error-container',
      'warning-container',
      'success-container'
    ];

    containers.forEach(id => {
      const container = document.getElementById(id);
      if (container) {
        container.innerHTML = '';
      }
    });
  }
}

// Initialize the change request handler
const changeRequest = new ChangeRequest(); 