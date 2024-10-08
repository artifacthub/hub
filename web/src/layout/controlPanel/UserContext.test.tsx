import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

import API from '../../api';
import { AppCtx } from '../../context/AppCtx';
import UserContext from './UserContext';
jest.mock('../../api');

const getMockOrgs = (fixtureId: string) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/UserContext/${fixtureId}.json`);
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

const mockOrgCtx = {
  user: { alias: 'userAlias', email: 'jsmith@email.com', passwordSet: true },
  prefs: {
    controlPanel: {
      selectedOrg: 'test',
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

const mockOrgCtx1 = {
  user: { alias: 'userAlias', email: 'jsmith@email.com', passwordSet: true },
  prefs: {
    controlPanel: {
      selectedOrg: 'org',
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

const mockDispatch = jest.fn();

describe('UserContext', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockOrgs = getMockOrgs('1');
    mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrgs);

    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
        <Router>
          <UserContext />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByRole('button', { name: 'Open context' })).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockOrgs = getMockOrgs('2');
      mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrgs);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
          <Router>
            <UserContext />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByRole('button', { name: 'Open context' })).toBeInTheDocument();
    });

    it('displays spinner to get organizations', async () => {
      const mockOrgs = getMockOrgs('3');
      mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrgs);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
          <Router>
            <UserContext />
          </Router>
        </AppCtx.Provider>
      );

      expect(await screen.findByRole('status')).toBeInTheDocument();

      await waitFor(() => {
        expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByRole('button', { name: 'Open context' })).toBeInTheDocument();
    });

    it('displays dropdown with ctx', async () => {
      const mockOrgs = getMockOrgs('4');
      mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrgs);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
          <Router>
            <UserContext />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
      });

      const ctxBtn = await screen.findByRole('button', { name: 'Open context' });
      const ctxDropdown = await screen.findByRole('menu');

      expect(ctxBtn).toBeInTheDocument();
      expect(ctxDropdown).toBeInTheDocument();
      expect(ctxDropdown).not.toHaveClass('show');

      await userEvent.click(ctxBtn);

      expect(ctxDropdown).toHaveClass('show');

      await waitFor(() => {
        expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(2);
      });

      expect(await screen.findByRole('button', { name: 'Activate user context' })).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /Activate org/ })).toHaveLength(mockOrgs.length);
    });

    it('renders only user ctx when no orgs', async () => {
      const mockOrgs = getMockOrgs('5');
      mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrgs);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
          <Router>
            <UserContext />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByRole('button', { name: 'Activate user context' })).toBeInTheDocument();
      expect(screen.queryAllByTestId('orgCtxBtn')).toHaveLength(0);
    });

    it('calls updateOrg when org ctx button is clicked', async () => {
      const mockOrgs = getMockOrgs('4');
      mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrgs);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
          <Router>
            <UserContext />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
      });

      const ctxBtn = await screen.findByRole('button', { name: 'Open context' });
      const ctxDropdown = await screen.findByRole('menu');

      expect(ctxBtn).toBeInTheDocument();
      expect(ctxDropdown).toBeInTheDocument();
      expect(ctxDropdown).not.toHaveClass('show');

      await userEvent.click(ctxBtn);

      expect(ctxDropdown).toHaveClass('show');

      expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(2);

      expect(screen.getByRole('button', { name: 'Activate user context' })).toBeInTheDocument();

      const orgBtns = await screen.findAllByRole('button', { name: /Activate org/ });
      expect(orgBtns).toHaveLength(mockOrgs.length);

      await userEvent.click(orgBtns[0]);

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith({ name: 'test', type: 'updateOrg' });
      });

      expect(ctxDropdown).not.toHaveClass('show');
    });

    it('calls unselectOrg when user ctx button is clicked', async () => {
      const mockOrgs = getMockOrgs('4');
      mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrgs);

      render(
        <AppCtx.Provider value={{ ctx: mockOrgCtx, dispatch: mockDispatch }}>
          <Router>
            <UserContext />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
      });

      const ctxBtn = await screen.findByRole('button', { name: 'Open context' });
      await userEvent.click(ctxBtn);

      expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(2);

      const userCtxBtn = await screen.findByRole('button', { name: 'Activate user context' });
      await userEvent.click(userCtxBtn);

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'unselectOrg' });
      });
    });

    it('calls unselectOrg when selectedOrg is not in the list', async () => {
      const mockOrgs = getMockOrgs('4');
      mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrgs);

      render(
        <AppCtx.Provider value={{ ctx: mockOrgCtx1, dispatch: mockDispatch }}>
          <Router>
            <UserContext />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'unselectOrg' });
      });
    });
  });
});
