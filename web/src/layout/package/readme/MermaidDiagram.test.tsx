import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import MermaidDiagram from './MermaidDiagram';

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(),
  },
}));

describe('MermaidDiagram', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders mermaid diagram as SVG', async () => {
    const mermaid = (await import('mermaid')).default;
    vi.mocked(mermaid.render).mockResolvedValue({
      svg: '<svg data-testid="mermaid-svg"><text>Diagram</text></svg>',
      bindFunctions: vi.fn(),
    });

    render(<MermaidDiagram code="graph LR; A-->B" />);

    await waitFor(() => {
      expect(screen.getByTestId('mermaid-svg')).toBeInTheDocument();
    });

    expect(mermaid.initialize).toHaveBeenCalledWith({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'default',
    });
    expect(mermaid.render).toHaveBeenCalledWith(expect.stringContaining('mermaid'), 'graph LR; A-->B');
  });

  it('falls back to code display on error', async () => {
    const mermaid = (await import('mermaid')).default;
    vi.mocked(mermaid.render).mockRejectedValue(new Error('Invalid syntax'));

    render(<MermaidDiagram code="invalid mermaid" />);

    await waitFor(() => {
      expect(screen.getByText('invalid mermaid')).toBeInTheDocument();
    });
  });
});
