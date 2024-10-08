import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';

import API from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { ErrorKind, Repository } from '../../../types';
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
  user: { alias: 'test', email: 'test@test.com', passwordSet: true },
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

const getMockOrganizations = (fixtureId: string) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/TransferModal/${fixtureId}.json`);
};

describe('Transfer Repository Modal - packages section', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockOrganizations = getMockOrganizations('1');
    mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrganizations);

    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
        <TransferModal {...defaultProps} />
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.queryByRole('status')).toBeNull();
    });
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component when org is selected in context', async () => {
      const mockOrganizations = getMockOrganizations('2');
      mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrganizations);

      render(
        <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
          <TransferModal {...defaultProps} />
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByText('Transfer repository')).toBeInTheDocument();
      const form = await screen.findByTestId('transferRepoForm');
      expect(form).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Transfer to my user' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Transfer to my user' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Transfer to organization' })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'org-select' })).not.toBeRequired();
      expect(screen.getByRole('combobox', { name: 'org-select' })).toBeInTheDocument();
      expect(screen.getByTestId('selectOrgsWrapper')).toBeInTheDocument();
      expect(screen.getByTestId('selectOrgsWrapper')).toHaveClass('invisible');
      expect(
        screen.getByText('It may take a few minutes for this change to be visible across the Hub.')
      ).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: 'Transfer repository' })).toBeInTheDocument();
      expect(await screen.findByText(mockOrganizations[0].name)).toBeInTheDocument();
      expect(screen.getByText(mockOrganizations[2].name)).toBeInTheDocument();
      expect(screen.queryByText('orgTest')).toBeNull(); // Does not render selected org in context
    });

    it('renders component when org is not selected in context', async () => {
      const mockOrganizations = getMockOrganizations('3');
      mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrganizations);

      render(
        <AppCtx.Provider value={{ ctx: mockWithoutSelectedOrgCtx, dispatch: jest.fn() }}>
          <TransferModal {...defaultProps} />
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByText('Transfer repository')).toBeInTheDocument();
      const form = await screen.findByTestId('transferRepoForm');
      expect(form).toBeInTheDocument();
      expect(screen.queryByRole('radio', { name: 'Transfer to my user' })).toBeNull();
      expect(screen.queryByRole('radio', { name: 'Transfer to organization' })).toBeNull();
      expect(screen.getByRole('combobox', { name: 'org-select' })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'org-select' })).toBeRequired();
      expect(screen.getByTestId('selectOrgsWrapper')).toBeInTheDocument();
      expect(screen.getByTestId('selectOrgsWrapper')).not.toHaveClass('invisible');
      expect(
        screen.getByText('It may take a few minutes for this change to be visible across the Hub.')
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Transfer repository' })).toBeInTheDocument();
    });

    describe('Transfer repo', () => {
      it('from org to myself', async () => {
        const mockOrganizations = getMockOrganizations('4');
        mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrganizations);
        mocked(API).transferRepository.mockResolvedValue(null);

        render(
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <TransferModal {...defaultProps} />
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
        });

        await userEvent.click(screen.getByRole('button', { name: 'Transfer repository' }));

        await waitFor(() => {
          expect(API.transferRepository).toHaveBeenCalledTimes(1);
          expect(API.transferRepository).toHaveBeenCalledWith({
            repositoryName: 'repoTest',
            fromOrgName: 'orgTest',
            toOrgName: undefined,
          });
        });

        await waitFor(() => {
          expect(onSuccessMock).toHaveBeenCalledTimes(1);
        });
      });

      it('from org to org', async () => {
        const mockOrganizations = getMockOrganizations('5');
        mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrganizations);
        mocked(API).transferRepository.mockResolvedValue(null);

        render(
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <TransferModal {...defaultProps} />
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
        });

        expect(await screen.findByTestId('selectOrgsWrapper')).toHaveClass('invisible');
        expect(screen.getByRole('combobox', { name: 'org-select' })).not.toBeRequired();

        const radio = await screen.findByText('Transfer to organization');
        await userEvent.click(radio);

        const select = await screen.findByRole('combobox', { name: 'org-select' });
        await userEvent.selectOptions(select, mockOrganizations[2].name);

        const btn = screen.getByRole('button', { name: 'Transfer repository' });
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.transferRepository).toHaveBeenCalledTimes(1);
          expect(API.transferRepository).toHaveBeenCalledWith({
            repositoryName: 'repoTest',
            fromOrgName: 'orgTest',
            toOrgName: mockOrganizations[2].name,
          });
        });

        await waitFor(() => {
          expect(onSuccessMock).toHaveBeenCalledTimes(1);
        });
      });

      it('from user to org', async () => {
        const mockOrganizations = getMockOrganizations('6');
        mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrganizations);
        mocked(API).transferRepository.mockResolvedValue(null);

        render(
          <AppCtx.Provider value={{ ctx: mockWithoutSelectedOrgCtx, dispatch: jest.fn() }}>
            <TransferModal {...defaultProps} />
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(screen.queryByRole('status')).toBeNull();
        });

        expect(await screen.findByTestId('selectOrgsWrapper')).not.toHaveClass('invisible');

        const select = await screen.findByRole('combobox', { name: 'org-select' });
        await userEvent.selectOptions(select, 'helm');

        const btn = await screen.findByRole('button', { name: 'Transfer repository' });
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.transferRepository).toHaveBeenCalledTimes(1);
          expect(API.transferRepository).toHaveBeenCalledWith({
            repositoryName: 'repoTest',
            fromOrgName: undefined,
            toOrgName: mockOrganizations[2].name,
          });
        });

        await waitFor(() => {
          expect(onSuccessMock).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe('When transfer repo fails', () => {
      it('UnauthorizedError', async () => {
        const mockOrganizations = getMockOrganizations('7');
        mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrganizations);
        mocked(API).transferRepository.mockRejectedValue({
          kind: ErrorKind.Unauthorized,
        });

        render(
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <TransferModal {...defaultProps} />
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
        });

        const btn = await screen.findByRole('button', { name: 'Transfer repository' });
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.transferRepository).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => expect(onAuthErrorMock).toHaveBeenCalledTimes(1));
      });

      it('default error', async () => {
        const mockOrganizations = getMockOrganizations('8');
        mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrganizations);
        mocked(API).transferRepository.mockRejectedValue({
          kind: ErrorKind.Other,
        });

        const component = (
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <TransferModal {...defaultProps} />
          </AppCtx.Provider>
        );

        const { rerender } = render(component);

        await waitFor(() => {
          expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
        });

        const btn = await screen.findByRole('button', { name: 'Transfer repository' });
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.transferRepository).toHaveBeenCalledTimes(1);
        });

        rerender(component);

        await waitFor(() => expect(scrollIntoViewMock).toHaveBeenCalledTimes(1));
        expect(
          await screen.findByText('An error occurred transferring the repository, please try again later.')
        ).toBeInTheDocument();
      });

      it('with custom error message', async () => {
        const mockOrganizations = getMockOrganizations('9');
        mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrganizations);
        mocked(API).transferRepository.mockRejectedValue({
          kind: ErrorKind.Other,
          message: 'custom error',
        });

        const component = (
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <TransferModal {...defaultProps} />
          </AppCtx.Provider>
        );

        const { rerender } = render(component);

        await waitFor(() => {
          expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
        });

        const btn = await screen.findByRole('button', { name: 'Transfer repository' });
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.transferRepository).toHaveBeenCalledTimes(1);
        });

        rerender(component);

        await waitFor(() => expect(scrollIntoViewMock).toHaveBeenCalledTimes(1));
        expect(
          await screen.findByText('An error occurred transferring the repository: custom error')
        ).toBeInTheDocument();
      });
    });

    describe('When fetchOrganizations fails', () => {
      it('error UnauthorizedError', async () => {
        mocked(API).getAllUserOrganizations.mockRejectedValue({
          kind: ErrorKind.Unauthorized,
        });

        render(
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <TransferModal {...defaultProps} />
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => expect(onAuthErrorMock).toHaveBeenCalledTimes(1));
      });

      it('default error', async () => {
        mocked(API).getAllUserOrganizations.mockRejectedValue({
          kind: ErrorKind.Other,
        });

        const component = (
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <TransferModal {...defaultProps} />
          </AppCtx.Provider>
        );

        const { rerender } = render(component);

        await waitFor(() => {
          expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
        });

        rerender(component);

        await waitFor(() => expect(scrollIntoViewMock).toHaveBeenCalledTimes(1));
        expect(
          await screen.findByText('An error occurred getting your organizations, please try again later.')
        ).toBeInTheDocument();
      });
    });
  });
});
