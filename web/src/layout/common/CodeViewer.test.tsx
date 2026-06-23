import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import CodeViewer from './CodeViewer';

vi.mock('react-syntax-highlighter', () => ({
  default: ({ children }: { children: string }) => <div data-testid="highlighted-code">{children}</div>,
}));

describe('CodeViewer', () => {
  it('uses syntax highlighting for small content', () => {
    render(
      <CodeViewer
        content="name: package"
        language="yaml"
        style={{}}
        customStyle={{ color: '#636a6e' }}
        showLineNumbers
      />
    );

    expect(screen.getByTestId('highlighted-code')).toHaveTextContent('name: package');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('uses plain code for large content', () => {
    const content = Array.from({ length: 1000 }, (_, index) => `name: line-${index}`).join('\n');

    render(
      <CodeViewer
        content={content}
        language="yaml"
        style={{}}
        plainCodeTestId="plain-code"
        plainCodeLinesTestId="plain-code-lines"
        showLineNumbers
      />
    );

    expect(screen.getByTestId('plain-code')).toHaveTextContent(content, { normalizeWhitespace: false });
    expect(screen.getByTestId('plain-code-lines')).toHaveTextContent('1\n2\n3', { normalizeWhitespace: false });
    expect(screen.getByRole('alert')).toHaveTextContent('Syntax highlighting is disabled for large files.');
    expect(screen.queryByTestId('highlighted-code')).toBeNull();
  });
});
