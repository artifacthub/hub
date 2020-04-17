import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
import { Package } from '../../types';
import prepareQuerystring from '../../utils/prepareQueryString';
import PackageView from './index';
jest.mock('../../api');

const getMockPackage = (fixtureId: string): Package => {
  return require(`./__fixtures__/index/${fixtureId}.json`) as Package;
};

const mockIsLoading = jest.fn();
const mockHistoryPush = jest.fn();
const mockHistoryReplace = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({
    push: mockHistoryPush,
    replace: mockHistoryReplace,
    action: 'POP',
  }),
}));

const defaultProps = {
  isLoadingPackage: false,
  setIsLoadingPackage: mockIsLoading,
  repoName: 'repoName',
  packageName: 'packageName',
  searchUrlReferer: undefined,
};

describe('Package index', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockPackage = getMockPackage('1');
    mocked(API).getPackage.mockResolvedValue(mockPackage);

    const result = render(
      <Router>
        <PackageView {...defaultProps} />
      </Router>
    );

    await waitFor(() => {
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockPackage = getMockPackage('2');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
      });
    });

    it('displays loading spinner', async () => {
      const mockPackage = getMockPackage('3');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      const props = {
        ...defaultProps,
        isLoadingPackage: true,
      };
      render(
        <Router>
          <PackageView {...props} />
        </Router>
      );

      const spinner = await waitFor(() => screen.getByRole('status'));

      expect(spinner).toBeTruthy();
      await waitFor(() => {});
    });
  });

  describe('Go back button', () => {
    it('creates snapshot', async () => {
      const searchUrlReferer = {
        text: 'test',
        filters: {},
        pageNumber: 1,
        deprecated: false,
      };
      const mockPackage = getMockPackage('4');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView {...defaultProps} searchUrlReferer={searchUrlReferer} />
        </Router>
      );

      const goBack = await waitFor(() => screen.getByTestId('goBack'));

      expect(goBack).toBeInTheDocument();
      fireEvent.click(goBack);
      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQuerystring(searchUrlReferer),
        state: { fromDetail: true },
      });

      await waitFor(() => {});
    });
  });

  describe('Chart repository button', () => {
    it('renders repository link', async () => {
      const mockPackage = getMockPackage('5');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView {...defaultProps} />
        </Router>
      );
      const link = await waitFor(() => screen.getByTestId('repoLink'));
      expect(link).toBeInTheDocument();
      fireEvent.click(link);
      expect(window.location.pathname).toBe('/packages/search');
      expect(window.location.search).toBe(`?page=1&repo=${mockPackage.chartRepository?.name}`);

      await waitFor(() => {});
    });
  });

  describe('Modals', () => {
    it('renders all of them', async () => {
      const mockPackage = getMockPackage('6');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView {...defaultProps} />
        </Router>
      );

      const dialogs = await waitFor(() => screen.getAllByRole('dialog'));

      expect(dialogs).toHaveLength(3);

      await waitFor(() => {});
    });
  });

  describe('Readme', () => {
    it('does not render it when readme is null and displays no data message', async () => {
      const mockPackage = getMockPackage('7');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView {...defaultProps} />
        </Router>
      );

      await waitFor(() => screen.getByTestId('mainPackage'));

      const noData = screen.getByTestId('noData');
      expect(noData).toBeInTheDocument();
      expect(noData).toHaveTextContent('No README file available for this package');
      expect(screen.queryByTestId('readme')).toBeNull();

      await waitFor(() => {});
    });

    it('renders ir correctly', async () => {
      const mockPackage = getMockPackage('8');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView {...defaultProps} />
        </Router>
      );

      await waitFor(() => screen.getByTestId('mainPackage'));

      const readme = screen.queryByTestId('readme');
      expect(readme).toBeInTheDocument();
      expect(readme).toHaveTextContent(mockPackage.readme!);

      await waitFor(() => {});
    });
  });
});
