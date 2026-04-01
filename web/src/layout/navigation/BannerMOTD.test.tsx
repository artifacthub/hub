import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { hasClassContaining } from '../../utils/testUtils';
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
      expect(hasClassContaining(alert, 'infoAlert')).toBe(true);
      expect(alert).toHaveClass('alert-info');
      expect(screen.getByRole('button', { name: 'Close banner' })).toBeInTheDocument();
      expect(screen.getByText('this is a sample')).toBeInTheDocument();
    });

    it('renders markdown bold text', () => {
      Object.defineProperty(document, 'querySelector', {
        value: (selector: string) => {
          switch (selector) {
            case `meta[name='artifacthub:motd']`:
              return {
                getAttribute: () => 'This is **bold** text',
              };
            default:
              return false;
          }
        },
        writable: true,
      });

      render(<BannerMOTD />);

      const boldElement = screen.getByText('bold');
      expect(boldElement.tagName).toBe('STRONG');
    });

    it('renders markdown italic text', () => {
      Object.defineProperty(document, 'querySelector', {
        value: (selector: string) => {
          switch (selector) {
            case `meta[name='artifacthub:motd']`:
              return {
                getAttribute: () => 'This is *italic* text',
              };
            default:
              return false;
          }
        },
        writable: true,
      });

      render(<BannerMOTD />);

      const italicElement = screen.getByText('italic');
      expect(italicElement.tagName).toBe('EM');
    });

    it('renders markdown link', () => {
      Object.defineProperty(document, 'querySelector', {
        value: (selector: string) => {
          switch (selector) {
            case `meta[name='artifacthub:motd']`:
              return {
                getAttribute: () => 'Click [here](https://example.com)',
              };
            default:
              return false;
          }
        },
        writable: true,
      });

      render(<BannerMOTD />);

      const link = screen.getByRole('link', { name: 'here' });
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders combined markdown formatting', () => {
      Object.defineProperty(document, 'querySelector', {
        value: (selector: string) => {
          switch (selector) {
            case `meta[name='artifacthub:motd']`:
              return {
                getAttribute: () => 'This is **bold** and *italic* with a [link](https://example.com)',
              };
            default:
              return false;
          }
        },
        writable: true,
      });

      render(<BannerMOTD />);

      expect(screen.getByText('bold').tagName).toBe('STRONG');
      expect(screen.getByText('italic').tagName).toBe('EM');
      expect(screen.getByRole('link', { name: 'link' })).toHaveAttribute('href', 'https://example.com');
    });

    it('renders markdown heading (all sizes use h6)', () => {
      Object.defineProperty(document, 'querySelector', {
        value: (selector: string) => {
          switch (selector) {
            case `meta[name='artifacthub:motd']`:
              return {
                getAttribute: () => '# This is a heading',
              };
            default:
              return false;
          }
        },
        writable: true,
      });

      render(<BannerMOTD />);

      const headingElement = screen.getByText('This is a heading');
      expect(headingElement).toBeInTheDocument();
      expect(headingElement.tagName).toBe('H6');
      expect(headingElement).toHaveClass('d-inline');
    });

    it('renders different heading levels with same h6 size', () => {
      Object.defineProperty(document, 'querySelector', {
        value: (selector: string) => {
          switch (selector) {
            case `meta[name='artifacthub:motd']`:
              return {
                getAttribute: () => '## Level 2 heading',
              };
            default:
              return false;
          }
        },
        writable: true,
      });

      render(<BannerMOTD />);

      const headingElement = screen.getByText('Level 2 heading');
      expect(headingElement.tagName).toBe('H6');
      expect(headingElement).toHaveClass('d-inline');
    });

    it('strips unsupported markdown (code blocks)', () => {
      Object.defineProperty(document, 'querySelector', {
        value: (selector: string) => {
          switch (selector) {
            case `meta[name='artifacthub:motd']`:
              return {
                getAttribute: () => '```code block```',
              };
            default:
              return false;
          }
        },
        writable: true,
      });

      render(<BannerMOTD />);

      expect(screen.getByText('code block')).toBeInTheDocument();
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
      expect(alert).toHaveClass('alert-danger');
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
