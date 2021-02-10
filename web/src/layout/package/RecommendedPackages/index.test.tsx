import { render } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import RecommendedPackages from './index';

const defaultProps = {
  recommendations: [
    {
      url: 'https://artifacthub.io/packages/helm/artifact-hub/artifact-hub',
    },
    {
      url: 'https://artifacthub.io/packages/helm/prometheus-community/kube-prometheus-stack',
    },
  ],
};

describe('RecommendedPackages', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(
      <Router>
        <RecommendedPackages {...defaultProps} />
      </Router>
    );
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, getAllByTestId } = render(
        <Router>
          <RecommendedPackages {...defaultProps} />
        </Router>
      );

      expect(getByText('Other packages recommended by the publisher:')).toBeInTheDocument();

      const pkgs = getAllByTestId('recommended-pkg');
      expect(pkgs).toHaveLength(2);
      expect(pkgs[0]).toHaveTextContent('Helm chartartifact-hubREPO: artifact-hub');
      expect(pkgs[1]).toHaveTextContent('Helm chartkube-prometheus-stackREPO: prometheus-community');
    });

    it('renders component with clean pkgs', () => {
      const { getByText, getAllByTestId } = render(
        <Router>
          <RecommendedPackages
            recommendations={[
              { url: 'https://artifacthub.io/packages/helm/artifact-hub/artifact-hub' },
              { url: 'htpps://notvalidurl.com/packages/not/valid/pkg' },
            ]}
          />
        </Router>
      );

      expect(getByText('Other packages recommended by the publisher:')).toBeInTheDocument();

      const pkgs = getAllByTestId('recommended-pkg');
      expect(pkgs).toHaveLength(1);
      expect(pkgs[0]).toHaveTextContent('Helm chartartifact-hubREPO: artifact-hub');
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
