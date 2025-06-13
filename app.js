// Initialize the app
client.events.on('app.activated', async function() {
  try {
    // Get app settings
    const settings = await client.db.get('app_settings');
    
    // Update header with company name and logo
    const headerTitle = document.getElementById('header-title');
    if (settings && settings.company_name) {
      headerTitle.textContent = settings.company_name;
    }
    
    // Update header logo if available
    const headerLogo = document.getElementById('header-logo');
    if (settings && settings.company_logo) {
      headerLogo.src = settings.company_logo;
      headerLogo.style.display = 'block';
    } else {
      headerLogo.style.display = 'none';
    }
    
    // Initialize the app
    await initializeApp();
    
  } catch (error) {
    console.error('Error initializing app:', error);
    showError('Failed to initialize app: ' + error.message);
  }
});

// ... rest of existing code ... 