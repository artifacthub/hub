import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
const user = userEvent.setup({ delay: null });

const defaultProps = {
  onClick: onClickMock,
  action: AuthorizerAction.AddOrganizationMember,
};

const mockCtx = {
  user: { alias: 'test', email: 'test@test.com', passwordSet: true },
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
    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <ActionBtn {...defaultProps}>
          <div>button content</div>
        </ActionBtn>
      </AppCtx.Provider>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders enabled button', async () => {
    render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <ActionBtn {...defaultProps}>
          <div>button content</div>
        </ActionBtn>
      </AppCtx.Provider>
    );

    const btn = screen.getByRole('button');
    expect(btn).toBeInTheDocument();
    expect(btn).not.toHaveClass('disabled');

    await userEvent.click(btn);
    expect(onClickMock).toHaveBeenCalledTimes(1);

    expect(screen.getByText('button content')).toBeInTheDocument();
  });

  it('renders disabled button', async () => {
    render(
      <AppCtx.Provider
        value={{
          ctx: {
            ...mockCtx,
            user: { alias: 'member', email: 'test@test.com', passwordSet: false },
          },
          dispatch: jest.fn(),
        }}
      >
        <ActionBtn {...defaultProps}>
          <div>button content</div>
        </ActionBtn>
      </AppCtx.Provider>
    );

    const btn = screen.getByRole('button');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass('disabled');

    await userEvent.click(btn);
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
            user: { alias: 'member', email: 'test@test.com', passwordSet: false },
          },
          dispatch: jest.fn(),
        }}
      >
        <ActionBtn {...defaultProps}>
          <div>button content</div>
        </ActionBtn>
      </AppCtx.Provider>
    );

    const btn = screen.getByRole('button');
    await user.hover(btn);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('You are not allowed to perform this action')).toBeInTheDocument();

    jest.useRealTimers();
  });
});
