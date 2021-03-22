import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import Modal from './Modal';

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
    expect(asFragment).toMatchSnapshot();
  });

  it('renders proper content', () => {
    const { getByTestId, getByText } = render(<Modal {...defaultProps} />);
    expect(getByTestId('closeModalBtn')).toBeInTheDocument();
    expect(getByText('children')).toBeInTheDocument();
    expect(getByText('title')).toBeInTheDocument();
    expect(getByTestId('modalBackdrop')).toBeInTheDocument();
    expect(getByTestId('closeModalFooterBtn')).toBeInTheDocument();
  });

  it('calls onClose to click close button', () => {
    const { getByTestId, getByRole } = render(<Modal {...defaultProps} />);
    expect(getByRole('dialog')).toHaveClass('d-block');

    fireEvent.click(getByTestId('closeModalBtn'));
    expect(onCloseMock).toHaveBeenCalledTimes(1);

    expect(getByRole('dialog')).not.toHaveClass('d-block');
  });

  it('calls onClose to click close button on modal footer', () => {
    const { getByTestId, getByRole } = render(<Modal {...defaultProps} />);
    expect(getByRole('dialog')).toHaveClass('d-block');

    fireEvent.click(getByTestId('closeModalFooterBtn'));

    expect(getByRole('dialog')).not.toHaveClass('d-block');
  });

  it('renders error alert if error is defined', () => {
    const { getByText } = render(<Modal {...defaultProps} error="api error" />);
    expect(getByText('api error')).toBeInTheDocument();
  });

  it('opens Modal to click Open Modal btn', () => {
    const { getByTestId, getByRole } = render(<Modal {...defaultProps} buttonContent="Open modal" open={false} />);

    const modal = getByRole('dialog');
    expect(modal).not.toHaveClass('active d-block');
    const btn = getByTestId('openModalBtn');

    fireEvent.click(btn);

    waitFor(() => {
      expect(modal).toHaveClass('active d-block');
    });
  });

  it('calls cleanErrorMock to click close button when error is not null', () => {
    const { getByTestId, getByRole } = render(<Modal {...defaultProps} error="Error" />);
    expect(getByRole('dialog')).toHaveClass('d-block');

    fireEvent.click(getByTestId('closeModalFooterBtn'));

    expect(cleanErrorMock).toHaveBeenCalledTimes(1);
  });
});
