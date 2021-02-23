import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import OfficialBadge from './OfficialBadge';

describe('OfficialBadge', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<OfficialBadge official type="package" />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders label', async () => {
    const { getByTestId, getByText, getByRole } = render(<OfficialBadge official type="repo" />);
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

  it('renders label for package', async () => {
    const { getByTestId, getByText, getByRole } = render(<OfficialBadge official type="package" />);
    expect(getByText('Official')).toBeInTheDocument();

    const badge = getByTestId('elementWithTooltip');
    expect(badge).toBeInTheDocument();
    fireEvent.mouseEnter(badge);

    await waitFor(() => {
      expect(getByText('The publisher owns the software deployed by this package')).toBeInTheDocument();
      expect(getByRole('tooltip')).toBeInTheDocument();
    });
  });

  it('does not render label', () => {
    const { container } = render(<OfficialBadge official={false} type="package" />);
    expect(container).toBeEmptyDOMElement();
  });
});
