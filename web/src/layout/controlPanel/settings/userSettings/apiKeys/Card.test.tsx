import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../../../api';
import { APIKey, ErrorKind } from '../../../../../types';
import alertDispatcher from '../../../../../utils/alertDispatcher';
import Card from './Card';
jest.mock('../../../../../api');
jest.mock('../../../../../utils/alertDispatcher');
jest.mock('moment', () => () => ({ format: () => '2020/06/18 16:35:39 (+00:00)' }));

const APIKeyMock: APIKey = {
  apiKeyId: 'bf28013f-610e-4691-80a2-bd3a673c4b3f',
  name: 'key1',
  createdAt: 1592498139,
};

const setModalStatusMock = jest.fn();
const onAuthErrorMock = jest.fn();

const defaultProps = {
  apiKey: APIKeyMock,
  setModalStatus: setModalStatusMock,
  onSuccess: jest.fn(),
  onAuthError: onAuthErrorMock,
};

describe('API key Card - API keys section', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<Card {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, getByTestId } = render(<Card {...defaultProps} />);

      expect(getByTestId('APIKeyCard')).toBeInTheDocument();
      expect(getByText(APIKeyMock.name!)).toBeInTheDocument();
      expect(getByText('Created at:')).toBeInTheDocument();
      expect(getByTestId('updateAPIKeyBtn')).toBeInTheDocument();
      expect(getByTestId('deleteAPIKeyModalBtn')).toBeInTheDocument();
    });

    it('calls deleteAPIKey when leave button in dropdown is clicked', async () => {
      const { getByTestId, getByText } = render(<Card {...defaultProps} />);

      const modalBtn = getByTestId('deleteAPIKeyModalBtn');
      expect(modalBtn).toBeInTheDocument();
      fireEvent.click(modalBtn);

      expect(getByText('Are you sure you want to remove this API key?')).toBeInTheDocument();

      const btn = getByTestId('deleteAPIKeyBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.deleteAPIKey).toHaveBeenCalledTimes(1);
      });
    });

    it('calls setModalStatusMock when Edit button is clicked', () => {
      const { getByTestId } = render(<Card {...defaultProps} />);

      const btn = getByTestId('updateAPIKeyBtn');
      expect(btn).toBeInTheDocument();

      fireEvent.click(btn);
      expect(setModalStatusMock).toHaveBeenCalledTimes(1);
      expect(setModalStatusMock).toHaveBeenCalledWith({
        open: true,
        apiKey: APIKeyMock,
      });
    });
  });

  describe('on deleteAPIKey error', () => {
    it('displays generic error', async () => {
      mocked(API).deleteAPIKey.mockRejectedValue({
        kind: ErrorKind.Other,
      });
      const { getByTestId } = render(<Card {...defaultProps} />);

      const modalBtn = getByTestId('deleteAPIKeyModalBtn');
      expect(modalBtn).toBeInTheDocument();
      fireEvent.click(modalBtn);

      const btn = getByTestId('deleteAPIKeyBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.deleteAPIKey).toHaveBeenCalledTimes(1);
      });

      expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
      expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
        type: 'danger',
        message: 'An error occurred deleting the API key, please try again later.',
      });
    });

    it('calls onAuthError', async () => {
      mocked(API).deleteAPIKey.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });
      const { getByTestId } = render(<Card {...defaultProps} />);

      const modalBtn = getByTestId('deleteAPIKeyModalBtn');
      expect(modalBtn).toBeInTheDocument();
      fireEvent.click(modalBtn);

      const btn = getByTestId('deleteAPIKeyBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.deleteAPIKey).toHaveBeenCalledTimes(1);
      });

      expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
    });
  });
});
