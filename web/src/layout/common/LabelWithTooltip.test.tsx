import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import LabelWithTooltip from './LabelWithTooltip';

const defaultProps = {
  tooltipMessage: 'Tooltip message',
  label: <div>label</div>,
  active: true,
  visibleTooltip: true,
};

describe('LabelWithTooltip', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<LabelWithTooltip {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders properly', () => {
    const { getByTestId, getByText } = render(<LabelWithTooltip {...defaultProps} />);
    expect(getByTestId('labelWithTooltip')).toBeInTheDocument();
    expect(getByText('label')).toBeInTheDocument();
  });

  it('does not render label', () => {
    const props = {
      ...defaultProps,
      active: false,
    };
    const { container } = render(<LabelWithTooltip {...props} />);
    expect(container).toBeEmpty();
  });

  it('displays tootltip', () => {
    const { getByTestId, getByText, getByRole } = render(<LabelWithTooltip {...defaultProps} />);

    const badge = getByTestId('labelWithTooltip');
    fireEvent.mouseEnter(badge);

    waitFor(() => {
      expect(getByText(defaultProps.tooltipMessage)).toBeInTheDocument();
      expect(getByRole('tooltip')).toBeInTheDocument();
    });
  });

  it('hides tootltip on mouse leave', () => {
    const { getByTestId, getByText, getByRole, queryByRole } = render(<LabelWithTooltip {...defaultProps} />);

    const badge = getByTestId('labelWithTooltip');
    fireEvent.mouseEnter(badge);

    waitFor(() => {
      expect(getByText(defaultProps.tooltipMessage)).toBeInTheDocument();
      expect(getByRole('tooltip')).toBeInTheDocument();
    });

    fireEvent.mouseLeave(badge);

    waitFor(() => {
      expect(queryByRole('tooltip')).toBeNull();
    });
  });

  it('does not display tootltip when visibleTooltip is false', () => {
    const props = {
      ...defaultProps,
      visibleTooltip: false,
    };
    const { getByTestId, queryByRole } = render(<LabelWithTooltip {...props} />);

    const badge = getByTestId('labelWithTooltip');
    fireEvent.mouseEnter(badge);

    waitFor(() => {
      expect(queryByRole('tooltip')).toBeNull();
    });
  });
});
