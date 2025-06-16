/* eslint-disable no-unused-vars */
import { createRoot } from 'react-dom/client';
import ChangeRequestForm from './components/ChangeRequestForm';
/* eslint-enable no-unused-vars */

// Initialize the ChangeSubmission module
import { ChangeSubmission } from './change-submission.mjs';
window.ChangeSubmission = ChangeSubmission;
ChangeSubmission.init();

// Create a React root and render the app
const container = document.getElementById('change-details');
const root = createRoot(container);
root.render(<ChangeRequestForm />);
