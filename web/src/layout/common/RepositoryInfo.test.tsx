import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

const defaultProps = {
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
  deprecated: false,
  withLabels: true,
};

describe('RepositoryInfo', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<RepositoryInfo {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders proper content', () => {
    render(<RepositoryInfo {...defaultProps} />);
    expect(screen.getAllByText(defaultProps.repository.displayName)).toHaveLength(2);
    expect(screen.getByTestId('repoLink')).toBeInTheDocument();
  });

  it('calls history push to click repo link', async () => {
    render(<RepositoryInfo {...defaultProps} />);
    userEvent.click(screen.getByTestId('repoLink'));

    await waitFor(() => expect(mockHistoryPush).toHaveBeenCalledTimes(1));
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
    jest.useFakeTimers();

    render(<RepositoryInfo {...defaultProps} />);
    expect(screen.getAllByText(defaultProps.repository.displayName!)).toHaveLength(2);
    expect(screen.getByTestId('repoUrl')).toBeInTheDocument();
    expect(screen.getByTestId('repoUrl')).toHaveTextContent(defaultProps.repository.url);

    userEvent.hover(screen.getByTestId('repoLink'));

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(await screen.findByTestId('repoInfoDropdown')).toHaveClass('show');

    userEvent.unhover(screen.getByTestId('repoLink'));

    act(() => {
      jest.advanceTimersByTime(50);
    });

    expect(await screen.findByTestId('repoInfoDropdown')).not.toHaveClass('show');

    jest.useRealTimers();
  });

  it('hides repo info to leave dropdown', async () => {
    jest.useFakeTimers();

    render(<RepositoryInfo {...defaultProps} />);
    userEvent.hover(screen.getByTestId('repoLink'));

    userEvent.hover(screen.getByTestId('repoInfoDropdown'));
    userEvent.unhover(screen.getByTestId('repoLink'));

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(await screen.findByTestId('repoInfoDropdown')).toHaveClass('show');

    userEvent.unhover(screen.getByTestId('repoInfoDropdown'));

    act(() => {
      jest.advanceTimersByTime(50);
    });

    expect(await screen.findByTestId('repoInfoDropdown')).not.toHaveClass('show');

    jest.useRealTimers();
  });

  it('renders Verified Publisher label', () => {
    const props = {
      ...defaultProps,
      repository: {
        ...defaultProps.repository,
        verifiedPublisher: true,
      },
    };
    render(<RepositoryInfo {...props} />);
    expect(screen.getByText('Verified Publisher')).toBeInTheDocument();
  });
});
