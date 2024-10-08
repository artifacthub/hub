import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';

import { Dependency } from '../../types';
import Dependencies from './Dependencies';

const getMockDependencies = (fixtureId: string): Dependency[] => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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
    const { asFragment } = render(<Dependencies dependencies={mockDependencies} {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const mockDependencies = getMockDependencies('2');
      render(<Dependencies dependencies={mockDependencies} {...defaultProps} />);

      expect(screen.getByText('Dependencies')).toBeInTheDocument();

      const dependencies = screen.getAllByTestId('dependencyItem');
      expect(dependencies).toHaveLength(mockDependencies.length);
      expect(dependencies[0]).toHaveTextContent(`${mockDependencies[0].name}@${mockDependencies[0].version}`);
      expect(dependencies[1]).toHaveTextContent(`${mockDependencies[1].name}@${mockDependencies[1].version}`);
    });

    it('renders 3 dependencies max + see all modal', async () => {
      const mockDependencies = getMockDependencies('3');
      render(<Dependencies dependencies={mockDependencies} {...defaultProps} />);

      expect(screen.getAllByTestId('dependencyItem')).toHaveLength(8); // 3 + 5 mobile version
      expect(screen.getByText('See all'));

      const btn = screen.getByRole('button', { name: 'See all entries' });
      await userEvent.click(btn);

      expect(await screen.findByRole('dialog')).toHaveClass('active d-block');

      expect(screen.getAllByText('Dependencies')).toHaveLength(2);
      expect(screen.getAllByTestId('dependencyItem')).toHaveLength(15);
    });

    it('does not render component when dependencies are undefined', () => {
      const { container } = render(<Dependencies {...defaultProps} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('renders repo info', () => {
      const mockDependencies = getMockDependencies('4');
      render(<Dependencies dependencies={mockDependencies} {...defaultProps} />);
      expect(screen.getAllByText('Repo:')).toHaveLength(3);
      expect(screen.getAllByText('https://prometheus-community.github.io/helm-charts')).toHaveLength(2);
      expect(screen.getByText('https://grafana.github.io/helm-charts')).toBeInTheDocument();
    });

    it('renders AH repo link', () => {
      const mockDependencies = getMockDependencies('5');
      render(
        <Router>
          <Dependencies dependencies={mockDependencies} {...defaultProps} />
        </Router>
      );

      const link = screen.getByRole('link', { name: 'grafana' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/packages/helm/grafana/grafana');
    });
  });
});
