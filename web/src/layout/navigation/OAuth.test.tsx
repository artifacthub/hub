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
    /* eslint-disable no-native-reassign */
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
    delete (window as any).config;
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<OAuth {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<OAuth {...defaultProps} />);

      expect(screen.getByText('Github')).toBeInTheDocument();
      expect(screen.getByText('Google')).toBeInTheDocument();
      expect(screen.getByText('OpenID Connect')).toBeInTheDocument();
    });

    it('goes to correct route on Github btn click', async () => {
      render(<OAuth {...defaultProps} />);

      const btn = screen.getByText('Github');
      userEvent.click(btn);

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
      userEvent.click(btn);

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
      userEvent.click(btn);

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
          search: '?kind=0&ts_query=security&sort=relevance&page=1',
        },
        writable: true,
      });

      render(<OAuth {...defaultProps} />);

      const btn = screen.getByText('Github');
      userEvent.click(btn);

      await waitFor(() => {
        expect(setIsLoadingMock).toHaveBeenCalledTimes(1);
        expect(setIsLoadingMock).toHaveBeenCalledWith({
          type: 'github',
          status: true,
        });
      });

      expect(window.location.href).toBe(
        '/oauth/github?redirect_url=%2Fpackages%2Fsearch%3Fkind%3D0%26ts_query%3Dsecurity%26sort%3Drelevance%26page%3D1'
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

      const btn = screen.getByText('Github');
      userEvent.click(btn);

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
