import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

import API from '../../../api';
import { ChangeLog } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import ChangelogModal from './Modal';
jest.mock('../../../api');
jest.mock('../../../utils/alertDispatcher');

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

const scrollIntoViewMock = jest.fn();
window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const getMockChangelog = (fixtureId: string): ChangeLog[] => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/Modal/${fixtureId}.json`) as ChangeLog[];
};

const markdownMock = `
# Changelog

## 1.3.0 - 2021-10-06

### Added

- Versions index to changelog modal
- Allow publishers to include screenshots in packages
- Repository metadata file is now supported in Helm OCI repositories
- Support for provenance files in Helm OCI repositories
- Changes annotation is now available for Krew plugins kind
- Option to show/hide stars in widget
- Link Helm charts dependencies to packages in the hub
- API endpoint for helm-exporter tool
`;

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

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValueOnce(new Date('2019/11/24').getTime());
  });

  it('creates snapshot', async () => {
    const mockChangelog = getMockChangelog('1');
    mocked(API).getChangelog.mockResolvedValue(mockChangelog);

    const { asFragment } = render(
      <Router>
        <ChangelogModal {...defaultProps} visibleChangelog />
      </Router>
    );

    await waitFor(() => {
      expect(API.getChangelog).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockChangelog = getMockChangelog('2');
      mocked(API).getChangelog.mockResolvedValue(mockChangelog);

      render(
        <Router>
          <ChangelogModal {...defaultProps} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: 'Open Changelog modal' });
      expect(btn).toBeInTheDocument();
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getChangelog).toHaveBeenCalledTimes(1);
        expect(API.getChangelog).toHaveBeenCalledWith('id');
      });

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Get changelog markdown' })).toBeInTheDocument();
    });

    it('does not render component when repo kind is Krew, Falco, Helm plugin or Container', async () => {
      const props = {
        ...defaultProps,
        repository: {
          ...defaultProps.repository,
          kind: 5,
        },
      };
      const { container } = render(
        <Router>
          <ChangelogModal {...props} />
        </Router>
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('renders disabled button when package has not changelog and does not call getChangelog', async () => {
      render(
        <Router>
          <ChangelogModal {...defaultProps} hasChangelog={false} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: 'Open Changelog modal' });
      expect(btn).toHaveClass('disabled');
    });

    it('opens modal', async () => {
      const mockChangelog = getMockChangelog('3');
      mocked(API).getChangelog.mockResolvedValue(mockChangelog);

      render(
        <Router>
          <ChangelogModal {...defaultProps} />
        </Router>
      );

      const btn = screen.getByRole('button', { name: 'Open Changelog modal' });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getChangelog).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getAllByText('Changelog')).toHaveLength(2);

      const blocks = screen.getAllByTestId('changelogBlock');
      expect(blocks).toHaveLength(Object.keys(mockChangelog).length);
    });

    it('selects correct version to open modal', async () => {
      const mockChangelog = getMockChangelog('10');
      mocked(API).getChangelog.mockResolvedValue(mockChangelog);

      render(
        <Router>
          <ChangelogModal {...defaultProps} currentVersion="0.3.0" />
        </Router>
      );

      const btn = screen.getByText('Changelog');
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getChangelog).toHaveBeenCalledTimes(1);
      });

      const els = await screen.findAllByText(/0.3.0/);
      expect(els).toHaveLength(2);

      await waitFor(() => {
        expect(els[0].parentElement).toHaveClass('activeVersionBtnWrapper');
      });
    });

    it('closes modal', async () => {
      const mockChangelog = getMockChangelog('4');
      mocked(API).getChangelog.mockResolvedValue(mockChangelog);

      render(
        <Router>
          <ChangelogModal {...defaultProps} visibleChangelog />
        </Router>
      );

      await waitFor(() => {
        expect(API.getChangelog).toHaveBeenCalledTimes(1);
      });

      const close = await screen.findByText('Close');
      await userEvent.click(close);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull();
      });
    });

    it("displays first version when selected one doesn't exist", async () => {
      const mockChangelog = getMockChangelog('10');
      mocked(API).getChangelog.mockResolvedValue(mockChangelog);

      render(
        <Router>
          <ChangelogModal {...defaultProps} visibleChangelog visibleVersion="1.0.0" />
        </Router>
      );

      await waitFor(() => {
        expect(API.getChangelog).toHaveBeenCalledTimes(1);
      });

      const versionBtns = await screen.findAllByTestId('versionBtnWrapper');

      await waitFor(() => {
        expect(versionBtns[0]).toHaveClass('activeVersionBtnWrapper');
      });
    });

    it('does not render blocks when changes is null', async () => {
      const mockChangelog = getMockChangelog('5');
      mocked(API).getChangelog.mockResolvedValue(mockChangelog);

      render(
        <Router>
          <ChangelogModal {...defaultProps} visibleChangelog />
        </Router>
      );

      await waitFor(() => {
        expect(API.getChangelog).toHaveBeenCalledTimes(1);
      });

      const btnTitles = await screen.findAllByRole('button', { name: /Open version/i });
      expect(btnTitles).toHaveLength(1);
      expect(screen.queryByText('0.4.0')).toBeNull();
    });

    it('calls again to getMockChangelog when packageId is different', async () => {
      const mockChangelog = getMockChangelog('6');
      mocked(API).getChangelog.mockResolvedValue(mockChangelog);

      const { rerender } = render(
        <Router>
          <ChangelogModal {...defaultProps} />
        </Router>
      );

      const btn = screen.getByText('Changelog');
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getChangelog).toHaveBeenCalledTimes(1);
        expect(API.getChangelog).toHaveBeenCalledWith('id');
      });

      rerender(
        <Router>
          <ChangelogModal {...defaultProps} packageId="id2" />
        </Router>
      );

      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getChangelog).toHaveBeenCalledTimes(2);
        expect(API.getChangelog).toHaveBeenCalledWith('id2');
      });
    });

    it('dislays security updates badge', async () => {
      const mockChangelog = getMockChangelog('7');
      mocked(API).getChangelog.mockResolvedValue(mockChangelog);

      render(
        <Router>
          <ChangelogModal {...defaultProps} />
        </Router>
      );

      const btn = screen.getByText('Changelog');
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getChangelog).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByText('Contains security updates')).toBeInTheDocument();
    });

    it('dislays pre-release badge', async () => {
      const mockChangelog = getMockChangelog('8');
      mocked(API).getChangelog.mockResolvedValue(mockChangelog);

      render(
        <Router>
          <ChangelogModal {...defaultProps} />
        </Router>
      );

      const btn = screen.getByText('Changelog');
      await userEvent.click(btn);

      await waitFor(() => {
        expect(API.getChangelog).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByText('Pre-release')).toBeInTheDocument();
    });

    it('calls again to getChangelog to render a different version', async () => {
      const mockChangelog = getMockChangelog('9');
      mocked(API).getChangelog.mockResolvedValue(mockChangelog);

      const { rerender } = render(
        <Router>
          <ChangelogModal {...defaultProps} visibleVersion="0.4.0" visibleChangelog />
        </Router>
      );

      await waitFor(() => {
        expect(API.getChangelog).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByRole('dialog')).toBeInTheDocument();

      rerender(
        <Router>
          <ChangelogModal {...defaultProps} currentVersion="0.6.0" visibleChangelog />
        </Router>
      );

      await waitFor(() => {
        expect(API.getChangelog).toHaveBeenCalledTimes(2);
      });

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });

    it('calls getChangelogMD', async () => {
      const mockChangelog = getMockChangelog('11');
      mocked(API).getChangelog.mockResolvedValue(mockChangelog);
      mocked(API).getChangelogMD.mockResolvedValue(markdownMock);

      render(
        <Router>
          <ChangelogModal {...defaultProps} />
        </Router>
      );

      const btn = screen.getByText('Changelog');
      await userEvent.click(btn);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const btnMD = screen.getByRole('button', { name: 'Get changelog markdown' });
      await userEvent.click(btnMD);

      await waitFor(() => {
        expect(API.getChangelogMD).toHaveBeenCalledTimes(1);
        expect(API.getChangelogMD).toHaveBeenCalledWith({
          packageName: 'test',
          repositoryKind: 'helm',
          repositoryName: 'stable',
        });
      });
    });

    it('when getChangelogMD call fails', async () => {
      const mockChangelog = getMockChangelog('12');
      mocked(API).getChangelog.mockResolvedValue(mockChangelog);
      mocked(API).getChangelogMD.mockRejectedValue('');

      render(
        <Router>
          <ChangelogModal {...defaultProps} />
        </Router>
      );

      const btn = screen.getByText('Changelog');
      await userEvent.click(btn);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(API.getChangelog).toHaveBeenCalledTimes(1);
      });

      const btnMD = screen.getByRole('button', { name: 'Get changelog markdown' });
      await userEvent.click(btnMD);

      await waitFor(() => {
        expect(API.getChangelogMD).toHaveBeenCalledTimes(1);
        expect(API.getChangelogMD).toHaveBeenCalledWith({
          packageName: 'test',
          repositoryKind: 'helm',
          repositoryName: 'stable',
        });
      });

      await waitFor(() => {
        expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
        expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
          type: 'danger',
          message: 'An error occurred getting package changelog markdown, please try again later.',
        });
      });
    });
  });
});
