import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import API from '../../../api';
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
  user: { alias: 'userAlias', email: 'jsmith@email.com', passwordSet: false },
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
    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Card {...defaultProps} />
      </AppCtx.Provider>
    );

    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...defaultProps} />
        </AppCtx.Provider>
      );
      expect(screen.getByText(`${memberMock.firstName!} ${memberMock.lastName!}`)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open leave organization modal' })).toBeInTheDocument();
    });

    it('renders alias when user has not saved first and last name', () => {
      const props = {
        ...defaultProps,
        member: {
          alias: 'test',
          confirmed: false,
        },
      };
      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...props} />
        </AppCtx.Provider>
      );

      expect(screen.getAllByText('test')).toHaveLength(2);
    });

    it('calls deleteOrganizationMember to remove member', async () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...defaultProps} />
        </AppCtx.Provider>
      );

      const modalBtn = screen.getByRole('button', { name: 'Open leave organization modal' });
      expect(modalBtn).toBeInTheDocument();
      await userEvent.click(modalBtn);

      expect(
        screen.getByText('Are you sure you want to remove this member from this organization?')
      ).toBeInTheDocument();

      const btn = await screen.findByRole('button', { name: 'Remove member' });
      expect(btn).toBeInTheDocument();
      await userEvent.click(btn);

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
      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Card {...props} />
        </AppCtx.Provider>
      );

      const modalBtn = screen.getByRole('button', { name: 'Open leave organization modal' });
      expect(modalBtn).toBeInTheDocument();
      await userEvent.click(modalBtn);

      expect(screen.getByText('Are you sure you want to leave this organization?')).toBeInTheDocument();

      const btn = await screen.findByRole('button', { name: 'Leave organization' });
      await userEvent.click(btn);

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
