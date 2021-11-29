import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'ts-jest/utils';

import API from '../../api';
import { ErrorKind } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import SearchRepositories from './SearchRepositories';
jest.mock('../../api');
jest.mock('../../utils/alertDispatcher');

const getMockSearch = (fixtureId: string) => {
  return require(`./__fixtures__/SearchRepositories/${fixtureId}.json`);
};

Object.defineProperty(HTMLElement.prototype, 'scroll', { configurable: true, value: jest.fn() });

const mockOnSelection = jest.fn();
const mockOnAuthError = jest.fn();

const defaultProps = {
  label: 'label',
  visibleUrl: false,
  onSelection: mockOnSelection,
  onAuthError: mockOnAuthError,
};

describe('SearchRepositories', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<SearchRepositories {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockSearch = getMockSearch('1');
      mocked(API).searchRepositories.mockResolvedValue(mockSearch);

      render(<SearchRepositories {...defaultProps} />);

      const input = screen.getByRole('textbox', { name: 'Search repositories' });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');

      userEvent.type(input, 'sec');

      await waitFor(() => {
        expect(API.searchRepositories).toHaveBeenCalledTimes(1);
      });

      expect(screen.getAllByRole('button')).toHaveLength(3);
    });

    it('selects repo', async () => {
      const mockSearch = getMockSearch('2');
      mocked(API).searchRepositories.mockResolvedValue(mockSearch);

      render(<SearchRepositories {...defaultProps} />);

      const input = screen.getByRole('textbox', { name: 'Search repositories' });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');

      userEvent.type(input, 'sec');

      await waitFor(() => {
        expect(API.searchRepositories).toHaveBeenCalledTimes(1);
      });

      const repos = screen.getAllByTestId('repoItem');
      userEvent.click(repos[0]);

      expect(mockOnSelection).toHaveBeenCalledTimes(1);
      expect(mockOnSelection).toHaveBeenCalledWith(mockSearch.items![0]);
    });

    it('renders disabled repos', async () => {
      const mockSearch = getMockSearch('4');
      mocked(API).searchRepositories.mockResolvedValue(mockSearch);

      render(
        <SearchRepositories
          {...defaultProps}
          disabledRepositories={{ ids: ['a032a436-3568-4970-804a-2780f5e9d231'], users: ['test'] }}
        />
      );

      userEvent.type(screen.getByRole('textbox', { name: 'Search repositories' }), 'sec');

      await waitFor(() => {
        expect(API.searchRepositories).toHaveBeenCalledTimes(1);
      });

      const repos = screen.getAllByTestId('repoItem');
      expect(repos[0]).toHaveClass('disabledCell');
      expect(repos[1]).toHaveClass('disabledCell');

      userEvent.click(repos[0]);
      expect(mockOnSelection).toHaveBeenCalledTimes(0);
    });

    describe('when searchRepositories fails', () => {
      it('default', async () => {
        mocked(API).searchRepositories.mockRejectedValue({
          kind: ErrorKind.Other,
        });

        render(<SearchRepositories {...defaultProps} />);

        userEvent.type(screen.getByRole('textbox', { name: 'Search repositories' }), 'sec');

        await waitFor(() => {
          expect(API.searchRepositories).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
          expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
            type: 'danger',
            message: 'An error occurred searching repositories, please try again later.',
          });
        });
      });

      it('unauthorized', async () => {
        mocked(API).searchRepositories.mockRejectedValue({ kind: ErrorKind.Unauthorized });

        render(<SearchRepositories {...defaultProps} />);

        userEvent.type(screen.getByRole('textbox', { name: 'Search repositories' }), 'sec');

        await waitFor(() => {
          expect(API.searchRepositories).toHaveBeenCalledTimes(1);
        });

        expect(mockOnAuthError).toHaveBeenCalledTimes(1);
      });
    });

    it('forces focus to click search icon', () => {
      render(<SearchRepositories {...defaultProps} />);

      const icon = screen.getByTestId('searchBarIcon');
      userEvent.click(icon);

      expect(screen.getByRole('textbox', { name: 'Search repositories' })).toHaveFocus();
    });
  });
});
