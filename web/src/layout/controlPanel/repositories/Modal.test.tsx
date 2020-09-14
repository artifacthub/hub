import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { ErrorKind, Repository } from '../../../types';
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
};

const mockCtx = {
  user: { alias: 'test', email: 'test@test.com' },
  prefs: {
    controlPanel: {
      selectedOrg: 'orgTest',
    },
    search: { limit: 25 },
    theme: {
      configured: 'light',
      automatic: false,
    },
  },
};

describe('Repository Modal - repositories section', () => {
  afterEach(() => {
    jest.resetAllMocks();
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
    });

    it('renders component with existing repo', () => {
      const { getByTestId, getByDisplayValue } = render(<Modal {...defaultProps} repository={repoMock} />);

      const form = getByTestId('repoForm');
      expect(form).toBeInTheDocument();
      expect(getByDisplayValue(repoMock.name)).toBeInTheDocument();
      expect(getByDisplayValue(repoMock.displayName!)).toBeInTheDocument();
      expect(getByDisplayValue(repoMock.url)).toBeInTheDocument();
    });

    describe('Add repo', () => {
      it('calls add repo', async () => {
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
              displayName: 'Pretty name',
              kind: 0,
            },
            undefined
          );
        });

        expect(onSuccessMock).toHaveBeenCalledTimes(1);
      });

      it('calls add repo for org', async () => {
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
              displayName: 'Pretty name',
              kind: 0,
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

    describe('Update organization', () => {
      it('calls update organization', async () => {
        mocked(API).checkAvailability.mockResolvedValue(true);
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addRepository.mockResolvedValue(null);
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

      it('calls update organization for org', async () => {
        mocked(API).checkAvailability.mockResolvedValue(true);
        mocked(API).saveImage.mockResolvedValue({ imageId: '123' });
        mocked(API).addRepository.mockResolvedValue(null);
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
  });
});
