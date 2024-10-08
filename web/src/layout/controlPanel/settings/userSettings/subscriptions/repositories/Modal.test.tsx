import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';

import API from '../../../../../../api';
import { AppCtx } from '../../../../../../context/AppCtx';
import { OptOutItem } from '../../../../../../types';
import alertDispatcher from '../../../../../../utils/alertDispatcher';
import OptOutModal from './Modal';
jest.mock('../../../../../../api');
jest.mock('../../../../../../utils/alertDispatcher');

const scrollIntoViewMock = jest.fn();

window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const mockOnSuccess = jest.fn();
const mockOnClose = jest.fn();
const mockOnAuthError = jest.fn();

const mockOptOutList: OptOutItem[] = [
  {
    optOutId: '5trurt4sf-drtyrygfe5-po09rikjtr',
    repository: {
      kind: 0,
      name: 'artifact-hub',
      displayName: 'Artifact Hub',
      repositoryId: 'a032a436-3568-4970-804a-2780f5e9d231',
      organizationName: 'artifactHub',
      url: 'http://url2.com',
    },
    eventKind: 2,
  },
];

const getMockOrgs = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./__fixtures__/Modal/orgs.json');
};

const getMockRepos = (repoName?: string) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/Modal/${repoName || 'user'}.json`);
};

const defaultProps = {
  open: true,
  optOutList: mockOptOutList,
  disabledList: [],
  onSuccess: mockOnSuccess,
  onClose: mockOnClose,
  onAuthError: mockOnAuthError,
  getNotificationTitle: () => 'tracking errors',
};

const mockCtx = {
  user: { alias: 'test', email: 'test@test.com', passwordSet: true },
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

describe('OptOutModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    mocked(API).getAllUserOrganizations.mockResolvedValue(getMockOrgs());

    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <OptOutModal {...defaultProps} />
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('Add opt-out entry')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      mocked(API).getAllUserOrganizations.mockResolvedValue(getMockOrgs());

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <OptOutModal {...defaultProps} />
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByText('Add opt-out entry')).toBeInTheDocument();
      expect(screen.getByText('Events')).toBeInTheDocument();
      expect(screen.getByText('Repository')).toBeInTheDocument();

      const btn = screen.getByRole('button', { name: 'Add opt-out entry' });
      expect(btn).toBeInTheDocument();
      expect(btn).toBeDisabled();

      const radio = screen.getByRole('radio', { name: 'Tracking errors' });
      expect(radio).toBeInTheDocument();
      expect(radio).toBeChecked();
    });
  });

  describe('calls addOptOut', () => {
    it('when is successful', async () => {
      mocked(API).getAllUserOrganizations.mockResolvedValue(getMockOrgs());
      mocked(API).searchRepositories.mockResolvedValue(getMockRepos('repos'));
      mocked(API).addOptOut.mockResolvedValue('');

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <OptOutModal {...defaultProps} />
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
      });

      const input = await screen.findByRole('textbox', { name: 'Search repositories' });
      expect(input).toBeInTheDocument();
      await userEvent.type(input, 'sec');

      await waitFor(() => {
        expect(API.searchRepositories).toHaveBeenCalledTimes(1);
      });

      const buttons = await screen.findAllByTestId('repoItem');
      expect(buttons).toHaveLength(3);
      await userEvent.click(buttons[1]);

      const activeRepo = await screen.findByTestId('activeRepoItem');

      expect(activeRepo).toBeInTheDocument();
      expect(activeRepo).toHaveTextContent('security-hub/(Publisher: test)(Publisher: test)');

      expect(screen.queryByTestId('searchRepositoriesInput')).toBeNull();

      const btn = screen.getByRole('button', { name: 'Add opt-out entry' });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.addOptOut).toHaveBeenCalledTimes(1);
        expect(API.addOptOut).toHaveBeenCalledWith('f0cebfe4-c4b2-4310-a6f8-e34525177ff6', 2);
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('when fails', async () => {
      mocked(API).getAllUserOrganizations.mockResolvedValue(getMockOrgs());
      mocked(API).searchRepositories.mockResolvedValue(getMockRepos('repos'));
      mocked(API).addOptOut.mockRejectedValue({});

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <OptOutModal {...defaultProps} />
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
      });

      const input = await screen.findByRole('textbox', { name: 'Search repositories' });
      expect(input).toBeInTheDocument();
      await userEvent.type(input, 'sec');

      await waitFor(() => {
        expect(API.searchRepositories).toHaveBeenCalledTimes(1);
      });

      const buttons = await screen.findAllByTestId('repoItem');
      await userEvent.click(buttons[1]);

      const activeRepo = await screen.findByTestId('activeRepoItem');

      expect(activeRepo).toBeInTheDocument();
      expect(activeRepo).toHaveTextContent('security-hub/(Publisher: test)(Publisher: test)');

      expect(screen.queryByRole('textbox', { name: 'Search repositories' })).toBeNull();

      const btn = screen.getByRole('button', { name: 'Add opt-out entry' });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.addOptOut).toHaveBeenCalledTimes(1);
        expect(API.addOptOut).toHaveBeenCalledWith('f0cebfe4-c4b2-4310-a6f8-e34525177ff6', 2);
      });

      await waitFor(() => {
        expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
        expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
          type: 'danger',
          message:
            'An error occurred adding the opt-out entry for tracking errors notifications for repository security-hub, please try again later.',
        });
      });
    });
  });
});
