import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import alertDispatcher from '../../utils/alertDispatcher';
import AlertController from './AlertController';
jest.mock('../../utils/alertDispatcher');

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

  it('closes alert to click close button', () => {
    render(<AlertController />);

    alertDispatcher.postAlert({
      type: 'warning',
      message: 'alert',
    });

    waitFor(() => {
      userEvent.click(screen.getByText('×'));
      expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
      expect(alertDispatcher.postAlert).toHaveBeenCalledWith(null);
    });
  });

  it('renders warning alert', () => {
    render(<AlertController />);

    alertDispatcher.postAlert({
      type: 'warning',
      message: 'This is a warning alert',
    });

    waitFor(() => {
      const component = screen.getByTestId('alertController');
      expect(component).toHaveClass('alert-warning');
      expect(component).toHaveClass('show active');

      expect(screen.getByText('This is a warning alert'));
    });
  });

  it('renders success alert', () => {
    render(<AlertController />);

    alertDispatcher.postAlert({
      type: 'success',
      message: 'This is a success alert',
    });

    waitFor(() => {
      const component = screen.getByTestId('alertController');
      expect(component).toHaveClass('alert-success');
      expect(component).toHaveClass('show active');

      expect(screen.getByText('This is a success alert'));
    });
  });

  it('renders danger alert', () => {
    render(<AlertController />);

    alertDispatcher.postAlert({
      type: 'danger',
      message: 'This is a danger alert',
    });

    waitFor(() => {
      const component = screen.getByTestId('alertController');
      expect(component).toHaveClass('alert-danger');
      expect(component).toHaveClass('show active');

      expect(screen.getByText('This is a danger alert'));
    });
  });
});
