import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import { SearchFiltersURL } from '../../types';
import prepareQueryString from '../../utils/prepareQueryString';
import SampleQueries from './SampleQueries';

const mockQueries = [
  {
    label: 'OLM operators for databases',
    filters: {
      pageNumber: 1,
      tsQueryWeb: 'database',
      filters: {
        kind: ['3'],
      },
    },
  },
  {
    label: 'Helm Charts provided by Bitnami',
    filters: {
      pageNumber: 1,
      filters: {
        kind: ['0'],
        org: ['bitnami'],
      },
    },
  },
  {
    label: 'Packages of any kind related to etcd',
    filters: {
      pageNumber: 1,
      tsQueryWeb: 'etcd',
      filters: {},
    },
  },
  {
    label: 'Falco rules for CVE',
    filters: {
      pageNumber: 1,
      tsQuery: ['monitoring'],
      filters: {
        kind: ['3'],
      },
    },
  },
  {
    label: 'OLM operators in the monitoring category',
    filters: {
      pageNumber: 1,
      tsQuery: ['monitoring'],
      filters: {
        kind: ['3'],
      },
    },
  },
];

jest.mock('lodash', () => ({
  ...(jest.requireActual('lodash') as {}),
  sampleSize: () => {
    return mockQueries;
  },
}));

describe('SampleQueries', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(
      <Router>
        <SampleQueries />
      </Router>
    );

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getAllByTestId, getByText } = render(
        <Router>
          <SampleQueries />
        </Router>
      );

      expect(getAllByTestId('sampleQuery')).toHaveLength(mockQueries.length);

      for (let i = 0; i < mockQueries.length; i++) {
        expect(getByText(mockQueries[i].label)).toBeInTheDocument();
      }
    });

    it('renders proper classes', () => {
      const { getAllByTestId } = render(
        <Router>
          <SampleQueries className="badge-light border-secondary text-secondary" />
        </Router>
      );

      const links = getAllByTestId('sampleQuery');
      expect(links[0]).toHaveClass('badge-light border-secondary text-secondary');
    });

    it('renders break line', () => {
      const { getByTestId } = render(
        <Router>
          <SampleQueries lineBreakIn={2} />
        </Router>
      );

      expect(getByTestId('sampleQueryBreakLine')).toBeInTheDocument();
    });

    it('opens first sample query', () => {
      const { getAllByTestId } = render(
        <Router>
          <SampleQueries />
        </Router>
      );

      const links = getAllByTestId('sampleQuery');
      fireEvent.click(links[0]);

      expect(window.location.pathname).toBe('/packages/search');
      expect(window.location.search).toBe(prepareQueryString(mockQueries[0].filters as SearchFiltersURL));
    });
  });
});
