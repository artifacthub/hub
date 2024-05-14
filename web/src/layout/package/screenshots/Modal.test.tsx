import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';

import ScreenshotsModal from './Modal';

const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
}));

const defaultProps = {
  visibleScreenshotsModal: true,
  screenshots: [
    {
      url: 'https://artifacthub.github.io/hub/screenshots/screenshot1.jpg',
      title: 'Home page',
    },
    {
      url: 'https://artifacthub.github.io/hub/screenshots/screenshot2.jpg',
      title: 'Packages search',
    },
    {
      url: 'https://artifacthub.github.io/hub/screenshots/screenshot3.jpg',
      title: 'Package details',
    },
    {
      url: 'https://artifacthub.github.io/hub/screenshots/screenshot4.jpg',
      title: 'Security report',
    },
    {
      url: 'https://artifacthub.github.io/hub/screenshots/screenshot5.jpg',
      title: 'Values schema',
    },
    {
      url: 'https://artifacthub.github.io/hub/screenshots/screenshot6.jpg',
      title: 'Changelog',
    },
  ],
};

describe('ScreenshotsModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <Router>
        <ScreenshotsModal {...defaultProps} />
      </Router>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('opens next screenshot', async () => {
      render(
        <Router>
          <ScreenshotsModal {...defaultProps} />
        </Router>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const nextBtn = screen.getByRole('button', { name: 'Go to next screenshot' });
      await userEvent.click(nextBtn);

      expect(screen.getByText('Packages search')).toBeInTheDocument();
    });

    it('renders component', async () => {
      render(
        <Router>
          <ScreenshotsModal {...defaultProps} visibleScreenshotsModal={false} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: 'Open screenshots modal' });
      expect(btn).toBeInTheDocument();
      await userEvent.click(btn);

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Home page')).toBeInTheDocument();

      const prevBtn = screen.getByRole('button', { name: 'Go to previous screenshot' });
      expect(prevBtn).toBeInTheDocument();
      expect(prevBtn).toBeDisabled();
      const nextBtn = screen.getByRole('button', { name: 'Go to next screenshot' });
      expect(nextBtn).toBeInTheDocument();
      expect(nextBtn).not.toBeDisabled();

      const dotBtns = screen.getAllByTestId('dotBtn');
      expect(dotBtns).toHaveLength(6);
      expect(dotBtns[0]).toBeDisabled();
    });

    describe('does not render component', () => {
      it('when screenshots is empty', () => {
        const { container } = render(
          <Router>
            <ScreenshotsModal screenshots={[]} visibleScreenshotsModal />
          </Router>
        );

        expect(container).toBeEmptyDOMElement();
      });
    });
  });
});
