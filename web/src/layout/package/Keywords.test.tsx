import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';

import { prepareQueryString } from '../../utils/prepareQueryString';
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
    const { asFragment } = render(
      <Router>
        <Keywords {...defaultProps} />
      </Router>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(
        <Router>
          <Keywords {...defaultProps} />
        </Router>
      );

      expect(screen.getByTestId('keywords')).toBeInTheDocument();
      const keywords = screen.getAllByRole('listitem', { name: /Filter by/ });
      expect(keywords).toHaveLength(defaultProps.keywords!.length);
    });

    it('renders only uniq keywords', () => {
      render(
        <Router>
          <Keywords keywords={['key1', 'key2', 'key3', 'key1']} deprecated={false} />
        </Router>
      );

      expect(screen.getByTestId('keywords')).toBeInTheDocument();
      const keywords = screen.getAllByRole('listitem', { name: /Filter by/ });
      expect(keywords).toHaveLength(3);
    });

    it('renders placeholder if keywords prop is null', () => {
      render(
        <Router>
          <Keywords keywords={null} deprecated={false} />
        </Router>
      );

      const keywords = screen.getByTestId('keywords');
      expect(keywords).toBeInTheDocument();
      expect(keywords).toHaveTextContent('-');
    });

    it('calls history push to click keyword button', () => {
      render(
        <Router>
          <Keywords {...defaultProps} />
        </Router>
      );

      const keywordBtn = screen.getByText(defaultProps.keywords[0]);
      userEvent.click(keywordBtn);
      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQueryString({
          tsQueryWeb: defaultProps.keywords[0],
          pageNumber: 1,
        }),
      });
    });
  });
});
