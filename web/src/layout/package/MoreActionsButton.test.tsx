import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MoreActionsButton from './MoreActionsButton';

const defaultProps = {
  packageId: 'id',
  packageName: 'pkg',
  packageDescription: 'this is the description',
  visibleWidget: false,
};

const mockHistoryReplace = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    replace: mockHistoryReplace,
  }),
}));

const openMock = jest.fn();
window.open = openMock;

describe('MoreActionsButton', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<MoreActionsButton {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<MoreActionsButton {...defaultProps} />);

      const btn = screen.getByRole('button', { name: 'Open menu' });
      expect(btn).toBeInTheDocument();
    });

    it('displays dropdown', () => {
      render(<MoreActionsButton {...defaultProps} />);

      const dropdown = screen.getByRole('menu');
      expect(dropdown).toBeInTheDocument();
      expect(dropdown).not.toHaveClass('show');

      const btn = screen.getByRole('button', { name: 'Open menu' });
      expect(btn).toBeInTheDocument();

      userEvent.click(btn);

      expect(dropdown).toHaveClass('show');
      expect(screen.getByText('Embed widget')).toBeInTheDocument();
    });

    it('opens modal', () => {
      render(<MoreActionsButton {...defaultProps} />);

      const btn = screen.getByRole('button', { name: 'Open menu' });
      expect(btn).toBeInTheDocument();

      userEvent.click(btn);

      const widgetBtn = screen.getByRole('button', { name: 'Open embed widget modal' });
      expect(widgetBtn).toBeInTheDocument();

      userEvent.click(widgetBtn);

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
      expect(mockHistoryReplace).toHaveBeenCalledWith({
        search: '?modal=widget',
        state: {
          fromStarredPage: undefined,
          searchUrlReferer: undefined,
        },
      });
    });

    describe('report abuse', () => {
      it('opens url', () => {
        Object.defineProperty(document, 'querySelector', {
          value: (selector: any) => {
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

        render(<MoreActionsButton {...defaultProps} />);

        const dropdown = screen.getByRole('menu');
        expect(dropdown).toBeInTheDocument();
        expect(dropdown).not.toHaveClass('show');

        const btn = screen.getByRole('button', { name: 'Open menu' });
        expect(btn).toBeInTheDocument();

        userEvent.click(btn);

        expect(dropdown).toHaveClass('show');

        const reportURLBtn = screen.getByRole('button', { name: 'Open report abuse url' });
        expect(reportURLBtn).toBeInTheDocument();

        userEvent.click(reportURLBtn);

        expect(openMock).toHaveBeenCalledTimes(1);
        expect(openMock).toHaveBeenCalledWith('http://test.com', '_blank');
      });

      it('does not render when url is undefined', () => {
        Object.defineProperty(document, 'querySelector', {
          value: (selector: any) => {
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

        render(<MoreActionsButton {...defaultProps} />);

        const dropdown = screen.getByRole('menu');
        expect(dropdown).toBeInTheDocument();
        expect(dropdown).not.toHaveClass('show');

        const btn = screen.getByRole('button', { name: 'Open menu' });
        expect(btn).toBeInTheDocument();

        userEvent.click(btn);

        expect(dropdown).toHaveClass('show');
        expect(screen.queryByRole('button', { name: 'Open report abuse url' })).toBeNull();
      });
    });

    it('does not render when url is an empty string', () => {
      Object.defineProperty(document, 'querySelector', {
        value: (selector: any) => {
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

      render(<MoreActionsButton {...defaultProps} />);

      const dropdown = screen.getByRole('menu');
      expect(dropdown).toBeInTheDocument();
      expect(dropdown).not.toHaveClass('show');

      const btn = screen.getByRole('button', { name: 'Open menu' });
      expect(btn).toBeInTheDocument();

      userEvent.click(btn);

      expect(dropdown).toHaveClass('show');
      expect(screen.queryByRole('button', { name: 'Open report abuse url' })).toBeNull();
    });
  });
});
