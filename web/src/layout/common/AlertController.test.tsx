import { act, render, screen } from '@testing-library/react';

import alertDispatcher from '../../utils/alertDispatcher';
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
  });

  it('renders warning alert', async () => {
    render(<AlertController />);

    expect(screen.getByTestId('alertController')).not.toHaveClass('show active');

    act(() => {
      alertDispatcher.postAlert({
        type: 'warning',
        message: 'This is a warning alert',
      });
    });

    expect(await screen.findByTestId('alertController')).toHaveClass('show active');
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

    expect(await screen.findByTestId('alertController')).toHaveClass('show active');
    expect(screen.getByTestId('alertController')).toHaveClass('alert-success');
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

    expect(await screen.findByTestId('alertController')).toHaveClass('show active');
    expect(screen.getByTestId('alertController')).toHaveClass('alert-danger');
    expect(screen.getByText('This is a danger alert'));
  });
});
