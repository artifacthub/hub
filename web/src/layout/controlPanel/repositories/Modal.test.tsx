import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../api';
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

describe('Repository Modal - repositories section', () => {
  afterEach(() => {
    jest.resetAllMocks();
    delete (window as any).config;
  });

  it('creates snapshot', () => {
    const result = render(<Modal {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByTestId } = render(<Modal {...defaultProps} />);

      const form = getByTestId('repoForm');
      expect(form).toBeInTheDocument();
      expect(getByTestId('nameInput')).toBeInTheDocument();
      expect(getByTestId('displayNameInput')).toBeInTheDocument();
      expect(getByTestId('urlInput')).toBeInTheDocument();
      expect(getByTestId('toggleDisabledRepo')).toBeInTheDocument();
    });

    it('renders component with existing repo', () => {
      const { getByTestId, getByDisplayValue } = render(<Modal {...defaultProps} repository={repoMock} />);

      const form = getByTestId('repoForm');
      expect(form).toBeInTheDocument();
      expect(getByDisplayValue(repoMock.name)).toBeInTheDocument();
      expect(getByDisplayValue(repoMock.displayName!)).toBeInTheDocument();
      expect(getByDisplayValue(repoMock.url)).toBeInTheDocument();
      expect(getByTestId('toggleDisabledRepo')).toBeInTheDocument();
    });

    it('renders private not Helm charts repo', () => {
      Object.defineProperty(document, 'querySelector', {
        value: () => ({
          getAttribute: () => 'true',
        }),
        writable: true,
      });

      const { getByText, queryByTestId } = render(
        <Modal {...defaultProps} repository={{ ...repoMock, kind: RepositoryKind.HelmPlugin, authPass: 'pass123' }} />
      );

      expect(getByText('Update repository')).toBeInTheDocument();
      expect(getByText('Update')).toBeInTheDocument();
      expect(getByText('Authentication token')).toBeInTheDocument();
      expect(queryByTestId('authUserInput')).toBeNull();
    });

    it('displays warning about repo url', () => {
      const { getByText, getByTestId } = render(
        <Modal {...defaultProps} repository={{ ...repoMock, kind: RepositoryKind.OLM }} />
      );

      expect(getByText(/Please DO NOT include the git hosting platform specific parts/g)).toBeInTheDocument();
      expect(getByText('tree/branch')).toBeInTheDocument();

      fireEvent.change(getByTestId('urlInput'), { target: { value: 'https://github.com/test/tree/test' } });

      expect(getByText(/Please DO NOT include the git hosting platform specific parts/g)).toHaveClass(
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
        const { getByTestId, getByText } = render(<Modal {...defaultProps} />);

        expect(getByText('Add repository')).toBeInTheDocument();
        expect(getByText('Add')).toBeInTheDocument();
        fireEvent.change(getByTestId('nameInput'), { target: { value: 'name' } });
        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.change(getByTestId('urlInput'), { target: { value: 'http://test.com' } });
        fireEvent.click(getByTestId('repoBtn'));

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
        const { getByTestId } = render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Modal {...defaultProps} />
          </AppCtx.Provider>
        );

        fireEvent.change(getByTestId('nameInput'), { target: { value: 'name' } });
        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.change(getByTestId('urlInput'), { target: { value: 'http://test.com' } });
        fireEvent.click(getByTestId('repoBtn'));

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
        const { getByTestId, getByText, rerender } = render(component);

        fireEvent.change(getByTestId('nameInput'), { target: { value: 'name2' } });
        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.change(getByTestId('urlInput'), { target: { value: 'http://test.com' } });
        fireEvent.click(getByTestId('repoBtn'));

        await waitFor(() => {
          expect(API.addRepository).toHaveBeenCalledTimes(1);
        });

        rerender(component);

        expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
        expect(getByText('An error occurred adding the repository, please try again later.')).toBeInTheDocument();
      });

      it('displays custom Api error', async () => {
        mocked(API).checkAvailability.mockResolvedValue(false);
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addRepository.mockRejectedValue({
          kind: ErrorKind.Other,
          message: 'custom error',
        });

        const component = <Modal {...defaultProps} />;
        const { getByTestId, getByText, rerender } = render(component);

        fireEvent.change(getByTestId('nameInput'), { target: { value: 'name2' } });
        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.change(getByTestId('urlInput'), { target: { value: 'http://test.com' } });
        fireEvent.click(getByTestId('repoBtn'));

        await waitFor(() => {
          expect(API.addRepository).toHaveBeenCalledTimes(1);
        });

        rerender(component);

        expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
        expect(getByText('An error occurred adding the repository: custom error')).toBeInTheDocument();
      });

      it('calls onAuthError when error is UnauthorizedError', async () => {
        mocked(API).checkAvailability.mockResolvedValue(false);
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addRepository.mockRejectedValue({
          kind: ErrorKind.Unauthorized,
        });
        const { getByTestId } = render(<Modal {...defaultProps} />);

        fireEvent.change(getByTestId('nameInput'), { target: { value: 'name2' } });
        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.change(getByTestId('urlInput'), { target: { value: 'http://test.com' } });
        fireEvent.click(getByTestId('repoBtn'));

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
        const { getByTestId, getByText } = render(<Modal {...defaultProps} repository={repoMock} />);

        expect(getByText('Update repository')).toBeInTheDocument();
        expect(getByText('Update')).toBeInTheDocument();
        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.click(getByTestId('repoBtn'));

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
        const { getByTestId } = render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Modal {...defaultProps} repository={repoMock} />
          </AppCtx.Provider>
        );

        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.click(getByTestId('repoBtn'));

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
        const { getByTestId, getByText, rerender } = render(component);

        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.click(getByTestId('repoBtn'));

        await waitFor(() => {
          expect(API.updateRepository).toHaveBeenCalledTimes(1);
        });

        rerender(component);

        expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
        expect(getByText('An error occurred updating the repository, please try again later.')).toBeInTheDocument();
      });

      it('displays custom Api error message', async () => {
        mocked(API).checkAvailability.mockResolvedValue(true);
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).updateRepository.mockRejectedValue({
          kind: ErrorKind.Other,
          message: 'custom error',
        });

        const component = <Modal {...defaultProps} repository={repoMock} />;
        const { getByTestId, getByText, rerender } = render(component);

        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.click(getByTestId('repoBtn'));

        await waitFor(() => {
          expect(API.updateRepository).toHaveBeenCalledTimes(1);
        });

        rerender(component);

        expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
        expect(getByText('An error occurred updating the repository: custom error')).toBeInTheDocument();
      });

      it('calls onAuthError when error is UnauthorizedError', async () => {
        mocked(API).checkAvailability.mockResolvedValue(true);
        mocked(API).updateRepository.mockRejectedValue({
          kind: ErrorKind.Unauthorized,
        });
        const { getByTestId } = render(<Modal {...defaultProps} repository={repoMock} />);

        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.click(getByTestId('repoBtn'));

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
        const { getByTestId, getByText } = render(<Modal {...defaultProps} />);

        expect(getByText('Add repository')).toBeInTheDocument();
        expect(getByText('Add')).toBeInTheDocument();
        fireEvent.change(getByTestId('nameInput'), { target: { value: 'name' } });
        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.change(getByTestId('urlInput'), { target: { value: 'http://test.com' } });

        const toggle = getByTestId('toggleDisabledRepo');
        expect(toggle).toBeInTheDocument();
        expect(toggle).not.toBeChecked();
        fireEvent.click(toggle);

        fireEvent.click(getByTestId('repoBtn'));

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

          const { getByTestId, getByText } = render(
            <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
              <Modal {...defaultProps} repository={repoMock} />
            </AppCtx.Provider>
          );

          const toggle = getByTestId('toggleDisabledRepo');
          expect(toggle).toBeInTheDocument();
          expect(toggle).not.toBeChecked();
          fireEvent.click(toggle);

          await waitFor(() => {
            expect(getByText('Disable repository')).toBeInTheDocument();
            expect(getByText(/Please read this carefully./g)).toBeInTheDocument();
            expect(getByText('This operation cannot be undone.')).toBeInTheDocument();
            expect(getByTestId('repoNameInput')).toBeInTheDocument();
            expect(getByTestId('confirmDisabledRepo')).toBeInTheDocument();
          });

          fireEvent.change(getByTestId('repoNameInput'), { target: { value: 'repoTest' } });
          fireEvent.click(getByTestId('confirmDisabledRepo'));

          await waitFor(() => {
            expect(getByText('Update repository')).toBeInTheDocument();
          });

          fireEvent.click(getByTestId('repoBtn'));

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

          const { getByTestId, getByText } = render(
            <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
              <Modal {...defaultProps} repository={repoMock} />
            </AppCtx.Provider>
          );

          const toggle = getByTestId('toggleDisabledRepo');
          expect(toggle).toBeInTheDocument();
          expect(toggle).not.toBeChecked();
          fireEvent.click(toggle);

          await waitFor(() => {
            expect(getByText('Disable repository')).toBeInTheDocument();
            expect(getByText(/Please read this carefully./g)).toBeInTheDocument();
            expect(getByText('This operation cannot be undone.')).toBeInTheDocument();
            expect(getByTestId('repoNameInput')).toBeInTheDocument();
            expect(getByTestId('confirmDisabledRepo')).toBeInTheDocument();
          });

          fireEvent.change(getByTestId('repoNameInput'), { target: { value: 'repoTest' } });
          fireEvent.click(getByTestId('cancelDisabledRepo'));

          await waitFor(() => {
            expect(getByText('Update repository')).toBeInTheDocument();
          });

          fireEvent.click(getByTestId('repoBtn'));

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

          const { getByTestId } = render(
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

          const toggle = getByTestId('toggleDisabledRepo');
          expect(toggle).toBeInTheDocument();
          expect(toggle).toBeChecked();
          fireEvent.click(toggle);

          await waitFor(() => {
            expect(toggle).not.toBeChecked();
          });

          fireEvent.click(toggle);

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

        const { getByTestId } = render(<Modal {...defaultProps} />);

        const form = getByTestId('repoForm');
        expect(form).toBeInTheDocument();
        expect(getByTestId('authUserInput')).toBeInTheDocument();
        expect(getByTestId('authPassInput')).toBeInTheDocument();
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
        const { getByTestId, getByText } = render(<Modal {...defaultProps} />);

        expect(getByText('Add repository')).toBeInTheDocument();
        expect(getByText('Add')).toBeInTheDocument();
        fireEvent.change(getByTestId('nameInput'), { target: { value: 'name' } });
        fireEvent.change(getByTestId('displayNameInput'), { target: { value: 'Pretty name' } });
        fireEvent.change(getByTestId('urlInput'), { target: { value: 'http://test.com' } });
        fireEvent.change(getByTestId('authUserInput'), { target: { value: 'username' } });
        fireEvent.change(getByTestId('authPassInput'), { target: { value: 'pass123' } });
        fireEvent.click(getByTestId('repoBtn'));

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
        const { getByTestId, getByText } = render(
          <Modal {...defaultProps} repository={{ ...repoMock, authUser: 'username', authPass: 'pass123' }} />
        );

        expect(getByText('Update repository')).toBeInTheDocument();
        expect(getByText('Update')).toBeInTheDocument();
        fireEvent.change(getByTestId('authPassInput'), { target: { value: 'pass1234' } });
        fireEvent.click(getByTestId('repoBtn'));

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
