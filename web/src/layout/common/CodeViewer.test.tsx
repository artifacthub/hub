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

  it('uses syntax highlighting for content with 1000 lines', () => {
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

    expect(screen.getByTestId('highlighted-code')).toHaveTextContent(content, { normalizeWhitespace: false });
    expect(screen.queryByTestId('plain-code')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('uses plain code for large content', () => {
    const content = Array.from({ length: 1001 }, (_, index) => `name: line-${index}`).join('\n');

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
    expect(screen.getByRole('alert')).toHaveClass('alert-secondary');
    expect(screen.getByRole('alert')).toHaveClass('border-0');
    expect(screen.getByRole('alert')).toHaveClass('rounded-0');
    const codeWrapper = screen.getByTestId('plain-code').parentElement?.parentElement;
    expect(codeWrapper).not.toContainElement(screen.getByRole('alert'));
    expect(codeWrapper?.compareDocumentPosition(screen.getByRole('alert'))).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.queryByTestId('highlighted-code')).toBeNull();
  });

  it('keeps syntax theme colors for large content', () => {
    const content = Array.from({ length: 1001 }, (_, index) => `name: line-${index}`).join('\n');

    render(
      <CodeViewer
        content={content}
        language="bash"
        style={{ hljs: { backgroundColor: '#1d1f21', color: '#c5c8c6' } }}
        plainCodeTestId="plain-code"
      />
    );

    const codeWrapper = screen.getByTestId('plain-code').parentElement?.parentElement;
    expect(codeWrapper).toHaveStyle({ backgroundColor: '#1d1f21', color: '#c5c8c6' });
    expect(codeWrapper).not.toHaveClass('text-muted');
  });

  it('keeps default syntax theme colors for large content', () => {
    const content = Array.from({ length: 1001 }, (_, index) => `name: line-${index}`).join('\n');

    render(<CodeViewer content={content} language="yaml" plainCodeTestId="plain-code" />);

    const codeWrapper = screen.getByTestId('plain-code').parentElement?.parentElement;
    expect(codeWrapper).toHaveStyle({ background: '#f8f8ff', color: '#000' });
    expect(codeWrapper).not.toHaveClass('text-muted');
  });

  it('uses plain code for long single-line content', () => {
    const content = `name: ${'a'.repeat(150001)}`;

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
    expect(screen.getByTestId('plain-code-lines')).toHaveTextContent('1', { normalizeWhitespace: false });
    expect(screen.getByRole('alert')).toHaveTextContent('Syntax highlighting is disabled for large files.');
    expect(screen.queryByTestId('highlighted-code')).toBeNull();
  });
});
