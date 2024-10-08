import { render, screen } from '@testing-library/react';

import { Maintainer } from '../../types';
import Maintainers from './Maintainers';

const getMockMaintainers = (fixtureId: string): Maintainer[] => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/Maintainers/${fixtureId}.json`) as Maintainer[];
};

describe('Maintainers', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const mockMaintainers = getMockMaintainers('1');
    const { asFragment } = render(<Maintainers maintainers={mockMaintainers} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const mockMaintainers = getMockMaintainers('2');
      render(<Maintainers maintainers={mockMaintainers} />);

      expect(screen.getByText('Maintainers')).toBeInTheDocument();

      const maintainers = screen.getAllByRole('button');
      expect(maintainers).toHaveLength(mockMaintainers.length);
      expect(maintainers[0]).toHaveTextContent(mockMaintainers[0].name!);
      expect(maintainers[0]).toHaveProperty('href', `mailto:${mockMaintainers[0].email}`);
      expect(maintainers[1]).toHaveTextContent(mockMaintainers[1].name!);
      expect(maintainers[2]).toHaveTextContent(mockMaintainers[2].email);
    });

    it('does not render component when maintainers are undefined', () => {
      const { container } = render(<Maintainers />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});
