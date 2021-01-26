import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import { ContainerImage } from '../../types';
import ContainersImages from './ContainersImages';

const getMockImages = (fixtureId: string): ContainerImage[] => {
  return require(`./__fixtures__/ContainersImages/${fixtureId}.json`) as ContainerImage[];
};

const defaultProps = {
  title: 'Containers Images',
  packageId: 'id',
};

describe('ContainersImages', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const mockContainers = getMockImages('1');
    const result = render(<ContainersImages containers={mockContainers} {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const mockContainers = getMockImages('2');
      const { getByText, getAllByTestId } = render(<ContainersImages containers={mockContainers} {...defaultProps} />);

      expect(getByText('Containers Images')).toBeInTheDocument();

      const containers = getAllByTestId('containerImageItem');
      expect(containers).toHaveLength(mockContainers.length);
    });

    it('renders 3 images max + see all modal', () => {
      const mockContainers = getMockImages('3');
      const { getByText, getAllByTestId, getByTestId } = render(
        <ContainersImages containers={mockContainers} {...defaultProps} />
      );

      expect(getAllByTestId('containerImageItem')).toHaveLength(8); // 3 + 5 mobile version
      expect(getByText('See all'));

      const btn = getByTestId('seeAllModalBtn');
      fireEvent.click(btn);

      waitFor(() => {
        expect(getAllByTestId('containerImageItem')).toHaveLength(50);
        expect(getByText('Title'));
      });
    });

    it('does not render component when containers are undefined', () => {
      const { container } = render(<ContainersImages {...defaultProps} />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});
