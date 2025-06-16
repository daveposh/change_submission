// Lexical initialization
const LexicalConfig = {
  namespace: 'lexical-editor',
  nodes: [
    Lexical.RichTextNode,
    Lexical.ListNode,
    Lexical.LinkNode,
    Lexical.TableNode,
    Lexical.CodeNode
  ],
  onError: (error) => {
    console.error('Lexical editor error:', error);
  }
};

// Create a base editor state
const createInitialEditorState = () => {
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

// Export the configuration
window.LexicalConfig = LexicalConfig;
window.createInitialEditorState = createInitialEditorState; 