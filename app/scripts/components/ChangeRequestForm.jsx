import React, { useState } from 'react';
import RichTextEditor from './RichTextEditor';

const ChangeRequestForm = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reasonForChange: '',
    implementationPlan: '',
    backoutPlan: '',
    validation: ''
  });

  const handleInputChange = (field) => (value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here we'll integrate with the existing ChangeSubmission module
    if (window.ChangeSubmission) {
      // Convert the form data to the format expected by the existing module
      const changeData = {
        title: formData.title,
        description: formData.description,
        reason_for_change: formData.reasonForChange,
        implementation_plan: formData.implementationPlan,
        backout_plan: formData.backoutPlan,
        validation: formData.validation
      };
      
      // Call the existing showSubmissionSummary method
      window.ChangeSubmission.showSubmissionSummary(changeData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="change-request-form">
      <div className="mb-4">
        <label htmlFor="title" className="form-label">Title of Change:</label>
        <input
          type="text"
          id="title"
          className="form-control"
          value={formData.title}
          onChange={(e) => handleInputChange('title')(e.target.value)}
          placeholder="Enter a descriptive title for this change request..."
          required
        />
      </div>

      <div className="mb-4">
        <label htmlFor="description" className="form-label">Description:</label>
        <RichTextEditor
          placeholder="Provide a detailed description of the change..."
          onChange={handleInputChange('description')}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="reasonForChange" className="form-label">Reason for Change:</label>
        <RichTextEditor
          placeholder="Explain why this change is necessary..."
          onChange={handleInputChange('reasonForChange')}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="implementationPlan" className="form-label">Implementation Plan:</label>
        <RichTextEditor
          placeholder="Provide step-by-step implementation details..."
          onChange={handleInputChange('implementationPlan')}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="backoutPlan" className="form-label">Backout Plan:</label>
        <RichTextEditor
          placeholder="Describe the steps to roll back this change if needed..."
          onChange={handleInputChange('backoutPlan')}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="validation" className="form-label">Validation Plan:</label>
        <RichTextEditor
          placeholder="Describe how you will validate the change was successful..."
          onChange={handleInputChange('validation')}
        />
      </div>

      <div className="mt-4">
        <button type="submit" className="btn btn-primary">
          Submit Change Request
        </button>
      </div>
    </form>
  );
};

export default ChangeRequestForm; 