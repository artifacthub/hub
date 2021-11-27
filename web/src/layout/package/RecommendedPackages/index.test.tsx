import { render, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';

import RecommendedPackages from './index';

const defaultProps = {
  recommendations: [
    {
      url: 'https://test.com/packages/helm/artifact-hub/artifact-hub',
    },
    {
      url: 'https://test.com/packages/helm/prometheus-community/kube-prometheus-stack',
    },
  ],
};

describe('RecommendedPackages', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <Router>
        <RecommendedPackages {...defaultProps} />
      </Router>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(
        <Router>
          <RecommendedPackages {...defaultProps} />
        </Router>
      );

      expect(screen.getByText(/recommended by the publisher/)).toBeInTheDocument();

      const pkgs = screen.getAllByTestId('recommended-pkg');
      expect(pkgs).toHaveLength(2);
      expect(pkgs[0]).toHaveTextContent('artifact-hub');
      expect(pkgs[1]).toHaveTextContent('kube-prometheus-stack');
    });

    it('renders component with clean pkgs', () => {
      render(
        <Router>
          <RecommendedPackages
            recommendations={[
              { url: 'https://test.com/packages/helm/artifact-hub/artifact-hub' },
              { url: 'htpps://notvalidurl.com/packages/not/valid/pkg' },
            ]}
          />
        </Router>
      );

      expect(screen.getByText(/recommended by the publisher/)).toBeInTheDocument();

      const pkgs = screen.getAllByTestId('recommended-pkg');
      expect(pkgs).toHaveLength(1);
      expect(pkgs[0]).toHaveTextContent('artifact-hub');
    });

    describe('does not render component', () => {
      it('when recommendations is undefined', () => {
        const { container } = render(
          <Router>
            <RecommendedPackages />
          </Router>
        );

        expect(container).toBeEmptyDOMElement();
      });

      it('when all recommendations have not valid urls', () => {
        const { container } = render(
          <Router>
            <RecommendedPackages
              recommendations={[
                { url: 'htpps://notvalidurl.com/packages/not/valid/pkg' },
                { url: 'htpps://notvalidurl1.com/packages/not/valid/pkg1' },
              ]}
            />
          </Router>
        );

        expect(container).toBeEmptyDOMElement();
      });
    });
  });
});
