import { render, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';

import OrgCard from './Card';

const defaultProps = {
  organization: {
    name: 'artifacthub',
    displayName: 'Artifact Hub',
    homeUrl: 'https://artifacthub.io',
    logoImageId: '35c5d3c7-421e-4b4a-97b0-86f4602a2f59',
  },
};

describe('OrgCard', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <Router>
        <OrgCard {...defaultProps} />
      </Router>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(
        <Router>
          <OrgCard {...defaultProps} />
        </Router>
      );

      const org = screen.getByTestId('org-using-pkg');
      expect(org).toBeInTheDocument();
      expect(org).toHaveTextContent('Artifact Hub');

      const link = screen.getByRole('button', { name: 'Open organization url' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://artifacthub.io');
    });

    it('renders component without url', () => {
      render(
        <Router>
          <OrgCard organization={{ ...defaultProps.organization, homeUrl: undefined }} />
        </Router>
      );

      expect(screen.queryByRole('button', { name: 'Open organization url' })).toBeNull();
    });
  });
});
