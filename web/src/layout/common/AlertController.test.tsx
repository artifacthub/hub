import { act, render, screen } from '@testing-library/react';

import alertDispatcher from '../../utils/alertDispatcher';
import { hasClassContaining } from '../../utils/testUtils';
import AlertController from './AlertController';

describe('AlertController', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<AlertController />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders component when alert is null', () => {
    render(<AlertController />);

    const component = screen.getByTestId('alertController');
    expect(component).toBeInTheDocument();
    expect(component).not.toHaveClass('show');
    expect(component).toHaveClass('fade');
    expect(hasClassContaining(component, 'active')).toBe(false);
  });

  it('renders warning alert', async () => {
    render(<AlertController />);

    expect(screen.getByTestId('alertController')).not.toHaveClass('show');
    expect(hasClassContaining(screen.getByTestId('alertController'), 'active')).toBe(false);

    act(() => {
      alertDispatcher.postAlert({
        type: 'warning',
        message: 'This is a warning alert',
      });
    });

    const controller = await screen.findByTestId('alertController');
    expect(controller).toHaveClass('show');
    expect(hasClassContaining(controller, 'active')).toBe(true);
    expect(screen.getByTestId('alertController')).toHaveClass('alert-warning');
    expect(screen.getByText('This is a warning alert'));
  });

  it('renders success alert', async () => {
    render(<AlertController />);

    act(() => {
      alertDispatcher.postAlert({
        type: 'success',
        message: 'This is a success alert',
      });
    });

    const controller = await screen.findByTestId('alertController');
    expect(controller).toHaveClass('show');
    expect(hasClassContaining(controller, 'active')).toBe(true);
    expect(controller).toHaveClass('alert-success');
    expect(screen.getByText('This is a success alert'));
  });

  it('renders danger alert', async () => {
    render(<AlertController />);

    act(() => {
      alertDispatcher.postAlert({
        type: 'danger',
        message: 'This is a danger alert',
      });
    });

    const controller = await screen.findByTestId('alertController');
    expect(controller).toHaveClass('show');
    expect(hasClassContaining(controller, 'active')).toBe(true);
    expect(controller).toHaveClass('alert-danger');
    expect(screen.getByText('This is a danger alert'));
  });
});
