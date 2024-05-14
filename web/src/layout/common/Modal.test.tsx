import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Modal from './Modal';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock('./Alert', () => (props: any) => <div>{props.message}</div>);

const onCloseMock = jest.fn();
const cleanErrorMock = jest.fn();

const defaultProps = {
  header: 'title',
  children: <span>children</span>,
  onClose: onCloseMock,
  cleanError: cleanErrorMock,
  open: true,
};

describe('Modal', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<Modal {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders proper content', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Close modal' })).toBeInTheDocument();
    expect(screen.getByText('children')).toBeInTheDocument();
    expect(screen.getByText('title')).toBeInTheDocument();
    expect(screen.getByTestId('modalBackdrop')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('calls onClose to click close button', async () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toHaveClass('d-block');

    await userEvent.click(screen.getByRole('button', { name: 'Close modal' }));
    expect(onCloseMock).toHaveBeenCalledTimes(1);

    expect(screen.getByRole('dialog')).not.toHaveClass('d-block');
  });

  it('calls onClose to click close button on modal footer', async () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toHaveClass('d-block');

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.getByRole('dialog')).not.toHaveClass('d-block');
  });

  it('renders error alert if error is defined', () => {
    render(<Modal {...defaultProps} error="api error" />);
    expect(screen.getByText('api error')).toBeInTheDocument();
  });

  it('opens Modal to click Open Modal btn', async () => {
    render(<Modal {...defaultProps} buttonContent="Open modal" open={false} />);

    const modal = screen.getByRole('dialog');
    expect(modal).not.toHaveClass('active d-block');
    const btn = screen.getByRole('button', { name: /Open modal/ });

    await userEvent.click(btn);

    expect(await screen.findByRole('dialog')).toHaveClass('active d-block');
  });

  it('calls cleanErrorMock to click close button when error is not null', async () => {
    render(<Modal {...defaultProps} error="Error" />);
    expect(screen.getByRole('dialog')).toHaveClass('d-block');

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(cleanErrorMock).toHaveBeenCalledTimes(1);
  });
});
