import { render, screen } from '@testing-library/react';

import { SecurityReport } from '../../../types';
import OldVulnerabilitiesWarning from './OldVulnerabilitiesWarning';

const getMockSecurityReport = (fixtureId: string): SecurityReport => {
  return require(`./__fixtures__/OldVulnerabilitiesWarning/${fixtureId}.json`) as SecurityReport;
};

describe('OldVulnerabilitiesWarning', () => {
  let dateNowSpy: any;

  beforeEach(() => {
    dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => 1666943574000);
  });

  afterAll(() => {
    dateNowSpy.mockRestore();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const report = getMockSecurityReport('1');
    const { asFragment } = render(<OldVulnerabilitiesWarning fixableReport={report} />);

    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders warning', () => {
      const report = getMockSecurityReport('2');
      render(<OldVulnerabilitiesWarning fixableReport={report} />);

      expect(screen.getByText('Warning:')).toBeInTheDocument();
      expect(screen.getByText('high severity fixable')).toBeInTheDocument();
      expect(screen.getByText('2 years old')).toBeInTheDocument();
    });

    describe('does not render warning', () => {
      it('when vulnerabilities are not older than 2 years', () => {
        const report = getMockSecurityReport('3');
        const { container } = render(<OldVulnerabilitiesWarning fixableReport={report} />);

        expect(container).toBeEmptyDOMElement();
      });

      it('when report is null', () => {
        const { container } = render(<OldVulnerabilitiesWarning fixableReport={null} />);

        expect(container).toBeEmptyDOMElement();
      });
    });
  });
});
