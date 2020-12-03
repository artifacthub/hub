import { render } from '@testing-library/react';
import React from 'react';

import ScannerDisabledRepositoryBadge from './ScannerDisabledRepositoryBadge';

describe('ScannerDisabledRepositoryBadge', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<ScannerDisabledRepositoryBadge scannerDisabled />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders label', () => {
    const { getByText } = render(<ScannerDisabledRepositoryBadge scannerDisabled />);
    expect(getByText('Security scanner disabled')).toBeInTheDocument();
  });

  it('does not render label', () => {
    const { container } = render(<ScannerDisabledRepositoryBadge scannerDisabled={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
