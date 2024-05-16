import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';

import MoreActionsButton from './MoreActionsButton';

const defaultProps = {
  packageId: 'id',
  packageName: 'pkg',
  packageDescription: 'this is the description',
  visibleWidget: false,
};

const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
}));

const openMock = jest.fn();
window.open = openMock;

describe('MoreActionsButton', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <Router>
        <MoreActionsButton {...defaultProps} />
      </Router>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(
        <Router>
          <MoreActionsButton {...defaultProps} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: 'Open menu' });
      expect(btn).toBeInTheDocument();
    });

    it('displays dropdown', async () => {
      render(
        <Router>
          <MoreActionsButton {...defaultProps} />
        </Router>
      );

      const dropdown = screen.getByRole('menu');
      expect(dropdown).toBeInTheDocument();
      expect(dropdown).not.toHaveClass('show');

      const btn = screen.getByRole('button', { name: 'Open menu' });
      expect(btn).toBeInTheDocument();

      await userEvent.click(btn);

      expect(dropdown).toHaveClass('show');
      expect(screen.getByText('Embed widget')).toBeInTheDocument();
    });

    it('opens modal', async () => {
      render(
        <Router>
          <MoreActionsButton {...defaultProps} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: 'Open menu' });
      expect(btn).toBeInTheDocument();

      await userEvent.click(btn);

      const widgetBtn = screen.getByRole('button', { name: 'Open embed widget modal' });
      expect(widgetBtn).toBeInTheDocument();

      await userEvent.click(widgetBtn);

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      expect(mockUseNavigate).toHaveBeenCalledTimes(1);
      expect(mockUseNavigate).toHaveBeenCalledWith('?modal=widget', { replace: true, state: null });
    });

    describe('report abuse', () => {
      it('opens url', async () => {
        Object.defineProperty(document, 'querySelector', {
          value: (selector: string) => {
            switch (selector) {
              case `meta[name='artifacthub:reportURL']`:
                return {
                  getAttribute: () => 'http://test.com',
                };
              default:
                return false;
            }
          },
          writable: true,
        });

        render(
          <Router>
            <MoreActionsButton {...defaultProps} />
          </Router>
        );

        const dropdown = screen.getByRole('menu');
        expect(dropdown).toBeInTheDocument();
        expect(dropdown).not.toHaveClass('show');

        const btn = screen.getByRole('button', { name: 'Open menu' });
        expect(btn).toBeInTheDocument();

        await userEvent.click(btn);

        expect(dropdown).toHaveClass('show');

        const reportURLBtn = screen.getByRole('button', { name: 'Open report abuse url' });
        expect(reportURLBtn).toBeInTheDocument();

        await userEvent.click(reportURLBtn);

        expect(openMock).toHaveBeenCalledTimes(1);
        expect(openMock).toHaveBeenCalledWith('http://test.com', '_blank');
      });

      it('does not render when url is undefined', async () => {
        Object.defineProperty(document, 'querySelector', {
          value: (selector: string) => {
            switch (selector) {
              case `meta[name='artifacthub:reportURL']`:
                return {
                  getAttribute: () => null,
                };
              default:
                return false;
            }
          },
          writable: true,
        });

        render(
          <Router>
            <MoreActionsButton {...defaultProps} />
          </Router>
        );

        const dropdown = screen.getByRole('menu');
        expect(dropdown).toBeInTheDocument();
        expect(dropdown).not.toHaveClass('show');

        const btn = screen.getByRole('button', { name: 'Open menu' });
        expect(btn).toBeInTheDocument();

        await userEvent.click(btn);

        expect(dropdown).toHaveClass('show');
        expect(screen.queryByRole('button', { name: 'Open report abuse url' })).toBeNull();
      });
    });

    it('does not render when url is an empty string', async () => {
      Object.defineProperty(document, 'querySelector', {
        value: (selector: string) => {
          switch (selector) {
            case `meta[name='artifacthub:reportURL']`:
              return {
                getAttribute: () => '',
              };
            default:
              return false;
          }
        },
        writable: true,
      });

      render(
        <Router>
          <MoreActionsButton {...defaultProps} />
        </Router>
      );

      const dropdown = screen.getByRole('menu');
      expect(dropdown).toBeInTheDocument();
      expect(dropdown).not.toHaveClass('show');

      const btn = screen.getByRole('button', { name: 'Open menu' });
      expect(btn).toBeInTheDocument();

      await userEvent.click(btn);

      expect(dropdown).toHaveClass('show');
      expect(screen.queryByRole('button', { name: 'Open report abuse url' })).toBeNull();
    });
  });
});
