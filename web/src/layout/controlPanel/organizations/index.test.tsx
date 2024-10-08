import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

import API from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { ErrorKind } from '../../../types';
import OrganizationsSection from './index';
jest.mock('../../../api');

const getMockOrganizations = (fixtureId: string) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/index/${fixtureId}.json`);
};

const onAuthErrorMock = jest.fn();

const defaultProps = {
  onAuthError: onAuthErrorMock,
  activePage: null,
};

const mockCtx = {
  user: { alias: 'userAlias', email: 'jsmith@email.com', passwordSet: true },
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

describe('Organizations section index', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockOrganizations = getMockOrganizations('1');
    mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);

    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Router>
          <OrganizationsSection {...defaultProps} />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findAllByTestId('organizationCard')).toHaveLength(2);
    expect(asFragment()).toMatchSnapshot();
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

      expect(await screen.findAllByTestId('organizationCard')).toHaveLength(2);
    });

    it('displays no data component when no organizations', async () => {
      const mockOrganizations = getMockOrganizations('4');
      mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <OrganizationsSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      expect(screen.getByText('Do you need to create a organization?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open modal for adding first organization' })).toBeInTheDocument();
    });

    it('renders organization form when add first org button is clicked', async () => {
      const mockOrganizations = getMockOrganizations('5');
      mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <OrganizationsSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      expect(screen.queryByText('Name')).toBeNull();
      expect(screen.queryByText('Display name')).toBeNull();
      expect(screen.queryByText('Home URL')).toBeNull();
      expect(screen.queryByText('Description')).toBeNull();

      const addBtn = await screen.findByRole('button', { name: 'Open modal for adding first organization' });
      await userEvent.click(addBtn);
      expect(screen.queryByText('Name')).toBeInTheDocument();
      expect(screen.queryByText('Display name')).toBeInTheDocument();
      expect(screen.queryByText('Home URL')).toBeInTheDocument();
      expect(screen.queryByText('Description')).toBeInTheDocument();
    });

    it('renders organization form when add org button is clicked', async () => {
      const mockOrganizations = getMockOrganizations('6');
      mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <OrganizationsSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const addBtn = await screen.findByRole('button', { name: 'Open modal' });
      expect(addBtn).toBeInTheDocument();

      expect(screen.queryByText('Name')).toBeNull();
      expect(screen.queryByText('Display name')).toBeNull();
      expect(screen.queryByText('Home URL')).toBeNull();
      expect(screen.queryByText('Description')).toBeNull();

      await userEvent.click(addBtn);

      expect(screen.queryByText('Name')).toBeInTheDocument();
      expect(screen.queryByText('Display name')).toBeInTheDocument();
      expect(screen.queryByText('Home URL')).toBeInTheDocument();
      expect(screen.queryByText('Description')).toBeInTheDocument();
    });
  });

  it('renders 2 organization cards', async () => {
    const mockOrganizations = getMockOrganizations('6');
    mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);

    render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Router>
          <OrganizationsSection {...defaultProps} />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(screen.getAllByTestId('organizationCard')).toHaveLength(2);
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

      await waitFor(() => expect(onAuthErrorMock).toHaveBeenCalledTimes(1));
    });

    it('rest API errors - displays generic error message', async () => {
      mocked(API).getUserOrganizations.mockRejectedValue({ kind: ErrorKind.Other, message: 'error' });

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <OrganizationsSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => expect(API.getUserOrganizations).toHaveBeenCalledTimes(1));

      await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
      expect(
        screen.getByText(/An error occurred getting your organizations, please try again later./i)
      ).toBeInTheDocument();
    });
  });
});
