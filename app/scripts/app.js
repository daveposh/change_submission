import React from 'react';
import { createRoot } from 'react-dom/client';
import ChangeRequestForm from './components/ChangeRequestForm';

// Initialize the ChangeSubmission module
import { ChangeSubmission } from './change-submission';
window.ChangeSubmission = ChangeSubmission;
ChangeSubmission.init();

// Create a React root and render the app
const container = document.getElementById('change-details');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <ChangeRequestForm />
  </React.StrictMode>
);
