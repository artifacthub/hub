import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'ts-jest/utils';

import API from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { ErrorKind, Repository, RepositoryKind } from '../../../types';
import Modal from './Modal';
jest.mock('../../../api');

const onAuthErrorMock = jest.fn();
const onSuccessMock = jest.fn();
const scrollIntoViewMock = jest.fn();

window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const defaultProps = {
  open: true,
  onAuthError: onAuthErrorMock,
  onSuccess: onSuccessMock,
  onClose: jest.fn(),
};

const repoMock: Repository = {
  kind: 0,
  name: 'repoTest',
  displayName: 'Repo test',
  url: 'http://test.repo',
  branch: null,
  disabled: false,
  scannerDisabled: false,
  authUser: null,
  authPass: null,
};

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

describe('Repository Modal - repositories section', () => {
  afterEach(() => {
    jest.resetAllMocks();
    delete (window as any).config;
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<Modal {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<Modal {...defaultProps} />);

      const form = screen.getByTestId('repoForm');
      expect(form).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /Name/ })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Display name' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /Url/ })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Disabled' })).toBeInTheDocument();
    });

    it('renders component with existing repo', () => {
      render(<Modal {...defaultProps} repository={repoMock} />);

      const form = screen.getByTestId('repoForm');
      expect(form).toBeInTheDocument();
      expect(screen.getByDisplayValue(repoMock.name)).toBeInTheDocument();
      expect(screen.getByDisplayValue(repoMock.displayName!)).toBeInTheDocument();
      expect(screen.getByDisplayValue(repoMock.url)).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Disabled' })).toBeInTheDocument();
    });

    it('renders private not Helm charts repo', () => {
      Object.defineProperty(document, 'querySelector', {
        value: () => ({
          getAttribute: () => 'true',
        }),
        writable: true,
      });

      render(
        <Modal {...defaultProps} repository={{ ...repoMock, kind: RepositoryKind.HelmPlugin, authPass: 'pass123' }} />
      );

      expect(screen.getByText('Update repository')).toBeInTheDocument();
      expect(screen.getByText('Update')).toBeInTheDocument();
      expect(screen.getByText('Authentication token')).toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: 'Username' })).toBeNull();
    });

    it('displays warning about repo url', () => {
      render(<Modal {...defaultProps} repository={{ ...repoMock, kind: RepositoryKind.OLM }} />);

      expect(screen.getByText(/Please DO NOT include the git hosting platform specific parts/g)).toBeInTheDocument();
      expect(screen.getByText('tree/branch')).toBeInTheDocument();

      userEvent.type(screen.getByRole('textbox', { name: /Url/ }), 'https://github.com/test/tree/test');

      expect(screen.getByText(/Please DO NOT include the git hosting platform specific parts/g)).toHaveClass(
        'animatedWarning'
      );
    });

    describe('Add repo', () => {
      it('calls add repo', async () => {
        Object.defineProperty(document, 'querySelector', {
          value: () => false,
          writable: true,
        });

        mocked(API).checkAvailability.mockResolvedValue(false);
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addRepository.mockResolvedValue(null);
        render(<Modal {...defaultProps} />);

        expect(screen.getByText('Add repository')).toBeInTheDocument();
        expect(screen.getByText('Add')).toBeInTheDocument();
        userEvent.type(screen.getByRole('textbox', { name: /Name/ }), 'name');
        userEvent.type(screen.getByRole('textbox', { name: 'Display name' }), 'Pretty name');
        userEvent.type(screen.getByRole('textbox', { name: /Url/ }), 'http://test.com');
        userEvent.click(screen.getByRole('button', { name: 'Add repository' }));

        await waitFor(() => {
          expect(API.addRepository).toHaveBeenCalledTimes(1);
          expect(API.addRepository).toHaveBeenCalledWith(
            {
              name: 'name',
              url: 'http://test.com',
              branch: null,
              displayName: 'Pretty name',
              kind: 0,
              disabled: false,
              scannerDisabled: false,
              authUser: null,
              authPass: null,
            },
            undefined
          );
        });

        expect(onSuccessMock).toHaveBeenCalledTimes(1);
      });

      it('calls add repo for org', async () => {
        Object.defineProperty(document, 'querySelector', {
          value: () => false,
          writable: true,
        });

        mocked(API).checkAvailability.mockResolvedValue(false);
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addRepository.mockResolvedValue(null);
        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Modal {...defaultProps} />
          </AppCtx.Provider>
        );

        userEvent.type(screen.getByRole('textbox', { name: /Name/ }), 'name');
        userEvent.type(screen.getByRole('textbox', { name: 'Display name' }), 'Pretty name');
        userEvent.type(screen.getByRole('textbox', { name: /Url/ }), 'http://test.com');
        userEvent.click(screen.getByRole('button', { name: 'Add repository' }));

        await waitFor(() => {
          expect(API.addRepository).toHaveBeenCalledTimes(1);
          expect(API.addRepository).toHaveBeenCalledWith(
            {
              name: 'name',
              url: 'http://test.com',
              branch: null,
              displayName: 'Pretty name',
              kind: 0,
              disabled: false,
              scannerDisabled: false,
              authUser: null,
              authPass: null,
            },
            'orgTest'
          );
        });

        expect(onSuccessMock).toHaveBeenCalledTimes(1);
      });

      it('displays default Api error', async () => {
        mocked(API).checkAvailability.mockResolvedValue(false);
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addRepository.mockRejectedValue({
          kind: ErrorKind.Other,
        });

        const component = <Modal {...defaultProps} />;
        const { rerender } = render(component);

        userEvent.type(screen.getByRole('textbox', { name: /Name/ }), 'name');
        userEvent.type(screen.getByRole('textbox', { name: 'Display name' }), 'Pretty name');
        userEvent.type(screen.getByRole('textbox', { name: /Url/ }), 'http://test.com');
        userEvent.click(screen.getByRole('button', { name: 'Add repository' }));

        await waitFor(() => {
          expect(API.addRepository).toHaveBeenCalledTimes(1);
        });

        rerender(component);

        expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
        expect(
          screen.getByText('An error occurred adding the repository, please try again later.')
        ).toBeInTheDocument();
      });

      it('displays custom Api error', async () => {
        mocked(API).checkAvailability.mockResolvedValue(false);
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addRepository.mockRejectedValue({
          kind: ErrorKind.Other,
          message: 'custom error',
        });

        const component = <Modal {...defaultProps} />;
        const { rerender } = render(component);

        userEvent.type(screen.getByRole('textbox', { name: /Name/ }), 'name');
        userEvent.type(screen.getByRole('textbox', { name: 'Display name' }), 'Pretty name');
        userEvent.type(screen.getByRole('textbox', { name: /Url/ }), 'http://test.com');
        userEvent.click(screen.getByRole('button', { name: 'Add repository' }));

        await waitFor(() => {
          expect(API.addRepository).toHaveBeenCalledTimes(1);
        });

        rerender(component);

        expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
        expect(screen.getByText('An error occurred adding the repository: custom error')).toBeInTheDocument();
      });

      it('calls onAuthError when error is UnauthorizedError', async () => {
        mocked(API).checkAvailability.mockResolvedValue(false);
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addRepository.mockRejectedValue({
          kind: ErrorKind.Unauthorized,
        });
        render(<Modal {...defaultProps} />);

        userEvent.type(screen.getByRole('textbox', { name: /Name/ }), 'name');
        userEvent.type(screen.getByRole('textbox', { name: 'Display name' }), 'Pretty name');
        userEvent.type(screen.getByRole('textbox', { name: /Url/ }), 'http://test.com');
        userEvent.click(screen.getByRole('button', { name: 'Add repository' }));

        await waitFor(() => {
          expect(API.addRepository).toHaveBeenCalledTimes(1);
        });

        expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
      });
    });

    describe('Update repository', () => {
      it('calls update repository', async () => {
        mocked(API).checkAvailability.mockResolvedValue(true);
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).updateRepository.mockResolvedValue(null);
        render(<Modal {...defaultProps} repository={repoMock} />);

        expect(screen.getByText('Update repository')).toBeInTheDocument();
        expect(screen.getByText('Update')).toBeInTheDocument();
        const displayNameInput = screen.getByRole('textbox', { name: 'Display name' });
        userEvent.clear(displayNameInput);
        userEvent.type(displayNameInput, 'Pretty name');
        userEvent.click(screen.getByRole('button', { name: 'Update repository' }));

        await waitFor(() => {
          expect(API.updateRepository).toHaveBeenCalledTimes(1);
          expect(API.updateRepository).toHaveBeenCalledWith(
            {
              ...repoMock,
              displayName: 'Pretty name',
            },
            undefined
          );
        });

        expect(onSuccessMock).toHaveBeenCalledTimes(1);
      });

      it('calls update repository for org', async () => {
        mocked(API).checkAvailability.mockResolvedValue(true);
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).updateRepository.mockResolvedValue(null);
        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Modal {...defaultProps} repository={repoMock} />
          </AppCtx.Provider>
        );

        const displayNameInput = screen.getByRole('textbox', { name: 'Display name' });
        userEvent.clear(displayNameInput);
        userEvent.type(displayNameInput, 'Pretty name');
        userEvent.click(screen.getByRole('button', { name: 'Update repository' }));

        await waitFor(() => {
          expect(API.updateRepository).toHaveBeenCalledTimes(1);
          expect(API.updateRepository).toHaveBeenCalledWith(
            {
              ...repoMock,
              displayName: 'Pretty name',
            },
            'orgTest'
          );
        });

        expect(onSuccessMock).toHaveBeenCalledTimes(1);
      });

      it('displays default Api error', async () => {
        mocked(API).checkAvailability.mockResolvedValue(true);
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).updateRepository.mockRejectedValue({
          kind: ErrorKind.Other,
        });

        const component = <Modal {...defaultProps} repository={repoMock} />;
        const { rerender } = render(component);

        const displayNameInput = screen.getByRole('textbox', { name: 'Display name' });
        userEvent.clear(displayNameInput);
        userEvent.type(displayNameInput, 'Pretty name');
        userEvent.click(screen.getByRole('button', { name: 'Update repository' }));

        await waitFor(() => {
          expect(API.updateRepository).toHaveBeenCalledTimes(1);
        });

        rerender(component);

        expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
        expect(
          screen.getByText('An error occurred updating the repository, please try again later.')
        ).toBeInTheDocument();
      });

      it('displays custom Api error message', async () => {
        mocked(API).checkAvailability.mockResolvedValue(true);
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).updateRepository.mockRejectedValue({
          kind: ErrorKind.Other,
          message: 'custom error',
        });

        const component = <Modal {...defaultProps} repository={repoMock} />;
        const { rerender } = render(component);

        const displayNameInput = screen.getByRole('textbox', { name: 'Display name' });
        userEvent.clear(displayNameInput);
        userEvent.type(displayNameInput, 'Pretty name');
        userEvent.click(screen.getByRole('button', { name: 'Update repository' }));

        await waitFor(() => {
          expect(API.updateRepository).toHaveBeenCalledTimes(1);
        });

        rerender(component);

        expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
        expect(screen.getByText('An error occurred updating the repository: custom error')).toBeInTheDocument();
      });

      it('calls onAuthError when error is UnauthorizedError', async () => {
        mocked(API).checkAvailability.mockResolvedValue(true);
        mocked(API).updateRepository.mockRejectedValue({
          kind: ErrorKind.Unauthorized,
        });
        render(<Modal {...defaultProps} repository={repoMock} />);

        const displayNameInput = screen.getByRole('textbox', { name: 'Display name' });
        userEvent.clear(displayNameInput);
        userEvent.type(displayNameInput, 'Pretty name');
        userEvent.click(screen.getByRole('button', { name: 'Update repository' }));

        await waitFor(() => {
          expect(API.updateRepository).toHaveBeenCalledTimes(1);
        });

        expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
      });
    });

    describe('Disable repository', () => {
      it('new repo', async () => {
        mocked(API).checkAvailability.mockResolvedValue(false);
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addRepository.mockResolvedValue(null);
        render(<Modal {...defaultProps} />);

        expect(screen.getByText('Add repository')).toBeInTheDocument();
        expect(screen.getByText('Add')).toBeInTheDocument();
        const nameInput = screen.getByRole('textbox', { name: /Name/ });
        userEvent.type(nameInput, 'name');
        const displayNameInput = screen.getByRole('textbox', { name: 'Display name' });
        userEvent.type(displayNameInput, 'Pretty name');
        const urlInput = screen.getByRole('textbox', { name: /Url/ });
        userEvent.type(urlInput, 'http://test.com');

        const toggle = screen.getByRole('checkbox', { name: 'Disabled' });
        expect(toggle).toBeInTheDocument();
        expect(toggle).not.toBeChecked();
        userEvent.click(toggle);

        userEvent.click(screen.getByRole('button', { name: 'Add repository' }));

        await waitFor(() => {
          expect(API.addRepository).toHaveBeenCalledTimes(1);
          expect(API.addRepository).toHaveBeenCalledWith(
            {
              name: 'name',
              url: 'http://test.com',
              branch: null,
              displayName: 'Pretty name',
              kind: 0,
              disabled: true,
              scannerDisabled: false,
              authUser: null,
              authPass: null,
            },
            undefined
          );
        });

        expect(onSuccessMock).toHaveBeenCalledTimes(1);
      });

      describe('existing repo', () => {
        it('confirms action', async () => {
          mocked(API).checkAvailability.mockResolvedValue(true);
          mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
          mocked(API).updateRepository.mockResolvedValue(null);

          render(
            <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
              <Modal {...defaultProps} repository={repoMock} />
            </AppCtx.Provider>
          );

          const toggle = screen.getByRole('checkbox', { name: 'Disabled' });
          expect(toggle).toBeInTheDocument();
          expect(toggle).not.toBeChecked();
          userEvent.click(toggle);

          expect(await screen.findByText('Disable repository')).toBeInTheDocument();
          expect(screen.getByText(/Please read this carefully./g)).toBeInTheDocument();
          expect(screen.getByText('This operation cannot be undone.')).toBeInTheDocument();
          expect(screen.getByRole('textbox')).toBeInTheDocument();
          expect(screen.getByRole('button', { name: 'Disable repository' })).toBeInTheDocument();

          userEvent.type(screen.getByRole('textbox'), 'repoTest');
          userEvent.click(screen.getByRole('button', { name: 'Disable repository' }));

          await waitFor(() => {
            expect(screen.getByText('Update repository')).toBeInTheDocument();
          });

          userEvent.click(screen.getByRole('button', { name: 'Update repository' }));

          await waitFor(() => {
            expect(API.updateRepository).toHaveBeenCalledTimes(1);
            expect(API.updateRepository).toHaveBeenCalledWith(
              {
                ...repoMock,
                disabled: true,
              },
              'orgTest'
            );
          });

          expect(onSuccessMock).toHaveBeenCalledTimes(1);
        });

        it('does not confirm action', async () => {
          mocked(API).checkAvailability.mockResolvedValue(true);
          mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
          mocked(API).updateRepository.mockResolvedValue(null);

          render(
            <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
              <Modal {...defaultProps} repository={repoMock} />
            </AppCtx.Provider>
          );

          const toggle = screen.getByRole('checkbox', { name: 'Disabled' });
          expect(toggle).toBeInTheDocument();
          expect(toggle).not.toBeChecked();
          userEvent.click(toggle);

          expect(await screen.findByText('Disable repository')).toBeInTheDocument();

          expect(screen.getByText(/Please read this carefully./g)).toBeInTheDocument();
          expect(screen.getByText('This operation cannot be undone.')).toBeInTheDocument();
          expect(screen.getByRole('textbox')).toBeInTheDocument();
          expect(screen.getByRole('button', { name: 'Disable repository' })).toBeInTheDocument();

          userEvent.type(screen.getByRole('textbox'), 'repoTest');
          userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

          await waitFor(() => {
            expect(screen.getByText('Update repository')).toBeInTheDocument();
          });

          userEvent.click(screen.getByRole('button', { name: 'Update repository' }));

          await waitFor(() => {
            expect(API.updateRepository).toHaveBeenCalledTimes(1);
            expect(API.updateRepository).toHaveBeenCalledWith(
              {
                ...repoMock,
              },
              'orgTest'
            );
          });

          expect(onSuccessMock).toHaveBeenCalledTimes(1);
        });

        it('does not render confirmation info', async () => {
          mocked(API).checkAvailability.mockResolvedValue(true);
          mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
          mocked(API).updateRepository.mockResolvedValue(null);

          render(
            <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
              <Modal
                {...defaultProps}
                repository={{
                  ...repoMock,
                  disabled: true,
                }}
              />
            </AppCtx.Provider>
          );

          const toggle = screen.getByRole('checkbox', { name: 'Disabled' });
          expect(toggle).toBeInTheDocument();
          expect(toggle).toBeChecked();
          userEvent.click(toggle);

          await waitFor(() => {
            expect(toggle).not.toBeChecked();
          });

          userEvent.click(toggle);

          await waitFor(() => {
            expect(toggle).toBeChecked();
          });
        });
      });
    });

    describe('When allowPrivateRepositories is true', () => {
      it('renders Add repo for Helm charts', () => {
        Object.defineProperty(document, 'querySelector', {
          value: () => ({
            getAttribute: () => 'true',
          }),
          writable: true,
        });

        render(<Modal {...defaultProps} />);

        const form = screen.getByTestId('repoForm');
        expect(form).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Username' })).toBeInTheDocument();
        expect(screen.getByTestId('authPassInput')).toBeInTheDocument();
      });

      it('calls add repo for Helm charts', async () => {
        Object.defineProperty(document, 'querySelector', {
          value: () => ({
            getAttribute: () => 'true',
          }),
          writable: true,
        });

        mocked(API).checkAvailability.mockResolvedValue(false);
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addRepository.mockResolvedValue(null);
        render(<Modal {...defaultProps} />);

        expect(screen.getByText('Add repository')).toBeInTheDocument();
        expect(screen.getByText('Add')).toBeInTheDocument();
        userEvent.type(screen.getByRole('textbox', { name: /Name/ }), 'name');
        userEvent.type(screen.getByRole('textbox', { name: 'Display name' }), 'Pretty name');
        userEvent.type(screen.getByRole('textbox', { name: /Url/ }), 'http://test.com');
        userEvent.type(screen.getByRole('textbox', { name: 'Username' }), 'username');
        userEvent.type(screen.getByTestId('authPassInput'), 'pass123');
        userEvent.click(screen.getByRole('button', { name: 'Add repository' }));

        await waitFor(() => {
          expect(API.addRepository).toHaveBeenCalledTimes(1);
          expect(API.addRepository).toHaveBeenCalledWith(
            {
              name: 'name',
              url: 'http://test.com',
              branch: null,
              displayName: 'Pretty name',
              kind: 0,
              disabled: false,
              scannerDisabled: false,
              authUser: 'username',
              authPass: 'pass123',
            },
            undefined
          );
        });

        expect(onSuccessMock).toHaveBeenCalledTimes(1);
      });

      it('calls update repository for Helm charts', async () => {
        Object.defineProperty(document, 'querySelector', {
          value: () => ({
            getAttribute: () => 'true',
          }),
          writable: true,
        });

        mocked(API).checkAvailability.mockResolvedValue(true);
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).updateRepository.mockResolvedValue(null);
        render(<Modal {...defaultProps} repository={{ ...repoMock, authUser: 'username', authPass: 'pass123' }} />);

        expect(screen.getByText('Update repository')).toBeInTheDocument();
        expect(screen.getByText('Update')).toBeInTheDocument();
        userEvent.type(screen.getByTestId('authPassInput'), '4');
        userEvent.click(screen.getByRole('button', { name: 'Update repository' }));

        await waitFor(() => {
          expect(API.updateRepository).toHaveBeenCalledTimes(1);
          expect(API.updateRepository).toHaveBeenCalledWith(
            {
              ...repoMock,
              authUser: 'username',
              authPass: 'pass1234',
            },
            undefined
          );
        });

        expect(onSuccessMock).toHaveBeenCalledTimes(1);
      });
    });
  });
});
