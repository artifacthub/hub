import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import ProductionBadge from './ProductionBadge';

describe('VerifiedPublisherBadge', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<ProductionBadge productionOrganizationsCount={3} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders label', async () => {
    render(<ProductionBadge productionOrganizationsCount={7} />);
    expect(screen.getByText('In Production')).toBeInTheDocument();

    const badge = screen.getByTestId('elementWithTooltip');
    expect(badge).toBeInTheDocument();
    userEvent.hover(badge);

    expect(await screen.findByRole('tooltip')).toBeInTheDocument();

    expect(screen.getByText('7 organizations are using this package in production')).toBeInTheDocument();
  });

  describe('does not render label', () => {
    it('when productionOrganizationsCount is undefiend', () => {
      const { container } = render(<ProductionBadge />);
      expect(container).toBeEmptyDOMElement();
    });

    it('when productionOrganizationsCount is undefiend', () => {
      const { container } = render(<ProductionBadge productionOrganizationsCount={0} />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});
