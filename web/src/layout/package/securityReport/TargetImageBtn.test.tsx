import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import TargetImageBtn from './TargetImageBtn';

const onClickMock = jest.fn();
const scrollIntoViewMock = jest.fn();

window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const defaultProps = {
  isActive: false,
  isExpanded: false,
  onClick: onClickMock,
  expandedTarget: null,
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

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('content')).toBeInTheDocument();
    });

    it('calls onClick', async () => {
      render(<TargetImageBtn {...defaultProps} />);

      const btn = screen.getByRole('button');
      await userEvent.click(btn);

      await waitFor(() => {
        expect(onClickMock).toHaveBeenCalledTimes(1);
      });
    });

    it('scrolls into view when target is active', async () => {
      const { rerender } = render(<TargetImageBtn {...defaultProps} isActive={false} />);

      rerender(<TargetImageBtn {...defaultProps} isActive={true} />);

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
      });
    });

    it('scrolls into view when target is expanded', async () => {
      const { rerender } = render(<TargetImageBtn {...defaultProps} isActive={false} />);

      rerender(<TargetImageBtn {...defaultProps} isExpanded={true} />);

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
      });
    });

    it('does not scrolls into view when target is expanded but is only one', async () => {
      const { rerender } = render(<TargetImageBtn {...defaultProps} isActive={false} hasOnlyOneTarget />);

      rerender(<TargetImageBtn {...defaultProps} isActive={true} hasOnlyOneTarget />);

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalledTimes(0);
      });
    });
  });
});
