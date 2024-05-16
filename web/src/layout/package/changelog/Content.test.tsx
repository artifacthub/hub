import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Content from './Content';
jest.mock('../../../api');

jest.mock('moment', () => ({
  ...(jest.requireActual('moment') as object),
  unix: () => ({
    isAfter: () => false,
    fromNow: () => '3 hours ago',
    format: () => '7 Oct, 2020',
  }),
}));

const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
}));

const changelog = [
  {
    version: '0.8.0',
    ts: 1604048487,
    prerelease: true,
    containsSecurityUpdates: false,
    changes: [
      { description: 'Add JSON schema for Artifact Hub Helm chart' },
      { description: 'Some improvements in Artifact Hub Helm chart' },
      { description: 'Track Helm charts values schema' },
      { description: 'Add endpoint to get Helm charts values schema' },
      { description: 'Bump Trivy to 0.12.0' },
      { description: 'Display containers images in Helm packages' },
      { description: 'Remove internal requests limiter' },
      { description: 'Upgrade frontend dependencies to fix some security vulnerabilities' },
      { description: 'Add packages security report documentation' },
      { description: 'Some bugs fixes and improvements' },
    ],
  },
  {
    version: '0.5.0',
    ts: 1604048487,
    prerelease: false,
    containsSecurityUpdates: true,
    changes: [
      { description: 'Introduce verified publisher concept' },
      { description: 'Add dark mode support' },
      { description: 'Improve search facets filtering' },
      { description: 'Notify repository owners of tracking errors' },
      { description: 'Track and list Helm charts dependencies' },
      { description: 'Display links to source in Helm packages' },
      { description: 'Add repositories kind filter to tracker' },
      { description: 'Add Monocular compatible search API' },
      { description: 'Some bugs fixes and improvements' },
    ],
  },
];

const updateVersionInQueryStringMock = jest.fn();

const defaultProps = {
  changelog: changelog,
  normalizedName: 'test',
  activeVersionIndex: 0,
  repository: {
    repositoryId: '0acb228c-17ab-4e50-85e9-ffc7102ea423',
    kind: 0,
    name: 'stable',
    url: 'repoUrl',
    userAlias: 'user',
  },
  setActiveVersionIndex: jest.fn(),
  setOpenStatus: jest.fn(),
  onCloseModal: jest.fn(),
  updateVersionInQueryString: updateVersionInQueryStringMock,
  state: null,
};

describe('Changelog content ', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValueOnce(new Date('2019/11/24').getTime());
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<Content {...defaultProps} />);

    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      render(<Content {...defaultProps} />);

      const btnTitles = screen.getAllByRole('button', { name: /Open version/i });
      expect(btnTitles[0]).toHaveTextContent('0.8.0');
      expect(btnTitles[1]).toHaveTextContent('0.5.0');

      expect(screen.getByLabelText('Update active version in querystring to 0.8.0')).toBeInTheDocument();
      expect(screen.getByLabelText('Update active version in querystring to 0.5.0')).toBeInTheDocument();

      expect(screen.getByText('Contains security updates')).toBeInTheDocument();
      expect(screen.getByText('Pre-release')).toBeInTheDocument();
    });

    it('calls updateVersionInQueryString', async () => {
      render(<Content {...defaultProps} />);

      const btn = screen.getByLabelText('Update active version in querystring to 0.5.0');
      await userEvent.click(btn);

      await waitFor(() => {
        expect(updateVersionInQueryStringMock).toHaveBeenCalledTimes(1);
        expect(updateVersionInQueryStringMock).toHaveBeenCalledWith('0.5.0', 1);
      });
    });
  });
});
