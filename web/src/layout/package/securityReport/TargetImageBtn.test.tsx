import { fireEvent, render, waitFor } from '@testing-library/react';
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
    const result = render(<TargetImageBtn {...defaultProps} />);

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByTestId, getByText } = render(<TargetImageBtn {...defaultProps} />);

      expect(getByTestId('btnExpand')).toBeInTheDocument();
      expect(getByText('content')).toBeInTheDocument();
    });

    it('calls onClick', () => {
      const { getByTestId } = render(<TargetImageBtn {...defaultProps} />);

      const btn = getByTestId('btnExpand');
      fireEvent.click(btn);

      waitFor(() => {
        expect(onClickMock).toHaveBeenCalledTimes(1);
      });
    });

    it('renders disabled button', () => {
      const { getByTestId } = render(<TargetImageBtn {...defaultProps} disabled={true} />);

      const btn = getByTestId('btnExpand');
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
