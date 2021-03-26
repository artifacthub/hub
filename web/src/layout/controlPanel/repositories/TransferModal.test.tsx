import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { ErrorKind, Organization, Repository } from '../../../types';
import TransferModal from './TransferModal';
jest.mock('../../../api');

const onAuthErrorMock = jest.fn();
const onSuccessMock = jest.fn();
const scrollIntoViewMock = jest.fn();

window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const repoMock: Repository = {
  kind: 0,
  name: 'repoTest',
  displayName: 'Repo test',
  url: 'http://test.repo',
  userAlias: 'user',
};

const defaultProps = {
  open: true,
  repository: repoMock,
  onAuthError: onAuthErrorMock,
  onSuccess: onSuccessMock,
  onClose: jest.fn(),
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
  return require(`./__fixtures__/TransferModal/${fixtureId}.json`) as Organization[];
};

describe('Transfer Repository Modal - packages section', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockOrganizations = getMockOrganizations('1');
    mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);

    const result = render(
      <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
        <TransferModal {...defaultProps} />
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component when org is selected in context', async () => {
      const mockOrganizations = getMockOrganizations('2');
      mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);

      const { getByTestId, getByText, queryByText } = render(
        <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
          <TransferModal {...defaultProps} />
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
      });

      expect(getByText('Transfer repository')).toBeInTheDocument();
      const form = getByTestId('transferRepoForm');
      expect(form).toBeInTheDocument();
      expect(getByTestId('radio_user')).toBeInTheDocument();
      expect(getByTestId('radio_user')).toBeChecked();
      expect(getByTestId('radio_org')).toBeInTheDocument();
      expect(getByTestId('select_orgs')).not.toBeRequired();
      expect(getByTestId('select_orgs')).toBeInTheDocument();
      expect(getByTestId('selectOrgsWrapper')).toBeInTheDocument();
      expect(getByTestId('selectOrgsWrapper')).toHaveClass('invisible');
      expect(getByText('It may take a few minutes for this change to be visible across the Hub.')).toBeInTheDocument();
      expect(getByTestId('transferRepoBtn')).toBeInTheDocument();
      expect(getByText(mockOrganizations[0].name)).toBeInTheDocument();
      expect(getByText(mockOrganizations[2].name)).toBeInTheDocument();
      expect(queryByText('orgTest')).toBeNull(); // Does not render selected org in context
    });

    it('renders component when org is not selected in context', async () => {
      const mockOrganizations = getMockOrganizations('3');
      mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);

      const { getByTestId, queryByTestId, getByText } = render(
        <AppCtx.Provider value={{ ctx: mockWithoutSelectedOrgCtx, dispatch: jest.fn() }}>
          <TransferModal {...defaultProps} />
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
      });

      expect(getByText('Transfer repository')).toBeInTheDocument();
      const form = getByTestId('transferRepoForm');
      expect(form).toBeInTheDocument();
      expect(queryByTestId('radio_user')).toBeNull();
      expect(queryByTestId('radio_org')).toBeNull();
      expect(getByTestId('select_orgs')).toBeInTheDocument();
      expect(getByTestId('select_orgs')).toBeRequired();
      expect(getByTestId('selectOrgsWrapper')).toBeInTheDocument();
      expect(getByTestId('selectOrgsWrapper')).not.toHaveClass('invisible');
      expect(getByText('It may take a few minutes for this change to be visible across the Hub.')).toBeInTheDocument();
      expect(getByTestId('transferRepoBtn')).toBeInTheDocument();
    });

    describe('Transfer repo', () => {
      it('from org to myself', async () => {
        const mockOrganizations = getMockOrganizations('4');
        mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);
        mocked(API).transferRepository.mockResolvedValue(null);

        const { getByTestId } = render(
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <TransferModal {...defaultProps} />
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
        });

        const btn = getByTestId('transferRepoBtn');
        fireEvent.click(btn);

        await waitFor(() => {
          expect(API.transferRepository).toHaveBeenCalledTimes(1);
          expect(API.transferRepository).toHaveBeenCalledWith({
            repositoryName: 'repoTest',
            fromOrgName: 'orgTest',
            toOrgName: undefined,
          });
        });

        waitFor(() => {
          expect(onSuccessMock).toHaveBeenCalledTimes(1);
        });
      });

      it('from org to org', async () => {
        const mockOrganizations = getMockOrganizations('5');
        mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);
        mocked(API).transferRepository.mockResolvedValue(null);

        const { getByTestId, getByText } = render(
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <TransferModal {...defaultProps} />
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
        });

        expect(getByTestId('selectOrgsWrapper')).toHaveClass('invisible');
        expect(getByTestId('select_orgs')).not.toBeRequired();

        const radio = getByText('Transfer to organization');
        fireEvent.click(radio);

        const btn = getByTestId('transferRepoBtn');

        const select = getByTestId('select_orgs');
        fireEvent.change(select, { target: { value: mockOrganizations[2].name } });

        fireEvent.click(btn);

        await waitFor(() => {
          expect(API.transferRepository).toHaveBeenCalledTimes(1);
          expect(API.transferRepository).toHaveBeenCalledWith({
            repositoryName: 'repoTest',
            fromOrgName: 'orgTest',
            toOrgName: mockOrganizations[2].name,
          });
        });

        waitFor(() => {
          expect(onSuccessMock).toHaveBeenCalledTimes(1);
        });
      });

      it('from user to org', async () => {
        const mockOrganizations = getMockOrganizations('6');
        mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);
        mocked(API).transferRepository.mockResolvedValue(null);

        const { getByTestId } = render(
          <AppCtx.Provider value={{ ctx: mockWithoutSelectedOrgCtx, dispatch: jest.fn() }}>
            <TransferModal {...defaultProps} />
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
        });

        const select = getByTestId('select_orgs');
        fireEvent.change(select, { target: { value: mockOrganizations[2].name } });

        const btn = getByTestId('transferRepoBtn');
        fireEvent.click(btn);

        await waitFor(() => {
          expect(API.transferRepository).toHaveBeenCalledTimes(1);
          expect(API.transferRepository).toHaveBeenCalledWith({
            repositoryName: 'repoTest',
            fromOrgName: undefined,
            toOrgName: mockOrganizations[2].name,
          });
        });

        waitFor(() => {
          expect(onSuccessMock).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe('When transfer repo fails', () => {
      it('UnauthorizedError', async () => {
        const mockOrganizations = getMockOrganizations('7');
        mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);
        mocked(API).transferRepository.mockRejectedValue({
          kind: ErrorKind.Unauthorized,
        });

        const { getByTestId } = render(
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <TransferModal {...defaultProps} />
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
        });

        const btn = getByTestId('transferRepoBtn');
        fireEvent.click(btn);

        await waitFor(() => {
          expect(API.transferRepository).toHaveBeenCalledTimes(1);
        });

        expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
      });

      it('default error', async () => {
        const mockOrganizations = getMockOrganizations('8');
        mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);
        mocked(API).transferRepository.mockRejectedValue({
          kind: ErrorKind.Other,
        });

        const component = (
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <TransferModal {...defaultProps} />
          </AppCtx.Provider>
        );

        const { getByTestId, getByText, rerender } = render(component);

        await waitFor(() => {
          expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
        });

        const btn = getByTestId('transferRepoBtn');
        fireEvent.click(btn);

        await waitFor(() => {
          expect(API.transferRepository).toHaveBeenCalledTimes(1);
        });

        rerender(component);

        expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
        expect(getByText('An error occurred transfering the repository, please try again later.')).toBeInTheDocument();
      });

      it('with custom error message', async () => {
        const mockOrganizations = getMockOrganizations('9');
        mocked(API).getUserOrganizations.mockResolvedValue(mockOrganizations);
        mocked(API).transferRepository.mockRejectedValue({
          kind: ErrorKind.Other,
          message: 'custom error',
        });

        const component = (
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <TransferModal {...defaultProps} />
          </AppCtx.Provider>
        );

        const { getByTestId, getByText, rerender } = render(component);

        await waitFor(() => {
          expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
        });

        const btn = getByTestId('transferRepoBtn');
        fireEvent.click(btn);

        await waitFor(() => {
          expect(API.transferRepository).toHaveBeenCalledTimes(1);
        });

        rerender(component);

        expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
        expect(getByText('An error occurred transfering the repository: custom error')).toBeInTheDocument();
      });
    });

    describe('When fetchOrganizations fails', () => {
      it('error UnauthorizedError', async () => {
        mocked(API).getUserOrganizations.mockRejectedValue({
          kind: ErrorKind.Unauthorized,
        });

        render(
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <TransferModal {...defaultProps} />
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
            <TransferModal {...defaultProps} />
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
  });
});
