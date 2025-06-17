// Editor.js configuration
const editorConfig = {
  // Common configuration for all editors
  commonConfig: {
    placeholder: 'Start typing...',
    autofocus: false,
    readOnly: false,
    minHeight: 200,
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
        class: window.List || window.EditorJsList,
        inlineToolbar: true,
        config: {
          defaultStyle: 'unordered'
        }
      },
      checklist: {
        class: window.Checklist,
        inlineToolbar: true
      },
      quote: {
        class: window.Quote,
        inlineToolbar: true,
        config: {
          quotePlaceholder: 'Enter a quote',
          captionPlaceholder: 'Quote\'s author'
        }
      },
      code: {
        class: window.CodeTool,
        inlineToolbar: true
      },
      table: {
        class: window.Table,
        inlineToolbar: true
      },
      image: {
        class: window.ImageTool,
        config: {
          endpoints: {
            byFile: '/uploadFile', // Your file upload endpoint
            byUrl: '/fetchUrl'     // Your URL fetch endpoint
          }
        }
      },
      marker: {
        class: window.Marker,
        shortcut: 'CMD+SHIFT+M'
      },
      inlineCode: {
        class: window.InlineCode,
        shortcut: 'CMD+SHIFT+C'
      }
    }
  },

  // Initialize editors for specific fields
  initializeEditors: function() {
    try {
      console.log('🔧 Initializing Editor.js instances...');
      
      // Check if Editor.js is loaded
      if (!window.EditorJS) {
        console.error('❌ Editor.js not loaded');
        return;
      }

      // Check if List tool is loaded
      const ListClass = window.List || window.EditorJsList;
      if (!ListClass) {
        console.error('❌ List tool not loaded');
        console.log('Debugging List tool:', {
          windowList: window.List,
          editorJsList: window.EditorJsList,
          listToolScript: document.querySelector('script[src*="list"]')
        });
        return;
      }

      // Update List tool class
      this.commonConfig.tools.list.class = ListClass;
      
      // Check if required elements exist
      const holders = [
        'reason-for-change-editor',
        'implementation-plan-editor',
        'backout-plan-editor',
        'validation-plan-editor'
      ];
      
      const missingHolders = holders.filter(id => !document.getElementById(id));
      if (missingHolders.length > 0) {
        console.error('❌ Missing editor containers:', missingHolders);
        return;
      }

      // Initialize each editor
      const editors = {
        reason: new EditorJS({
          holder: 'reason-for-change-editor',
          ...this.commonConfig,
          placeholder: 'Describe the reason for this change...'
        }),
        implementation: new EditorJS({
          holder: 'implementation-plan-editor',
          ...this.commonConfig,
          placeholder: 'Describe the implementation steps...'
        }),
        backout: new EditorJS({
          holder: 'backout-plan-editor',
          ...this.commonConfig,
          placeholder: 'Describe the backout procedure...'
        }),
        validation: new EditorJS({
          holder: 'validation-plan-editor',
          ...this.commonConfig,
          placeholder: 'Describe how the change will be validated...'
        })
      };

      // Store editor instances globally
      window.editors = editors;
      console.log('✅ Editor.js instances initialized successfully');
      
      return editors;
    } catch (error) {
      console.error('❌ Error initializing editors:', error);
      throw error;
    }
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
      const content = {
        reasonForChange: await editors.reason.save(),
        implementationPlan: await editors.implementation.save(),
        backoutPlan: await editors.backout.save(),
        validationPlan: await editors.validation.save()
      };

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
      if (data.reasonForChange) {
        await editors.reason.render(data.reasonForChange);
      }
      if (data.implementationPlan) {
        await editors.implementation.render(data.implementationPlan);
      }
      if (data.backoutPlan) {
        await editors.backout.render(data.backoutPlan);
      }
      if (data.validationPlan) {
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