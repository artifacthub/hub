import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import OrgsUsingPackage from './index';

const defaultProps = {
  organizations: [
    {
      name: 'artifacthub',
      displayName: 'Artifact Hub',
      homeUrl: 'https://artifacthub.io',
      logoImageId: '35c5d3c7-421e-4b4a-97b0-86f4602a2f59',
    },
    {
      name: 'test',
    },
    {
      name: 'org-name',
      displayName: 'Organization',
      logoImageId: '132543-jkhd8yeu-uyreiunbdnfsd-iuisdjfk',
    },
  ],
};

describe('OrgsUsingPackage', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <Router>
        <OrgsUsingPackage {...defaultProps} />
      </Router>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(
        <Router>
          <OrgsUsingPackage {...defaultProps} />
        </Router>
      );

      expect(screen.getByText('Organizations using this package in production:')).toBeInTheDocument();

      const orgs = screen.getAllByTestId('org-using-pkg');
      expect(orgs).toHaveLength(3);
      expect(orgs[0]).toHaveTextContent('Artifact Hub');
      expect(orgs[1]).toHaveTextContent('test');
      expect(orgs[2]).toHaveTextContent('Organization');

      const link = screen.getByRole('button', { name: 'Open organization url' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://artifacthub.io');
    });

    describe('does not render component', () => {
      it('when orgs list is empty', () => {
        const { container } = render(
          <Router>
            <OrgsUsingPackage organizations={[]} />
          </Router>
        );

        expect(container).toBeEmptyDOMElement();
      });
    });
  });
});
