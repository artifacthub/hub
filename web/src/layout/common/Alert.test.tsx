import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Alert from './Alert';

const onCloseMock = jest.fn();
const scrollIntoViewMock = jest.fn();

window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const defaultProps = {
  message: null,
  type: 'danger',
  onClose: onCloseMock,
};

describe('Alert', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<Alert {...defaultProps} message="errorMessage" />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders alert', async () => {
    render(<Alert {...defaultProps} message="errorMessage" />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('renders proper content', async () => {
    const { rerender } = render(<Alert {...defaultProps} />);

    const alertWrapper = screen.getByTestId('alertWrapper');
    expect(alertWrapper).toBeInTheDocument();
    expect(alertWrapper).not.toHaveClass('isAlertActive');
    expect(screen.queryByRole('alert')).toBeNull();

    rerender(<Alert {...defaultProps} message="errorMessage" />);

    expect(await scrollIntoViewMock).toHaveBeenCalledTimes(1);
    expect(alertWrapper).toHaveClass('isAlertActive');

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText('errorMessage')).toBeInTheDocument();
    expect(screen.getByTestId('closeAlertBtn')).toBeInTheDocument();
  });

  it('calls close alert', async () => {
    render(<Alert {...defaultProps} message="errorMessage" />);

    const alertWrapper = screen.getByTestId('alertWrapper');
    expect(alertWrapper).toHaveClass('isAlertActive');

    const closeBtn = screen.getByTestId('closeAlertBtn');
    await userEvent.click(closeBtn);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
