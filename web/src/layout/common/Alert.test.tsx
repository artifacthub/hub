import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { hasClassContaining } from '../../utils/testUtils';
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
    expect(hasClassContaining(alertWrapper, 'isAlertActive')).toBe(false);
    expect(screen.queryByRole('alert')).toBeNull();

    rerender(<Alert {...defaultProps} message="errorMessage" />);

    expect(await scrollIntoViewMock).toHaveBeenCalledTimes(1);
    expect(hasClassContaining(alertWrapper, 'isAlertActive')).toBe(true);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText('errorMessage')).toBeInTheDocument();
    expect(screen.getByTestId('closeAlertBtn')).toBeInTheDocument();
  });

  it('calls close alert', async () => {
    render(<Alert {...defaultProps} message="errorMessage" />);

    const alertWrapper = screen.getByTestId('alertWrapper');
    expect(hasClassContaining(alertWrapper, 'isAlertActive')).toBe(true);

    const closeBtn = screen.getByTestId('closeAlertBtn');
    await userEvent.click(closeBtn);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('displays again the same message when it is set right after closing the alert', async () => {
    const { rerender } = render(<Alert {...defaultProps} message="errorMessage" />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    rerender(<Alert {...defaultProps} message={null} />);
    expect(screen.queryByRole('alert')).toBeNull();

    rerender(<Alert {...defaultProps} message="errorMessage" />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('errorMessage')).toBeInTheDocument();
    expect(hasClassContaining(screen.getByTestId('alertWrapper'), 'isAlertActive')).toBe(true);
  });

  describe('when the size of the alert can be observed', () => {
    let onResize: () => void;
    const observeMock = jest.fn();
    const disconnectMock = jest.fn();

    beforeEach(() => {
      window.ResizeObserver = class {
        constructor(callback: () => void) {
          onResize = callback;
        }
        observe = observeMock;
        unobserve = jest.fn();
        disconnect = disconnectMock;
      } as unknown as typeof ResizeObserver;
    });

    afterEach(() => {
      delete (window as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
    });

    it('keeps the alert in view while it opens', async () => {
      render(<Alert {...defaultProps} message="errorMessage" />);

      const alertWrapper = screen.getByTestId('alertWrapper');
      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(observeMock).toHaveBeenCalledWith(alertWrapper);
      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);

      onResize();

      expect(scrollIntoViewMock).toHaveBeenCalledTimes(2);
      expect(scrollIntoViewMock).toHaveBeenLastCalledWith({ block: 'nearest', inline: 'nearest' });

      fireEvent.transitionEnd(alertWrapper);

      expect(disconnectMock).toHaveBeenCalled();
    });

    it('does not observe the alert when there is no message', () => {
      render(<Alert {...defaultProps} />);

      expect(observeMock).not.toHaveBeenCalled();
    });
  });
});
