import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { ContainerImage } from '../../types';
import ContainersImages from './ContainersImages';

const getMockImages = (fixtureId: string): ContainerImage[] => {
  return require(`./__fixtures__/ContainersImages/${fixtureId}.json`) as ContainerImage[];
};

describe('ContainersImages', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const mockContainers = getMockImages('1');
    const result = render(<ContainersImages containers={mockContainers} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const mockContainers = getMockImages('2');
      const { getByText, getAllByTestId } = render(<ContainersImages containers={mockContainers} />);

      expect(getByText('Containers Images')).toBeInTheDocument();

      const containers = getAllByTestId('containerImageItem');
      expect(containers).toHaveLength(mockContainers.length);
    });

    it('renders 5 images max', () => {
      const mockContainers = getMockImages('3');
      const { getByText, getAllByTestId, getByTestId } = render(<ContainersImages containers={mockContainers} />);

      expect(getAllByTestId('containerImageItem')).toHaveLength(5);
      expect(getByText('Show more...'));

      const btn = getByTestId('expandableListBtn');
      fireEvent.click(btn);

      expect(getAllByTestId('containerImageItem')).toHaveLength(50);
      expect(getByText('Show less...'));
    });

    it('does not render component when containers are undefined', () => {
      const { container } = render(<ContainersImages />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});
