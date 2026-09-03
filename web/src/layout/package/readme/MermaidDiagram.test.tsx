import { act, render, screen, waitFor } from '@testing-library/react';
import type { RenderResult } from 'mermaid';
import { vi } from 'vitest';

import { AppCtx } from '../../../context/AppCtx';
import { ThemePrefs } from '../../../types';
import MermaidDiagram from './MermaidDiagram';

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(),
  },
}));

const getMockContext = (theme: ThemePrefs) => ({
  ctx: {
    user: null,
    prefs: {
      controlPanel: {},
      search: { limit: 60 },
      theme,
      notifications: {
        lastDisplayedTime: null,
        enabled: true,
        displayed: [],
      },
    },
  },
  dispatch: vi.fn(),
});

describe('MermaidDiagram', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it.each([
    { configured: 'light', effective: 'light', mermaidTheme: 'default' },
    { configured: 'dark', effective: 'dark', mermaidTheme: 'dark' },
    { configured: 'automatic', effective: 'light', mermaidTheme: 'default' },
    { configured: 'automatic', effective: 'dark', mermaidTheme: 'dark' },
  ])('renders an SVG with the $configured ($effective) theme', async ({ configured, effective, mermaidTheme }) => {
    const mermaid = (await import('mermaid')).default;
    vi.mocked(mermaid.render).mockResolvedValue({
      svg: '<svg data-testid="mermaid-svg"><text>Diagram</text></svg>',
      diagramType: 'flowchart',
      bindFunctions: vi.fn(),
    });

    render(
      <AppCtx.Provider value={getMockContext({ configured, effective })}>
        <MermaidDiagram code="graph LR; A-->B" />
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mermaid-svg')).toBeInTheDocument();
    });

    expect(mermaid.initialize).toHaveBeenCalledWith({
      startOnLoad: false,
      securityLevel: 'strict',
      suppressErrorRendering: true,
      theme: mermaidTheme,
    });
    expect(mermaid.render).toHaveBeenCalledWith(expect.stringContaining('mermaid'), 'graph LR; A-->B');
  });

  it('updates the diagram when the effective theme changes', async () => {
    const mermaid = (await import('mermaid')).default;
    vi.mocked(mermaid.render)
      .mockResolvedValueOnce({ svg: '<svg><text>Light diagram</text></svg>', diagramType: 'flowchart' })
      .mockResolvedValueOnce({ svg: '<svg><text>Dark diagram</text></svg>', diagramType: 'flowchart' })
      .mockResolvedValueOnce({ svg: '<svg><text>Light diagram</text></svg>', diagramType: 'flowchart' });

    const { rerender } = render(
      <AppCtx.Provider value={getMockContext({ configured: 'automatic', effective: 'light' })}>
        <MermaidDiagram code="graph LR; A-->B" />
      </AppCtx.Provider>
    );

    expect(await screen.findByText('Light diagram')).toBeInTheDocument();

    rerender(
      <AppCtx.Provider value={getMockContext({ configured: 'automatic', effective: 'dark' })}>
        <MermaidDiagram code="graph LR; A-->B" />
      </AppCtx.Provider>
    );

    expect(await screen.findByText('Dark diagram')).toBeInTheDocument();
    expect(screen.queryByText('Light diagram')).not.toBeInTheDocument();
    expect(mermaid.initialize).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'dark' }));

    rerender(
      <AppCtx.Provider value={getMockContext({ configured: 'automatic', effective: 'light' })}>
        <MermaidDiagram code="graph LR; A-->B" />
      </AppCtx.Provider>
    );

    expect(await screen.findByText('Light diagram')).toBeInTheDocument();
    expect(screen.queryByText('Dark diagram')).not.toBeInTheDocument();
    expect(mermaid.initialize).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'default' }));
  });

  it('ignores a pending render from the previous theme', async () => {
    const mermaid = (await import('mermaid')).default;
    let finishPreviousRender: (result: RenderResult) => void = () => {};
    vi.mocked(mermaid.render)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishPreviousRender = resolve;
          })
      )
      .mockResolvedValueOnce({ svg: '<svg><text>Dark diagram</text></svg>', diagramType: 'flowchart' });

    const { rerender } = render(
      <AppCtx.Provider value={getMockContext({ configured: 'light', effective: 'light' })}>
        <MermaidDiagram code="graph LR; A-->B" />
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(mermaid.render).toHaveBeenCalledTimes(1);
    });

    rerender(
      <AppCtx.Provider value={getMockContext({ configured: 'dark', effective: 'dark' })}>
        <MermaidDiagram code="graph LR; A-->B" />
      </AppCtx.Provider>
    );

    expect(await screen.findByText('Dark diagram')).toBeInTheDocument();

    await act(async () => {
      finishPreviousRender({ svg: '<svg><text>Light diagram</text></svg>', diagramType: 'flowchart' });
    });

    expect(screen.getByText('Dark diagram')).toBeInTheDocument();
    expect(screen.queryByText('Light diagram')).not.toBeInTheDocument();
  });

  it.each(['light', 'dark'])('falls back to code display on error in the %s theme', async (theme) => {
    const mermaid = (await import('mermaid')).default;
    vi.mocked(mermaid.render).mockRejectedValue(new Error('Invalid syntax'));

    render(
      <AppCtx.Provider value={getMockContext({ configured: theme, effective: theme })}>
        <MermaidDiagram code="invalid mermaid" />
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('invalid mermaid')).toBeInTheDocument();
    });

    expect(mermaid.initialize).toHaveBeenCalledWith(expect.objectContaining({ suppressErrorRendering: true }));
  });
});
