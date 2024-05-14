import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';

import MesheryDesignModal from './MesheryDesignModal';

const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
}));

jest.mock('react-syntax-highlighter', () => () => <div>content</div>);

const defaultProps = {
  design:
    'name: kubernetes_basic\nservices:\n  AnchorNode:\n    name: AnchorNode\n    type: AnchorNode\n    apiVersion: core.meshery.io/v1alpha1\n    namespace: helloah\n    version: 0.7.1\n    model: meshery-core\n',
  normalizedName: 'design-name',
  visibleDesign: false,
};

describe('MesheryDesignModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
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
      expect(screen.getByText('content')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy to clipboard' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
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
