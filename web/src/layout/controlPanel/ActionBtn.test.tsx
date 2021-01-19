import { fireEvent, render, waitFor } from '@testing-library/react';
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
      automatic: false,
    },
  },
};

describe('ActionBtn', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
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
    const { getByTestId, getByText } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <ActionBtn {...defaultProps}>
          <div>button content</div>
        </ActionBtn>
      </AppCtx.Provider>
    );

    const btn = getByTestId(defaultProps.testId);
    expect(btn).toBeInTheDocument();
    expect(btn).not.toHaveClass('disabled');

    fireEvent.click(btn);
    expect(onClickMock).toHaveBeenCalledTimes(1);

    expect(getByText('button content')).toBeInTheDocument();
  });

  it('renders disabled button', () => {
    const { getByTestId, getByText } = render(
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

    const btn = getByTestId(defaultProps.testId);
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass('disabled');

    fireEvent.click(btn);
    expect(onClickMock).toHaveBeenCalledTimes(0);

    expect(getByText('button content')).toBeInTheDocument();
  });

  it('displays tooltip', async () => {
    const { getByTestId, getByRole, getByText } = render(
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

    const btn = getByTestId(defaultProps.testId);
    fireEvent.mouseEnter(btn);

    await waitFor(() => {
      expect(getByRole('tooltip')).toBeInTheDocument();
      expect(getByText('You are not allowed to perform this action')).toBeInTheDocument();
    });
  });
});
