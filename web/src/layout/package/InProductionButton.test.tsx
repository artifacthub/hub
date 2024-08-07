import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

import API from '../../api';
import { AppCtx } from '../../context/AppCtx';
import { ErrorKind, Organization } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import InProductionButton from './InProductionButton';
jest.mock('../../api');
jest.mock('../../utils/alertDispatcher');

const mockDispatch = jest.fn();

const defaultProps = {
  normalizedName: 'pkgName',
  repository: {
    repositoryId: '0acb228c-17ab-4e50-85e9-ffc7102ea423',
    kind: 0,
    name: 'stable',
    displayName: 'Stable',
    url: 'http://repoUrl.com',
    userAlias: 'user',
    verifiedPublisher: false,
    official: false,
  },
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

const mockNotSignedInCtx = {
  user: null,
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

const mockUndefinedUserCtx = {
  user: undefined,
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

const getMockProductionUsage = (fixtureId: string): Organization[] => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/InProductionButton/${fixtureId}.json`) as Organization[];
};

describe('InProductionButton', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockProductionUsage = getMockProductionUsage('1');
    mocked(API).getProductionUsage.mockResolvedValue(mockProductionUsage);

    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Router>
          <InProductionButton {...defaultProps} />
        </Router>
      </AppCtx.Provider>
    );

    await userEvent.click(screen.getByRole('button', { name: /Open organizations menu/ }));

    await waitFor(() => {
      expect(API.getProductionUsage).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findAllByRole('button')).toHaveLength(4);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    describe('when user is signed in', () => {
      it('renders component', async () => {
        const mockProductionUsage = getMockProductionUsage('2');
        mocked(API).getProductionUsage.mockResolvedValue(mockProductionUsage);

        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Router>
              <InProductionButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        const button = screen.getByRole('button', { name: /Open organizations menu/ });
        expect(button).toBeInTheDocument();
        expect(button).not.toBeDisabled();
        await userEvent.click(button);

        await waitFor(() => {
          expect(API.getProductionUsage).toHaveBeenCalledTimes(1);
          expect(API.getProductionUsage).toHaveBeenCalledWith({
            packageName: 'pkgName',
            repositoryKind: 'helm',
            repositoryName: 'stable',
          });
        });

        await waitFor(() => {
          expect(screen.queryByRole('status')).toBeNull();
        });

        expect(screen.getByRole('menu')).toBeInTheDocument();
        expect(
          screen.getByText('Select which of your organizations are using this package in production')
        ).toBeInTheDocument();
        expect(screen.getByText('Artifact Hub')).toBeInTheDocument();
        expect(screen.getByText('Org test')).toBeInTheDocument();
        expect(screen.getByText('test1')).toBeInTheDocument();

        expect(
          screen.getByRole('button', {
            name: "Delete Artifact Hub organization from package's production users list",
          })
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', {
            name: "Add Org test organization to package's production users list",
          })
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', {
            name: "Add test1 organization to package's production users list",
          })
        ).toBeInTheDocument();
      });

      it('renders empty menu when any orgs', async () => {
        mocked(API).getProductionUsage.mockResolvedValue([]);

        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Router>
              <InProductionButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        const button = screen.getByRole('button', { name: /Open organizations menu/ });
        expect(button).toBeInTheDocument();
        expect(button).not.toBeDisabled();
        await userEvent.click(button);

        await waitFor(() => {
          expect(API.getProductionUsage).toHaveBeenCalledTimes(1);
          expect(API.getProductionUsage).toHaveBeenCalledWith({
            packageName: 'pkgName',
            repositoryKind: 'helm',
            repositoryName: 'stable',
          });
        });

        expect(screen.getByRole('menu')).toBeInTheDocument();
        expect(
          screen.getByText(
            "Here you'll be able to specify which of the organizations you belong to are using this package in production."
          )
        ).toBeInTheDocument();
      });

      it("deletes org from pkg's production users list", async () => {
        const mockProductionUsage = getMockProductionUsage('3');
        mocked(API).getProductionUsage.mockResolvedValue(mockProductionUsage);
        mocked(API).deleteProductionUsage.mockResolvedValue(null);

        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Router>
              <InProductionButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        await userEvent.click(screen.getByRole('button', { name: /Open organizations menu/ }));

        await waitFor(() => {
          expect(API.getProductionUsage).toHaveBeenCalledTimes(1);
        });

        const btn = await screen.findByRole('button', {
          name: "Delete Artifact Hub organization from package's production users list",
        });
        expect(btn).toBeInTheDocument();
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.deleteProductionUsage).toHaveBeenCalledTimes(1);
          expect(API.deleteProductionUsage).toHaveBeenCalledWith(
            {
              packageName: 'pkgName',
              repositoryKind: 'helm',
              repositoryName: 'stable',
            },
            'artifact-hub'
          );
        });

        await waitFor(() => {
          expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
          expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
            type: 'info',
            message: "Your change was applied successfully. It'll be visible across the site in a few minutes",
          });
        });

        await waitFor(() => {
          expect(screen.getByRole('menu')).not.toHaveClass('show');
        });
      });

      it("adds org to pkg's production users list", async () => {
        const mockProductionUsage = getMockProductionUsage('4');
        mocked(API).getProductionUsage.mockResolvedValue(mockProductionUsage);
        mocked(API).addProductionUsage.mockResolvedValue(null);

        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Router>
              <InProductionButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        await userEvent.click(screen.getByRole('button', { name: /Open organizations menu/ }));

        await waitFor(() => {
          expect(API.getProductionUsage).toHaveBeenCalledTimes(1);
        });

        const btn = await screen.findByRole('button', {
          name: "Add Org test organization to package's production users list",
        });
        expect(btn).toBeInTheDocument();
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.addProductionUsage).toHaveBeenCalledTimes(1);
          expect(API.addProductionUsage).toHaveBeenCalledWith(
            {
              packageName: 'pkgName',
              repositoryKind: 'helm',
              repositoryName: 'stable',
            },
            'test'
          );
        });

        await waitFor(() => {
          expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
          expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
            type: 'info',
            message: "Your change was applied successfully. It'll be visible across the site in a few minutes",
          });
        });

        await waitFor(() => {
          expect(screen.getByRole('menu')).not.toHaveClass('show');
        });
      });
    });

    describe('when getProductionUsage fails', () => {
      it('with any error', async () => {
        mocked(API).getProductionUsage.mockRejectedValue({ kind: ErrorKind.Other });

        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Router>
              <InProductionButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        await userEvent.click(screen.getByRole('button', { name: /Open organizations menu/ }));

        await waitFor(() => {
          expect(API.getProductionUsage).toHaveBeenCalledTimes(1);
          expect(API.getProductionUsage).toHaveBeenCalledWith({
            packageName: 'pkgName',
            repositoryKind: 'helm',
            repositoryName: 'stable',
          });
        });

        await waitFor(() => {
          expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
          expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
            type: 'danger',
            message:
              'Something went wrong checking if your organizations use this package in production, please try again later.',
          });
        });
      });

      it('when user is not authorized', async () => {
        mocked(API).getProductionUsage.mockRejectedValue({ kind: ErrorKind.Unauthorized });

        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
            <Router>
              <InProductionButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        await userEvent.click(screen.getByRole('button', { name: /Open organizations menu/ }));

        await waitFor(() => {
          expect(API.getProductionUsage).toHaveBeenCalledTimes(1);
          expect(API.getProductionUsage).toHaveBeenCalledWith({
            packageName: 'pkgName',
            repositoryKind: 'helm',
            repositoryName: 'stable',
          });
        });

        await waitFor(() => {
          expect(mockDispatch).toHaveBeenCalledTimes(1);
          expect(mockDispatch).toHaveBeenCalledWith({ type: 'signOut' });
        });
      });
    });

    describe('when addProductionUsage fails', () => {
      it('with any error', async () => {
        const mockProductionUsage = getMockProductionUsage('5');
        mocked(API).getProductionUsage.mockResolvedValue(mockProductionUsage);
        mocked(API).addProductionUsage.mockRejectedValue({ kind: ErrorKind.Other });

        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Router>
              <InProductionButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        await userEvent.click(screen.getByRole('button', { name: /Open organizations menu/ }));

        await waitFor(() => {
          expect(API.getProductionUsage).toHaveBeenCalledTimes(1);
        });

        const btn = await screen.findByRole('button', {
          name: "Add Org test organization to package's production users list",
        });
        expect(btn).toBeInTheDocument();
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.addProductionUsage).toHaveBeenCalledTimes(1);
          expect(API.addProductionUsage).toHaveBeenCalledWith(
            {
              packageName: 'pkgName',
              repositoryKind: 'helm',
              repositoryName: 'stable',
            },
            'test'
          );
        });

        await waitFor(() => {
          expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
          expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
            type: 'danger',
            message:
              'Something went wrong adding the selected organization to the list of production users of this package, please try again later.',
          });
        });

        await waitFor(() => {
          expect(screen.getByRole('menu')).not.toHaveClass('show');
        });
      });

      it('when user is not authorized', async () => {
        const mockProductionUsage = getMockProductionUsage('5');
        mocked(API).getProductionUsage.mockResolvedValue(mockProductionUsage);
        mocked(API).addProductionUsage.mockRejectedValue({ kind: ErrorKind.Unauthorized });

        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
            <Router>
              <InProductionButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        await userEvent.click(screen.getByRole('button', { name: /Open organizations menu/ }));

        await waitFor(() => {
          expect(API.getProductionUsage).toHaveBeenCalledTimes(1);
        });

        const btn = await screen.findByRole('button', {
          name: "Add Org test organization to package's production users list",
        });
        expect(btn).toBeInTheDocument();
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.addProductionUsage).toHaveBeenCalledTimes(1);
          expect(API.addProductionUsage).toHaveBeenCalledWith(
            {
              packageName: 'pkgName',
              repositoryKind: 'helm',
              repositoryName: 'stable',
            },
            'test'
          );
        });

        await waitFor(() => {
          expect(mockDispatch).toHaveBeenCalledTimes(1);
          expect(mockDispatch).toHaveBeenCalledWith({ type: 'signOut' });
        });
      });
    });

    describe('when deleteProductionUsage fails', () => {
      it('with any error', async () => {
        const mockProductionUsage = getMockProductionUsage('6');
        mocked(API).getProductionUsage.mockResolvedValue(mockProductionUsage);
        mocked(API).deleteProductionUsage.mockRejectedValue({ kind: ErrorKind.Other });

        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Router>
              <InProductionButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        await userEvent.click(screen.getByRole('button', { name: /Open organizations menu/ }));

        await waitFor(() => {
          expect(API.getProductionUsage).toHaveBeenCalledTimes(1);
        });

        const btn = await screen.findByRole('button', {
          name: "Delete Artifact Hub organization from package's production users list",
        });
        expect(btn).toBeInTheDocument();
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.deleteProductionUsage).toHaveBeenCalledTimes(1);
          expect(API.deleteProductionUsage).toHaveBeenCalledWith(
            {
              packageName: 'pkgName',
              repositoryKind: 'helm',
              repositoryName: 'stable',
            },
            'artifact-hub'
          );
        });

        await waitFor(() => {
          expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
          expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
            type: 'danger',
            message:
              'Something went wrong deleting the selected organization from the list of production users of this package, please try again later.',
          });
        });

        await waitFor(() => {
          expect(screen.getByRole('menu')).not.toHaveClass('show');
        });
      });

      it('when user is not authorized', async () => {
        const mockProductionUsage = getMockProductionUsage('6');
        mocked(API).getProductionUsage.mockResolvedValue(mockProductionUsage);
        mocked(API).deleteProductionUsage.mockRejectedValue({ kind: ErrorKind.Unauthorized });

        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
            <Router>
              <InProductionButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        await userEvent.click(screen.getByRole('button', { name: /Open organizations menu/ }));

        await waitFor(() => {
          expect(API.getProductionUsage).toHaveBeenCalledTimes(1);
        });

        const btn = await screen.findByRole('button', {
          name: "Delete Artifact Hub organization from package's production users list",
        });
        expect(btn).toBeInTheDocument();
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.deleteProductionUsage).toHaveBeenCalledTimes(1);
          expect(API.deleteProductionUsage).toHaveBeenCalledWith(
            {
              packageName: 'pkgName',
              repositoryKind: 'helm',
              repositoryName: 'stable',
            },
            'artifact-hub'
          );
        });

        await waitFor(() => {
          expect(mockDispatch).toHaveBeenCalledTimes(1);
          expect(mockDispatch).toHaveBeenCalledWith({ type: 'signOut' });
        });
      });
    });

    describe('displays disabled button', () => {
      it('when user is not signed in', async () => {
        render(
          <AppCtx.Provider value={{ ctx: mockNotSignedInCtx, dispatch: jest.fn() }}>
            <Router>
              <InProductionButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        const btn = await screen.findByRole('button', {
          name: /Open organizations menu/,
        });
        expect(btn).toBeInTheDocument();
        expect(btn).toHaveClass('disabled');

        await userEvent.hover(btn);

        expect(await screen.findByRole('tooltip')).toBeInTheDocument();
        expect(
          screen.getByText(
            'You must be signed in to specify which of your organizations are using this package in production'
          )
        ).toBeInTheDocument();
      });

      it('when user is undefined', async () => {
        render(
          <AppCtx.Provider value={{ ctx: mockUndefinedUserCtx, dispatch: jest.fn() }}>
            <Router>
              <InProductionButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        const btn = await screen.findByRole('button', {
          name: /Open organizations menu/,
        });
        expect(btn).toBeInTheDocument();
        expect(btn).toHaveClass('disabled');
      });
    });
  });
});
