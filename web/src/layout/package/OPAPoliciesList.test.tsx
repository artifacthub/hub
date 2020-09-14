import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import { OPAPolicies } from '../../types';
import OPAPoliciesList from './OPAPoliciesList';

const getMockPolicies = (fixtureId: string): OPAPolicies => {
  return require(`./__fixtures__/OPAPoliciesList/${fixtureId}.json`) as OPAPolicies;
};

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    push: mockHistoryPush,
  }),
}));

describe('OPAPoliciesDetails', () => {
  it('creates snapshot', () => {
    const mockPolicies = getMockPolicies('1');
    const result = render(<OPAPoliciesList policies={mockPolicies} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const mockPolicies = getMockPolicies('2');
      const { getByText, getAllByTestId } = render(<OPAPoliciesList policies={mockPolicies} />);

      const cards = getAllByTestId('policyCard');
      expect(cards).toHaveLength(Object.keys(mockPolicies).length);

      Object.keys(mockPolicies).forEach((fileName: string) => {
        expect(getByText(fileName)).toBeInTheDocument();
      });
    });

    it('opens OPA details', () => {
      const mockPolicies = getMockPolicies('2');
      const { queryByRole, getByText, getAllByTestId } = render(<OPAPoliciesList policies={mockPolicies} />);

      const modal = queryByRole('dialog');
      expect(modal).toBeNull();

      const btns = getAllByTestId('policyBtn');
      expect(btns).toHaveLength(Object.keys(mockPolicies).length);

      fireEvent.click(btns[0]);

      waitFor(() => {
        expect(modal).toBeInTheDocument();
        expect(modal).toHaveClass('d-block');
        expect(getByText('obj := input.items[_]')).toBeInTheDocument();
      });
    });
  });
});
