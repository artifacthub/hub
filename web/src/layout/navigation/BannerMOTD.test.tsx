import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import BannerMOTD from './BannerMOTD';

describe('BannerMOTD', () => {
  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).config;
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    Object.defineProperty(document, 'querySelector', {
      value: (selector: string) => {
        switch (selector) {
          case `meta[name='artifacthub:motd']`:
            return {
              getAttribute: () => 'this is a sample',
            };
          default:
            return false;
        }
      },
      writable: true,
    });

    const { asFragment } = render(<BannerMOTD />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      Object.defineProperty(document, 'querySelector', {
        value: (selector: string) => {
          switch (selector) {
            case `meta[name='artifacthub:motd']`:
              return {
                getAttribute: () => 'this is a sample',
              };
            default:
              return false;
          }
        },
        writable: true,
      });

      render(<BannerMOTD />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveClass('infoAlert alert-info');
      expect(screen.getByRole('button', { name: 'Close banner' })).toBeInTheDocument();
      expect(screen.getByText('this is a sample')).toBeInTheDocument();
    });

    it('renders component with specific severity type', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).config = {
        motd: 'this is a sample',
        motdSeverity: 'error',
      };

      Object.defineProperty(document, 'querySelector', {
        value: (selector: string) => {
          switch (selector) {
            case `meta[name='artifacthub:motd']`:
              return {
                getAttribute: () => 'this is a sample',
              };
            case `meta[name='artifacthub:motdSeverity']`:
              return {
                getAttribute: () => 'error',
              };
            default:
              return false;
          }
        },
        writable: true,
      });

      render(<BannerMOTD />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('dangerAlert alert-danger');
    });

    it('closes alert', async () => {
      Object.defineProperty(document, 'querySelector', {
        value: (selector: string) => {
          switch (selector) {
            case `meta[name='artifacthub:motd']`:
              return {
                getAttribute: () => 'this is a sample',
              };
            default:
              return false;
          }
        },
        writable: true,
      });

      const { container } = render(<BannerMOTD />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();

      const btn = screen.getByRole('button', { name: 'Close banner' });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(container).toBeEmptyDOMElement();
      });
    });

    describe('does not render component', () => {
      it('when motd is undefined', () => {
        Object.defineProperty(document, 'querySelector', {
          value: () => false,
          writable: true,
        });
        const { container } = render(<BannerMOTD />);
        expect(container).toBeEmptyDOMElement();
      });

      it('when motd is a empty string', () => {
        Object.defineProperty(document, 'querySelector', {
          value: (selector: string) => {
            switch (selector) {
              case `meta[name='artifacthub:motd']`:
                return {
                  getAttribute: () => '',
                };
              default:
                return false;
            }
          },
          writable: true,
        });

        const { container } = render(<BannerMOTD />);
        expect(container).toBeEmptyDOMElement();
      });

      it('when motd is a {{ .motd }}', () => {
        Object.defineProperty(document, 'querySelector', {
          value: (selector: string) => {
            switch (selector) {
              case `meta[name='artifacthub:motd']`:
                return {
                  // When variable is not updated
                  getAttribute: () => '{{ .motd }}',
                };
              default:
                return false;
            }
          },
          writable: true,
        });

        const { container } = render(<BannerMOTD />);
        expect(container).toBeEmptyDOMElement();
      });
    });
  });
});
