import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../../../api';
import { APIKey, ErrorKind } from '../../../../../types';
import Modal from './Modal';
jest.mock('../../../../../api');

const APIKeyMock: APIKey = {
  apiKeyId: 'bf28013f-610e-4691-80a2-bd3a673c4b3f',
  name: 'key1',
  createdAt: 1592498139,
};

const onSuccessMock = jest.fn();
const onAuthErrorMock = jest.fn();
const scrollIntoViewMock = jest.fn();

window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const defaultProps = {
  open: true,
  apiKey: undefined,
  onAuthError: onAuthErrorMock,
  onClose: jest.fn(),
  onSuccess: onSuccessMock,
};

describe('APIKeyModal - API keys section', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<Modal {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component when API key is defined', () => {
      const { getByTestId, getByText } = render(<Modal {...defaultProps} apiKey={APIKeyMock} />);

      expect(getByTestId('apiKeyForm')).toBeInTheDocument();
      expect(getByText('Update API key')).toBeInTheDocument();
      expect(getByText('Update')).toBeInTheDocument();
    });

    it('renders component when API key is undefined', () => {
      const { getByTestId, getByText } = render(<Modal {...defaultProps} />);

      expect(getByTestId('apiKeyForm')).toBeInTheDocument();
      expect(getByText('Add API key')).toBeInTheDocument();
      expect(getByText('Add')).toBeInTheDocument();
    });
  });

  describe('Add API key', () => {
    it('calls add API key', async () => {
      mocked(API).addAPIKey.mockResolvedValue({
        secret: '1276576',
        apiKeyId: 'id',
      });
      const { getByTestId, getByText, getAllByRole } = render(<Modal {...defaultProps} />);

      expect(getByText('Add API key')).toBeInTheDocument();
      expect(getByText('Add')).toBeInTheDocument();
      fireEvent.change(getByTestId('nameInput'), { target: { value: 'test' } });
      fireEvent.click(getByTestId('apiKeyFormBtn'));

      await waitFor(() => {
        expect(API.addAPIKey).toHaveBeenCalledTimes(1);
        expect(API.addAPIKey).toHaveBeenCalledWith('test');
      });

      expect(onSuccessMock).toHaveBeenCalledTimes(1);

      expect(getByText('API-KEY-ID')).toBeInTheDocument();
      expect(getByText('API-KEY-SECRET')).toBeInTheDocument();
      expect(
        getByText(
          /These are the credentials you will need to provide when making requests to the API. Please, copy and store them in a safe place./i
        )
      ).toBeInTheDocument();
      expect(getByText('You will not be able to see the secret again when you close this window.')).toBeInTheDocument();
      expect(getByText('Important:')).toBeInTheDocument();
      expect(getByText(/the API key you've just generated can be used to perform/i)).toBeInTheDocument();
      expect(getByText('Close')).toBeInTheDocument();

      const btns = getAllByRole('button');
      expect(btns[3]).toHaveTextContent('API docs');
      expect(btns[3]).toHaveAttribute('href', 'https://artifacthub.github.io/hub/api');
    });

    it('displays default Api error', async () => {
      mocked(API).addAPIKey.mockRejectedValue({
        kind: ErrorKind.Other,
      });

      const component = <Modal {...defaultProps} />;
      const { getByTestId, getByText, rerender } = render(component);

      fireEvent.change(getByTestId('nameInput'), { target: { value: 'test2' } });
      fireEvent.click(getByTestId('apiKeyFormBtn'));

      await waitFor(() => {
        expect(API.addAPIKey).toHaveBeenCalledTimes(1);
      });

      rerender(component);

      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
      expect(getByText('An error occurred adding the API key, please try again later.')).toBeInTheDocument();
    });

    it('calls onAuthError when error is UnauthorizedError', async () => {
      mocked(API).addAPIKey.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });
      const { getByTestId } = render(<Modal {...defaultProps} />);

      fireEvent.change(getByTestId('nameInput'), { target: { value: 'test2' } });
      fireEvent.click(getByTestId('apiKeyFormBtn'));

      await waitFor(() => {
        expect(API.addAPIKey).toHaveBeenCalledTimes(1);
      });

      expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Update API key', () => {
    it('calls update API key', async () => {
      mocked(API).updateAPIKey.mockResolvedValue(null);
      const { getByTestId, getByText } = render(<Modal {...defaultProps} apiKey={APIKeyMock} />);

      expect(getByText('Update API key')).toBeInTheDocument();
      expect(getByText('Update')).toBeInTheDocument();
      fireEvent.change(getByTestId('nameInput'), { target: { value: 'key1-a' } });
      fireEvent.click(getByTestId('apiKeyFormBtn'));

      await waitFor(() => {
        expect(API.updateAPIKey).toHaveBeenCalledTimes(1);
        expect(API.updateAPIKey).toHaveBeenCalledWith(APIKeyMock.apiKeyId, 'key1-a');
      });

      expect(onSuccessMock).toHaveBeenCalledTimes(1);
    });

    it('displays default Api error', async () => {
      mocked(API).updateAPIKey.mockRejectedValue({
        kind: ErrorKind.Other,
      });

      const component = <Modal {...defaultProps} apiKey={APIKeyMock} />;
      const { getByTestId, getByText, rerender } = render(component);

      fireEvent.change(getByTestId('nameInput'), { target: { value: 'key1-a' } });
      fireEvent.click(getByTestId('apiKeyFormBtn'));

      await waitFor(() => {
        expect(API.updateAPIKey).toHaveBeenCalledTimes(1);
      });

      rerender(component);

      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
      expect(getByText('An error occurred updating the API key, please try again later.')).toBeInTheDocument();
    });

    it('calls onAuthError when error is UnauthorizedError', async () => {
      mocked(API).updateAPIKey.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });
      const { getByTestId } = render(<Modal {...defaultProps} apiKey={APIKeyMock} />);

      fireEvent.change(getByTestId('nameInput'), { target: { value: 'key1-a' } });
      fireEvent.click(getByTestId('apiKeyFormBtn'));

      await waitFor(() => {
        expect(API.updateAPIKey).toHaveBeenCalledTimes(1);
      });

      expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
    });
  });
});
