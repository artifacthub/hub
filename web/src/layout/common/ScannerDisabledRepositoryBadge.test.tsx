import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ScannerDisabledRepositoryBadge from './ScannerDisabledRepositoryBadge';

describe('ScannerDisabledRepositoryBadge', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<ScannerDisabledRepositoryBadge scannerDisabled />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders label', () => {
    render(<ScannerDisabledRepositoryBadge scannerDisabled />);
    expect(screen.getByText('Security scanner disabled')).toBeInTheDocument();
  });

  it('does not render label', () => {
    const { container } = render(<ScannerDisabledRepositoryBadge scannerDisabled={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('displays tooltip', async () => {
    render(<ScannerDisabledRepositoryBadge scannerDisabled withTooltip />);
    expect(screen.getByText('Security scanner disabled')).toBeInTheDocument();

    const badge = screen.getByTestId('elementWithTooltip');
    expect(badge).toBeInTheDocument();
    userEvent.hover(badge);

    expect(await screen.findByRole('tooltip')).toBeInTheDocument();

    expect(
      screen.getByText('Security scanning of this package has been disabled by the publisher.')
    ).toBeInTheDocument();
  });
});
