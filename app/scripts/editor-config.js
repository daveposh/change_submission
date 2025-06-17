// Editor.js configuration
const editorConfig = {
  // Common configuration for all editors
  commonConfig: {
    placeholder: 'Start typing...',
    autofocus: false,
    readOnly: false,
    minHeight: 200,
    onReady: function() {
      console.log('✅ Editor.js ready');
    },
    logLevel: 'WARN', // Reduce log verbosity
    // Disable features that cause SecurityError in iframe
    sanitizer: {
      b: true,
      i: true,
      u: true,
      s: true,
      p: true,
      br: true,
      div: true,
      span: true,
      strong: true,
      em: true,
      h1: true,
      h2: true,
      h3: true,
      h4: true,
      h5: true,
      h6: true,
      ul: true,
      ol: true,
      li: true,
      blockquote: true,
      code: true,
      pre: true
    },
    tools: {
      header: {
        class: window.Header,
        inlineToolbar: true,
        config: {
          levels: [1, 2, 3],
          defaultLevel: 2
        }
      },
      list: {
        class: window.List,
        inlineToolbar: true,
        config: {
          defaultStyle: 'unordered'
        }
      }
    }
  },

  // Initialize editors for specific fields
  initializeEditors: function() {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔧 Initializing Editor.js instances...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => {
            this._initializeEditors().then(resolve).catch(reject);
          });
          return;
        }
        
        // Wait for Editor.js to be loaded
        if (typeof window.EditorJS !== 'function') {
          console.warn('⚠️ Editor.js not loaded yet, waiting...');
          const checkInterval = setInterval(() => {
            if (typeof window.EditorJS === 'function') {
              clearInterval(checkInterval);
              this._initializeEditors().then(resolve).catch(reject);
            }
          }, 100);

          // Timeout after 5 seconds
          setTimeout(() => {
            clearInterval(checkInterval);
            reject(new Error('Editor.js failed to load after timeout'));
          }, 5000);
          return;
        }

        this._initializeEditors().then(resolve).catch(reject);
      } catch (error) {
        console.error('❌ Error initializing editors:', error);
        reject(error);
      }
    });
  },

  // Internal method to initialize editors
  _initializeEditors: function() {
    return new Promise((resolve, reject) => {
      try {
        // Check if required tools are loaded
        if (!window.Header || !window.List) {
          reject(new Error('Required Editor.js tools not loaded'));
          return;
        }
        
        // Check if required elements exist and are visible
        const holders = [
          'reason-for-change-editor',
          'implementation-plan-editor',
          'backout-plan-editor',
          'validation-plan-editor'
        ];
        
        const missingHolders = holders.filter(id => {
          const element = document.getElementById(id);
          return !element || element.offsetParent === null;
        });
        
        if (missingHolders.length > 0) {
          console.warn('⚠️ Some editor containers not visible yet:', missingHolders);
          // Try again after a short delay
          setTimeout(() => {
            this._initializeEditors().then(resolve).catch(reject);
          }, 500);
          return;
        }

        // Clear any existing editor content first
        holders.forEach(id => {
          const holder = document.getElementById(id);
          if (holder) {
            holder.innerHTML = '';
            holder.style.position = 'relative';
            holder.style.width = '100%';
          }
        });

        // Initialize each editor with proper container styling
        const editors = {};
        let initCount = 0;
        const totalEditors = 4;
        
        const checkComplete = () => {
          initCount++;
          if (initCount === totalEditors) {
            // Store editor instances globally
            window.editors = editors;
            console.log('✅ Editor.js instances initialized successfully');
            resolve(editors);
          }
        };
        
        // Create a simplified config that avoids SecurityError
        const safeConfig = {
          ...this.commonConfig,
          // Remove features that might cause SecurityError
          onChange: undefined,
          onReady: () => {
            console.log('✅ Editor ready');
            checkComplete();
          }
        };
        
        try {
          editors.reason = new window.EditorJS({
            holder: 'reason-for-change-editor',
            ...safeConfig,
            placeholder: 'Describe the reason for this change...'
          });
          console.log('✅ Reason editor initialized');
        } catch (error) {
          console.error('❌ Failed to initialize reason editor:', error);
          checkComplete();
        }

        try {
          editors.implementation = new window.EditorJS({
            holder: 'implementation-plan-editor',
            ...safeConfig,
            placeholder: 'Describe the implementation steps...'
          });
          console.log('✅ Implementation editor initialized');
        } catch (error) {
          console.error('❌ Failed to initialize implementation editor:', error);
          checkComplete();
        }

        try {
          editors.backout = new window.EditorJS({
            holder: 'backout-plan-editor',
            ...safeConfig,
            placeholder: 'Describe the backout procedure...'
          });
          console.log('✅ Backout editor initialized');
        } catch (error) {
          console.error('❌ Failed to initialize backout editor:', error);
          checkComplete();
        }

        try {
          editors.validation = new window.EditorJS({
            holder: 'validation-plan-editor',
            ...safeConfig,
            placeholder: 'Describe how the change will be validated...'
          });
          console.log('✅ Validation editor initialized');
        } catch (error) {
          console.error('❌ Failed to initialize validation editor:', error);
          checkComplete();
        }

      } catch (error) {
        console.error('❌ Error initializing editors:', error);
        reject(error);
      }
    });
  },

  // Save editor content
  saveEditorContent: async function() {
    const editors = window.editors;
    if (!editors) {
      console.error('❌ No editor instances found');
      return null;
    }

    try {
      console.log('💾 Saving editor content...');
      const content = {};
      
      if (editors.reason) {
        content.reasonForChange = await editors.reason.save();
      }
      if (editors.implementation) {
        content.implementationPlan = await editors.implementation.save();
      }
      if (editors.backout) {
        content.backoutPlan = await editors.backout.save();
      }
      if (editors.validation) {
        content.validationPlan = await editors.validation.save();
      }

      console.log('✅ Editor content saved successfully');
      return content;
    } catch (error) {
      console.error('❌ Error saving editor content:', error);
      throw error;
    }
  },

  // Load editor content
  loadEditorContent: async function(data) {
    const editors = window.editors;
    if (!editors || !data) {
      console.error('❌ No editor instances or data found');
      return;
    }

    try {
      console.log('📥 Loading editor content...');
      if (data.reasonForChange && editors.reason) {
        await editors.reason.render(data.reasonForChange);
      }
      if (data.implementationPlan && editors.implementation) {
        await editors.implementation.render(data.implementationPlan);
      }
      if (data.backoutPlan && editors.backout) {
        await editors.backout.render(data.backoutPlan);
      }
      if (data.validationPlan && editors.validation) {
        await editors.validation.render(data.validationPlan);
      }
      console.log('✅ Editor content loaded successfully');
    } catch (error) {
      console.error('❌ Error loading editor content:', error);
      throw error;
    }
  }
};

// Export the configuration
window.editorConfig = editorConfig;
console.log('✅ Editor configuration loaded'); 