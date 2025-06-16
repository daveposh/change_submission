import ERROR_CODES from './error-codes.js';

/**
 * Validates a change request form
 */
class ChangeRequestValidator {
  constructor() {
    this.requiredFields = [
      { id: 'change-title', label: 'Change Title' },
      { id: 'change-description', label: 'Change Description' },
      { id: 'reason-for-change', label: 'Reason for Change' },
      { id: 'implementation-plan', label: 'Implementation Plan' },
      { id: 'backout-plan', label: 'Backout Plan' },
      { id: 'validation-plan', label: 'Validation Plan' }
    ];
  }

  /**
   * Validates all required fields
   * @returns {Array} Array of validation errors
   */
  validateRequiredFields() {
    const errors = [];
    
    this.requiredFields.forEach(field => {
      const element = document.getElementById(field.id);
      if (!element || !element.value.trim()) {
        errors.push({
          field: field.id,
          message: `${field.label} is required`,
          code: ERROR_CODES.REQUIRED.FIELD
        });
      }
    });

    return errors;
  }

  /**
   * Validates risk level and related fields
   * @returns {Array} Array of validation errors
   */
  validateRiskLevel() {
    const errors = [];
    const riskLevel = document.getElementById('risk-level').value;

    if (!riskLevel) {
      errors.push({
        field: 'risk-level',
        message: 'Risk Level must be selected',
        code: ERROR_CODES.REQUIRED.RISK_LEVEL
      });
    }

    // CAB approval required for high risk changes
    if (riskLevel === 'high' && !document.getElementById('cab-approval').checked) {
      errors.push({
        field: 'cab-approval',
        message: 'CAB approval is required for high risk changes',
        code: ERROR_CODES.REQUIRED.CAB_APPROVAL
      });
    }

    return errors;
  }

  /**
   * Validates implementation date
   * @returns {Array} Array of validation errors
   */
  validateImplementationDate() {
    const errors = [];
    const implementationDate = document.getElementById('implementation-date').value;

    if (!implementationDate) {
      errors.push({
        field: 'implementation-date',
        message: 'Implementation Date is required',
        code: ERROR_CODES.REQUIRED.IMPLEMENTATION_DATE
      });
    } else {
      const selectedDate = new Date(implementationDate);
      const today = new Date();
      if (selectedDate < today) {
        errors.push({
          field: 'implementation-date',
          message: 'Implementation Date cannot be in the past',
          code: ERROR_CODES.INVALID.IMPLEMENTATION_DATE
        });
      }
    }

    return errors;
  }

  /**
   * Validates change window
   * @returns {Array} Array of validation errors
   */
  validateChangeWindow() {
    const errors = [];
    const changeWindow = document.getElementById('change-window').value;

    if (!changeWindow) {
      errors.push({
        field: 'change-window',
        message: 'Change Window is required',
        code: ERROR_CODES.REQUIRED.CHANGE_WINDOW
      });
    }

    return errors;
  }

  /**
   * Validates SME assignment
   * @returns {Array} Array of validation errors
   */
  validateSME() {
    const errors = [];
    const sme = document.getElementById('sme').value;

    if (!sme) {
      errors.push({
        field: 'sme',
        message: 'Subject Matter Expert must be assigned',
        code: ERROR_CODES.REQUIRED.SME
      });
    }

    return errors;
  }

  /**
   * Validates peer review requirement
   * @returns {Array} Array of validation errors
   */
  validatePeerReview() {
    const errors = [];

    if (!document.getElementById('peer-review').checked) {
      errors.push({
        field: 'peer-review',
        message: 'Peer review is required',
        code: ERROR_CODES.REQUIRED.PEER_REVIEW
      });
    }

    return errors;
  }

  /**
   * Validates content length for various fields
   * @returns {Array} Array of validation warnings
   */
  validateContentLength() {
    const warnings = [];
    const minLengths = {
      'implementation-plan': { length: 50, code: ERROR_CODES.SHORT.IMPLEMENTATION_PLAN },
      'backout-plan': { length: 30, code: ERROR_CODES.SHORT.BACKOUT_PLAN },
      'validation-plan': { length: 30, code: ERROR_CODES.SHORT.VALIDATION_PLAN },
      'communication-plan': { length: 30, code: ERROR_CODES.SHORT.COMMUNICATION_PLAN },
      'testing-requirements': { length: 30, code: ERROR_CODES.SHORT.TESTING_REQUIREMENTS },
      'security-considerations': { length: 30, code: ERROR_CODES.SHORT.SECURITY_CONSIDERATIONS },
      'performance-impact': { length: 30, code: ERROR_CODES.SHORT.PERFORMANCE_IMPACT },
      'compliance-requirements': { length: 30, code: ERROR_CODES.SHORT.COMPLIANCE_REQUIREMENTS },
      'documentation-requirements': { length: 30, code: ERROR_CODES.SHORT.DOCUMENTATION_REQUIREMENTS },
      'training-requirements': { length: 30, code: ERROR_CODES.SHORT.TRAINING_REQUIREMENTS },
      'maintenance-requirements': { length: 30, code: ERROR_CODES.SHORT.MAINTENANCE_REQUIREMENTS }
    };

    Object.entries(minLengths).forEach(([fieldId, { length, code }]) => {
      const element = document.getElementById(fieldId);
      if (element && element.value && element.value.length < length) {
        warnings.push({
          field: fieldId,
          message: `${element.getAttribute('data-label') || fieldId} should be more detailed`,
          code
        });
      }
    });

    return warnings;
  }

  /**
   * Validates dependencies and resources
   * @returns {Array} Array of validation warnings
   */
  validateLists() {
    const warnings = [];
    const lists = {
      'dependencies': ERROR_CODES.EMPTY.DEPENDENCIES,
      'resources': ERROR_CODES.EMPTY.RESOURCES
    };

    Object.entries(lists).forEach(([fieldId, code]) => {
      const element = document.getElementById(fieldId);
      if (element && element.value) {
        const items = element.value.split(',').map(item => item.trim());
        if (items.some(item => !item)) {
          warnings.push({
            field: fieldId,
            message: `Some ${fieldId} are empty`,
            code
          });
        }
      }
    });

    return warnings;
  }

  /**
   * Main validation method
   * @returns {Object} Object containing errors and warnings
   */
  validateChangeRequest() {
    const errors = [
      ...this.validateRequiredFields(),
      ...this.validateRiskLevel(),
      ...this.validateImplementationDate(),
      ...this.validateChangeWindow(),
      ...this.validateSME(),
      ...this.validatePeerReview()
    ];

    const warnings = [
      ...this.validateContentLength(),
      ...this.validateLists()
    ];

    return { errors, warnings };
  }
}

// Export the validator class
export default ChangeRequestValidator; 