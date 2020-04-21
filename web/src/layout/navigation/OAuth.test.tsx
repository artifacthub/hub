import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import OAuth from './OAuth';
jest.mock('../../api');

const setIsLoadingMock = jest.fn();

const defaultProps = {
  isLoading: { status: false },
  setIsLoading: setIsLoadingMock,
};

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
    /* eslint-enable no-native-reassign */
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<OAuth {...defaultProps} />);

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText } = render(<OAuth {...defaultProps} />);

      expect(getByText('Github')).toBeInTheDocument();
      expect(getByText('Google')).toBeInTheDocument();
    });

    it('goes to correct route on Github btn click', () => {
      const { getByText } = render(<OAuth {...defaultProps} />);

      const btn = getByText('Github');
      fireEvent.click(btn);

      waitFor(() => {
        expect(setIsLoadingMock).toHaveBeenCalledTimes(1);
        expect(setIsLoadingMock).toHaveBeenCalledWith({
          name: 'github',
          status: true,
        });
      });

      expect(window.location.href).toBe('/oauth/github?redirect_url=/control-panel');
    });

    it('goes to correct route on Google btn click', () => {
      const { getByText } = render(<OAuth {...defaultProps} />);

      const btn = getByText('Google');
      fireEvent.click(btn);

      waitFor(() => {
        expect(setIsLoadingMock).toHaveBeenCalledTimes(1);
        expect(setIsLoadingMock).toHaveBeenCalledWith({
          name: 'google',
          status: true,
        });
      });

      expect(window.location.href).toBe('/oauth/google?redirect_url=/control-panel');
    });
  });
});
