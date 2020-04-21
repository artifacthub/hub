import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import ButtonCopyToClipboard from './ButtonCopyToClipboard';

const copyToClipboardMock = jest.fn();

document.execCommand = copyToClipboardMock;

jest.useFakeTimers();

describe('ButtonCopyToClipboard', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshoty', () => {
    const { asFragment } = render(<ButtonCopyToClipboard text="Text to copy" />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders tooltip after clicking button', () => {
    const { getByTestId, getByRole, queryByRole } = render(<ButtonCopyToClipboard text="Text to copy" />);
    expect(queryByRole('tooltip')).toBeNull();

    const btn = getByTestId('ctcBtn');
    fireEvent.click(btn);
    expect(copyToClipboardMock).toHaveBeenCalledTimes(1);
    expect(copyToClipboardMock).toHaveBeenCalledWith('copy');
    expect(getByRole('tooltip')).toBeInTheDocument();
  });

  it('hides tooltip after 2 seconds', () => {
    const { getByTestId, getByRole, queryByRole } = render(<ButtonCopyToClipboard text="Text to copy" />);
    expect(queryByRole('tooltip')).toBeNull();

    const btn = getByTestId('ctcBtn');
    fireEvent.click(btn);
    expect(getByRole('tooltip')).toBeInTheDocument();

    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 2000);
  });
});
