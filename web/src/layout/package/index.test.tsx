import React from 'react';
import { render, screen, wait, waitForElement, fireEvent, waitForElementToBeRemoved, within } from '@testing-library/react';
import { mocked } from 'ts-jest/utils';
import { BrowserRouter as Router } from 'react-router-dom';
import { API } from '../../api';
import PackageView from './index';
import prepareQuerystring from '../../utils/prepareQueryString';
import { Package } from '../../types';
jest.mock('../../api');

const getMockPackage = (fixtureId: string): Package => {
  return require(`./__fixtures__/index/${fixtureId}.json`) as Package;
};

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
  repoName: 'repoName',
  packageName: 'packageName',
  searchUrlReferer: null,
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
    expect(result.asFragment()).toMatchSnapshot();
    await wait();
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
      expect(API.getPackage).toHaveBeenCalledTimes(1);
      await wait();
    });

    it('removes loading spinner after getting package', async () => {
      const mockPackage = getMockPackage('3');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      const props = {
        ...defaultProps,
        isSearching: true,
      };
      render(
        <Router>
          <PackageView {...props} />
        </Router>
      );

      const spinner = await waitForElementToBeRemoved(() =>
        screen.getByRole('status'),
      );

      expect(spinner).toBeTruthy();
      await wait();
    });
  });

  describe('Go back button', () => {
    it('creates snapshot', async () => {
      const searchUrlReferer = {
        text: 'test',
        filters: {},
        pageNumber: 1,
      };
      const mockPackage = getMockPackage('4');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView
            {...defaultProps}
            searchUrlReferer={searchUrlReferer}
          />
        </Router>
      );

      const goBack = await waitForElement(() =>
        screen.getByTestId('goBack'),
      );

      expect(goBack).toBeInTheDocument();
      fireEvent.click(goBack);
      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/search',
        search: prepareQuerystring(searchUrlReferer),
        state: { fromDetail: true },
      });

      await wait();
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
      const link = await waitForElement(() =>
        screen.getByTestId('link'),
      );
      expect(link).toBeInTheDocument();
      fireEvent.click(link);
      expect(location.pathname).toBe('/search');
      expect(location.search).toBe(`?page=1&repo=${mockPackage.chartRepository?.name}`);

      await wait();
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

      const dialogs = await waitForElement(() =>
        screen.getAllByRole('dialog'),
      );

      expect(dialogs).toHaveLength(3);

      await wait();
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

      const [noData, readme] = await waitForElement(() => [
        screen.getByTestId('noData'),
        screen.queryByTestId('readme'),
      ]);

      expect(noData).toBeInTheDocument();
      expect(noData.textContent).toBe('No README file available for this package');
      expect(readme).toBeNull();

      await wait();
    });

    it('renders ir correctly', async () => {
      const mockPackage = getMockPackage('8');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView {...defaultProps} />
        </Router>
      );

      const readme = await waitForElement(() =>
        screen.queryByTestId('readme'),
      );

      expect(readme).toBeInTheDocument();
      expect(readme?.textContent).toBe(mockPackage.readme);

      await wait();
    });
  });
});
