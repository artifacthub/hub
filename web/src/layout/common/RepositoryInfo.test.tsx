import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import prepareQuerystring from '../../utils/prepareQueryString';
import RepositoryInfo from './RepositoryInfo';

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    push: mockHistoryPush,
  }),
}));

const packageItem = {
  packageId: 'dc5d4eda-8cee-4d19-a4c3-45aae7f6d894',
  name: 'artifact-hub',
  normalizedName: 'artifact-hub',
  logoImageId: 'f4d39ecd-b710-4b4e-a88f-234d94d73fce',
  stars: 0,
  description:
    'Artifact Hub is a web-based application that enables finding, installing, and publishing Kubernetes packages.',
  version: '0.15.0',
  appVersion: '0.15.0',
  license: 'Apache-2.0',
  deprecated: false,
  signed: false,
  createdAt: 1613115038,
  repository: {
    repositoryId: '0acb228c-17ab-4e50-85e9-ffc7102ea423',
    kind: 0,
    name: 'stable',
    displayName: 'Stable',
    url: 'http://repoUrl.com',
    userAlias: 'user',
    verifiedPublisher: false,
    official: false,
  },
};

const defaultProps = {
  package: packageItem,
  deprecated: false,
  withLabels: true,
};

describe('RepositoryInfo', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<RepositoryInfo {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders proper content', () => {
    const { getAllByText, getByTestId } = render(<RepositoryInfo {...defaultProps} />);
    expect(getAllByText(defaultProps.package.repository.displayName)).toHaveLength(2);
    expect(getByTestId('repoLink')).toBeInTheDocument();
  });

  it('calls history push to click repo link', () => {
    const { getByTestId } = render(<RepositoryInfo {...defaultProps} />);
    fireEvent.click(getByTestId('repoLink'));

    expect(mockHistoryPush).toHaveBeenCalledTimes(1);
    expect(mockHistoryPush).toHaveBeenCalledWith({
      pathname: '/packages/search',
      search: prepareQuerystring({
        pageNumber: 1,
        filters: {
          repo: [defaultProps.package.repository.name],
        },
        deprecated: defaultProps.deprecated,
      }),
    });
  });

  it('displays repo info to enter on link and hides on leave', async () => {
    const { getByTestId, getAllByText } = render(<RepositoryInfo {...defaultProps} />);
    expect(getAllByText(defaultProps.package.repository.displayName!)).toHaveLength(2);
    expect(getByTestId('repoUrl')).toBeInTheDocument();
    expect(getByTestId('repoUrl')).toHaveTextContent(defaultProps.package.repository.url);

    fireEvent.mouseEnter(getByTestId('repoLink'));

    await waitFor(() => {
      expect(getByTestId('repoInfoDropdown')).toHaveClass('show');
    });

    fireEvent.mouseLeave(getByTestId('repoLink'));

    await waitFor(() => {
      expect(getByTestId('repoInfoDropdown')).not.toHaveClass('show');
    });
  });

  it('hides repo info to leave dropdown', async () => {
    const { getByTestId } = render(<RepositoryInfo {...defaultProps} />);
    fireEvent.mouseEnter(getByTestId('repoLink'));

    fireEvent.mouseEnter(getByTestId('repoInfoDropdown'));
    fireEvent.mouseLeave(getByTestId('repoLink'));
    await waitFor(() => {
      expect(getByTestId('repoInfoDropdown')).toHaveClass('show');
    });

    fireEvent.mouseLeave(getByTestId('repoInfoDropdown'));
    await waitFor(() => {
      expect(getByTestId('repoInfoDropdown')).not.toHaveClass('show');
    });
  });

  it('renders Verified Publisher label', () => {
    const props = {
      ...defaultProps,
      package: {
        ...packageItem,
        repository: {
          ...packageItem.repository,
          verifiedPublisher: true,
        },
      },
    };
    const { getByText } = render(<RepositoryInfo {...props} />);
    expect(getByText('Verified Publisher')).toBeInTheDocument();
  });

  it('renders Official label', () => {
    const props = {
      ...defaultProps,
      package: {
        ...packageItem,
        official: true,
      },
    };
    const { getByText } = render(<RepositoryInfo {...props} />);
    expect(getByText('Official')).toBeInTheDocument();
  });
});
