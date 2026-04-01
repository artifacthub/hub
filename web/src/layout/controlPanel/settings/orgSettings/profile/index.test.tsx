import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { vi } from 'vitest';

import API from '../../../../../api';
import { AppCtx } from '../../../../../context/AppCtx';
import { ErrorKind, Organization } from '../../../../../types';
import ProfileOrgSection from './index';
vi.mock('../../../../../api');

const getMockOrganization = (fixtureId: string): Organization => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/index/${fixtureId}.json`) as Organization;
};

const onAuthErrorMock = jest.fn();

const defaultProps = {
  onAuthError: onAuthErrorMock,
};

const authorizerMock = vi.hoisted(() => ({
  check: vi.fn(() => true),
  init: vi.fn(),
  updateCtx: vi.fn(),
  getAllowedActionsList: vi.fn(),
}));

vi.mock('../../../../../utils/authorizer', () => ({
  __esModule: true,
  default: authorizerMock,
}));

const mockCtx = {
  user: { alias: 'test', email: 'test@test.com', passwordSet: true },
  prefs: {
    controlPanel: {
      selectedOrg: 'orgTest',
    },
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

describe('Organization profile settings index', () => {
  afterEach(() => {
    jest.resetAllMocks();
    authorizerMock.check.mockClear();
  });

  it('creates snapshot', async () => {
    const mockOrganization = getMockOrganization('1');
    vi.mocked(API).getOrganization.mockResolvedValue(mockOrganization);

    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Router>
          <ProfileOrgSection {...defaultProps} />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(API.getOrganization).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('Profile information')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockOrganization = getMockOrganization('2');
      vi.mocked(API).getOrganization.mockResolvedValue(mockOrganization);

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

      expect(await screen.findByText('Profile information')).toBeInTheDocument();
      expect(screen.getAllByText('Delete organization')).toHaveLength(3);
    });
  });

  describe('when getPackage call fails', () => {
    it('not found', async () => {
      vi.mocked(API).getOrganization.mockResolvedValue(null);

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

      const noData = await screen.findByRole('alert');
      expect(noData).toBeInTheDocument();
      expect(screen.getByText('Sorry, the organization you requested was not found.')).toBeInTheDocument();
    });

    it('generic error', async () => {
      vi.mocked(API).getOrganization.mockRejectedValue({ kind: ErrorKind.Other });

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

      const noData = await screen.findByRole('alert');
      expect(noData).toBeInTheDocument();
      expect(
        screen.getByText(/An error occurred getting the organization details, please try again later./i)
      ).toBeInTheDocument();
    });

    it('UnauthorizedError', async () => {
      vi.mocked(API).getOrganization.mockRejectedValue({
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

      await waitFor(() => {
        expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
      });
    });
  });
});
