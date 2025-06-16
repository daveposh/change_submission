// Wait for Lexical to be loaded
function waitForLexical(callback) {
  if (window.Lexical) {
    callback();
  } else {
    setTimeout(() => waitForLexical(callback), 100);
  }
}

// Initialize Lexical configuration
waitForLexical(() => {
  // Define the base configuration
  window.LexicalConfig = {
    namespace: 'change-submission',
    nodes: [
      Lexical.ParagraphNode,
      Lexical.HeadingNode,
      Lexical.QuoteNode,
      Lexical.ListNode,
      Lexical.ListItemNode,
      Lexical.CodeNode,
      Lexical.LinkNode,
      Lexical.ImageNode,
      Lexical.TableNode,
      Lexical.TableRowNode,
      Lexical.TableCellNode
    ],
    onError: (error) => {
      console.error('Lexical Editor Error:', error);
    }
  };

  // Create initial editor state
  window.createInitialEditorState = () => {
    return {
      root: {
        children: [
          {
            children: [],
            direction: null,
            format: '',
            indent: 0,
            type: 'paragraph',
            version: 1
          }
        ],
        direction: null,
        format: '',
        indent: 0,
        type: 'root',
        version: 1
      }
    };
  };

  // Initialize rich text editors when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    const editorFields = [
      'description',
      'implementation-plan',
      'validation-plan',
      'rollback-plan'
    ];

    editorFields.forEach(fieldId => {
      const container = document.getElementById(fieldId);
      if (container) {
        const textarea = container.querySelector('textarea');
        if (textarea) {
          new RichTextEditor(fieldId, textarea.value);
        }
      }
    });
  });
}); 