import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';
import { vi } from 'vitest';

import MesheryDesignModal from './MesheryDesignModal';

const mockUseNavigate = jest.fn();
let localStorageItems: { [key: string]: string } = {};
const localStorageMock = {
  clear: vi.fn(() => {
    localStorageItems = {};
  }),
  getItem: vi.fn((key: string) => localStorageItems[key] || null),
  removeItem: vi.fn((key: string) => {
    delete localStorageItems[key];
  }),
  setItem: vi.fn((key: string, value: string) => {
    localStorageItems[key] = value;
  }),
};

vi.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
}));

vi.mock('react-syntax-highlighter', () => ({
  default: ({ children }: { children: string }) => <div data-testid="highlighted-design">{children}</div>,
}));

const defaultProps = {
  design:
    'name: kubernetes_basic\nservices:\n  AnchorNode:\n    name: AnchorNode\n    type: AnchorNode\n    apiVersion: core.meshery.io/v1alpha1\n    namespace: helloah\n    version: 0.7.1\n    model: meshery-core\n',
  normalizedName: 'design-name',
  visibleDesign: false,
};

describe('MesheryDesignModal', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
    mockUseNavigate.mockReset();
    window.localStorage.clear();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <Router>
        <MesheryDesignModal {...defaultProps} />
      </Router>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders properly', () => {
      render(
        <Router>
          <MesheryDesignModal {...defaultProps} />
        </Router>
      );

      expect(screen.getByRole('button', { name: 'Open Design' })).toBeInTheDocument();
      expect(screen.getByText('Design')).toBeInTheDocument();
    });

    it('does not render component when design is undefined', () => {
      const { container } = render(
        <Router>
          <MesheryDesignModal normalizedName="design-name" visibleDesign={false} />
        </Router>
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('opens design modal', async () => {
      render(
        <Router>
          <MesheryDesignModal {...defaultProps} />
        </Router>
      );

      expect(screen.queryByRole('dialog')).toBeNull();

      const btn = screen.getByRole('button', { name: 'Open Design' });
      await userEvent.click(btn);

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getAllByText('Design')).toHaveLength(2);
      expect(screen.getByTestId('highlighted-design')).toHaveTextContent(defaultProps.design, {
        normalizeWhitespace: false,
      });
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.getByRole('button', { name: 'Copy to clipboard' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
    });

    it('uses local design override', async () => {
      const override = '{\n  "name": "Override design"\n}';
      window.localStorage.setItem('artifactHub.mesheryDesignModalOverride', override);

      render(
        <Router>
          <MesheryDesignModal {...defaultProps} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: 'Open Design' });
      await userEvent.click(btn);

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('highlighted-design')).toHaveTextContent(override, { normalizeWhitespace: false });
    });

    it('uses plain code for large designs', async () => {
      const largeDesign = Array.from({ length: 1001 }, (_, index) => `name: line-${index}`).join('\n');

      render(
        <Router>
          <MesheryDesignModal {...defaultProps} design={largeDesign} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: 'Open Design' });
      await userEvent.click(btn);

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('plain-design')).toHaveTextContent(largeDesign, { normalizeWhitespace: false });
      expect(screen.getByTestId('plain-design-lines')).toHaveTextContent('1\n2\n3', { normalizeWhitespace: false });
      expect(screen.getByRole('alert')).toHaveTextContent('Syntax highlighting is disabled for large files.');
      expect(screen.queryByTestId('highlighted-design')).toBeNull();
    });

    it('uses plain code for long single-line designs', async () => {
      const longDesign = `{"name":"${'a'.repeat(150000)}"}`;
      const formattedLongDesign = JSON.stringify(JSON.parse(longDesign), null, 2);

      render(
        <Router>
          <MesheryDesignModal {...defaultProps} design={longDesign} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: 'Open Design' });
      await userEvent.click(btn);

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('plain-design')).toHaveTextContent(formattedLongDesign, { normalizeWhitespace: false });
      expect(screen.getByTestId('plain-design-lines')).toHaveTextContent('1\n2\n3', { normalizeWhitespace: false });
      expect(screen.getByRole('alert')).toHaveTextContent('Syntax highlighting is disabled for large files.');
      expect(screen.queryByTestId('highlighted-design')).toBeNull();
    });

    it('renders open modal', async () => {
      render(
        <Router>
          <MesheryDesignModal {...defaultProps} visibleDesign />
        </Router>
      );

      expect(await screen.findByRole('dialog')).toBeInTheDocument();

      await waitFor(() => {
        expect(mockUseNavigate).toHaveBeenCalledTimes(1);
        expect(mockUseNavigate).toHaveBeenCalledWith('?modal=design', { replace: true, state: null });
      });
    });

    it('closes modal', async () => {
      render(
        <Router>
          <MesheryDesignModal {...defaultProps} visibleDesign />
        </Router>
      );

      expect(await screen.findByRole('dialog')).toBeInTheDocument();

      const btn = screen.getByRole('button', { name: 'Close' });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(mockUseNavigate).toHaveBeenCalledTimes(2);
        expect(mockUseNavigate).toHaveBeenLastCalledWith('', { replace: true, state: null });
      });
    });
  });
});
