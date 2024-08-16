import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

import API from '../../../api';
import { ChartTemplatesData, ErrorKind, RepositoryKind } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import ChartTemplatesModal from './index';
jest.mock('../../../utils/alertDispatcher');
jest.mock('../../../api');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock('react-markdown', () => (props: any) => {
  return <>{props.children}</>;
});
jest.mock('remark-gfm', () => () => <div />);

const getMockChartTemplates = (fixtureId: string): ChartTemplatesData => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/index/${fixtureId}.json`) as ChartTemplatesData;
};

const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
}));

const itemScrollMock = jest.fn();
Object.defineProperty(HTMLElement.prototype, 'scroll', { configurable: true, value: itemScrollMock });

const defaultProps = {
  normalizedName: 'pkg',
  packageId: 'id',
  version: '1.1.1',
  sortedVersions: [
    { version: '1.1.1', ts: 1, containsSecurityUpdates: false, prerelease: false },
    { version: '1.1.0', ts: 1, containsSecurityUpdates: false, prerelease: false },
    { version: '1.0.1', ts: 1, containsSecurityUpdates: false, prerelease: false },
    { version: '1.0.0', ts: 1, containsSecurityUpdates: false, prerelease: false },
  ],
  repoKind: RepositoryKind.Helm,
  visibleChartTemplates: false,
};

describe('ChartTemplatesModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockChartTemplates = getMockChartTemplates('1');
    mocked(API).getChartTemplates.mockResolvedValue(mockChartTemplates);

    const { asFragment } = render(
      <Router>
        <ChartTemplatesModal {...defaultProps} visibleChartTemplates />
      </Router>
    );

    await waitFor(() => {
      expect(API.getChartTemplates).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockChartTemplates = getMockChartTemplates('2');
      mocked(API).getChartTemplates.mockResolvedValue(mockChartTemplates);

      render(
        <Router>
          <ChartTemplatesModal {...defaultProps} visibleChartTemplates />
        </Router>
      );

      await waitFor(() => {
        expect(API.getChartTemplates).toHaveBeenCalledTimes(1);
        expect(API.getChartTemplates).toHaveBeenCalledWith('id', '1.1.1');
      });

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });

    it('opens modal', async () => {
      const mockChartTemplates = getMockChartTemplates('3');
      mocked(API).getChartTemplates.mockResolvedValue(mockChartTemplates);

      render(
        <Router>
          <ChartTemplatesModal {...defaultProps} />
        </Router>
      );

      expect(screen.queryByRole('dialog')).toBeNull();

      const modalBtn = screen.getByRole('button', { name: /Open templates modal/ });
      expect(modalBtn).toHaveTextContent('Templates');
      await userEvent.click(modalBtn);

      await waitFor(() => {
        expect(API.getChartTemplates).toHaveBeenCalledTimes(1);
        expect(API.getChartTemplates).toHaveBeenCalledWith('id', '1.1.1');
      });

      expect(await screen.findByRole('dialog')).toBeInTheDocument();

      expect(screen.getByText(/This chart version contains/)).toBeInTheDocument();
      expect(screen.getByText(/built-in objects and functions/)).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /Show template/ })).toHaveLength(16);
      expect(await screen.findByTestId('activeTmpl')).toBeInTheDocument();
    });

    it('updates path querystring when active template is not available', async () => {
      const mockChartTemplates = getMockChartTemplates('4');
      mocked(API).getChartTemplates.mockResolvedValue(mockChartTemplates);

      render(
        <Router>
          <ChartTemplatesModal {...defaultProps} visibleTemplate="wrongTemplateName.yaml" visibleChartTemplates />
        </Router>
      );

      await waitFor(() => {
        expect(API.getChartTemplates).toHaveBeenCalledTimes(1);
        expect(API.getChartTemplates).toHaveBeenCalledWith('id', '1.1.1');
        expect(mockUseNavigate).toHaveBeenCalledTimes(2);
        expect(mockUseNavigate).toHaveBeenCalledWith(
          { search: '?modal=template&template=db_migrator_install_job.yaml' },
          {
            state: null,
          }
        );
      });
    });

    it('cleans url when templates list is empty', async () => {
      const mockChartTemplates = getMockChartTemplates('8');
      mocked(API).getChartTemplates.mockResolvedValue(mockChartTemplates);

      render(
        <Router>
          <ChartTemplatesModal {...defaultProps} visibleChartTemplates />
        </Router>
      );

      await waitFor(() => {
        expect(API.getChartTemplates).toHaveBeenCalledTimes(1);
        expect(API.getChartTemplates).toHaveBeenCalledWith('id', '1.1.1');
        expect(mockUseNavigate).toHaveBeenCalledTimes(1);
        expect(mockUseNavigate).toHaveBeenCalledWith('', { state: null });
      });
    });

    it('does not call again to getChartTemplates to open modal when package is the same', async () => {
      const mockChartTemplates = getMockChartTemplates('5');
      mocked(API).getChartTemplates.mockResolvedValue(mockChartTemplates);

      render(
        <Router>
          <ChartTemplatesModal {...defaultProps} visibleChartTemplates />
        </Router>
      );

      expect(screen.getByRole('button', { name: /Open templates modal/ })).toBeInTheDocument();

      await waitFor(() => expect(API.getChartTemplates).toHaveBeenCalledTimes(1));

      expect(await screen.findByRole('dialog')).toBeInTheDocument();

      const btn = screen.getByText('Close');
      await userEvent.click(btn);

      expect(screen.queryByRole('dialog')).toBeNull();

      const openBtn = screen.getByRole('button', { name: /Open templates modal/ });
      await userEvent.click(openBtn);

      expect(await screen.findByRole('dialog')).toBeInTheDocument();

      await waitFor(() => {
        expect(mockUseNavigate).toHaveBeenCalledTimes(5);
        expect(mockUseNavigate).toHaveBeenLastCalledWith(
          { search: '?modal=template&template=db_migrator_install_job.yaml' },
          {
            state: null,
          }
        );
      });
    });
  });

  describe('displays alert', () => {
    it('when package has not any templates', async () => {
      const mockChartTemplates = getMockChartTemplates('6');
      mocked(API).getChartTemplates.mockResolvedValue(mockChartTemplates);

      render(
        <Router>
          <ChartTemplatesModal {...defaultProps} visibleChartTemplates />
        </Router>
      );

      await waitFor(() => expect(API.getChartTemplates).toHaveBeenCalledTimes(1));

      await waitFor(() => {
        expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
        expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
          type: 'warning',
          message: 'This Helm chart does not contain any template.',
        });
      });
    });

    it('when available templates are not tpl or yaml', async () => {
      const mockChartTemplates = getMockChartTemplates('7');
      mocked(API).getChartTemplates.mockResolvedValue(mockChartTemplates);

      render(
        <Router>
          <ChartTemplatesModal {...defaultProps} visibleChartTemplates />
        </Router>
      );

      await waitFor(() => expect(API.getChartTemplates).toHaveBeenCalledTimes(1));

      await waitFor(() => {
        expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
        expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
          type: 'warning',
          message: 'This Helm chart does not contain any template.',
        });
      });
    });

    describe('when fails', () => {
      it('on NotFound', async () => {
        mocked(API).getChartTemplates.mockRejectedValue({
          kind: ErrorKind.NotFound,
        });

        render(
          <Router>
            <ChartTemplatesModal {...defaultProps} visibleChartTemplates />
          </Router>
        );

        await waitFor(() => expect(API.getChartTemplates).toHaveBeenCalledTimes(1));

        await waitFor(() => {
          expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
          expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
            type: 'danger',
            message:
              'We could not find the templates for this chart version. Please check that the chart tgz package still exists in the source repository as it might not be available anymore.',
            dismissOn: 10000,
          });
        });
      });

      it('default error', async () => {
        mocked(API).getChartTemplates.mockRejectedValue({
          kind: ErrorKind.Other,
        });

        render(
          <Router>
            <ChartTemplatesModal {...defaultProps} visibleChartTemplates />
          </Router>
        );

        await waitFor(() => expect(API.getChartTemplates).toHaveBeenCalledTimes(1));

        await waitFor(() => {
          expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
          expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
            type: 'danger',
            message: 'An error occurred getting chart templates, please try again later.',
          });
        });
      });
    });
  });

  describe('does not render component', () => {
    it('when repo is not Helm chart', () => {
      const { container } = render(
        <Router>
          <ChartTemplatesModal {...defaultProps} repoKind={RepositoryKind.Krew} visibleChartTemplates />
        </Router>
      );

      expect(container).toBeEmptyDOMElement();
      expect(mockUseNavigate).toHaveBeenCalledTimes(1);
      expect(mockUseNavigate).toHaveBeenCalledWith('', {
        state: null,
      });
    });
  });

  describe('closes modal', () => {
    it('when a new pkg is open', async () => {
      const mockChartTemplates = getMockChartTemplates('9');
      mocked(API).getChartTemplates.mockResolvedValue(mockChartTemplates);

      const { rerender } = render(
        <Router>
          <ChartTemplatesModal {...defaultProps} visibleChartTemplates />
        </Router>
      );

      await waitFor(() => expect(API.getChartTemplates).toHaveBeenCalledTimes(1));

      await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

      rerender(
        <Router>
          <ChartTemplatesModal {...defaultProps} packageId="id2" />
        </Router>
      );

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull();
      });
    });
  });
});
