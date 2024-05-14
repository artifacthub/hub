import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { prepareQueryString } from '../../utils/prepareQueryString';
import RepositoryInfo from './RepositoryInfo';

const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
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
};
const user = userEvent.setup({ delay: null });

describe('RepositoryInfo', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<RepositoryInfo {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders proper content', () => {
    render(<RepositoryInfo {...defaultProps} />);
    expect(screen.getAllByText(defaultProps.repository.displayName)).toHaveLength(2);
    expect(screen.getByTestId('repoLink')).toBeInTheDocument();
  });

  it('calls navigate to click repo link', async () => {
    render(<RepositoryInfo {...defaultProps} />);
    await userEvent.click(screen.getByTestId('repoLink'));

    await waitFor(() => expect(mockUseNavigate).toHaveBeenCalledTimes(1));
    expect(mockUseNavigate).toHaveBeenCalledWith({
      pathname: '/packages/search',
      search: prepareQueryString({
        pageNumber: 1,
        filters: {
          repo: [defaultProps.repository.name],
        },
        deprecated: defaultProps.deprecated,
      }),
    });
  });

  it('calls proper history push to click repo label', async () => {
    render(<RepositoryInfo {...defaultProps} deprecated />);
    await userEvent.click(screen.getByTestId('repoLink'));

    await waitFor(() => expect(mockUseNavigate).toHaveBeenCalledTimes(1));
    expect(mockUseNavigate).toHaveBeenCalledWith({
      pathname: '/packages/search',
      search: prepareQueryString({
        pageNumber: 1,
        filters: {
          repo: [defaultProps.repository.name],
        },
        deprecated: true,
      }),
    });
  });

  it('displays repo info to enter on link and hides on leave', async () => {
    jest.useFakeTimers();

    render(<RepositoryInfo {...defaultProps} />);
    expect(screen.getAllByText(defaultProps.repository.displayName!)).toHaveLength(2);
    expect(screen.getByTestId('repoUrl')).toBeInTheDocument();
    expect(screen.getByTestId('repoUrl')).toHaveTextContent(defaultProps.repository.url);

    await user.hover(screen.getByTestId('repoLink'));

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(await screen.findByRole('complementary')).toHaveClass('show');

    await user.unhover(screen.getByTestId('repoLink'));

    act(() => {
      jest.advanceTimersByTime(50);
    });

    expect(await screen.findByRole('complementary')).not.toHaveClass('show');

    jest.useRealTimers();
  });

  it('hides repo info to leave dropdown', async () => {
    jest.useFakeTimers();

    render(<RepositoryInfo {...defaultProps} />);

    expect(screen.getByTestId('repoUrl')).toBeInTheDocument();

    await user.hover(screen.getByTestId('repoLink'));

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(await screen.findByRole('complementary')).toHaveClass('show');

    await user.unhover(screen.getByRole('complementary'));

    act(() => {
      jest.advanceTimersByTime(50);
    });

    expect(await screen.findByRole('complementary')).not.toHaveClass('show');

    jest.useRealTimers();
  });
});
