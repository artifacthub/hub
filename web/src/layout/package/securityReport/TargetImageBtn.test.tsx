import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import TargetImageBtn from './TargetImageBtn';

const onClickMock = jest.fn();
const scrollIntoViewMock = jest.fn();

window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const defaultProps = {
  isExpanded: false,
  onClick: onClickMock,
  children: <>content</>,
  disabled: false,
  hasOnlyOneTarget: false,
};

describe('TargetImageBtn', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<TargetImageBtn {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<TargetImageBtn {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Open target image' })).toBeInTheDocument();
      expect(screen.getByText('content')).toBeInTheDocument();
    });

    it('calls onClick', () => {
      render(<TargetImageBtn {...defaultProps} />);

      const btn = screen.getByRole('button', { name: 'Open target image' });
      userEvent.click(btn);

      waitFor(() => {
        expect(onClickMock).toHaveBeenCalledTimes(1);
      });
    });

    it('renders disabled button', () => {
      render(<TargetImageBtn {...defaultProps} disabled={true} />);

      const btn = screen.getByRole('button', { name: 'Open target image' });
      expect(btn).toBeDisabled();
    });

    it('scrolls into view when target is expanded', () => {
      const { rerender } = render(<TargetImageBtn {...defaultProps} isExpanded={false} />);

      rerender(<TargetImageBtn {...defaultProps} isExpanded={true} />);

      waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
      });
    });

    it('does not scrolls into view when target is expanded but is only one', () => {
      const { rerender } = render(<TargetImageBtn {...defaultProps} isExpanded={false} hasOnlyOneTarget />);

      rerender(<TargetImageBtn {...defaultProps} isExpanded={true} hasOnlyOneTarget />);

      waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalledTimes(0);
      });
    });
  });
});
