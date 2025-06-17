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
        class: Header,
        inlineToolbar: true,
        config: {
          levels: [1, 2, 3],
          defaultLevel: 2
        }
      },
      list: {
        class: List,
        inlineToolbar: true
      },
      checklist: {
        class: Checklist,
        inlineToolbar: true
      },
      quote: {
        class: Quote,
        inlineToolbar: true,
        config: {
          quotePlaceholder: 'Enter a quote',
          captionPlaceholder: 'Quote\'s author'
        }
      },
      code: {
        class: CodeTool,
        inlineToolbar: true
      },
      table: {
        class: Table,
        inlineToolbar: true
      },
      image: {
        class: ImageTool,
        config: {
          endpoints: {
            byFile: '/uploadFile', // Your file upload endpoint
            byUrl: '/fetchUrl'     // Your URL fetch endpoint
          }
        }
      },
      marker: {
        class: Marker,
        shortcut: 'CMD+SHIFT+M'
      },
      inlineCode: {
        class: InlineCode,
        shortcut: 'CMD+SHIFT+C'
      }
    }
  },

  // Initialize editors for specific fields
  initializeEditors: function() {
    // Reason for Change editor
    const reasonEditor = new EditorJS({
      holder: 'reason-for-change-editor',
      ...this.commonConfig,
      placeholder: 'Describe the reason for this change...'
    });

    // Implementation Plan editor
    const implementationEditor = new EditorJS({
      holder: 'implementation-plan-editor',
      ...this.commonConfig,
      placeholder: 'Describe the implementation steps...'
    });

    // Backout Plan editor
    const backoutEditor = new EditorJS({
      holder: 'backout-plan-editor',
      ...this.commonConfig,
      placeholder: 'Describe the backout procedure...'
    });

    // Validation Plan editor
    const validationEditor = new EditorJS({
      holder: 'validation-plan-editor',
      ...this.commonConfig,
      placeholder: 'Describe how the change will be validated...'
    });

    // Store editor instances
    window.editors = {
      reason: reasonEditor,
      implementation: implementationEditor,
      backout: backoutEditor,
      validation: validationEditor
    };
  },

  // Save editor content
  saveEditorContent: async function() {
    const editors = window.editors;
    if (!editors) return null;

    try {
      const content = {
        reasonForChange: await editors.reason.save(),
        implementationPlan: await editors.implementation.save(),
        backoutPlan: await editors.backout.save(),
        validationPlan: await editors.validation.save()
      };

      return content;
    } catch (error) {
      console.error('Error saving editor content:', error);
      throw error;
    }
  },

  // Load editor content
  loadEditorContent: async function(data) {
    const editors = window.editors;
    if (!editors || !data) return;

    try {
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
    } catch (error) {
      console.error('Error loading editor content:', error);
      throw error;
    }
  }
};

// Export the configuration
window.editorConfig = editorConfig; 