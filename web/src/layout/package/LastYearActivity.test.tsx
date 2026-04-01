import { render, screen } from '@testing-library/react';

import { Version } from '../../types';
import { hasClassContaining } from '../../utils/testUtils';
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
      expect(hasClassContaining(cells[0], 'level3')).toBe(true);
      expect(hasClassContaining(cells[1], 'level1')).toBe(true);
      expect(hasClassContaining(cells[2], 'level3')).toBe(true);
      expect(hasClassContaining(cells[3], 'level2')).toBe(true);
      expect(hasClassContaining(cells[4], 'level3')).toBe(true);
      expect(hasClassContaining(cells[5], 'level1')).toBe(true);
      expect(hasClassContaining(cells[6], 'level3')).toBe(true);
      expect(hasClassContaining(cells[7], 'level1')).toBe(true);
      expect(hasClassContaining(cells[8], 'level0')).toBe(true);
      expect(hasClassContaining(cells[9], 'level1')).toBe(true);
      expect(hasClassContaining(cells[10], 'level1')).toBe(true);
      expect(hasClassContaining(cells[11], 'level0')).toBe(true);

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
      cells.forEach((cell) => expect(hasClassContaining(cell, 'level0')).toBe(true));

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
      cells.slice(0, 11).forEach((cell) => expect(hasClassContaining(cell, 'level4')).toBe(true));
      expect(hasClassContaining(cells[11], 'level3')).toBe(true);

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
