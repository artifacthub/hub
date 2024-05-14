import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import OAuth from './OAuth';
jest.mock('../../api');

const setIsLoadingMock = jest.fn();

const defaultProps = {
  isLoading: { status: false },
  setIsLoading: setIsLoadingMock,
};

Object.defineProperty(document, 'querySelector', {
  value: () => ({
    getAttribute: () => 'true',
  }),
});

describe('OAuth', () => {
  beforeEach(() => {
    /* eslint-disable no-global-assign */
    window = Object.create(window);
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost',
        pathname: '/control-panel',
      },
      writable: true,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).config;
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<OAuth {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<OAuth {...defaultProps} />);

      expect(screen.getByText('GitHub')).toBeInTheDocument();
      expect(screen.getByText('Google')).toBeInTheDocument();
      expect(screen.getByText('OpenID Connect')).toBeInTheDocument();
    });

    it('goes to correct route on GitHub btn click', async () => {
      render(<OAuth {...defaultProps} />);

      const btn = screen.getByText('GitHub');
      await userEvent.click(btn);

      await waitFor(() => {
        expect(setIsLoadingMock).toHaveBeenCalledTimes(1);
        expect(setIsLoadingMock).toHaveBeenCalledWith({
          type: 'github',
          status: true,
        });
      });

      expect(window.location.href).toBe('/oauth/github?redirect_url=%2Fcontrol-panel');
    });

    it('goes to correct route on Google btn click', async () => {
      render(<OAuth {...defaultProps} />);

      const btn = screen.getByText('Google');
      await userEvent.click(btn);

      await waitFor(() => {
        expect(setIsLoadingMock).toHaveBeenCalledTimes(1);
        expect(setIsLoadingMock).toHaveBeenCalledWith({
          type: 'google',
          status: true,
        });
      });

      expect(window.location.href).toBe('/oauth/google?redirect_url=%2Fcontrol-panel');
    });

    it('goes to correct route on OpenID btn click', async () => {
      render(<OAuth {...defaultProps} />);

      const btn = screen.getByText('OpenID Connect');
      await userEvent.click(btn);

      await waitFor(() => {
        expect(setIsLoadingMock).toHaveBeenCalledTimes(1);
        expect(setIsLoadingMock).toHaveBeenCalledWith({
          type: 'oidc',
          status: true,
        });
      });

      expect(window.location.href).toBe('/oauth/oidc?redirect_url=%2Fcontrol-panel');
    });

    it('goes to correct route with querystring on btn click', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'http://localhost',
          pathname: '/packages/search',
          search: '?kind=0&sort=relevance&page=1',
        },
        writable: true,
      });

      render(<OAuth {...defaultProps} />);

      const btn = screen.getByText('GitHub');
      await userEvent.click(btn);

      await waitFor(() => {
        expect(setIsLoadingMock).toHaveBeenCalledTimes(1);
        expect(setIsLoadingMock).toHaveBeenCalledWith({
          type: 'github',
          status: true,
        });
      });

      expect(window.location.href).toBe(
        '/oauth/github?redirect_url=%2Fpackages%2Fsearch%3Fkind%3D0%26sort%3Drelevance%26page%3D1'
      );
    });

    it('goes to correct route without wrong querystring on btn click', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'http://localhost',
          pathname: '/',
          search: '?modal=login&redirect=%2F',
        },
        writable: true,
      });

      render(<OAuth {...defaultProps} />);

      const btn = screen.getByText('GitHub');
      await userEvent.click(btn);

      await waitFor(() => {
        expect(setIsLoadingMock).toHaveBeenCalledTimes(1);
        expect(setIsLoadingMock).toHaveBeenCalledWith({
          type: 'github',
          status: true,
        });
      });

      expect(window.location.href).toBe('/oauth/github?redirect_url=%2F');
    });
  });
});
