import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
import LogIn from './LogIn';
jest.mock('../../api');

const mockHistoryReplace = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({
    replace: mockHistoryReplace,
  }),
}));

const scrollIntoViewMock = jest.fn();

window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const defaultProps = {
  openLogIn: true,
  setOpenLogIn: jest.fn(),
};

describe('LogIn', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(
      <Router>
        <LogIn {...defaultProps} />
      </Router>
    );

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, getByTestId } = render(
        <Router>
          <LogIn {...defaultProps} />
        </Router>
      );

      expect(getByText('Email')).toBeInTheDocument();
      expect(getByText('Password')).toBeInTheDocument();
      expect(getByTestId('logInBtn')).toBeInTheDocument();
    });

    it('updates all fields and calls login', async () => {
      const { getByTestId } = render(
        <Router>
          <LogIn {...defaultProps} />
        </Router>
      );

      const password = getByTestId('passwordInput') as HTMLInputElement;
      const email = getByTestId('emailInput') as HTMLInputElement;

      fireEvent.change(password, { target: { value: 'pass123' } });
      fireEvent.change(email, { target: { value: 'jsmith@email.com' } });

      const btn = getByTestId('logInBtn');
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.login).toBeCalledTimes(1);
        expect(API.login).toHaveBeenCalledWith({
          email: 'jsmith@email.com',
          password: 'pass123',
        });
      });
    });

    it('display 401 api error', async () => {
      mocked(API).login.mockRejectedValue({
        status: 401,
      });

      const { getByTestId, getByText } = render(
        <Router>
          <LogIn {...defaultProps} />
        </Router>
      );

      const password = getByTestId('passwordInput') as HTMLInputElement;
      const email = getByTestId('emailInput') as HTMLInputElement;

      fireEvent.change(password, { target: { value: 'pass123' } });
      fireEvent.change(email, { target: { value: 'jsmith@email.com' } });

      const btn = getByTestId('logInBtn');
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
        expect(getByText('Authentication failed. Please check your credentials')).toBeInTheDocument();
      });
    });

    it('display 400 api error', async () => {
      mocked(API).login.mockRejectedValue({
        status: 400,
        statusText: 'Password not provided',
      });

      const { getByTestId, getByText } = render(
        <Router>
          <LogIn {...defaultProps} />
        </Router>
      );

      const password = getByTestId('passwordInput') as HTMLInputElement;
      const email = getByTestId('emailInput') as HTMLInputElement;

      fireEvent.change(password, { target: { value: 'pass123' } });
      fireEvent.change(email, { target: { value: 'jsmith@email.com' } });

      const btn = getByTestId('logInBtn');
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
        expect(getByText('An error occurred signing in: Password not provided')).toBeInTheDocument();
      });
    });

    it('display common login error', async () => {
      mocked(API).login.mockRejectedValue({
        status: 500,
      });

      const { getByTestId, getByText } = render(
        <Router>
          <LogIn {...defaultProps} />
        </Router>
      );

      const password = getByTestId('passwordInput') as HTMLInputElement;
      const email = getByTestId('emailInput') as HTMLInputElement;

      fireEvent.change(password, { target: { value: 'pass123' } });
      fireEvent.change(email, { target: { value: 'jsmith@email.com' } });

      const btn = getByTestId('logInBtn');
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
        expect(getByText('An error occurred signing in, please try again later')).toBeInTheDocument();
      });
    });

    it('calls history replace on close modal when redirect is not undefined', async () => {
      const { getByTestId } = render(
        <Router>
          <LogIn {...defaultProps} redirect="/control-panel" />
        </Router>
      );

      const btn = getByTestId('closeModalBtn');
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);

      await waitFor(() => {
        expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
        expect(mockHistoryReplace).toHaveBeenCalledWith({ pathname: '/' });
      });
    });
  });
});
