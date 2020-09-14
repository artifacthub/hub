import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import prepareQuerystring from '../../utils/prepareQueryString';
import Keywords from './Keywords';

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    push: mockHistoryPush,
  }),
}));

const defaultProps = {
  keywords: ['key1', 'key2', 'key3'],
};

describe('Keywords', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(
      <Router>
        <Keywords {...defaultProps} />
      </Router>
    );
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByTestId, getAllByTestId } = render(
        <Router>
          <Keywords {...defaultProps} />
        </Router>
      );

      expect(getByTestId('keywords')).toBeInTheDocument();
      const keywords = getAllByTestId('keywordBtn');
      expect(keywords).toHaveLength(defaultProps.keywords!.length);
    });

    it('renders only uniq keywords', () => {
      const { getByTestId, getAllByTestId } = render(
        <Router>
          <Keywords keywords={['key1', 'key2', 'key3', 'key1']} deprecated={false} />
        </Router>
      );

      expect(getByTestId('keywords')).toBeInTheDocument();
      const keywords = getAllByTestId('keywordBtn');
      expect(keywords).toHaveLength(3);
    });

    it('renders placeholder if keywords prop is null', () => {
      const { getByTestId } = render(
        <Router>
          <Keywords keywords={null} deprecated={false} />
        </Router>
      );

      const keywords = getByTestId('keywords');
      expect(keywords).toBeInTheDocument();
      expect(keywords).toHaveTextContent('-');
    });

    it('calls history push to click keyword button', () => {
      const { getByText } = render(
        <Router>
          <Keywords {...defaultProps} />
        </Router>
      );

      const keywordBtn = getByText(defaultProps.keywords[0]);
      fireEvent.click(keywordBtn);
      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQuerystring({
          tsQueryWeb: defaultProps.keywords[0],
          pageNumber: 1,
          filters: {},
        }),
      });
    });
  });
});
