import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import Alert from './Alert';

const onCloseMock = jest.fn();
const scrollIntoViewMock = jest.fn();

window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const defaultProps = {
  message: null,
  type: 'danger',
  activeScroll: true,
  onClose: onCloseMock,
};

jest.useFakeTimers();

describe('Alert', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<Alert {...defaultProps} message="errorMessage" />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders proper content', () => {
    const { rerender, getByTestId, getByRole, queryByRole, getByText } = render(<Alert {...defaultProps} />);

    const alertWrapper = getByTestId('alertWrapper');
    expect(alertWrapper).toBeInTheDocument();
    expect(alertWrapper).not.toHaveClass('isAlertActive');

    expect(queryByRole('alert')).toBeNull();

    rerender(<Alert {...defaultProps} message="errorMessage" />);

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    expect(alertWrapper).toHaveClass('isAlertActive');
    const alert = getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(getByText('errorMessage')).toBeInTheDocument();
    expect(getByTestId('closeAlertBtn')).toBeInTheDocument();
  });

  it('calls close alert', () => {
    const { getByTestId } = render(<Alert {...defaultProps} message="errorMessage" />);

    const alertWrapper = getByTestId('alertWrapper');
    expect(alertWrapper).toHaveClass('isAlertActive');

    const closeBtn = getByTestId('closeAlertBtn');
    fireEvent.click(closeBtn);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
