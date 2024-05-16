import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';

import { prepareQueryString } from '../../utils/prepareQueryString';
import Keywords from './Keywords';

const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
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

      expect(screen.getByText('Keywords')).toBeInTheDocument();
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

    it('renders only uniq keywords (ignoring case)', () => {
      render(
        <Router>
          <Keywords keywords={['key1', 'key2', 'key3', 'Key1']} deprecated={false} />
        </Router>
      );

      expect(screen.getByTestId('keywords')).toBeInTheDocument();
      const keywords = screen.getAllByRole('listitem', { name: /Filter by/ });
      expect(keywords).toHaveLength(3);
    });

    it('calls navigate to click keyword button', async () => {
      render(
        <Router>
          <Keywords {...defaultProps} />
        </Router>
      );

      const keywordBtn = screen.getByText(defaultProps.keywords[0]);
      await userEvent.click(keywordBtn);

      await waitFor(() => {
        expect(mockUseNavigate).toHaveBeenCalledTimes(1);
        expect(mockUseNavigate).toHaveBeenCalledWith({
          pathname: '/packages/search',
          search: prepareQueryString({
            tsQueryWeb: defaultProps.keywords[0],
            pageNumber: 1,
          }),
        });
      });
    });

    describe('does not render', () => {
      it('when keywords is null', () => {
        const { container } = render(
          <Router>
            <Keywords keywords={null} deprecated={false} />
          </Router>
        );

        expect(container).toBeEmptyDOMElement();
      });

      it('when keywords is undefined', () => {
        const { container } = render(
          <Router>
            <Keywords deprecated={false} />
          </Router>
        );

        expect(container).toBeEmptyDOMElement();
      });

      it('when keywords is empty', () => {
        const { container } = render(
          <Router>
            <Keywords keywords={[]} deprecated={false} />
          </Router>
        );

        expect(container).toBeEmptyDOMElement();
      });
    });
  });
});
