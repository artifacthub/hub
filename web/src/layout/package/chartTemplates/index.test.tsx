import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../api';
import { ChartTemplatesData, RepositoryKind } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import ChartTemplatesModal from './index';
jest.mock('../../../utils/alertDispatcher');
jest.mock('../../../api');

const getMockChartTemplates = (fixtureId: string): ChartTemplatesData => {
  return require(`./__fixtures__/index/${fixtureId}.json`) as ChartTemplatesData;
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
  version: '1.1.1',
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

    const result = render(
      <Router>
        <ChartTemplatesModal {...defaultProps} visibleChartTemplates />
      </Router>
    );

    await waitFor(() => {
      expect(API.getChartTemplates).toHaveBeenCalledTimes(1);
      expect(result.asFragment()).toMatchSnapshot();
    });
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
    });

    it('opens modal', async () => {
      const mockChartTemplates = getMockChartTemplates('3');
      mocked(API).getChartTemplates.mockResolvedValue(mockChartTemplates);

      const { getByText, getAllByTestId, getByTestId, getByRole, queryByRole } = render(
        <Router>
          <ChartTemplatesModal {...defaultProps} />
        </Router>
      );

      expect(queryByRole('dialog')).toBeNull();

      const modalBtn = getByTestId('tmplModalBtn');
      expect(modalBtn).toHaveTextContent('Templates');
      fireEvent.click(modalBtn);

      await waitFor(() => {
        expect(API.getChartTemplates).toHaveBeenCalledTimes(1);
        expect(API.getChartTemplates).toHaveBeenCalledWith('id', '1.1.1');
      });

      await waitFor(() => {
        expect(getByRole('dialog')).toBeInTheDocument();
      });

      expect(getByText(/This chart version contains/g)).toBeInTheDocument();
      expect(getByText(/built-in objects and functions/g)).toBeInTheDocument();
      expect(getAllByTestId('tmplBtn')).toHaveLength(16);
      expect(getByTestId('activeTmpl')).toBeInTheDocument();
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
        expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
        expect(mockHistoryReplace).toHaveBeenCalledWith({
          search: '?modal=template&template=db_migrator_install_job.yaml',
          state: {
            fromStarredPage: undefined,
            searchUrlReferer: undefined,
          },
        });
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
        expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
        expect(mockHistoryReplace).toHaveBeenCalledWith({
          search: '',
          state: {
            fromStarredPage: undefined,
            searchUrlReferer: undefined,
          },
        });
      });
    });

    it('does not call again to getChartTemplates to open modal when package is the same', async () => {
      const mockChartTemplates = getMockChartTemplates('5');
      mocked(API).getChartTemplates.mockResolvedValue(mockChartTemplates);

      const { queryByRole, getByTestId, getByRole, getByText } = render(
        <Router>
          <ChartTemplatesModal {...defaultProps} visibleChartTemplates />
        </Router>
      );

      expect(getByTestId('tmplModalBtn')).toBeInTheDocument();

      await waitFor(() => expect(API.getChartTemplates).toHaveBeenCalledTimes(1));

      await waitFor(() => {
        expect(getByRole('dialog')).toBeInTheDocument();
      });

      const btn = getByText('Close');
      fireEvent.click(btn);

      expect(queryByRole('dialog')).toBeNull();

      const openBtn = getByTestId('tmplModalBtn');
      fireEvent.click(openBtn);

      await waitFor(() => {
        expect(getByRole('dialog')).toBeInTheDocument();
        expect(API.getChartTemplates).toHaveBeenCalledTimes(1);
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

    it('when error occurred to get templates', async () => {
      mocked(API).getChartTemplates.mockRejectedValue(null);

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

  describe('does not render component', () => {
    it('when repo is not Helm kind', () => {
      const { container } = render(
        <Router>
          <ChartTemplatesModal {...defaultProps} repoKind={RepositoryKind.Krew} visibleChartTemplates />
        </Router>
      );

      expect(container).toBeEmptyDOMElement();
      expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
      expect(mockHistoryReplace).toHaveBeenCalledWith({
        search: '',
        state: {
          fromStarredPage: undefined,
          searchUrlReferer: undefined,
        },
      });
    });
  });

  describe('closes modal', () => {
    it('when a new pkg is open', async () => {
      const mockChartTemplates = getMockChartTemplates('9');
      mocked(API).getChartTemplates.mockResolvedValue(mockChartTemplates);

      const { rerender, getByRole, queryByRole } = render(
        <Router>
          <ChartTemplatesModal {...defaultProps} visibleChartTemplates />
        </Router>
      );

      await waitFor(() => expect(API.getChartTemplates).toHaveBeenCalledTimes(1));

      expect(getByRole('dialog')).toBeInTheDocument();

      rerender(
        <Router>
          <ChartTemplatesModal {...defaultProps} packageId="id2" />
        </Router>
      );
      expect(queryByRole('dialog')).toBeNull();
    });
  });
});
