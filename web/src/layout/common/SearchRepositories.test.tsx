import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import API from '../../api';
import { ErrorKind } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import { hasClassContaining } from '../../utils/testUtils';
import SearchRepositories from './SearchRepositories';
vi.mock('../../api');
vi.mock('../../utils/alertDispatcher');

const getMockSearch = (fixtureId: string) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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
      vi.mocked(API).searchRepositories.mockResolvedValue(mockSearch);

      render(<SearchRepositories {...defaultProps} />);

      const input = screen.getByRole('textbox', { name: 'Search repositories' });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');

      await userEvent.type(input, 'sec');

      await waitFor(() => {
        expect(API.searchRepositories).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findAllByRole('button')).toHaveLength(3);
    });

    it('selects repo', async () => {
      const mockSearch = getMockSearch('2');
      vi.mocked(API).searchRepositories.mockResolvedValue(mockSearch);

      render(<SearchRepositories {...defaultProps} />);

      const input = screen.getByRole('textbox', { name: 'Search repositories' });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');

      await userEvent.type(input, 'sec');

      await waitFor(() => {
        expect(API.searchRepositories).toHaveBeenCalledTimes(1);
      });

      const repos = await screen.findAllByTestId('repoItem');
      await userEvent.click(repos[0]);

      expect(mockOnSelection).toHaveBeenCalledTimes(1);
      expect(mockOnSelection).toHaveBeenCalledWith(mockSearch.items![0]);
    });

    it('renders disabled repos', async () => {
      const mockSearch = getMockSearch('4');
      vi.mocked(API).searchRepositories.mockResolvedValue(mockSearch);

      render(
        <SearchRepositories
          {...defaultProps}
          disabledRepositories={{ ids: ['a032a436-3568-4970-804a-2780f5e9d231'], users: ['test'] }}
        />
      );

      await userEvent.type(screen.getByRole('textbox', { name: 'Search repositories' }), 'sec');

      await waitFor(() => {
        expect(API.searchRepositories).toHaveBeenCalledTimes(1);
      });

      const repos = await screen.findAllByTestId('repoItem');
      expect(hasClassContaining(repos[0], 'disabledCell')).toBe(true);
      expect(hasClassContaining(repos[1], 'disabledCell')).toBe(true);

      await userEvent.click(repos[0]);
      expect(mockOnSelection).toHaveBeenCalledTimes(0);
    });

    describe('when searchRepositories fails', () => {
      it('default', async () => {
        vi.mocked(API).searchRepositories.mockRejectedValue({
          kind: ErrorKind.Other,
        });

        render(<SearchRepositories {...defaultProps} />);

        await userEvent.type(screen.getByRole('textbox', { name: 'Search repositories' }), 'sec');

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
        vi.mocked(API).searchRepositories.mockRejectedValue({ kind: ErrorKind.Unauthorized });

        render(<SearchRepositories {...defaultProps} />);

        await userEvent.type(screen.getByRole('textbox', { name: 'Search repositories' }), 'sec');

        await waitFor(() => {
          expect(API.searchRepositories).toHaveBeenCalledTimes(1);
        });

        expect(mockOnAuthError).toHaveBeenCalledTimes(1);
      });
    });

    it('forces focus to click search icon', async () => {
      render(<SearchRepositories {...defaultProps} />);

      const icon = screen.getByTestId('searchBarIcon');
      await userEvent.click(icon);

      expect(screen.getByRole('textbox', { name: 'Search repositories' })).toHaveFocus();
    });
  });
});
