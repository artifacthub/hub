import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { AppCtx } from '../../context/AppCtx';
import { AuthorizerAction, AuthorizerInput } from '../../types';
import ActionBtn from './ActionBtn';

jest.mock('../../utils/authorizer', () => ({
  check: (params: AuthorizerInput) => {
    if (params.user === 'member') {
      return false;
    }
    return true;
  },
}));

const onClickMock = jest.fn();

const defaultProps = {
  testId: 'test',
  onClick: onClickMock,
  action: AuthorizerAction.AddOrganizationMember,
};

const mockCtx = {
  user: { alias: 'test', email: 'test@test.com' },
  prefs: {
    controlPanel: { selectedOrg: 'orgTest' },
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

describe('ActionBtn', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <ActionBtn {...defaultProps}>
          <div>button content</div>
        </ActionBtn>
      </AppCtx.Provider>
    );
    expect(result.asFragment()).toMatchSnapshot();
  });

  it('renders enabled button', () => {
    render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <ActionBtn {...defaultProps}>
          <div>button content</div>
        </ActionBtn>
      </AppCtx.Provider>
    );

    const btn = screen.getByTestId(defaultProps.testId);
    expect(btn).toBeInTheDocument();
    expect(btn).not.toHaveClass('disabled');

    userEvent.click(btn);
    expect(onClickMock).toHaveBeenCalledTimes(1);

    expect(screen.getByText('button content')).toBeInTheDocument();
  });

  it('renders disabled button', () => {
    render(
      <AppCtx.Provider
        value={{
          ctx: {
            ...mockCtx,
            user: { alias: 'member', email: 'test@test.com' },
          },
          dispatch: jest.fn(),
        }}
      >
        <ActionBtn {...defaultProps}>
          <div>button content</div>
        </ActionBtn>
      </AppCtx.Provider>
    );

    const btn = screen.getByTestId(defaultProps.testId);
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass('disabled');

    userEvent.click(btn);
    expect(onClickMock).toHaveBeenCalledTimes(0);

    expect(screen.getByText('button content')).toBeInTheDocument();
  });

  it('displays tooltip', async () => {
    jest.useFakeTimers();

    render(
      <AppCtx.Provider
        value={{
          ctx: {
            ...mockCtx,
            user: { alias: 'member', email: 'test@test.com' },
          },
          dispatch: jest.fn(),
        }}
      >
        <ActionBtn {...defaultProps}>
          <div>button content</div>
        </ActionBtn>
      </AppCtx.Provider>
    );

    const btn = screen.getByTestId(defaultProps.testId);
    userEvent.hover(btn);

    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('You are not allowed to perform this action')).toBeInTheDocument();

    jest.useRealTimers();
  });
});
