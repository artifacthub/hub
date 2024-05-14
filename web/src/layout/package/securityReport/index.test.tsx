import { render, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';

import { RepositoryKind } from '../../../types';
import calculateDiffInYears from '../../../utils/calculateDiffInYears';
import SecurityReport from './index';
jest.mock('../../../utils/calculateDiffInYears');

const defaultProps = {
  repoKind: RepositoryKind.Helm,
  summary: {
    low: 53,
    critical: 2,
    medium: 105,
    high: 10,
    unknown: 9,
  },
  ts: 1671024110,
  packageId: 'pkgID',
  version: '1.1.1',
  visibleSecurityReport: false,
  allContainersImagesWhitelisted: false,
  disabledReport: false,
  containers: [
    {
      name: '',
      image: 'test-container:0.0.1',
      whitelisted: false,
    },
  ],
};

const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
}));

jest.mock('react-markdown', () => () => <div />);

describe('SecurityReport', () => {
  beforeEach(() => {
    (calculateDiffInYears as jest.Mock).mockImplementation(() => 0.5);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <Router>
        <SecurityReport {...defaultProps} />
      </Router>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(
        <Router>
          <SecurityReport {...defaultProps} />
        </Router>
      );
      expect(screen.getByText('Security Report')).toBeInTheDocument();
      expect(screen.getByText('179')).toBeInTheDocument();
      expect(screen.getByText(/vulnerabilities found/)).toBeInTheDocument();

      const items = screen.getAllByTestId('summaryItem');
      expect(items).toHaveLength(5);
      expect(items[0]).toHaveTextContent('critical2');
      expect(items[1]).toHaveTextContent('high10');
      expect(items[2]).toHaveTextContent('medium105');
      expect(items[3]).toHaveTextContent('low53');
      expect(items[4]).toHaveTextContent('unknown');

      const badges = screen.getAllByTestId('summaryBadge');
      expect(badges[0]).toHaveStyle('background-color: #960003');
      expect(badges[1]).toHaveStyle('background-color: #DF2A19');
      expect(badges[2]).toHaveStyle('background-color: #F7860F');
      expect(badges[3]).toHaveStyle('background-color: #F4BD0C');
      expect(badges[4]).toHaveStyle('background-color: #b2b2b2');

      expect(screen.getByText('Open full report')).toBeInTheDocument();
    });

    it('renders component with 0 vulnerabilities', () => {
      const props = {
        ...defaultProps,
        summary: {
          low: 0,
          critical: 0,
          medium: 0,
          high: 0,
          unknown: 0,
        },
      };
      render(
        <Router>
          <SecurityReport {...props} />
        </Router>
      );

      expect(screen.getByText('Security Report')).toBeInTheDocument();
      expect(screen.getByText('No vulnerabilities found')).toBeInTheDocument();
      expect(screen.getByText('Open full report')).toBeInTheDocument();
    });

    it('renders component with a big number of vulnerabilities', () => {
      const props = {
        ...defaultProps,
        summary: {
          low: 14873,
          high: 2901,
          medium: 6062,
          unknown: 208,
          critical: 480,
        },
      };

      render(
        <Router>
          <SecurityReport {...props} />
        </Router>
      );

      expect(screen.getByText('24.5k')).toBeInTheDocument();
      expect(screen.getByText(/vulnerabilities found/)).toBeInTheDocument();
    });

    it('renders scanner disabled repository security text', () => {
      render(
        <Router>
          <SecurityReport
            summary={null}
            packageId="pkgID"
            repoKind={0}
            version="1.1.1"
            ts={1671024110}
            visibleSecurityReport={false}
            disabledReport
            containers={defaultProps.containers}
            allContainersImagesWhitelisted={false}
          />
        </Router>
      );

      expect(
        screen.getByText('Security scanning of this package has been disabled by the publisher.')
      ).toBeInTheDocument();
    });

    it('renders scanner disabled repository security text when all containers are whitelisted', () => {
      render(
        <Router>
          <SecurityReport
            summary={{}}
            packageId="pkgID"
            repoKind={0}
            version="1.1.1"
            ts={1671024110}
            visibleSecurityReport={false}
            disabledReport={false}
            allContainersImagesWhitelisted={true}
            containers={[
              {
                name: '',
                image: 'test-container:0.0.1',
                whitelisted: true,
              },
              {
                name: '',
                image: 'test-container-2:0.0.1',
                whitelisted: true,
              },
            ]}
          />
        </Router>
      );

      expect(
        screen.getByText('Security scanning of this package has been disabled by the publisher.')
      ).toBeInTheDocument();
    });
  });

  describe('Does not render component when not disabledReport and', () => {
    it('when summary is undefined', () => {
      const { container } = render(
        <Router>
          <SecurityReport
            packageId="pkgID"
            version="1.1.1"
            ts={1671024110}
            repoKind={0}
            visibleSecurityReport={false}
            disabledReport={false}
            containers={defaultProps.containers}
            allContainersImagesWhitelisted={false}
          />
        </Router>
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('when summary is null', () => {
      const { container } = render(
        <Router>
          <SecurityReport
            summary={null}
            packageId="pkgID"
            version="1.1.1"
            ts={1671024110}
            repoKind={0}
            visibleSecurityReport={false}
            disabledReport={false}
            containers={defaultProps.containers}
            allContainersImagesWhitelisted={false}
          />
        </Router>
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('when summary is empty', () => {
      const { container } = render(
        <Router>
          <SecurityReport
            summary={{}}
            packageId="pkgID"
            version="1.1.1"
            ts={1671024110}
            repoKind={0}
            visibleSecurityReport={false}
            disabledReport={false}
            containers={defaultProps.containers}
            allContainersImagesWhitelisted={false}
          />
        </Router>
      );
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('Does not render component', () => {
    it('when package is older than 1 year', () => {
      (calculateDiffInYears as jest.Mock).mockImplementation(() => 1.5);

      const { container } = render(
        <Router>
          <SecurityReport
            summary={null}
            packageId="pkgID"
            repoKind={0}
            version="1.1.1"
            ts={1631960186}
            visibleSecurityReport={false}
            disabledReport
            containers={defaultProps.containers}
            allContainersImagesWhitelisted={false}
          />
        </Router>
      );

      expect(container).toBeEmptyDOMElement();
    });
  });
});
