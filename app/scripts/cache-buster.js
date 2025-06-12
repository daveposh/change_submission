// Cache buster for change submission script
// Version: 2.3.1 - Stakeholder Notifications via Change Notes
// Force refresh timestamp: <?= new Date().getTime() ?>

console.log('🔄 Cache buster loaded - forcing fresh script execution');
console.log('📋 Change Submission Version: 2.8.0 - Interactive Tutorial & Enhanced Dark Mode');

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

// Cache buster for change submission app
// This forces browsers to reload cached JavaScript files when the version changes
window.CACHE_VERSION = '2.6.0'; 