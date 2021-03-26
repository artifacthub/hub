import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { ErrorKind } from '../../../types';
import MemberModal from './Modal';
jest.mock('../../../api');

const onSuccessMock = jest.fn();
const onAuthErrorMock = jest.fn();
const scrollIntoViewMock = jest.fn();
window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const defaultProps = {
  open: true,
  membersList: [],
  onSuccess: onSuccessMock,
  onClose: jest.fn(),
  onAuthError: onAuthErrorMock,
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

describe('Members Modal - members section', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <MemberModal {...defaultProps} />
      </AppCtx.Provider>
    );

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByTestId } = render(<MemberModal {...defaultProps} />);

      const form = getByTestId('membersForm');
      expect(form).toBeInTheDocument();
      expect(getByTestId('aliasInput')).toBeInTheDocument();
    });

    it('calls add organization member', async () => {
      mocked(API).checkAvailability.mockResolvedValue(true);
      mocked(API).addOrganizationMember.mockResolvedValue(null);
      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <MemberModal {...defaultProps} />
        </AppCtx.Provider>
      );

      const input = getByTestId('aliasInput');
      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.click(getByTestId('membersFormBtn'));

      await waitFor(() => {
        expect(API.addOrganizationMember).toHaveBeenCalledTimes(1);
        expect(API.addOrganizationMember).toHaveBeenLastCalledWith('orgTest', 'test');
      });

      expect(onSuccessMock).toHaveBeenCalledTimes(1);
    });

    it('Other api error', async () => {
      mocked(API).checkAvailability.mockResolvedValue(true);
      mocked(API).addOrganizationMember.mockRejectedValue({
        kind: ErrorKind.Other,
      });

      const component = (
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <MemberModal {...defaultProps} />
        </AppCtx.Provider>
      );
      const { getByTestId, getByText, rerender } = render(component);

      const input = getByTestId('aliasInput');
      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.click(getByTestId('membersFormBtn'));

      await waitFor(() => {
        expect(API.addOrganizationMember).toHaveBeenCalledTimes(1);
      });

      rerender(component);

      expect(getByText('An error occurred adding the new member, please try again later.')).toBeInTheDocument();
    });

    it('calls onAuthError when error is UnauthorizedError', async () => {
      mocked(API).checkAvailability.mockResolvedValue(true);
      mocked(API).addOrganizationMember.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });
      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <MemberModal {...defaultProps} />
        </AppCtx.Provider>
      );

      const input = getByTestId('aliasInput');
      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.click(getByTestId('membersFormBtn'));

      await waitFor(() => {
        expect(API.addOrganizationMember).toHaveBeenCalledTimes(1);
      });

      expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
    });
  });
});
