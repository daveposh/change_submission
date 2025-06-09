// Cache buster for change submission script
// Version: 2.3.1 - Stakeholder Notifications via Change Notes
// Force refresh timestamp: <?= new Date().getTime() ?>

console.log('🔄 Cache buster loaded - forcing fresh script execution');
console.log('📋 Change Submission Version: 2.4.2 - Preserve Manual Approvers/Stakeholders');

// Clear any cached stakeholder notification functions
if (window.ChangeSubmission) {
  console.log('🗑️ Clearing cached ChangeSubmission object...');
  delete window.ChangeSubmission;
}

// Force reload of change submission if already loaded
if (document.readyState === 'complete') {
  console.log('🔄 Page already loaded - cache buster applied');
} else {
  console.log('⏳ Page still loading - cache buster will apply on completion');
} 