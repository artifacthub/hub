import { render, screen, wait, waitForElement, waitForElementToBeRemoved } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { Profile } from '../../../types';
import UserSettings from './UserSettings';
jest.mock('../../../api');

const getMockProfile = (fixtureId: string): Profile => {
  return require(`./__fixtures__/UserSettings/${fixtureId}.json`) as Profile;
};

const defaultProps = {
  onAuthError: jest.fn(),
};

const mockCtx = {
  user: { alias: 'userAlias', email: 'jsmith@email.com' },
  org: null,
  requestSignIn: false,
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

    expect(result.asFragment()).toMatchSnapshot();
    await wait();
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
      expect(API.getUserProfile).toHaveBeenCalledTimes(1);
      await wait();
    });

    it('removes loading spinner after getting user profile', async () => {
      const mockProfile = getMockProfile('3');
      mocked(API).getUserProfile.mockResolvedValue(mockProfile);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <UserSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const spinner = await waitForElementToBeRemoved(() => screen.getByRole('status'));

      expect(spinner).toBeTruthy();
      await wait();
    });

    it('displays no data component when no organization details', async () => {
      const mockProfile = getMockProfile('4');
      mocked(API).getUserProfile.mockRejectedValue(mockProfile);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <UserSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const noData = await waitForElement(() => screen.getByTestId('noData'));

      expect(noData).toBeInTheDocument();
      expect(
        screen.getByText('Sorry, an error occurred fetching your profile, please try again later.')
      ).toBeInTheDocument();

      await wait();
    });
  });
});
