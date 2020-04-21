import { fireEvent, render, waitFor } from '@testing-library/react';
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
    expect(asFragment).toMatchSnapshot();
  });

  it('renders component when alert is null', () => {
    const { getByTestId } = render(<AlertController />);

    const component = getByTestId('alertController');
    expect(component).toBeInTheDocument();
    expect(component).not.toHaveClass('show');
    expect(component).toHaveClass('fade');
    expect(component).toHaveTextContent('×');
  });

  it('closes alert to click close button', () => {
    const { getByText } = render(<AlertController />);

    alertDispatcher.postAlert({
      type: 'warning',
      message: 'alert',
    });

    waitFor(() => {
      const btn = getByText('×');
      fireEvent.click(btn);
      expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
      expect(alertDispatcher.postAlert).toHaveBeenCalledWith(null);
    });
  });

  it('renders warning alert', () => {
    const { getByTestId, getByText } = render(<AlertController />);

    alertDispatcher.postAlert({
      type: 'warning',
      message: 'This is a warning alert',
    });

    waitFor(() => {
      const component = getByTestId('alertController');
      expect(component).toHaveClass('alert-warning');
      expect(component).toHaveClass('show active');

      expect(getByText('This is a warning alert'));
    });
  });

  it('renders success alert', () => {
    const { getByTestId, getByText } = render(<AlertController />);

    alertDispatcher.postAlert({
      type: 'success',
      message: 'This is a success alert',
    });

    waitFor(() => {
      const component = getByTestId('alertController');
      expect(component).toHaveClass('alert-success');
      expect(component).toHaveClass('show active');

      expect(getByText('This is a success alert'));
    });
  });

  it('renders danger alert', () => {
    const { getByTestId, getByText } = render(<AlertController />);

    alertDispatcher.postAlert({
      type: 'danger',
      message: 'This is a danger alert',
    });

    waitFor(() => {
      const component = getByTestId('alertController');
      expect(component).toHaveClass('alert-danger');
      expect(component).toHaveClass('show active');

      expect(getByText('This is a danger alert'));
    });
  });
});
