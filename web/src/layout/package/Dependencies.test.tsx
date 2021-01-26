import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import { Dependency } from '../../types';
import Dependencies from './Dependencies';

const getMockDependencies = (fixtureId: string): Dependency[] => {
  return require(`./__fixtures__/Dependencies/${fixtureId}.json`) as Dependency[];
};

const defaultProps = {
  title: 'Containers Images',
  packageId: 'id',
};

describe('Dependencies', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const mockDependencies = getMockDependencies('1');
    const result = render(<Dependencies dependencies={mockDependencies} {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const mockDependencies = getMockDependencies('2');
      const { getByText, getAllByTestId } = render(<Dependencies dependencies={mockDependencies} {...defaultProps} />);

      expect(getByText('Dependencies')).toBeInTheDocument();

      const dependencies = getAllByTestId('dependencyItem');
      expect(dependencies).toHaveLength(mockDependencies.length);
      expect(dependencies[0]).toHaveTextContent(`${mockDependencies[0].name}@${mockDependencies[0].version}`);
      expect(dependencies[1]).toHaveTextContent(`${mockDependencies[1].name}@${mockDependencies[1].version}`);
    });

    it('renders 3 dependencies max + see all modal', () => {
      const mockDependencies = getMockDependencies('3');
      const { getByText, getAllByTestId, getByTestId } = render(
        <Dependencies dependencies={mockDependencies} {...defaultProps} />
      );

      expect(getAllByTestId('dependencyItem')).toHaveLength(8); // 3 + 5 mobile version
      expect(getByText('See all'));

      const btn = getByTestId('seeAllModalBtn');
      fireEvent.click(btn);

      waitFor(() => {
        expect(getByText('Title'));
        expect(getAllByTestId('dependencyItem')).toHaveLength(7);
      });
    });

    it('does not render component when dependencies are undefined', () => {
      const { container } = render(<Dependencies {...defaultProps} />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});
