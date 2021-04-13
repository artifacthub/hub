import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../../../api';
import { AppCtx } from '../../../../../context/AppCtx';
import { ErrorKind, Profile } from '../../../../../types';
import UserSettings from './index';
jest.mock('../../../../../api');

const getMockProfile = (fixtureId: string): Profile => {
  return require(`./__fixtures__/index/${fixtureId}.json`) as Profile;
};

const onAuthErrorMock = jest.fn();

const defaultProps = {
  onAuthError: onAuthErrorMock,
};

const mockCtx = {
  user: { alias: 'userAlias', email: 'jsmith@email.com' },
  prefs: {
    controlPanel: {},
    search: { limit: 60 },
    theme: {
      configured: 'light',
      effective: 'light',
    },
    notifications: {
      lastDisplayedTime: null,
      enabled: true,
      displayed: [],
    },
  },
};

describe('User settings index', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockProfile = getMockProfile('1');
    mocked(API).getUserProfile.mockResolvedValue(mockProfile);

    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Router>
          <UserSettings {...defaultProps} />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(API.getUserProfile).toHaveBeenCalledTimes(1);
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockProfile = getMockProfile('2');
      mocked(API).getUserProfile.mockResolvedValue(mockProfile);

      const { getByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <UserSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getUserProfile).toHaveBeenCalledTimes(1);
      });

      expect(getByText('Profile information')).toBeInTheDocument();
      expect(getByText('Change password')).toBeInTheDocument();
    });
  });

  describe('on getUserProfile error', () => {
    it('does not render profile information section if error is different to UnauthorizedError', async () => {
      mocked(API).getUserProfile.mockRejectedValue({ kind: ErrorKind.Other, message: 'error' });

      const { queryByText, queryByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <UserSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getUserProfile).toHaveBeenCalledTimes(1);
      });

      expect(queryByText('Profile information')).toBeNull();
      expect(queryByTestId('updateProfileForm')).toBeNull();
      expect(queryByText('Change password')).toBeNull();
    });

    it('calls onAuthError if error is UnauthorizedError', async () => {
      mocked(API).getUserProfile.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <UserSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getUserProfile).toHaveBeenCalledTimes(1);
      });

      expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
    });
  });
});
