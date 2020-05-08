import { render, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { Organization } from '../../../types';
import OrganizationSettings from './OrgSettings';
jest.mock('../../../api');

const getMockOrganization = (fixtureId: string): Organization => {
  return require(`./__fixtures__/OrgSettings/${fixtureId}.json`) as Organization;
};

const onAuthErrorMock = jest.fn();

const defaultProps = {
  onAuthError: onAuthErrorMock,
};

const mockCtx = {
  user: { alias: 'test', email: 'test@test.com' },
  prefs: {
    controlPanel: {
      selectedOrg: 'orgTest',
    },
    search: { limit: 25 },
  },
};

describe('Organization settings index', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockOrganization = getMockOrganization('1');
    mocked(API).getOrganization.mockResolvedValue(mockOrganization);

    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Router>
          <OrganizationSettings {...defaultProps} />
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

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <OrganizationSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getOrganization).toHaveBeenCalledTimes(1);
      });
    });

    it('removes loading spinner after getting organization details', async () => {
      const mockOrganization = getMockOrganization('3');
      mocked(API).getOrganization.mockResolvedValue(mockOrganization);

      const { getByRole } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <OrganizationSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const spinner = await waitForElementToBeRemoved(() => getByRole('status'));

      expect(spinner).toBeTruthy();
      await waitFor(() => {});
    });

    it('renders organization details in form', async () => {
      const mockOrganization = getMockOrganization('5');
      mocked(API).getOrganization.mockResolvedValue(mockOrganization);

      const { getByTestId, getByAltText, getByDisplayValue } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <OrganizationSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        const form = getByTestId('organizationForm');

        expect(form).toBeInTheDocument();
        expect(getByAltText('Logo')).toBeInTheDocument();
        expect(getByDisplayValue(mockOrganization.name)).toBeInTheDocument();
        expect(getByDisplayValue(mockOrganization.displayName!)).toBeInTheDocument();
        expect(getByDisplayValue(mockOrganization.homeUrl!)).toBeInTheDocument();
        expect(getByDisplayValue(mockOrganization.description!)).toBeInTheDocument();
      });

      await waitFor(() => {});
    });
  });

  describe('when getPackage call fails', () => {
    it('generic error', async () => {
      mocked(API).getOrganization.mockRejectedValue({ status: 400 });

      const { getByTestId, getByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <OrganizationSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getOrganization).toHaveBeenCalledTimes(1);
      });

      const noData = getByTestId('noData');

      expect(noData).toBeInTheDocument();
      expect(getByText('Sorry, the package you requested was not found.')).toBeInTheDocument();
    });

    it('error 500', async () => {
      mocked(API).getOrganization.mockRejectedValue({ status: 500 });

      const { getByTestId, getByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <OrganizationSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getOrganization).toHaveBeenCalledTimes(1);
      });

      const noData = getByTestId('noData');

      expect(noData).toBeInTheDocument();
      expect(
        getByText(/An error occurred getting the organization details, please try again later/i)
      ).toBeInTheDocument();
    });

    it('error 401', async () => {
      mocked(API).getOrganization.mockRejectedValue({ statusText: 'ErrLoginRedirect' });

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <OrganizationSettings {...defaultProps} />
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
