import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import OfficialBadge from './OfficialBadge';

describe('OfficialBadge', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<OfficialBadge official />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders label', async () => {
    const { getByTestId, getByText, getByRole } = render(<OfficialBadge official />);
    expect(getByText('Official')).toBeInTheDocument();

    const badge = getByTestId('elementWithTooltip');
    expect(badge).toBeInTheDocument();
    fireEvent.mouseEnter(badge);

    await waitFor(() => {
      expect(
        getByText('The publisher owns the software deployed by the packages in this repository')
      ).toBeInTheDocument();
      expect(getByRole('tooltip')).toBeInTheDocument();
    });
  });

  it('does not render label', () => {
    const { container } = render(<OfficialBadge official={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
