import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import RecommendedPackageCard from './Card';

const defaultProps = {
  recommendation: {
    kind: 0,
    normalizedName: 'artifact-hub',
    repoName: 'artifact-hub',
    url: '/packages/helm/artifact-hub/artifact-hub',
  },
};

describe('RecommendedPackageCard', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(
      <Router>
        <RecommendedPackageCard {...defaultProps} />
      </Router>
    );
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByTestId } = render(
        <Router>
          <RecommendedPackageCard {...defaultProps} />
        </Router>
      );

      const pkg = getByTestId('recommended-pkg');
      expect(pkg).toBeInTheDocument();
      expect(pkg).toHaveTextContent('Helm chartartifact-hubREPO: artifact-hub');
    });

    it('opens package', () => {
      const { getByTestId } = render(
        <Router>
          <RecommendedPackageCard {...defaultProps} />
        </Router>
      );

      const pkg = getByTestId('recommended-pkg');
      fireEvent.click(pkg);

      expect(window.location.pathname).toBe('/packages/helm/artifact-hub/artifact-hub');
    });
  });
});
