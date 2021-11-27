import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
    const { asFragment } = render(<ContainersImages containers={mockContainers} {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const mockContainers = getMockImages('2');
      render(<ContainersImages containers={mockContainers} {...defaultProps} />);

      expect(screen.getByText('Containers Images')).toBeInTheDocument();

      const containers = screen.getAllByTestId('containerImageItem');
      expect(containers).toHaveLength(mockContainers.length);
    });

    it('renders 3 images max + see all modal', async () => {
      const mockContainers = getMockImages('3');
      render(<ContainersImages containers={mockContainers} {...defaultProps} />);

      expect(screen.getAllByTestId('containerImageItem')).toHaveLength(8); // 3 + 5 mobile version
      expect(screen.getByText('See all'));

      const btn = screen.getByRole('button', { name: 'See all entries' });
      userEvent.click(btn);

      expect(await screen.findByRole('dialog')).toHaveClass('active d-block');

      expect(screen.getAllByTestId('containerImageItem')).toHaveLength(25 * 2 + 5 + 3);
      expect(screen.getAllByText('Containers Images')).toHaveLength(2);
    });

    it('does not render component when containers are undefined', () => {
      const { container } = render(<ContainersImages {...defaultProps} />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});
