'use client';

import { useRef, useState } from 'react';

const TOOLS: { label: string; title: string; command: string; arg?: string }[] = [
  { label: 'B', title: 'Bold', command: 'bold' },
  { label: 'I', title: 'Italic', command: 'italic' },
  { label: 'U', title: 'Underline', command: 'underline' },
  { label: 'H2', title: 'Heading', command: 'formatBlock', arg: 'h2' },
  { label: 'H3', title: 'Subheading', command: 'formatBlock', arg: 'h3' },
  { label: '¶', title: 'Paragraph', command: 'formatBlock', arg: 'p' },
  { label: '• list', title: 'Bullet list', command: 'insertUnorderedList' },
  { label: '1. list', title: 'Numbered list', command: 'insertOrderedList' },
  { label: '❝', title: 'Quote', command: 'formatBlock', arg: 'blockquote' },
];

/**
 * Small dependency-free WYSIWYG on contentEditable. The HTML travels in a
 * hidden input inside the surrounding form; the server sanitizes it to a
 * strict allowlist, so the editor only needs to be pleasant, not safe.
 */
export function RichTextEditor({
  name,
  placeholder,
  initialHtml = '',
}: {
  name: string;
  placeholder?: string;
  initialHtml?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(initialHtml);

  const exec = (command: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    setHtml(editorRef.current?.innerHTML ?? '');
  };

  return (
    <div style={{ border: '1px solid var(--line)', background: '#fff' }}>
      <div
        style={{
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--line)',
          padding: 4,
        }}
      >
        {TOOLS.map((tool) => (
          <button
            key={tool.label}
            type="button"
            title={tool.title}
            onMouseDown={(e) => {
              e.preventDefault(); // keep the selection in the editor
              exec(tool.command, tool.arg);
            }}
            style={{
              padding: '5px 9px',
              fontSize: 12,
              fontWeight: tool.label === 'B' ? 700 : 400,
              fontStyle: tool.label === 'I' ? 'italic' : undefined,
              textDecoration: tool.label === 'U' ? 'underline' : undefined,
              border: '1px solid transparent',
              borderRadius: 2,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--cream)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {tool.label}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => setHtml(editorRef.current?.innerHTML ?? '')}
        data-placeholder={placeholder}
        className="rte-area"
        style={{
          minHeight: 140,
          padding: '12px 14px',
          fontSize: 14,
          fontWeight: 300,
          lineHeight: 1.6,
          outline: 'none',
        }}
        dangerouslySetInnerHTML={{ __html: initialHtml }}
      />
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
