import { render, screen } from '@testing-library/react';

import { Version } from '../../types';
import LastYearActivity from './LastYearActivity';

const getMockVersions = (fixtureId: string): Version[] => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/LastYearActivity/${fixtureId}.json`) as Version[];
};

describe('LastYearActivity', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dateNowSpy: any;

  beforeEach(() => {
    dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => 1634969145000);
  });

  afterAll(() => {
    dateNowSpy.mockRestore();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const mockVersions = getMockVersions('1');
    const { asFragment } = render(<LastYearActivity versions={mockVersions} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const mockVersions = getMockVersions('2');
      render(<LastYearActivity versions={mockVersions} />);

      expect(screen.getByText('Last year activity')).toBeInTheDocument();
      expect(screen.getAllByText("Oct'21")).toHaveLength(2);
      expect(screen.getAllByText("Apr'21")).toHaveLength(2);
      expect(screen.getAllByText("Nov'20")).toHaveLength(2);
      expect(screen.getByTestId('lastYearActivity')).toBeInTheDocument();

      const cells = screen.getAllByTestId('heatMapCell');
      expect(cells).toHaveLength(12);
      expect(cells[0]).toHaveClass('level3');
      expect(cells[1]).toHaveClass('level1');
      expect(cells[2]).toHaveClass('level3');
      expect(cells[3]).toHaveClass('level2');
      expect(cells[4]).toHaveClass('level3');
      expect(cells[5]).toHaveClass('level1');
      expect(cells[6]).toHaveClass('level3');
      expect(cells[7]).toHaveClass('level1');
      expect(cells[8]).toHaveClass('level0');
      expect(cells[9]).toHaveClass('level1');
      expect(cells[10]).toHaveClass('level1');
      expect(cells[11]).toHaveClass('level0');

      const popovers = screen.getAllByTestId('heatMapPopover');
      expect(popovers).toHaveLength(12);
      expect(popovers[0]).toHaveTextContent("Nov'20Releases: 3");
      expect(popovers[1]).toHaveTextContent("Dec'20Releases: 1");
      expect(popovers[2]).toHaveTextContent("Jan'21Releases: 3");
      expect(popovers[3]).toHaveTextContent("Feb'21Releases: 2");
      expect(popovers[4]).toHaveTextContent("Mar'21Releases: 3");
      expect(popovers[5]).toHaveTextContent("Apr'21Releases: 1");
      expect(popovers[6]).toHaveTextContent("May'21Releases: 4");
      expect(popovers[7]).toHaveTextContent("Jun'21Releases: 1");
      expect(popovers[8]).toHaveTextContent("Jul'21Releases: 0");
      expect(popovers[9]).toHaveTextContent("Aug'21Releases: 1");
      expect(popovers[10]).toHaveTextContent("Sep'21Releases: 1");
      expect(popovers[11]).toHaveTextContent("Oct'21Releases: 0");
    });

    it('renders only level0 cells when versions are elder than 1 year', () => {
      const mockVersions = getMockVersions('3');
      render(<LastYearActivity versions={mockVersions} />);

      const cells = screen.getAllByTestId('heatMapCell');
      expect(cells).toHaveLength(12);
      expect(cells[0]).toHaveClass('level0');
      expect(cells[1]).toHaveClass('level0');
      expect(cells[2]).toHaveClass('level0');
      expect(cells[3]).toHaveClass('level0');
      expect(cells[4]).toHaveClass('level0');
      expect(cells[5]).toHaveClass('level0');
      expect(cells[6]).toHaveClass('level0');
      expect(cells[7]).toHaveClass('level0');
      expect(cells[8]).toHaveClass('level0');
      expect(cells[9]).toHaveClass('level0');
      expect(cells[10]).toHaveClass('level0');
      expect(cells[11]).toHaveClass('level0');

      const popovers = screen.getAllByTestId('heatMapPopover');
      expect(popovers).toHaveLength(12);
      expect(popovers[0]).toHaveTextContent("Nov'20Releases: 0");
      expect(popovers[1]).toHaveTextContent("Dec'20Releases: 0");
      expect(popovers[2]).toHaveTextContent("Jan'21Releases: 0");
      expect(popovers[3]).toHaveTextContent("Feb'21Releases: 0");
      expect(popovers[4]).toHaveTextContent("Mar'21Releases: 0");
      expect(popovers[5]).toHaveTextContent("Apr'21Releases: 0");
      expect(popovers[6]).toHaveTextContent("May'21Releases: 0");
      expect(popovers[7]).toHaveTextContent("Jun'21Releases: 0");
      expect(popovers[8]).toHaveTextContent("Jul'21Releases: 0");
      expect(popovers[9]).toHaveTextContent("Aug'21Releases: 0");
      expect(popovers[10]).toHaveTextContent("Sep'21Releases: 0");
      expect(popovers[11]).toHaveTextContent("Oct'21Releases: 0");
    });

    it('renders all level3 cells', () => {
      const mockVersions = getMockVersions('4');
      render(<LastYearActivity versions={mockVersions} />);

      const cells = screen.getAllByTestId('heatMapCell');
      expect(cells).toHaveLength(12);
      expect(cells[0]).toHaveClass('level4');
      expect(cells[1]).toHaveClass('level4');
      expect(cells[2]).toHaveClass('level4');
      expect(cells[3]).toHaveClass('level4');
      expect(cells[4]).toHaveClass('level4');
      expect(cells[5]).toHaveClass('level4');
      expect(cells[6]).toHaveClass('level4');
      expect(cells[7]).toHaveClass('level4');
      expect(cells[8]).toHaveClass('level4');
      expect(cells[9]).toHaveClass('level4');
      expect(cells[10]).toHaveClass('level4');
      expect(cells[11]).toHaveClass('level3');

      const popovers = screen.getAllByTestId('heatMapPopover');
      expect(popovers).toHaveLength(12);
      expect(popovers[0]).toHaveTextContent("Nov'20Releases: 28");
      expect(popovers[1]).toHaveTextContent("Dec'20Releases: 8");
      expect(popovers[2]).toHaveTextContent("Jan'21Releases: 27");
      expect(popovers[3]).toHaveTextContent("Feb'21Releases: 13");
      expect(popovers[4]).toHaveTextContent("Mar'21Releases: 9");
      expect(popovers[5]).toHaveTextContent("Apr'21Releases: 23");
      expect(popovers[6]).toHaveTextContent("May'21Releases: 12");
      expect(popovers[7]).toHaveTextContent("Jun'21Releases: 22");
      expect(popovers[8]).toHaveTextContent("Jul'21Releases: 10");
      expect(popovers[9]).toHaveTextContent("Aug'21Releases: 10");
      expect(popovers[10]).toHaveTextContent("Sep'21Releases: 14");
      expect(popovers[11]).toHaveTextContent("Oct'21Releases: 5");
    });
  });
});
