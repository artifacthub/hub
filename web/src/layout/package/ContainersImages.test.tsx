import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ContainerImage, RepositoryKind } from '../../types';
import ContainersImages from './ContainersImages';

const getMockImages = (fixtureId: string): ContainerImage[] => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/ContainersImages/${fixtureId}.json`) as ContainerImage[];
};

const defaultProps = {
  title: 'Containers Images',
  packageId: 'id',
  kind: RepositoryKind.Helm,
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

      expect(screen.getAllByText('Containers Images')).toHaveLength(2);

      const containers = screen.getAllByTestId('containerImageItem');
      expect(containers).toHaveLength(7);
    });

    it('opens modal', async () => {
      const mockContainers = getMockImages('3');
      render(<ContainersImages containers={mockContainers} {...defaultProps} />);

      expect(screen.getAllByTestId('containerImageItem')).toHaveLength(8); // 3 + 5 mobile version
      expect(screen.getByText('See details'));

      const btn = screen.getByRole('button', { name: 'See all entries' });
      await userEvent.click(btn);

      expect(await screen.findByRole('dialog')).toHaveClass('active d-block');

      expect(screen.getAllByTestId('containerImageItem')).toHaveLength(25 * 2 + 5 + 3);
      expect(screen.getAllByText('Containers Images')).toHaveLength(2);
    });

    it('does not render component when containers are undefined', () => {
      const { container } = render(<ContainersImages {...defaultProps} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('does not render component when repository kind is Container', () => {
      const mockContainers = getMockImages('4');
      const { container } = render(
        <ContainersImages {...defaultProps} containers={mockContainers} kind={RepositoryKind.Container} />
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('renders component with platforms', async () => {
      const mockContainers = getMockImages('5');
      render(<ContainersImages containers={mockContainers} {...defaultProps} />);

      expect(screen.getAllByText('Containers Images')).toHaveLength(2);

      const containers = screen.getAllByTestId('containerImageItem');
      expect(containers).toHaveLength(7);

      const btn = screen.getByRole('button', { name: 'See all entries' });
      await userEvent.click(btn);

      expect(await screen.findByRole('dialog')).toHaveClass('active d-block');

      expect(screen.getAllByText('linux/amd64')).toHaveLength(2);
      expect(screen.getByText('linux/arm64')).toBeInTheDocument();
      expect(screen.getByText('linux/s390x')).toBeInTheDocument();
    });
  });
});
