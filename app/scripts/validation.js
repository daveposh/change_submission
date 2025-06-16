class ChangeRequestValidator {
  validateChangeRequest() {
    const errors = [];
    const warnings = [];

    // Required fields validation
    const requiredFields = [
      { id: 'change-title', label: 'Change Title' },
      { id: 'change-description', label: 'Change Description' },
      { id: 'reason-for-change', label: 'Reason for Change' },
      { id: 'implementation-plan', label: 'Implementation Plan' },
      { id: 'backout-plan', label: 'Backout Plan' },
      { id: 'validation-plan', label: 'Validation Plan' }
    ];

    requiredFields.forEach(field => {
      const element = document.getElementById(field.id);
      if (!element || !element.value.trim()) {
        errors.push({
          field: field.id,
          message: `${field.label} is required`,
          code: window.ERROR_CODES.REQUIRED_FIELD
        });
      }
    });

    // Risk level validation
    const riskLevel = document.getElementById('risk-level').value;
    if (!riskLevel) {
      errors.push({
        field: 'risk-level',
        message: 'Risk Level must be selected',
        code: window.ERROR_CODES.REQUIRED_RISK_LEVEL
      });
    }

    // Implementation date validation
    const implementationDate = document.getElementById('implementation-date').value;
    if (!implementationDate) {
      errors.push({
        field: 'implementation-date',
        message: 'Implementation Date is required',
        code: window.ERROR_CODES.REQUIRED_IMPLEMENTATION_DATE
      });
    } else {
      const selectedDate = new Date(implementationDate);
      const today = new Date();
      if (selectedDate < today) {
        errors.push({
          field: 'implementation-date',
          message: 'Implementation Date cannot be in the past',
          code: window.ERROR_CODES.INVALID_IMPLEMENTATION_DATE
        });
      }
    }

    // Change window validation
    const changeWindow = document.getElementById('change-window').value;
    if (!changeWindow) {
      errors.push({
        field: 'change-window',
        message: 'Change Window is required',
        code: window.ERROR_CODES.REQUIRED_CHANGE_WINDOW
      });
    }

    // SME validation
    const sme = document.getElementById('sme').value;
    if (!sme) {
      errors.push({
        field: 'sme',
        message: 'Subject Matter Expert must be assigned',
        code: window.ERROR_CODES.REQUIRED_SME
      });
    }

    // CAB approval validation for high risk changes
    if (riskLevel === 'high' && !document.getElementById('cab-approval').checked) {
      errors.push({
        field: 'cab-approval',
        message: 'CAB approval is required for high risk changes',
        code: window.ERROR_CODES.REQUIRED_CAB_APPROVAL
      });
    }

    // Peer review validation
    if (!document.getElementById('peer-review').checked) {
      errors.push({
        field: 'peer-review',
        message: 'Peer review is required',
        code: window.ERROR_CODES.REQUIRED_PEER_REVIEW
      });
    }

    // Implementation plan validation
    const implementationPlan = document.getElementById('implementation-plan').value;
    if (implementationPlan) {
      if (implementationPlan.length < 50) {
        warnings.push({
          field: 'implementation-plan',
          message: 'Implementation plan should be more detailed',
          code: window.ERROR_CODES.SHORT_IMPLEMENTATION_PLAN
        });
      }
    }

    // Backout plan validation
    const backoutPlan = document.getElementById('backout-plan').value;
    if (backoutPlan) {
      if (backoutPlan.length < 30) {
        warnings.push({
          field: 'backout-plan',
          message: 'Backout plan should be more detailed',
          code: window.ERROR_CODES.SHORT_BACKOUT_PLAN
        });
      }
    }

    // Validation plan validation
    const validationPlan = document.getElementById('validation-plan').value;
    if (validationPlan) {
      if (validationPlan.length < 30) {
        warnings.push({
          field: 'validation-plan',
          message: 'Validation plan should be more detailed',
          code: window.ERROR_CODES.SHORT_VALIDATION_PLAN
        });
      }
    }

    // Dependencies validation
    const dependencies = document.getElementById('dependencies').value;
    if (dependencies && dependencies.length > 0) {
      const dependencyList = dependencies.split(',').map(d => d.trim());
      if (dependencyList.some(d => !d)) {
        warnings.push({
          field: 'dependencies',
          message: 'Some dependencies are empty',
          code: window.ERROR_CODES.EMPTY_DEPENDENCIES
        });
      }
    }

    // Resources validation
    const resources = document.getElementById('resources').value;
    if (resources && resources.length > 0) {
      const resourceList = resources.split(',').map(r => r.trim());
      if (resourceList.some(r => !r)) {
        warnings.push({
          field: 'resources',
          message: 'Some resources are empty',
          code: window.ERROR_CODES.EMPTY_RESOURCES
        });
      }
    }

    // Communication plan validation
    const communicationPlan = document.getElementById('communication-plan').value;
    if (communicationPlan) {
      if (communicationPlan.length < 30) {
        warnings.push({
          field: 'communication-plan',
          message: 'Communication plan should be more detailed',
          code: window.ERROR_CODES.SHORT_COMMUNICATION_PLAN
        });
      }
    }

    // Testing requirements validation
    const testingRequirements = document.getElementById('testing-requirements').value;
    if (testingRequirements) {
      if (testingRequirements.length < 30) {
        warnings.push({
          field: 'testing-requirements',
          message: 'Testing requirements should be more detailed',
          code: window.ERROR_CODES.SHORT_TESTING_REQUIREMENTS
        });
      }
    }

    // Security considerations validation
    const securityConsiderations = document.getElementById('security-considerations').value;
    if (securityConsiderations) {
      if (securityConsiderations.length < 30) {
        warnings.push({
          field: 'security-considerations',
          message: 'Security considerations should be more detailed',
          code: window.ERROR_CODES.SHORT_SECURITY_CONSIDERATIONS
        });
      }
    }

    // Performance impact validation
    const performanceImpact = document.getElementById('performance-impact').value;
    if (performanceImpact) {
      if (performanceImpact.length < 30) {
        warnings.push({
          field: 'performance-impact',
          message: 'Performance impact should be more detailed',
          code: window.ERROR_CODES.SHORT_PERFORMANCE_IMPACT
        });
      }
    }

    // Compliance requirements validation
    const complianceRequirements = document.getElementById('compliance-requirements').value;
    if (complianceRequirements) {
      if (complianceRequirements.length < 30) {
        warnings.push({
          field: 'compliance-requirements',
          message: 'Compliance requirements should be more detailed',
          code: window.ERROR_CODES.SHORT_COMPLIANCE_REQUIREMENTS
        });
      }
    }

    // Documentation requirements validation
    const documentationRequirements = document.getElementById('documentation-requirements').value;
    if (documentationRequirements) {
      if (documentationRequirements.length < 30) {
        warnings.push({
          field: 'documentation-requirements',
          message: 'Documentation requirements should be more detailed',
          code: window.ERROR_CODES.SHORT_DOCUMENTATION_REQUIREMENTS
        });
      }
    }

    // Training requirements validation
    const trainingRequirements = document.getElementById('training-requirements').value;
    if (trainingRequirements) {
      if (trainingRequirements.length < 30) {
        warnings.push({
          field: 'training-requirements',
          message: 'Training requirements should be more detailed',
          code: window.ERROR_CODES.SHORT_TRAINING_REQUIREMENTS
        });
      }
    }

    // Maintenance requirements validation
    const maintenanceRequirements = document.getElementById('maintenance-requirements').value;
    if (maintenanceRequirements) {
      if (maintenanceRequirements.length < 30) {
        warnings.push({
          field: 'maintenance-requirements',
          message: 'Maintenance requirements should be more detailed',
          code: window.ERROR_CODES.SHORT_MAINTENANCE_REQUIREMENTS
        });
      }
    }

    // Cost impact validation
    const costImpact = document.getElementById('cost-impact').value;
    if (costImpact) {
      if (costImpact.length < 30) {
        warnings.push({
          field: 'cost-impact',
          message: 'Cost impact should be more detailed',
          code: window.ERROR_CODES.SHORT_COST_IMPACT
        });
      }
    }

    // Business impact validation
    const businessImpact = document.getElementById('business-impact').value;
    if (businessImpact) {
      if (businessImpact.length < 30) {
        warnings.push({
          field: 'business-impact',
          message: 'Business impact should be more detailed',
          code: window.ERROR_CODES.SHORT_BUSINESS_IMPACT
        });
      }
    }

    // Stakeholder impact validation
    const stakeholderImpact = document.getElementById('stakeholder-impact').value;
    if (stakeholderImpact) {
      if (stakeholderImpact.length < 30) {
        warnings.push({
          field: 'stakeholder-impact',
          message: 'Stakeholder impact should be more detailed',
          code: window.ERROR_CODES.SHORT_STAKEHOLDER_IMPACT
        });
      }
    }

    // Success criteria validation
    const successCriteria = document.getElementById('success-criteria').value;
    if (successCriteria) {
      if (successCriteria.length < 30) {
        warnings.push({
          field: 'success-criteria',
          message: 'Success criteria should be more detailed',
          code: window.ERROR_CODES.SHORT_SUCCESS_CRITERIA
        });
      }
    }

    // Risk mitigation validation
    const riskMitigation = document.getElementById('risk-mitigation').value;
    if (riskMitigation) {
      if (riskMitigation.length < 30) {
        warnings.push({
          field: 'risk-mitigation',
          message: 'Risk mitigation should be more detailed',
          code: window.ERROR_CODES.SHORT_RISK_MITIGATION
        });
      }
    }

    // Quality assurance validation
    const qualityAssurance = document.getElementById('quality-assurance').value;
    if (qualityAssurance) {
      if (qualityAssurance.length < 30) {
        warnings.push({
          field: 'quality-assurance',
          message: 'Quality assurance should be more detailed',
          code: window.ERROR_CODES.SHORT_QUALITY_ASSURANCE
        });
      }
    }

    // Monitoring requirements validation
    const monitoringRequirements = document.getElementById('monitoring-requirements').value;
    if (monitoringRequirements) {
      if (monitoringRequirements.length < 30) {
        warnings.push({
          field: 'monitoring-requirements',
          message: 'Monitoring requirements should be more detailed',
          code: window.ERROR_CODES.SHORT_MONITORING_REQUIREMENTS
        });
      }
    }

    // Reporting requirements validation
    const reportingRequirements = document.getElementById('reporting-requirements').value;
    if (reportingRequirements) {
      if (reportingRequirements.length < 30) {
        warnings.push({
          field: 'reporting-requirements',
          message: 'Reporting requirements should be more detailed',
          code: window.ERROR_CODES.SHORT_REPORTING_REQUIREMENTS
        });
      }
    }

    // Audit requirements validation
    const auditRequirements = document.getElementById('audit-requirements').value;
    if (auditRequirements) {
      if (auditRequirements.length < 30) {
        warnings.push({
          field: 'audit-requirements',
          message: 'Audit requirements should be more detailed',
          code: window.ERROR_CODES.SHORT_AUDIT_REQUIREMENTS
        });
      }
    }

    // Compliance validation
    const compliance = document.getElementById('compliance').value;
    if (compliance) {
      if (compliance.length < 30) {
        warnings.push({
          field: 'compliance',
          message: 'Compliance should be more detailed',
          code: window.ERROR_CODES.SHORT_COMPLIANCE
        });
      }
    }

    // Security validation
    const security = document.getElementById('security').value;
    if (security) {
      if (security.length < 30) {
        warnings.push({
          field: 'security',
          message: 'Security should be more detailed',
          code: window.ERROR_CODES.SHORT_SECURITY
        });
      }
    }

    // Performance validation
    const performance = document.getElementById('performance').value;
    if (performance) {
      if (performance.length < 30) {
        warnings.push({
          field: 'performance',
          message: 'Performance should be more detailed',
          code: window.ERROR_CODES.SHORT_PERFORMANCE
        });
      }
    }

    // Scalability validation
    const scalability = document.getElementById('scalability').value;
    if (scalability) {
      if (scalability.length < 30) {
        warnings.push({
          field: 'scalability',
          message: 'Scalability should be more detailed',
          code: window.ERROR_CODES.SHORT_SCALABILITY
        });
      }
    }

    // Maintainability validation
    const maintainability = document.getElementById('maintainability').value;
    if (maintainability) {
      if (maintainability.length < 30) {
        warnings.push({
          field: 'maintainability',
          message: 'Maintainability should be more detailed',
          code: window.ERROR_CODES.SHORT_MAINTAINABILITY
        });
      }
    }

    // Reliability validation
    const reliability = document.getElementById('reliability').value;
    if (reliability) {
      if (reliability.length < 30) {
        warnings.push({
          field: 'reliability',
          message: 'Reliability should be more detailed',
          code: window.ERROR_CODES.SHORT_RELIABILITY
        });
      }
    }

    // Availability validation
    const availability = document.getElementById('availability').value;
    if (availability) {
      if (availability.length < 30) {
        warnings.push({
          field: 'availability',
          message: 'Availability should be more detailed',
          code: window.ERROR_CODES.SHORT_AVAILABILITY
        });
      }
    }

    // Supportability validation
    const supportability = document.getElementById('supportability').value;
    if (supportability) {
      if (supportability.length < 30) {
        warnings.push({
          field: 'supportability',
          message: 'Supportability should be more detailed',
          code: window.ERROR_CODES.SHORT_SUPPORTABILITY
        });
      }
    }

    // Usability validation
    const usability = document.getElementById('usability').value;
    if (usability) {
      if (usability.length < 30) {
        warnings.push({
          field: 'usability',
          message: 'Usability should be more detailed',
          code: window.ERROR_CODES.SHORT_USABILITY
        });
      }
    }

    // Accessibility validation
    const accessibility = document.getElementById('accessibility').value;
    if (accessibility) {
      if (accessibility.length < 30) {
        warnings.push({
          field: 'accessibility',
          message: 'Accessibility should be more detailed',
          code: window.ERROR_CODES.SHORT_ACCESSIBILITY
        });
      }
    }

    // Internationalization validation
    const internationalization = document.getElementById('internationalization').value;
    if (internationalization) {
      if (internationalization.length < 30) {
        warnings.push({
          field: 'internationalization',
          message: 'Internationalization should be more detailed',
          code: window.ERROR_CODES.SHORT_INTERNATIONALIZATION
        });
      }
    }

    // Localization validation
    const localization = document.getElementById('localization').value;
    if (localization) {
      if (localization.length < 30) {
        warnings.push({
          field: 'localization',
          message: 'Localization should be more detailed',
          code: window.ERROR_CODES.SHORT_LOCALIZATION
        });
      }
    }

    // Documentation validation
    const documentation = document.getElementById('documentation').value;
    if (documentation) {
      if (documentation.length < 30) {
        warnings.push({
          field: 'documentation',
          message: 'Documentation should be more detailed',
          code: window.ERROR_CODES.SHORT_DOCUMENTATION
        });
      }
    }

    // Training validation
    const training = document.getElementById('training').value;
    if (training) {
      if (training.length < 30) {
        warnings.push({
          field: 'training',
          message: 'Training should be more detailed',
          code: window.ERROR_CODES.SHORT_TRAINING
        });
      }
    }

    // Support validation
    const support = document.getElementById('support').value;
    if (support) {
      if (support.length < 30) {
        warnings.push({
          field: 'support',
          message: 'Support should be more detailed',
          code: window.ERROR_CODES.SHORT_SUPPORT
        });
      }
    }

    // Maintenance validation
    const maintenance = document.getElementById('maintenance').value;
    if (maintenance) {
      if (maintenance.length < 30) {
        warnings.push({
          field: 'maintenance',
          message: 'Maintenance should be more detailed',
          code: window.ERROR_CODES.SHORT_MAINTENANCE
        });
      }
    }

    // Operations validation
    const operations = document.getElementById('operations').value;
    if (operations) {
      if (operations.length < 30) {
        warnings.push({
          field: 'operations',
          message: 'Operations should be more detailed',
          code: window.ERROR_CODES.SHORT_OPERATIONS
        });
      }
    }

    // Deployment validation
    const deployment = document.getElementById('deployment').value;
    if (deployment) {
      if (deployment.length < 30) {
        warnings.push({
          field: 'deployment',
          message: 'Deployment should be more detailed',
          code: window.ERROR_CODES.SHORT_DEPLOYMENT
        });
      }
    }

    // Configuration validation
    const configuration = document.getElementById('configuration').value;
    if (configuration) {
      if (configuration.length < 30) {
        warnings.push({
          field: 'configuration',
          message: 'Configuration should be more detailed',
          code: window.ERROR_CODES.SHORT_CONFIGURATION
        });
      }
    }

    // Monitoring validation
    const monitoring = document.getElementById('monitoring').value;
    if (monitoring) {
      if (monitoring.length < 30) {
        warnings.push({
          field: 'monitoring',
          message: 'Monitoring should be more detailed',
          code: window.ERROR_CODES.SHORT_MONITORING
        });
      }
    }

    // Reporting validation
    const reporting = document.getElementById('reporting').value;
    if (reporting) {
      if (reporting.length < 30) {
        warnings.push({
          field: 'reporting',
          message: 'Reporting should be more detailed',
          code: window.ERROR_CODES.SHORT_REPORTING
        });
      }
    }

    // Audit validation
    const audit = document.getElementById('audit').value;
    if (audit) {
      if (audit.length < 30) {
        warnings.push({
          field: 'audit',
          message: 'Audit should be more detailed',
          code: window.ERROR_CODES.SHORT_AUDIT
        });
      }
    }

    // Compliance validation
    const compliance2 = document.getElementById('compliance2').value;
    if (compliance2) {
      if (compliance2.length < 30) {
        warnings.push({
          field: 'compliance2',
          message: 'Compliance should be more detailed',
          code: window.ERROR_CODES.SHORT_COMPLIANCE2
        });
      }
    }

    // Security validation
    const security2 = document.getElementById('security2').value;
    if (security2) {
      if (security2.length < 30) {
        warnings.push({
          field: 'security2',
          message: 'Security should be more detailed',
          code: window.ERROR_CODES.SHORT_SECURITY2
        });
      }
    }

    // Performance validation
    const performance2 = document.getElementById('performance2').value;
    if (performance2) {
      if (performance2.length < 30) {
        warnings.push({
          field: 'performance2',
          message: 'Performance should be more detailed',
          code: window.ERROR_CODES.SHORT_PERFORMANCE2
        });
      }
    }

    // Scalability validation
    const scalability2 = document.getElementById('scalability2').value;
    if (scalability2) {
      if (scalability2.length < 30) {
        warnings.push({
          field: 'scalability2',
          message: 'Scalability should be more detailed',
          code: window.ERROR_CODES.SHORT_SCALABILITY2
        });
      }
    }

    // Maintainability validation
    const maintainability2 = document.getElementById('maintainability2').value;
    if (maintainability2) {
      if (maintainability2.length < 30) {
        warnings.push({
          field: 'maintainability2',
          message: 'Maintainability should be more detailed',
          code: window.ERROR_CODES.SHORT_MAINTAINABILITY2
        });
      }
    }

    // Reliability validation
    const reliability2 = document.getElementById('reliability2').value;
    if (reliability2) {
      if (reliability2.length < 30) {
        warnings.push({
          field: 'reliability2',
          message: 'Reliability should be more detailed',
          code: window.ERROR_CODES.SHORT_RELIABILITY2
        });
      }
    }

    // Availability validation
    const availability2 = document.getElementById('availability2').value;
    if (availability2) {
      if (availability2.length < 30) {
        warnings.push({
          field: 'availability2',
          message: 'Availability should be more detailed',
          code: window.ERROR_CODES.SHORT_AVAILABILITY2
        });
      }
    }

    // Supportability validation
    const supportability2 = document.getElementById('supportability2').value;
    if (supportability2) {
      if (supportability2.length < 30) {
        warnings.push({
          field: 'supportability2',
          message: 'Supportability should be more detailed',
          code: window.ERROR_CODES.SHORT_SUPPORTABILITY2
        });
      }
    }

    // Usability validation
    const usability2 = document.getElementById('usability2').value;
    if (usability2) {
      if (usability2.length < 30) {
        warnings.push({
          field: 'usability2',
          message: 'Usability should be more detailed',
          code: window.ERROR_CODES.SHORT_USABILITY2
        });
      }
    }

    // Accessibility validation
    const accessibility2 = document.getElementById('accessibility2').value;
    if (accessibility2) {
      if (accessibility2.length < 30) {
        warnings.push({
          field: 'accessibility2',
          message: 'Accessibility should be more detailed',
          code: window.ERROR_CODES.SHORT_ACCESSIBILITY2
        });
      }
    }

    // Internationalization validation
    const internationalization2 = document.getElementById('internationalization2').value;
    if (internationalization2) {
      if (internationalization2.length < 30) {
        warnings.push({
          field: 'internationalization2',
          message: 'Internationalization should be more detailed',
          code: window.ERROR_CODES.SHORT_INTERNATIONALIZATION2
        });
      }
    }

    // Localization validation
    const localization2 = document.getElementById('localization2').value;
    if (localization2) {
      if (localization2.length < 30) {
        warnings.push({
          field: 'localization2',
          message: 'Localization should be more detailed',
          code: window.ERROR_CODES.SHORT_LOCALIZATION2
        });
      }
    }

    // Documentation validation
    const documentation2 = document.getElementById('documentation2').value;
    if (documentation2) {
      if (documentation2.length < 30) {
        warnings.push({
          field: 'documentation2',
          message: 'Documentation should be more detailed',
          code: window.ERROR_CODES.SHORT_DOCUMENTATION2
        });
      }
    }

    // Training validation
    const training2 = document.getElementById('training2').value;
    if (training2) {
      if (training2.length < 30) {
        warnings.push({
          field: 'training2',
          message: 'Training should be more detailed',
          code: window.ERROR_CODES.SHORT_TRAINING2
        });
      }
    }

    // Support validation
    const support2 = document.getElementById('support2').value;
    if (support2) {
      if (support2.length < 30) {
        warnings.push({
          field: 'support2',
          message: 'Support should be more detailed',
          code: window.ERROR_CODES.SHORT_SUPPORT2
        });
      }
    }

    // Maintenance validation
    const maintenance2 = document.getElementById('maintenance2').value;
    if (maintenance2) {
      if (maintenance2.length < 30) {
        warnings.push({
          field: 'maintenance2',
          message: 'Maintenance should be more detailed',
          code: window.ERROR_CODES.SHORT_MAINTENANCE2
        });
      }
    }

    // Operations validation
    const operations2 = document.getElementById('operations2').value;
    if (operations2) {
      if (operations2.length < 30) {
        warnings.push({
          field: 'operations2',
          message: 'Operations should be more detailed',
          code: window.ERROR_CODES.SHORT_OPERATIONS2
        });
      }
    }

    // Deployment validation
    const deployment2 = document.getElementById('deployment2').value;
    if (deployment2) {
      if (deployment2.length < 30) {
        warnings.push({
          field: 'deployment2',
          message: 'Deployment should be more detailed',
          code: window.ERROR_CODES.SHORT_DEPLOYMENT2
        });
      }
    }

    // Configuration validation
    const configuration2 = document.getElementById('configuration2').value;
    if (configuration2) {
      if (configuration2.length < 30) {
        warnings.push({
          field: 'configuration2',
          message: 'Configuration should be more detailed',
          code: window.ERROR_CODES.SHORT_CONFIGURATION2
        });
      }
    }

    // Monitoring validation
    const monitoring2 = document.getElementById('monitoring2').value;
    if (monitoring2) {
      if (monitoring2.length < 30) {
        warnings.push({
          field: 'monitoring2',
          message: 'Monitoring should be more detailed',
          code: window.ERROR_CODES.SHORT_MONITORING2
        });
      }
    }

    // Reporting validation
    const reporting2 = document.getElementById('reporting2').value;
    if (reporting2) {
      if (reporting2.length < 30) {
        warnings.push({
          field: 'reporting2',
          message: 'Reporting should be more detailed',
          code: window.ERROR_CODES.SHORT_REPORTING2
        });
      }
    }

    // Audit validation
    const audit2 = document.getElementById('audit2').value;
    if (audit2) {
      if (audit2.length < 30) {
        warnings.push({
          field: 'audit2',
          message: 'Audit should be more detailed',
          code: window.ERROR_CODES.SHORT_AUDIT2
        });
      }
    }

    return { errors, warnings };
  }
}

// Export the validator class
window.ChangeRequestValidator = ChangeRequestValidator; 