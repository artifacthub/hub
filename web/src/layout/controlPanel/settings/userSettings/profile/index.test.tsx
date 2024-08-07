import { render, screen, waitFor } from '@testing-library/react';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

import API from '../../../../../api';
import { AppCtx } from '../../../../../context/AppCtx';
import { ErrorKind, Profile } from '../../../../../types';
import UserSettings from './index';
jest.mock('../../../../../api');

const getMockProfile = (fixtureId: string): Profile => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/index/${fixtureId}.json`) as Profile;
};

const onAuthErrorMock = jest.fn();

const defaultProps = {
  onAuthError: onAuthErrorMock,
};

const mockCtx = {
  user: { alias: 'userAlias', email: 'jsmith@email.com', passwordSet: false },
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

    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Router>
          <UserSettings {...defaultProps} />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(API.getUserProfile).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('Profile information')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockProfile = getMockProfile('2');
      mocked(API).getUserProfile.mockResolvedValue(mockProfile);

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

      expect(await screen.findByText('Profile information')).toBeInTheDocument();
      expect(await screen.findByText('Change password')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Deleting your account will also delete all the content that belongs to it (repositories, subscriptions, webhooks, etc), as well as all organizations where you are the only member.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('on getUserProfile error', () => {
    it('does not render profile information section if error is different to UnauthorizedError', async () => {
      mocked(API).getUserProfile.mockRejectedValue({ kind: ErrorKind.Other, message: 'error' });

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

      await waitFor(() => {
        expect(screen.queryByText('Profile information')).toBeNull();
        expect(screen.queryByTestId('updateProfileForm')).toBeNull();
        expect(screen.queryByText('Change password')).toBeNull();
      });
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

      await waitFor(() => {
        expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
      });
    });
  });
});
