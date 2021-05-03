import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
import { ChangeLog } from '../../types';
import ChangelogModal from './ChangelogModal';
jest.mock('../../api');

jest.mock('moment', () => () => ({ fromNow: () => '3 hours ago' }));

const getMockChangelog = (fixtureId: string): ChangeLog[] => {
  return require(`./__fixtures__/ChangelogModal/${fixtureId}.json`) as ChangeLog[];
};

const mockHistoryReplace = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    replace: mockHistoryReplace,
  }),
}));

const defaultProps = {
  packageId: 'id',
  normalizedName: 'test',
  hasChangelog: true,
  repository: {
    repositoryId: '0acb228c-17ab-4e50-85e9-ffc7102ea423',
    kind: 0,
    name: 'stable',
    url: 'repoUrl',
    userAlias: 'user',
  },
  visibleChangelog: false,
};

describe('ChangelogModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockChangelog = getMockChangelog('1');
    mocked(API).getChangelog.mockResolvedValue(mockChangelog);

    const result = render(<ChangelogModal {...defaultProps} visibleChangelog />);

    await waitFor(() => {
      expect(API.getChangelog).toHaveBeenCalledTimes(1);
      expect(result.asFragment()).toMatchSnapshot();
    });

    expect(result.getByRole('dialog')).toBeInTheDocument();
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockChangelog = getMockChangelog('2');
      mocked(API).getChangelog.mockResolvedValue(mockChangelog);

      const { getByTestId, getByRole } = render(<ChangelogModal {...defaultProps} />);

      const btn = getByTestId('changelogBtn');
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.getChangelog).toHaveBeenCalledTimes(1);
        expect(API.getChangelog).toHaveBeenCalledWith('id');
      });

      expect(getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render component when repo kind is Krew, Falco or Helm plugin', async () => {
      const props = {
        ...defaultProps,
        repository: {
          ...defaultProps.repository,
          kind: 5,
        },
      };
      const { container } = render(<ChangelogModal {...props} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('renders disabled button when package has not changelog and does not call getChangelog', async () => {
      const { getByTestId } = render(<ChangelogModal {...defaultProps} hasChangelog={false} />);

      const btn = getByTestId('changelogBtn');
      expect(btn).toHaveClass('disabled');
    });

    it('opens modal', async () => {
      const mockChangelog = getMockChangelog('3');
      mocked(API).getChangelog.mockResolvedValue(mockChangelog);

      const { getByTestId, getAllByText, getByRole, getAllByTestId } = render(<ChangelogModal {...defaultProps} />);

      const btn = getByTestId('changelogBtn');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.getChangelog).toHaveBeenCalledTimes(1);
      });

      expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
      expect(mockHistoryReplace).toHaveBeenCalledWith({
        search: '?modal=changelog',
        state: {
          fromStarredPage: undefined,
          searchUrlReferer: undefined,
        },
      });

      expect(getByRole('dialog')).toBeInTheDocument();
      expect(getAllByText('Changelog')).toHaveLength(2);

      const blocks = getAllByTestId('changelogBlock');
      expect(blocks).toHaveLength(Object.keys(mockChangelog).length);
    });

    it('closes modal', async () => {
      const mockChangelog = getMockChangelog('4');
      mocked(API).getChangelog.mockResolvedValue(mockChangelog);

      const { getByText, queryByRole } = render(<ChangelogModal {...defaultProps} visibleChangelog />);

      await waitFor(() => {
        expect(API.getChangelog).toHaveBeenCalledTimes(1);
      });

      const close = getByText('Close');
      fireEvent.click(close);

      await waitFor(() => {
        expect(queryByRole('dialog')).toBeNull();
      });

      expect(mockHistoryReplace).toHaveBeenCalledTimes(2);
      expect(mockHistoryReplace).toHaveBeenLastCalledWith({
        search: '',
        state: {
          fromStarredPage: undefined,
          searchUrlReferer: undefined,
        },
      });
    });

    it('closes modal when a new pkg is open', async () => {
      const mockChangelog = getMockChangelog('10');
      mocked(API).getChangelog.mockResolvedValue(mockChangelog);

      const { getByRole, queryByRole, rerender } = render(<ChangelogModal {...defaultProps} visibleChangelog />);

      await waitFor(() => {
        expect(API.getChangelog).toHaveBeenCalledTimes(1);
      });

      expect(getByRole('dialog')).toBeInTheDocument();

      rerender(<ChangelogModal {...defaultProps} packageId="id2" />);

      waitFor(() => {
        expect(queryByRole('dialog')).toBeNull();
      });
    });

    it('renders changelog blocks in correct order', async () => {
      const mockChangelog = getMockChangelog('5');
      mocked(API).getChangelog.mockResolvedValue(mockChangelog);

      const { getByText, getAllByTestId } = render(<ChangelogModal {...defaultProps} />);

      const btn = getByText('Changelog');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.getChangelog).toHaveBeenCalledTimes(1);
      });

      const titles = getAllByTestId('changelogBlockTitle');
      expect(titles[0]).toHaveTextContent('0.8.0');
      expect(titles[1]).toHaveTextContent('0.7.0');
      expect(titles[2]).toHaveTextContent('0.6.0');
      expect(titles[3]).toHaveTextContent('0.5.0');
      expect(titles[4]).toHaveTextContent('0.4.0');
      expect(titles[5]).toHaveTextContent('0.3.0');
      expect(titles[6]).toHaveTextContent('0.2.0');
    });

    it('does not render blocks when changes is null', async () => {
      const mockChangelog = getMockChangelog('6');
      mocked(API).getChangelog.mockResolvedValue(mockChangelog);

      const { queryByText, getAllByTestId } = render(<ChangelogModal {...defaultProps} visibleChangelog />);

      await waitFor(() => {
        expect(API.getChangelog).toHaveBeenCalledTimes(1);
      });

      const titles = getAllByTestId('changelogBlockTitle');
      expect(titles).toHaveLength(1);
      expect(queryByText('0.4.0')).toBeNull();
    });

    it('calls again to getMockChangelog when packageId is different', async () => {
      const mockChangelog = getMockChangelog('7');
      mocked(API).getChangelog.mockResolvedValue(mockChangelog);

      const { rerender, getByText } = render(<ChangelogModal {...defaultProps} />);

      const btn = getByText('Changelog');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.getChangelog).toHaveBeenCalledTimes(1);
        expect(API.getChangelog).toHaveBeenCalledWith('id');
      });

      rerender(<ChangelogModal {...defaultProps} packageId="id2" />);

      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.getChangelog).toHaveBeenCalledTimes(2);
        expect(API.getChangelog).toHaveBeenCalledWith('id2');
      });
    });

    it('does not call again to getChangelog to open modal when package is the same', async () => {
      const mockReport = getMockChangelog('7');
      mocked(API).getChangelog.mockResolvedValue(mockReport);

      const { queryByRole, getByText, getByTestId, getByRole } = render(
        <ChangelogModal {...defaultProps} visibleChangelog />
      );

      await waitFor(() => {
        expect(API.getChangelog).toHaveBeenCalledTimes(1);
        expect(API.getChangelog).toHaveBeenCalledWith('id');
      });

      const btn = getByTestId('closeModalFooterBtn');
      fireEvent.click(btn);

      expect(queryByRole('dialog')).toBeNull();

      const openBtn = getByText('Changelog');
      fireEvent.click(openBtn);

      await waitFor(() => {
        expect(getByRole('dialog')).toBeInTheDocument();
        expect(API.getChangelog).toHaveBeenCalledTimes(1);
      });
    });

    it('dislays security updates badge', async () => {
      const mockChangelog = getMockChangelog('8');
      mocked(API).getChangelog.mockResolvedValue(mockChangelog);

      const { getByText } = render(<ChangelogModal {...defaultProps} />);

      const btn = getByText('Changelog');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.getChangelog).toHaveBeenCalledTimes(1);
      });

      expect(getByText('Contains security updates')).toBeInTheDocument();
    });

    it('dislays pre-release badge', async () => {
      const mockChangelog = getMockChangelog('9');
      mocked(API).getChangelog.mockResolvedValue(mockChangelog);

      const { getByText } = render(<ChangelogModal {...defaultProps} />);

      const btn = getByText('Changelog');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.getChangelog).toHaveBeenCalledTimes(1);
      });

      expect(getByText('Pre-release')).toBeInTheDocument();
    });
  });
});
