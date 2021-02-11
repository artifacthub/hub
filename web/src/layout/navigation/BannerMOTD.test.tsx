import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import BannerMOTD from './BannerMOTD';

describe('BannerMOTD', () => {
  afterEach(() => {
    delete (window as any).config;
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    (window as any).config = {
      motd: 'this is a sample',
    };

    const result = render(<BannerMOTD />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      (window as any).config = {
        motd: 'this is a sample',
      };

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

      const { getByRole } = render(<BannerMOTD />);

      const alert = getByRole('alert');
      expect(alert).toHaveClass('dangerAlert alert-danger');
    });

    it('closes alert', () => {
      (window as any).config = {
        motd: 'this is a sample',
      };

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
        const { container } = render(<BannerMOTD />);
        expect(container).toBeEmptyDOMElement();
      });

      it('when motd is a empty string', () => {
        (window as any).config = {
          motd: '',
        };

        const { container } = render(<BannerMOTD />);
        expect(container).toBeEmptyDOMElement();
      });

      it('when motd is a {{ .motd }}', () => {
        // This is important for dev
        (window as any).config = {
          motd: '{{ .motd }}',
        };

        const { container } = render(<BannerMOTD />);
        expect(container).toBeEmptyDOMElement();
      });
    });
  });
});
