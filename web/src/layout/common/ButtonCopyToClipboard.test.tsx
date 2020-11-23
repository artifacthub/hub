import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import ButtonCopyToClipboard from './ButtonCopyToClipboard';

const copyToClipboardMock = jest.fn();
const clipboardWriteTextMock = jest.fn();

document.execCommand = copyToClipboardMock;

Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: clipboardWriteTextMock,
  },
  writable: true,
});

jest.useFakeTimers();

describe('ButtonCopyToClipboard', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<ButtonCopyToClipboard text="Text to copy" />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders tooltip after clicking button', async () => {
    const { getByTestId, getByRole, queryByRole } = render(<ButtonCopyToClipboard text="Text to copy" />);
    expect(queryByRole('tooltip')).toBeNull();

    const btn = getByTestId('ctcBtn');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledTimes(1);
      expect(clipboardWriteTextMock).toHaveBeenCalledWith('Text to copy');
    });

    expect(getByRole('tooltip')).toBeInTheDocument();
  });

  it('hides tooltip after 2 seconds', async () => {
    const { getByTestId, getByRole, queryByRole } = render(<ButtonCopyToClipboard text="Text to copy" />);
    expect(queryByRole('tooltip')).toBeNull();

    const btn = getByTestId('ctcBtn');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(getByRole('tooltip')).toBeInTheDocument();
    });

    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 2000);
  });

  it('renders tooltip after clicking button when navidator.clipboard is undefined', async () => {
    (navigator as any).clipboard = null;
    const { getByTestId, getByRole, queryByRole } = render(<ButtonCopyToClipboard text="Text to copy" />);
    expect(queryByRole('tooltip')).toBeNull();

    const btn = getByTestId('ctcBtn');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(copyToClipboardMock).toHaveBeenCalledTimes(1);
      expect(copyToClipboardMock).toHaveBeenCalledWith('copy');
    });

    expect(getByRole('tooltip')).toBeInTheDocument();
  });
});
