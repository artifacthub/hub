import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';

import API from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { ErrorKind } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import ClaimModal from './ClaimOwnershipModal';
jest.mock('../../../api');
jest.mock('../../../utils/alertDispatcher');

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
  return require(`./__fixtures__/ClaimOwnershipModal/${fixtureId}org.json`);
};

const getMockRepositories = (fixtureId: string) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/ClaimOwnershipModal/${fixtureId}repo.json`);
};

describe('Claim Repository Modal - repositories section', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockOrganizations = getMockOrganizations('1');
    mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrganizations);
    const mockRepositories = getMockRepositories('1');
    mocked(API).searchRepositories.mockResolvedValue(mockRepositories);

    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
        <ClaimModal {...defaultProps} />
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText(mockOrganizations[0].name)).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component when org is selected in context', async () => {
      const mockOrganizations = getMockOrganizations('1');
      mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrganizations);
      const mockRepositories = getMockRepositories('1');
      mocked(API).searchRepositories.mockResolvedValue(mockRepositories);

      render(
        <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
          <ClaimModal {...defaultProps} />
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByText('Claim repository ownership')).toBeInTheDocument();
      const form = await screen.findByTestId('claimRepoForm');
      expect(form).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Transfer to: My user' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Transfer to: My user' })).not.toBeChecked();
      expect(screen.getByRole('radio', { name: 'Transfer to: Organization' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Transfer to: Organization' })).toBeChecked();
      expect(screen.getByRole('combobox', { name: 'org-select' })).toBeRequired();
      expect(screen.getByRole('combobox', { name: 'org-select' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Claim ownership' })).toBeInTheDocument();
      expect(
        screen.getByText(/Please make sure the email used in the metadata file matches with the one you use in/)
      ).toBeInTheDocument();
      expect(
        screen.getByText('It may take a few minutes for this change to be visible across the Hub.')
      ).toBeInTheDocument();

      expect(await screen.findByText(mockOrganizations[0].name)).toBeInTheDocument();
      expect(screen.getByText(mockOrganizations[1].name)).toBeInTheDocument();
      expect(screen.getByText(mockOrganizations[2].name)).toBeInTheDocument();
    });

    it('renders component when org is not selected in context', async () => {
      const mockOrganizations = getMockOrganizations('1');
      mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrganizations);
      const mockRepositories = getMockRepositories('1');
      mocked(API).searchRepositories.mockResolvedValue(mockRepositories);

      render(
        <AppCtx.Provider value={{ ctx: mockWithoutSelectedOrgCtx, dispatch: jest.fn() }}>
          <ClaimModal {...defaultProps} />
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByText('Claim repository ownership')).toBeInTheDocument();
      const form = screen.getByTestId('claimRepoForm');
      expect(form).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Transfer to: My user' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Transfer to: My user' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Transfer to: Organization' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Transfer to: Organization' })).not.toBeChecked();
      expect(screen.getByRole('combobox', { name: 'org-select' })).not.toBeRequired();
      expect(screen.getByRole('combobox', { name: 'org-select' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Claim ownership' })).toBeInTheDocument();
      expect(
        screen.getByText(/Please make sure the email used in the metadata file matches with the one you use in/)
      ).toBeInTheDocument();
      expect(
        screen.getByText('It may take a few minutes for this change to be visible across the Hub.')
      ).toBeInTheDocument();

      expect(await screen.findByText(mockOrganizations[0].name)).toBeInTheDocument();
      expect(screen.getByText(mockOrganizations[1].name)).toBeInTheDocument();
      expect(screen.getByText(mockOrganizations[2].name)).toBeInTheDocument();
    });

    it('displays disabled OCI repos', async () => {
      const mockOrganizations = getMockOrganizations('1');
      mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrganizations);
      const mockRepositories = getMockRepositories('2');
      mocked(API).searchRepositories.mockResolvedValue(mockRepositories);

      render(
        <AppCtx.Provider value={{ ctx: mockWithoutSelectedOrgCtx, dispatch: jest.fn() }}>
          <ClaimModal {...defaultProps} />
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByText('Claim repository ownership')).toBeInTheDocument();

      const input = await screen.findByRole('textbox', { name: 'Search repositories' });
      expect(input).toBeInTheDocument();
      await userEvent.type(input, 'repo');

      await waitFor(() => {
        expect(API.searchRepositories).toHaveBeenCalledTimes(1);
      });

      const buttons = await screen.findAllByTestId('repoItem');
      expect(buttons).toHaveLength(6);
      expect(buttons[2]).toHaveClass('disabledCell');
    });

    describe('Claim repo', () => {
      it('from user', async () => {
        const mockOrganizations = getMockOrganizations('1');
        mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrganizations);
        const mockRepositories = getMockRepositories('1');
        mocked(API).searchRepositories.mockResolvedValue(mockRepositories);
        mocked(API).claimRepositoryOwnership.mockResolvedValue(null);

        render(
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <ClaimModal {...defaultProps} />
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
        });

        const radio = screen.getByText('My user');
        await userEvent.click(radio);

        await userEvent.type(screen.getByRole('textbox', { name: 'Search repositories' }), 'repo');

        await waitFor(() => {
          expect(API.searchRepositories).toHaveBeenCalledTimes(1);
        });

        const buttons = await screen.findAllByTestId('repoItem');
        expect(buttons).toHaveLength(3);
        await userEvent.click(buttons[0]);

        const activeRepo = await screen.findByTestId('activeRepoItem');

        expect(activeRepo).toBeInTheDocument();
        expect(activeRepo).toHaveTextContent(
          'community-operators (https://github.com/operator-framework/community-operators/upstream-community-operators)/(Publisher: demo)(Publisher: demo)'
        );

        const btn = await screen.findByRole('button', { name: 'Claim ownership' });
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.claimRepositoryOwnership).toHaveBeenCalledTimes(1);
          expect(API.claimRepositoryOwnership).toHaveBeenCalledWith(mockRepositories.items[0], undefined);
        });

        await waitFor(() => {
          expect(onSuccessMock).toHaveBeenCalledTimes(1);
        });
      });

      it('from org', async () => {
        const mockOrganizations = getMockOrganizations('1');
        mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrganizations);
        const mockRepositories = getMockRepositories('1');
        mocked(API).searchRepositories.mockResolvedValue(mockRepositories);
        mocked(API).claimRepositoryOwnership.mockResolvedValue(null);

        render(
          <AppCtx.Provider value={{ ctx: mockWithoutSelectedOrgCtx, dispatch: jest.fn() }}>
            <ClaimModal {...defaultProps} />
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
        });

        const input = await screen.findByRole('textbox', { name: 'Search repositories' });
        expect(input).toBeInTheDocument();
        await userEvent.type(input, 'repo');

        await waitFor(() => {
          expect(API.searchRepositories).toHaveBeenCalledTimes(1);
        });

        const buttons = await screen.findAllByTestId('repoItem');
        await userEvent.click(buttons[1]);

        const radio = await screen.findByText('Organization');
        await userEvent.click(radio);

        const select = await screen.findByRole('combobox', { name: 'org-select' });
        await userEvent.selectOptions(select, mockOrganizations[2].name);

        const btn = await screen.findByRole('button', { name: 'Claim ownership' });
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.claimRepositoryOwnership).toHaveBeenCalledTimes(1);
          expect(API.claimRepositoryOwnership).toHaveBeenCalledWith(mockRepositories.items[1], 'helm');
        });

        await waitFor(() => {
          expect(onSuccessMock).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe('When claim repo fails', () => {
      it('UnauthorizedError', async () => {
        const mockOrganizations = getMockOrganizations('1');
        mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrganizations);
        const mockRepositories = getMockRepositories('1');
        mocked(API).searchRepositories.mockResolvedValue(mockRepositories);
        mocked(API).claimRepositoryOwnership.mockRejectedValue({
          kind: ErrorKind.Unauthorized,
        });

        render(
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <ClaimModal {...defaultProps} />
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
        });

        const input = await screen.findByRole('textbox', { name: 'Search repositories' });
        await userEvent.type(input, 'repo');

        await waitFor(() => {
          expect(API.searchRepositories).toHaveBeenCalledTimes(1);
        });

        const buttons = await screen.findAllByTestId('repoItem');
        await userEvent.click(buttons[1]);

        const btn = await screen.findByRole('button', { name: 'Claim ownership' });
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.claimRepositoryOwnership).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
        });
      });

      it('default error', async () => {
        const mockOrganizations = getMockOrganizations('1');
        mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrganizations);
        const mockRepositories = getMockRepositories('1');
        mocked(API).searchRepositories.mockResolvedValue(mockRepositories);
        mocked(API).claimRepositoryOwnership.mockRejectedValue({
          kind: ErrorKind.Other,
        });

        const component = (
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <ClaimModal {...defaultProps} />
          </AppCtx.Provider>
        );

        const { rerender } = render(component);

        await waitFor(() => {
          expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
        });

        const input = await screen.findByRole('textbox', { name: 'Search repositories' });
        await userEvent.type(input, 'repo');

        await waitFor(() => {
          expect(API.searchRepositories).toHaveBeenCalledTimes(1);
        });

        const buttons = await screen.findAllByTestId('repoItem');
        await userEvent.click(buttons[1]);

        const btn = await screen.findByRole('button', { name: 'Claim ownership' });
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.claimRepositoryOwnership).toHaveBeenCalledTimes(1);
        });

        rerender(component);

        await waitFor(() => {
          expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
        });
        expect(
          await screen.findByText('An error occurred claiming the repository, please try again later.')
        ).toBeInTheDocument();
      });

      it('with custom error message', async () => {
        const mockOrganizations = getMockOrganizations('1');
        mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrganizations);
        const mockRepositories = getMockRepositories('1');
        mocked(API).searchRepositories.mockResolvedValue(mockRepositories);
        mocked(API).claimRepositoryOwnership.mockRejectedValue({
          kind: ErrorKind.Other,
          message: 'custom error',
        });

        const component = (
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <ClaimModal {...defaultProps} />
          </AppCtx.Provider>
        );

        const { rerender } = render(component);

        await waitFor(() => {
          expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
        });

        const input = await screen.findByRole('textbox', { name: 'Search repositories' });
        await userEvent.type(input, 'repo');

        await waitFor(() => {
          expect(API.searchRepositories).toHaveBeenCalledTimes(1);
        });

        const buttons = await screen.findAllByTestId('repoItem');
        await userEvent.click(buttons[1]);

        const btn = await screen.findByRole('button', { name: 'Claim ownership' });
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.claimRepositoryOwnership).toHaveBeenCalledTimes(1);
        });

        rerender(component);

        await waitFor(() => {
          expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
        });
        expect(await screen.findByText('An error occurred claiming the repository: custom error')).toBeInTheDocument();
      });

      it('with Forbidden error', async () => {
        const mockOrganizations = getMockOrganizations('1');
        mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrganizations);
        const mockRepositories = getMockRepositories('1');
        mocked(API).searchRepositories.mockResolvedValue(mockRepositories);
        mocked(API).claimRepositoryOwnership.mockRejectedValue({
          kind: ErrorKind.Forbidden,
        });

        const component = (
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <ClaimModal {...defaultProps} />
          </AppCtx.Provider>
        );

        const { rerender } = render(component);

        await waitFor(() => {
          expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
        });

        const input = await screen.findByRole('textbox', { name: 'Search repositories' });
        await userEvent.type(input, 'repo');

        await waitFor(() => {
          expect(API.searchRepositories).toHaveBeenCalledTimes(1);
        });

        const buttons = await screen.findAllByTestId('repoItem');
        await userEvent.click(buttons[1]);

        const btn = await screen.findByRole('button', { name: 'Claim ownership' });
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.claimRepositoryOwnership).toHaveBeenCalledTimes(1);
        });

        rerender(component);

        await waitFor(() => {
          expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
        });
        expect(
          await screen.findByText(
            'You do not have permissions to claim this repository ownership. Please make sure your metadata file has been setup correctly.'
          )
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
            <ClaimModal {...defaultProps} />
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
        });
      });

      it('default error', async () => {
        mocked(API).getAllUserOrganizations.mockRejectedValue({
          kind: ErrorKind.Other,
        });

        const component = (
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <ClaimModal {...defaultProps} />
          </AppCtx.Provider>
        );

        const { rerender } = render(component);

        await waitFor(() => {
          expect(API.getAllUserOrganizations).toHaveBeenCalledTimes(1);
        });

        rerender(component);

        await waitFor(() => {
          expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
        });
        expect(
          await screen.findByText('An error occurred getting your organizations, please try again later.')
        ).toBeInTheDocument();
      });
    });

    describe('When searchRepositories fails', () => {
      it('error UnauthorizedError', async () => {
        const mockOrganizations = getMockOrganizations('1');
        mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrganizations);
        mocked(API).searchRepositories.mockRejectedValue({
          kind: ErrorKind.Unauthorized,
        });

        render(
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <ClaimModal {...defaultProps} />
          </AppCtx.Provider>
        );

        const input = screen.getByRole('textbox', { name: 'Search repositories' });
        await userEvent.type(input, 'repo');

        await waitFor(() => {
          expect(API.searchRepositories).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
        });
      });

      it('default error', async () => {
        const mockOrganizations = getMockOrganizations('1');
        mocked(API).getAllUserOrganizations.mockResolvedValue(mockOrganizations);
        mocked(API).searchRepositories.mockRejectedValue({
          kind: ErrorKind.Other,
        });

        render(
          <AppCtx.Provider value={{ ctx: mockWithSelectedOrgCtx, dispatch: jest.fn() }}>
            <ClaimModal {...defaultProps} />
          </AppCtx.Provider>
        );

        const input = screen.getByRole('textbox', { name: 'Search repositories' });
        await userEvent.type(input, 'repo');

        await waitFor(() => {
          expect(API.searchRepositories).toHaveBeenCalledTimes(1);
        });

        expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
        expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
          type: 'danger',
          message: 'An error occurred searching repositories, please try again later.',
        });
      });
    });
  });
});
