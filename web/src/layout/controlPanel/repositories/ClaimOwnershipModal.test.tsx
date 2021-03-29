import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { ErrorKind, Organization, Repository } from '../../../types';
import ClaimModal from './ClaimOwnershipModal';
jest.mock('../../../api');

const onAuthErrorMock = jest.fn();
const scrollIntoViewMock = jest.fn();
const onSuccessMock = jest.fn();

window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const defaultProps = {
  open: true,
  onAuthError: onAuthErrorMock,
  onClose: jest.fn(),
  onSuccess: onSuccessMock,
};

const mockWithoutSelectedOrgCtx = {
  user: { alias: 'test', email: 'test@test.com' },
  prefs: {
    controlPanel: {
      selectedOrg: undefined,
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

const mockWithSelectedOrgCtx = {
  user: { alias: 'test', email: 'test@test.com' },
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

const getMockOrganizations = (fixtureId: string): Organization[] => {
  return require(`./__fixtures__/ClaimOwnershipModal/${fixtureId}org.json`) as Organization[];
};

const getMockRepositories = (fixtureId: string): Repository[] => {
  return require(`./__fixtures__/ClaimOwnershipModal/${fixtureId}repo.json`) as Repository[];
};

describe('Claim Repository Modal - repositories section', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockOrganizations = getMockOrganizations('1');
    mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);
    const mockRepositories = getMockRepositories('1');
    mocked(API).getAllRepositories.mockResolvedValue(mockRepositories);

    const result = render(
      <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
        <ClaimModal {...defaultProps} />
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
      expect(API.getAllRepositories).toHaveBeenCalledTimes(1);
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component when org is selected in context', async () => {
      const mockOrganizations = getMockOrganizations('1');
      mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);
      const mockRepositories = getMockRepositories('1');
      mocked(API).getAllRepositories.mockResolvedValue(mockRepositories);

      const { getByTestId, getByText } = render(
        <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
          <ClaimModal {...defaultProps} />
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
        expect(API.getAllRepositories).toHaveBeenCalledTimes(1);
      });

      expect(getByText('Claim repository ownership')).toBeInTheDocument();
      const form = getByTestId('claimRepoForm');
      expect(form).toBeInTheDocument();
      expect(getByTestId('radio_claim_user')).toBeInTheDocument();
      expect(getByTestId('radio_claim_user')).not.toBeChecked();
      expect(getByTestId('radio_claim_org')).toBeInTheDocument();
      expect(getByTestId('radio_claim_org')).toBeChecked();
      expect(getByTestId('select_claim_orgs')).toBeRequired();
      expect(getByTestId('select_claim_orgs')).toBeInTheDocument();
      expect(getByTestId('claimRepoBtn')).toBeInTheDocument();
      expect(
        getByText(/Please make sure the email used in the metatata file matches with the one you use in Artifact Hub./g)
      ).toBeInTheDocument();
      expect(getByText('It may take a few minutes for this change to be visible across the Hub.')).toBeInTheDocument();

      expect(getByText(mockOrganizations[0].name)).toBeInTheDocument();
      expect(getByText(mockOrganizations[1].name)).toBeInTheDocument();
      expect(getByText(mockOrganizations[2].name)).toBeInTheDocument();
    });

    it('renders component when org is not selected in context', async () => {
      const mockOrganizations = getMockOrganizations('1');
      mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);
      const mockRepositories = getMockRepositories('1');
      mocked(API).getAllRepositories.mockResolvedValue(mockRepositories);

      const { getByTestId, getByText } = render(
        <AppCtx.Provider value={{ ctx: mockWithoutSelectedOrgCtx, dispatch: jest.fn() }}>
          <ClaimModal {...defaultProps} />
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
        expect(API.getAllRepositories).toHaveBeenCalledTimes(1);
      });

      expect(getByText('Claim repository ownership')).toBeInTheDocument();
      const form = getByTestId('claimRepoForm');
      expect(form).toBeInTheDocument();
      expect(getByTestId('radio_claim_user')).toBeInTheDocument();
      expect(getByTestId('radio_claim_user')).toBeChecked();
      expect(getByTestId('radio_claim_org')).toBeInTheDocument();
      expect(getByTestId('radio_claim_org')).not.toBeChecked();
      expect(getByTestId('select_claim_orgs')).not.toBeRequired();
      expect(getByTestId('select_claim_orgs')).toBeInTheDocument();
      expect(getByTestId('claimRepoBtn')).toBeInTheDocument();
      expect(
        getByText(/Please make sure the email used in the metatata file matches with the one you use in Artifact Hub./g)
      ).toBeInTheDocument();
      expect(getByText('It may take a few minutes for this change to be visible across the Hub.')).toBeInTheDocument();

      expect(getByText(mockOrganizations[0].name)).toBeInTheDocument();
      expect(getByText(mockOrganizations[1].name)).toBeInTheDocument();
      expect(getByText(mockOrganizations[2].name)).toBeInTheDocument();
    });

    it('does not render OCI repos', async () => {
      const mockOrganizations = getMockOrganizations('1');
      mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);
      const mockRepositories = getMockRepositories('2');
      mocked(API).getAllRepositories.mockResolvedValue(mockRepositories);

      const { getByTestId, getByText, getAllByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockWithoutSelectedOrgCtx, dispatch: jest.fn() }}>
          <ClaimModal {...defaultProps} />
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
        expect(API.getAllRepositories).toHaveBeenCalledTimes(1);
      });

      expect(getByText('Claim repository ownership')).toBeInTheDocument();

      const input = getByTestId('searchTypeaheadRepositoryInput');
      expect(input).toBeInTheDocument();
      fireEvent.change(input, { target: { value: 'ch' } });

      const buttons = await waitFor(() => getAllByTestId('repoItem'));
      expect(buttons).toHaveLength(2);
    });

    describe('Claim repo', () => {
      it('from user', async () => {
        const mockOrganizations = getMockOrganizations('1');
        mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);
        const mockRepositories = getMockRepositories('1');
        mocked(API).getAllRepositories.mockResolvedValue(mockRepositories);
        mocked(API).claimRepositoryOwnership.mockResolvedValue(null);

        const { getByTestId, getByText, getAllByTestId } = render(
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <ClaimModal {...defaultProps} />
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
          expect(API.getAllRepositories).toHaveBeenCalledTimes(1);
        });

        const radio = getByText('My user');
        fireEvent.click(radio);

        const input = getByTestId('searchTypeaheadRepositoryInput');
        expect(input).toBeInTheDocument();
        fireEvent.change(input, { target: { value: 'gi' } });

        const buttons = await waitFor(() => getAllByTestId('repoItem'));
        fireEvent.click(buttons[0]);

        const activeRepo = getByTestId('activeRepoItem');

        expect(activeRepo).toBeInTheDocument();
        expect(activeRepo).toHaveTextContent(
          'community-operators (https://github.com/operator-framework/community-operators/upstream-community-operators)(Publisher: demo)'
        );

        const btn = getByTestId('claimRepoBtn');
        fireEvent.click(btn);

        await waitFor(() => {
          expect(API.claimRepositoryOwnership).toHaveBeenCalledTimes(1);
          expect(API.claimRepositoryOwnership).toHaveBeenCalledWith(mockRepositories[0], undefined);
        });

        waitFor(() => {
          expect(onSuccessMock).toHaveBeenCalledTimes(1);
        });
      });

      it('from org', async () => {
        const mockOrganizations = getMockOrganizations('1');
        mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);
        const mockRepositories = getMockRepositories('1');
        mocked(API).getAllRepositories.mockResolvedValue(mockRepositories);
        mocked(API).claimRepositoryOwnership.mockResolvedValue(null);

        const { getByTestId, getByText, getAllByTestId } = render(
          <AppCtx.Provider value={{ ctx: mockWithoutSelectedOrgCtx, dispatch: jest.fn() }}>
            <ClaimModal {...defaultProps} />
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
          expect(API.getAllRepositories).toHaveBeenCalledTimes(1);
        });

        const input = getByTestId('searchTypeaheadRepositoryInput');
        expect(input).toBeInTheDocument();
        fireEvent.change(input, { target: { value: 'gi' } });

        const buttons = await waitFor(() => getAllByTestId('repoItem'));
        fireEvent.click(buttons[1]);

        const radio = getByText('Organization');
        fireEvent.click(radio);

        const btn = getByTestId('claimRepoBtn');

        const select = getByTestId('select_claim_orgs');
        fireEvent.change(select, { target: { value: mockOrganizations[2].name } });

        fireEvent.click(btn);

        await waitFor(() => {
          expect(API.claimRepositoryOwnership).toHaveBeenCalledTimes(1);
          expect(API.claimRepositoryOwnership).toHaveBeenCalledWith(mockRepositories[2], 'helm');
        });

        waitFor(() => {
          expect(onSuccessMock).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe('When claim repo fails', () => {
      it('UnauthorizedError', async () => {
        const mockOrganizations = getMockOrganizations('1');
        mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);
        const mockRepositories = getMockRepositories('1');
        mocked(API).getAllRepositories.mockResolvedValue(mockRepositories);
        mocked(API).claimRepositoryOwnership.mockRejectedValue({
          kind: ErrorKind.Unauthorized,
        });

        const { getByTestId, getAllByTestId } = render(
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <ClaimModal {...defaultProps} />
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
          expect(API.getAllRepositories).toHaveBeenCalledTimes(1);
        });

        const input = getByTestId('searchTypeaheadRepositoryInput');
        fireEvent.change(input, { target: { value: 'gi' } });

        const buttons = await waitFor(() => getAllByTestId('repoItem'));
        fireEvent.click(buttons[1]);

        const btn = getByTestId('claimRepoBtn');
        fireEvent.click(btn);

        await waitFor(() => {
          expect(API.claimRepositoryOwnership).toHaveBeenCalledTimes(1);
        });

        expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
      });

      it('default error', async () => {
        const mockOrganizations = getMockOrganizations('1');
        mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);
        const mockRepositories = getMockRepositories('1');
        mocked(API).getAllRepositories.mockResolvedValue(mockRepositories);
        mocked(API).claimRepositoryOwnership.mockRejectedValue({
          kind: ErrorKind.Other,
        });

        const component = (
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <ClaimModal {...defaultProps} />
          </AppCtx.Provider>
        );

        const { getByTestId, getAllByTestId, getByText, rerender } = render(component);

        await waitFor(() => {
          expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
          expect(API.getAllRepositories).toHaveBeenCalledTimes(1);
        });

        const input = getByTestId('searchTypeaheadRepositoryInput');
        fireEvent.change(input, { target: { value: 'gi' } });

        const buttons = await waitFor(() => getAllByTestId('repoItem'));
        fireEvent.click(buttons[1]);

        const btn = getByTestId('claimRepoBtn');
        fireEvent.click(btn);

        await waitFor(() => {
          expect(API.claimRepositoryOwnership).toHaveBeenCalledTimes(1);
        });

        rerender(component);

        expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
        expect(getByText('An error occurred claiming the repository, please try again later.')).toBeInTheDocument();
      });

      it('with custom error message', async () => {
        const mockOrganizations = getMockOrganizations('1');
        mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);
        const mockRepositories = getMockRepositories('1');
        mocked(API).getAllRepositories.mockResolvedValue(mockRepositories);
        mocked(API).claimRepositoryOwnership.mockRejectedValue({
          kind: ErrorKind.Other,
          message: 'custom error',
        });

        const component = (
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <ClaimModal {...defaultProps} />
          </AppCtx.Provider>
        );

        const { getByTestId, getAllByTestId, getByText, rerender } = render(component);

        await waitFor(() => {
          expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
          expect(API.getAllRepositories).toHaveBeenCalledTimes(1);
        });

        const input = getByTestId('searchTypeaheadRepositoryInput');
        fireEvent.change(input, { target: { value: 'gi' } });

        const buttons = await waitFor(() => getAllByTestId('repoItem'));
        fireEvent.click(buttons[1]);

        const btn = getByTestId('claimRepoBtn');
        fireEvent.click(btn);

        await waitFor(() => {
          expect(API.claimRepositoryOwnership).toHaveBeenCalledTimes(1);
        });

        rerender(component);

        expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
        expect(getByText('An error occurred claiming the repository: custom error')).toBeInTheDocument();
      });

      it('with Forbidden error', async () => {
        const mockOrganizations = getMockOrganizations('1');
        mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);
        const mockRepositories = getMockRepositories('1');
        mocked(API).getAllRepositories.mockResolvedValue(mockRepositories);
        mocked(API).claimRepositoryOwnership.mockRejectedValue({
          kind: ErrorKind.Forbidden,
        });

        const component = (
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <ClaimModal {...defaultProps} />
          </AppCtx.Provider>
        );

        const { getByTestId, getAllByTestId, getByText, rerender } = render(component);

        await waitFor(() => {
          expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
          expect(API.getAllRepositories).toHaveBeenCalledTimes(1);
        });

        const input = getByTestId('searchTypeaheadRepositoryInput');
        fireEvent.change(input, { target: { value: 'gi' } });

        const buttons = await waitFor(() => getAllByTestId('repoItem'));
        fireEvent.click(buttons[1]);

        const btn = getByTestId('claimRepoBtn');
        fireEvent.click(btn);

        await waitFor(() => {
          expect(API.claimRepositoryOwnership).toHaveBeenCalledTimes(1);
        });

        rerender(component);

        expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
        expect(
          getByText(
            'You do not have permissions to claim this repository ownership. Please make sure your metadata file has been setup correctly.'
          )
        ).toBeInTheDocument();
      });
    });

    describe('When fetchOrganizations fails', () => {
      it('error UnauthorizedError', async () => {
        mocked(API).getUserOrganizations.mockRejectedValue({
          kind: ErrorKind.Unauthorized,
        });
        const mockRepositories = getMockRepositories('1');
        mocked(API).getAllRepositories.mockResolvedValue(mockRepositories);

        render(
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <ClaimModal {...defaultProps} />
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
        });

        expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
      });

      it('default error', async () => {
        mocked(API).getUserOrganizations.mockRejectedValue({
          kind: ErrorKind.Other,
        });

        const component = (
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <ClaimModal {...defaultProps} />
          </AppCtx.Provider>
        );

        const { getByText, rerender } = render(component);

        await waitFor(() => {
          expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
        });

        rerender(component);

        expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
        expect(getByText('An error occurred getting your organizations, please try again later.')).toBeInTheDocument();
      });
    });

    describe('When getAllRepositories fails', () => {
      it('error UnauthorizedError', async () => {
        const mockOrganizations = getMockOrganizations('1');
        mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);
        mocked(API).getAllRepositories.mockRejectedValue({
          kind: ErrorKind.Unauthorized,
        });

        render(
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <ClaimModal {...defaultProps} />
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getAllRepositories).toHaveBeenCalledTimes(1);
        });

        expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
      });

      it('default error', async () => {
        const mockOrganizations = getMockOrganizations('1');
        mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);
        mocked(API).getAllRepositories.mockRejectedValue({
          kind: ErrorKind.Other,
        });

        const component = (
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <ClaimModal {...defaultProps} />
          </AppCtx.Provider>
        );

        const { getByText, rerender } = render(component);

        await waitFor(() => {
          expect(API.getAllRepositories).toHaveBeenCalledTimes(1);
        });

        rerender(component);

        expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
        expect(getByText('An error occurred getting the repositories, please try again later.')).toBeInTheDocument();
      });
    });
  });
});
