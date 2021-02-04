import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
import { SearchResults } from '../../types';
import RelatedPackages from './RelatedPackages';
jest.mock('../../api');

const getMockRelatedPackages = (fixtureId: string): SearchResults => {
  return require(`./__fixtures__/RelatedPackages/${fixtureId}.json`) as SearchResults;
};

const defaultProps = {
  name: 'packageName',
  packageId: 'efd6bafa-9313-499a-a4ea-aa16b819be91',
  keywords: ['key1', 'key2', 'key3'],
};

describe('RelatedPackages', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders correctly', async () => {
    const mockPackages = getMockRelatedPackages('1');
    mocked(API).searchPackages.mockResolvedValue(mockPackages);

    const result = render(
      <Router>
        <RelatedPackages {...defaultProps} />
      </Router>
    );

    await waitFor(() => {
      expect(API.searchPackages).toHaveBeenCalledTimes(1);
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockPackages = getMockRelatedPackages('2');
      mocked(API).searchPackages.mockResolvedValue(mockPackages);

      const { getByText } = render(
        <Router>
          <RelatedPackages {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
        expect(API.searchPackages).toHaveBeenCalledWith(
          {
            filters: {},
            limit: 9,
            offset: 0,
            tsQueryWeb: 'packageName or key1 or key2 or key3',
          },
          false
        );
      });
      expect(getByText('Related packages')).toBeInTheDocument();
    });
  });

  describe('Packages', () => {
    it('excludes selected package from search results list', async () => {
      const mockPackages = getMockRelatedPackages('3');
      mocked(API).searchPackages.mockResolvedValue(mockPackages);

      const { getAllByTestId } = render(
        <Router>
          <RelatedPackages {...defaultProps} />
        </Router>
      );
      const packages = await waitFor(() => getAllByTestId('relatedPackageLink'));

      expect(mockPackages.data.packages).toHaveLength(7);
      await waitFor(() => {
        expect(packages).toHaveLength(6);
      });
    });

    it('renders only 8 related packages', async () => {
      const mockPackages = getMockRelatedPackages('4');
      mocked(API).searchPackages.mockResolvedValue(mockPackages);

      const { getAllByTestId } = render(
        <Router>
          <RelatedPackages {...defaultProps} />
        </Router>
      );
      const packages = await waitFor(() => getAllByTestId('relatedPackageLink'));

      expect(mockPackages.data.packages).toHaveLength(25);
      await waitFor(() => {
        expect(packages).toHaveLength(8);
      });
    });

    describe('does not render component', () => {
      it('when packages list is empty', async () => {
        const mockPackages = getMockRelatedPackages('5');
        mocked(API).searchPackages.mockResolvedValue(mockPackages);

        const { container } = render(
          <Router>
            <RelatedPackages {...defaultProps} />
          </Router>
        );

        expect(mockPackages.data.packages).toHaveLength(0);
        await waitFor(() => {
          expect(container).toBeEmptyDOMElement();
        });
      });

      it('when list contains only selected package', async () => {
        const mockPackages = getMockRelatedPackages('6');
        mocked(API).searchPackages.mockResolvedValue(mockPackages);

        const { container } = render(
          <Router>
            <RelatedPackages {...defaultProps} />
          </Router>
        );

        expect(mockPackages.data.packages).toHaveLength(1);
        await waitFor(() => {
          expect(container).toBeEmptyDOMElement();
        });
      });

      it('when SearchPackages call fails', async () => {
        mocked(API).searchPackages.mockRejectedValue(null);

        const { container } = render(
          <Router>
            <RelatedPackages {...defaultProps} />
          </Router>
        );

        await waitFor(() => {
          expect(container).toBeEmptyDOMElement();
        });
      });
    });
  });
});
