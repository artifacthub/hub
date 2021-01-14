import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../../../api';
import { AppCtx } from '../../../../../context/AppCtx';
import { ErrorKind, Organization } from '../../../../../types';
import ProfileOrgSection from './index';
jest.mock('../../../../../api');

const getMockOrganization = (fixtureId: string): Organization => {
  return require(`./__fixtures__/index/${fixtureId}.json`) as Organization;
};

const onAuthErrorMock = jest.fn();

const defaultProps = {
  onAuthError: onAuthErrorMock,
};

jest.mock('../../../../../utils/authorizer', () => ({
  check: () => {
    return true;
  },
}));

const mockCtx = {
  user: { alias: 'test', email: 'test@test.com' },
  prefs: {
    controlPanel: {
      selectedOrg: 'orgTest',
    },
    search: { limit: 60 },
    theme: {
      configured: 'light',
      automatic: false,
    },
  },
};

describe('Organization profile settings index', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockOrganization = getMockOrganization('1');
    mocked(API).getOrganization.mockResolvedValue(mockOrganization);

    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Router>
          <ProfileOrgSection {...defaultProps} />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockOrganization = getMockOrganization('2');
      mocked(API).getOrganization.mockResolvedValue(mockOrganization);

      const { getByText, getAllByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <ProfileOrgSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getOrganization).toHaveBeenCalledTimes(1);
      });

      expect(getByText('Profile information')).toBeInTheDocument();
      expect(getAllByText('Delete organization')).toHaveLength(3);
    });
  });

  describe('when getPackage call fails', () => {
    it('not found', async () => {
      mocked(API).getOrganization.mockResolvedValue(null);

      const { getByTestId, getByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <ProfileOrgSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getOrganization).toHaveBeenCalledTimes(1);
      });

      const noData = getByTestId('noData');

      expect(noData).toBeInTheDocument();
      expect(getByText('Sorry, the organization you requested was not found.')).toBeInTheDocument();
    });

    it('generic error', async () => {
      mocked(API).getOrganization.mockRejectedValue({ kind: ErrorKind.Other });

      const { getByTestId, getByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <ProfileOrgSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getOrganization).toHaveBeenCalledTimes(1);
      });

      const noData = getByTestId('noData');

      expect(noData).toBeInTheDocument();
      expect(
        getByText(/An error occurred getting the organization details, please try again later./i)
      ).toBeInTheDocument();
    });

    it('UnauthorizedError', async () => {
      mocked(API).getOrganization.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <ProfileOrgSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getOrganization).toHaveBeenCalledTimes(1);
      });

      expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
    });
  });
});
