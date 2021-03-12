import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import BannerMOTD from './BannerMOTD';

describe('BannerMOTD', () => {
  afterEach(() => {
    delete (window as any).config;
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    Object.defineProperty(document, 'querySelector', {
      value: (selector: any) => {
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

    const result = render(<BannerMOTD />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      Object.defineProperty(document, 'querySelector', {
        value: (selector: any) => {
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

      const { getByRole, getByText, getByTestId } = render(<BannerMOTD />);

      const alert = getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveClass('infoAlert alert-info');
      expect(getByTestId('closeBannerMOTD')).toBeInTheDocument();
      expect(getByText('this is a sample')).toBeInTheDocument();
    });

    it('renders component with specific severity type', () => {
      (window as any).config = {
        motd: 'this is a sample',
        motdSeverity: 'error',
      };

      Object.defineProperty(document, 'querySelector', {
        value: (selector: any) => {
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

      const { getByRole } = render(<BannerMOTD />);

      const alert = getByRole('alert');
      expect(alert).toHaveClass('dangerAlert alert-danger');
    });

    it('closes alert', () => {
      Object.defineProperty(document, 'querySelector', {
        value: (selector: any) => {
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

      const { getByRole, getByTestId, container } = render(<BannerMOTD />);

      const alert = getByRole('alert');
      expect(alert).toBeInTheDocument();

      const btn = getByTestId('closeBannerMOTD');
      fireEvent.click(btn);

      waitFor(() => {
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
          value: (selector: any) => {
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
          value: (selector: any) => {
            switch (selector) {
              case `meta[name='artifacthub:motd']`:
                return {
                  // This is important for dev
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
