import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import { API } from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { Member } from '../../../types';
import Card from './Card';
jest.mock('../../../api');

jest.mock('../../../utils/authorizer', () => ({
  check: () => {
    return true;
  },
}));

const memberMock: Member = {
  alias: 'test',
  firstName: 'first',
  lastName: 'last',
  confirmed: true,
};

const mockCtx = {
  user: { alias: 'userAlias', email: 'jsmith@email.com' },
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

const defaultProps = {
  member: memberMock,
  membersNumber: 3,
  onSuccess: jest.fn(),
  onAuthError: jest.fn(),
};

describe('Member Card - members section', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Card {...defaultProps} />
      </AppCtx.Provider>
    );

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...defaultProps} />
        </AppCtx.Provider>
      );
      expect(getByText(`${memberMock.firstName!} ${memberMock.lastName!}`)).toBeInTheDocument();
      expect(getByTestId('leaveOrRemoveModalBtn')).toBeInTheDocument();
    });

    it('renders alias when user has not saved first and last name', () => {
      const props = {
        ...defaultProps,
        member: {
          alias: 'test',
          confirmed: false,
        },
      };
      const { getAllByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...props} />
        </AppCtx.Provider>
      );

      expect(getAllByText('test')).toHaveLength(2);
    });

    it('calls deleteOrganizationMember to delete member', async () => {
      const { getByTestId, getByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...defaultProps} />
        </AppCtx.Provider>
      );

      const modalBtn = getByTestId('leaveOrRemoveModalBtn');
      expect(modalBtn).toBeInTheDocument();
      fireEvent.click(modalBtn);

      expect(getByText('Are you sure you want to remove this member from this organization?')).toBeInTheDocument();

      const btn = getByTestId('leaveOrRemoveBtn');
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.deleteOrganizationMember).toHaveBeenCalledTimes(1);
        expect(API.deleteOrganizationMember).toHaveBeenCalledWith(
          mockCtx.prefs.controlPanel.selectedOrg,
          memberMock.alias
        );
      });
    });

    it('calls deleteOrganizationMember to remove yourself from the organization', async () => {
      const props = {
        ...defaultProps,
        member: {
          alias: 'userAlias',
          confirmed: true,
        },
      };
      const { getByTestId, getByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...props} />
        </AppCtx.Provider>
      );

      const modalBtn = getByTestId('leaveOrRemoveModalBtn');
      expect(modalBtn).toBeInTheDocument();
      fireEvent.click(modalBtn);

      expect(getByText('Are you sure you want to leave this organization?')).toBeInTheDocument();

      const btn = getByTestId('leaveOrRemoveBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.deleteOrganizationMember).toHaveBeenCalledTimes(1);
        expect(API.deleteOrganizationMember).toHaveBeenCalledWith(
          mockCtx.prefs.controlPanel.selectedOrg,
          mockCtx.user.alias
        );
      });
    });
  });
});
