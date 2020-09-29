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

const repo = {
  repositoryId: '0acb228c-17ab-4e50-85e9-ffc7102ea423',
  kind: 0,
  name: 'stable',
  displayName: 'Stable',
  url: 'http://repoUrl.com',
  userAlias: 'user',
  verifiedPublisher: false,
  official: false,
};

const defaultProps = {
  repository: repo,
  deprecated: false,
  withLabels: true,
};

describe('RepositoryInfo', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<RepositoryInfo {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders proper content', () => {
    const { getAllByText, getByTestId } = render(<RepositoryInfo {...defaultProps} />);
    expect(getAllByText(defaultProps.repository.displayName)).toHaveLength(2);
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
          repo: [defaultProps.repository.name],
        },
        deprecated: defaultProps.deprecated,
      }),
    });
  });

  it('displays repo info to enter on link and hides on leave', async () => {
    const { getByTestId, getAllByText, getByText } = render(<RepositoryInfo {...defaultProps} />);
    expect(getAllByText(defaultProps.repository.displayName!)).toHaveLength(2);
    expect(getByText(defaultProps.repository.url)).toBeInTheDocument();

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
      repository: {
        ...repo,
        verifiedPublisher: true,
      },
    };
    const { getByText } = render(<RepositoryInfo {...props} />);
    expect(getByText('Verified Publisher')).toBeInTheDocument();
  });

  it('renders Official label', () => {
    const props = {
      ...defaultProps,
      repository: {
        ...repo,
        official: true,
      },
    };
    const { getByText } = render(<RepositoryInfo {...props} />);
    expect(getByText('Official')).toBeInTheDocument();
  });
});
