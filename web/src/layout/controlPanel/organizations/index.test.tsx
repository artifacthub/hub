import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { ErrorKind, Organization } from '../../../types';
import OrganizationsSection from './index';
jest.mock('../../../api');

const getMockOrganizations = (fixtureId: string): Organization[] => {
  return require(`./__fixtures__/index/${fixtureId}.json`) as Organization[];
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
  },
};

describe('Organizations section index', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockOrganizations = getMockOrganizations('1');
    mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);

    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Router>
          <OrganizationsSection {...defaultProps} />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockOrganizations = getMockOrganizations('2');
      mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <OrganizationsSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
      });
    });

    it('displays no data component when no organizations', async () => {
      const mockOrganizations = getMockOrganizations('4');
      mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);

      const { getByTestId, getByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <OrganizationsSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(getByTestId('noData')).toBeInTheDocument();
      });
      expect(getByText('Do you need to create a organization?')).toBeInTheDocument();
      expect(getByTestId('addFirstOrgBtn')).toBeInTheDocument();
    });

    it('renders organization form when add first org button is clicked', async () => {
      const mockOrganizations = getMockOrganizations('5');
      mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);

      const { getByTestId, queryByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <OrganizationsSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(getByTestId('noData')).toBeInTheDocument();
      });

      expect(queryByText('Name')).toBeNull();
      expect(queryByText('Display name')).toBeNull();
      expect(queryByText('Home URL')).toBeNull();
      expect(queryByText('Description')).toBeNull();

      const addBtn = getByTestId('addFirstOrgBtn');
      fireEvent.click(addBtn);
      expect(queryByText('Name')).toBeInTheDocument();
      expect(queryByText('Display name')).toBeInTheDocument();
      expect(queryByText('Home URL')).toBeInTheDocument();
      expect(queryByText('Description')).toBeInTheDocument();
    });

    it('renders organization form when add org button is clicked', async () => {
      const mockOrganizations = getMockOrganizations('6');
      mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);

      const { getByTestId, queryByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <OrganizationsSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const addBtn = await waitFor(() => getByTestId('addOrgButton'));
      expect(addBtn).toBeInTheDocument();

      expect(queryByText('Name')).toBeNull();
      expect(queryByText('Display name')).toBeNull();
      expect(queryByText('Home URL')).toBeNull();
      expect(queryByText('Description')).toBeNull();

      fireEvent.click(addBtn);

      expect(queryByText('Name')).toBeInTheDocument();
      expect(queryByText('Display name')).toBeInTheDocument();
      expect(queryByText('Home URL')).toBeInTheDocument();
      expect(queryByText('Description')).toBeInTheDocument();
    });
  });

  it('renders 2 organization cards', async () => {
    const mockOrganizations = getMockOrganizations('6');
    mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);

    const { getAllByTestId } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Router>
          <OrganizationsSection {...defaultProps} />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(getAllByTestId('organizationCard')).toHaveLength(2);
    });
  });

  describe('on getUserOrganizations error', () => {
    it('UnauthorizedError', async () => {
      mocked(API).getUserOrganizations.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <OrganizationsSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => expect(API.getUserOrganizations).toHaveBeenCalledTimes(1));

      expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
    });

    it('rest API errors - displays generic error message', async () => {
      mocked(API).getUserOrganizations.mockRejectedValue({ kind: ErrorKind.Other, message: 'error' });

      const { getByTestId, getByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <OrganizationsSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => expect(API.getUserOrganizations).toHaveBeenCalledTimes(1));

      expect(getByTestId('noData')).toBeInTheDocument();
      expect(getByText(/An error occurred getting your organizations, please try again later./i)).toBeInTheDocument();
    });
  });
});
