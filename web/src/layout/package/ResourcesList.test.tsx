import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import { FalcoRules, OPAPolicies, RepositoryKind } from '../../types';
import ResourcesList from './ResourcesList';

const getmockResources = (fixtureId: string): OPAPolicies | FalcoRules => {
  return require(`./__fixtures__/ResourcesList/${fixtureId}.json`) as OPAPolicies | FalcoRules;
};

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    push: mockHistoryPush,
  }),
}));

describe('ResourcesList', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const mockResources = getmockResources('1');
    const result = render(<ResourcesList resources={mockResources} kind={RepositoryKind.OPA} normalizedName="pkg" />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const mockResources = getmockResources('2');
      const { getByText, getAllByTestId } = render(
        <ResourcesList resources={mockResources} kind={RepositoryKind.OPA} normalizedName="pkg" />
      );

      const cards = getAllByTestId('resourceCard');
      expect(cards).toHaveLength(Object.keys(mockResources).length);

      Object.keys(mockResources).forEach((fileName: string) => {
        expect(getByText(fileName)).toBeInTheDocument();
      });
    });

    it('opens resource details', () => {
      const mockResources = getmockResources('2');
      const { queryByRole, getByText, getAllByTestId, getByTestId } = render(
        <ResourcesList resources={mockResources} kind={RepositoryKind.OPA} normalizedName="pkg" />
      );

      const modal = queryByRole('dialog');
      expect(modal).toBeNull();

      const btns = getAllByTestId('resourceBtn');
      expect(btns).toHaveLength(Object.keys(mockResources).length);

      fireEvent.click(btns[0]);

      waitFor(() => {
        expect(modal).toBeInTheDocument();
        expect(modal).toHaveClass('d-block');
        expect(getByText('obj := input.items[_]')).toBeInTheDocument();

        expect(getByTestId('ctcBtn')).toBeInTheDocument();
        expect(getByTestId('downloadBtn')).toBeInTheDocument();
      });
    });

    it('renders OPA policies', () => {
      const mockResources = getmockResources('4');
      const { getAllByText, getAllByTestId, queryByRole, getByText } = render(
        <ResourcesList resources={mockResources} kind={RepositoryKind.OPA} normalizedName="pkg" />
      );

      expect(getAllByText('View Policy')).toHaveLength(8);

      const modal = queryByRole('dialog');
      const btns = getAllByTestId('resourceBtn');
      fireEvent.click(btns[0]);

      waitFor(() => {
        expect(modal).toBeInTheDocument();
        expect(modal).toHaveClass('d-block');
        expect(getByText('Policy file')).toBeInTheDocument();
      });
    });

    it('renders Falco rules', () => {
      const mockResources = getmockResources('5');
      const { getAllByText, getAllByTestId, queryByRole, getByText } = render(
        <ResourcesList resources={mockResources} kind={RepositoryKind.Falco} normalizedName="pkg" />
      );

      expect(getAllByText('View rules file')).toHaveLength(2);

      const modal = queryByRole('dialog');
      const btns = getAllByTestId('resourceBtn');
      fireEvent.click(btns[0]);

      waitFor(() => {
        expect(modal).toBeInTheDocument();
        expect(modal).toHaveClass('d-block');
        expect(getByText('Rules file')).toBeInTheDocument();
      });
    });
  });
});
