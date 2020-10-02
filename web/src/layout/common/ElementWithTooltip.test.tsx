import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import ElementWithTooltip from './ElementWithTooltip';

const defaultProps = {
  tooltipMessage: 'Tooltip message',
  element: <div>label</div>,
  active: true,
  visibleTooltip: true,
};

describe('ElementWithTooltip', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<ElementWithTooltip {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders properly', () => {
    const { getByTestId, getByText } = render(<ElementWithTooltip {...defaultProps} />);
    expect(getByTestId('elementWithTooltip')).toBeInTheDocument();
    expect(getByText('label')).toBeInTheDocument();
  });

  it('does not render label', () => {
    const props = {
      ...defaultProps,
      active: false,
    };
    const { container } = render(<ElementWithTooltip {...props} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('displays tootltip', () => {
    const { getByTestId, getByText, getByRole } = render(<ElementWithTooltip {...defaultProps} />);

    const badge = getByTestId('elementWithTooltip');
    fireEvent.mouseEnter(badge);

    waitFor(() => {
      expect(getByText(defaultProps.tooltipMessage)).toBeInTheDocument();
      expect(getByRole('tooltip')).toBeInTheDocument();
    });
  });

  it('hides tootltip on mouse leave', () => {
    const { getByTestId, getByText, getByRole, queryByRole } = render(<ElementWithTooltip {...defaultProps} />);

    const badge = getByTestId('elementWithTooltip');
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
    const { getByTestId, queryByRole } = render(<ElementWithTooltip {...props} />);

    const badge = getByTestId('elementWithTooltip');
    fireEvent.mouseEnter(badge);

    waitFor(() => {
      expect(queryByRole('tooltip')).toBeNull();
    });
  });
});
