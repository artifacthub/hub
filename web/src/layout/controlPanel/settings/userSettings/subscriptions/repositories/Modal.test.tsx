import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import API from '../../../../../../api';
import { AppCtx } from '../../../../../../context/AppCtx';
import { ListableItems, OptOutItem, Organization } from '../../../../../../types';
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

const getMockOrgs = (): Organization[] => {
  return require('./__fixtures__/Modal/orgs.json') as Organization[];
};

const getMockRepos = (repoName?: string): ListableItems => {
  return require(`./__fixtures__/Modal/${repoName || 'user'}.json`) as ListableItems;
};

const defaultProps = {
  open: true,
  optOutList: mockOptOutList,
  onSuccess: mockOnSuccess,
  onClose: mockOnClose,
  onAuthError: mockOnAuthError,
  getNotificationTitle: () => 'tracking errors',
};

const mockCtx = {
  user: { alias: 'test', email: 'test@test.com' },
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
    mocked(API).getUserOrganizations.mockResolvedValue(getMockOrgs());

    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <OptOutModal {...defaultProps} />
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', async () => {
      mocked(API).getUserOrganizations.mockResolvedValue(getMockOrgs());

      const { getByText, getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <OptOutModal {...defaultProps} />
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
      });

      expect(getByText('Add opt-out entry')).toBeInTheDocument();
      expect(getByText('Events')).toBeInTheDocument();
      expect(getByText('Repository')).toBeInTheDocument();

      const btn = getByTestId('addOptOutModalBtn');
      expect(btn).toBeInTheDocument();
      expect(btn).toBeDisabled();

      const radio = getByTestId('radio_2');
      expect(radio).toBeInTheDocument();
      expect(radio).toBeChecked();
    });
  });

  describe('calls addOptOut', () => {
    it('when is successful', async () => {
      mocked(API).getUserOrganizations.mockResolvedValue(getMockOrgs());
      mocked(API).searchRepositories.mockResolvedValue(getMockRepos('repos'));
      mocked(API).addOptOut.mockResolvedValue('');

      const { getAllByTestId, getByTestId, queryByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <OptOutModal {...defaultProps} />
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
      });

      const input = getByTestId('searchRepositoriesInput');
      expect(input).toBeInTheDocument();
      userEvent.type(input, 'sec');

      await waitFor(() => {
        expect(API.searchRepositories).toHaveBeenCalledTimes(1);
      });

      const buttons = await waitFor(() => getAllByTestId('repoItem'));
      expect(buttons).toHaveLength(3);
      userEvent.click(buttons[1]);

      const activeRepo = await screen.findByTestId('activeRepoItem');

      expect(activeRepo).toBeInTheDocument();
      expect(activeRepo).toHaveTextContent('security-hub(Publisher: test)');

      expect(queryByTestId('searchRepositoriesInput')).toBeNull();

      const btn = getByTestId('addOptOutModalBtn');
      fireEvent.click(btn);

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
      mocked(API).getUserOrganizations.mockResolvedValue(getMockOrgs());
      mocked(API).searchRepositories.mockResolvedValue(getMockRepos('repos'));
      mocked(API).addOptOut.mockRejectedValue({});

      const { getAllByTestId, getByTestId, queryByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <OptOutModal {...defaultProps} />
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
      });

      const input = getByTestId('searchRepositoriesInput');
      expect(input).toBeInTheDocument();
      userEvent.type(input, 'sec');

      await waitFor(() => {
        expect(API.searchRepositories).toHaveBeenCalledTimes(1);
      });

      const buttons = await waitFor(() => getAllByTestId('repoItem'));
      userEvent.click(buttons[1]);

      const activeRepo = await screen.findByTestId('activeRepoItem');

      expect(activeRepo).toBeInTheDocument();
      expect(activeRepo).toHaveTextContent('security-hub(Publisher: test)');

      expect(queryByTestId('searchRepositoriesInput')).toBeNull();

      const btn = getByTestId('addOptOutModalBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.addOptOut).toHaveBeenCalledTimes(1);
        expect(API.addOptOut).toHaveBeenCalledWith('f0cebfe4-c4b2-4310-a6f8-e34525177ff6', 2);
      });

      expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
      expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
        type: 'danger',
        message:
          'An error occurred adding the opt-out entry for tracking errors notifications for repository security-hub, please try again later.',
      });
    });
  });
});
