import { render } from '@testing-library/react';
import React from 'react';

import FalcoInstall from './FalcoInstall';

describe('FalcoInstall', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<FalcoInstall normalizedName="falco-repo" />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText } = render(<FalcoInstall normalizedName="falco-repo" />);

      expect(
        getByText(
          'helm upgrade falco -f https://api.securityhub.dev/resources/falco-rules/falco-repo/custom-rules.yaml stable/falco'
        )
      ).toBeInTheDocument();

      const helmLink = getByText('Need Helm?');
      expect(helmLink).toBeInTheDocument();
      expect(helmLink).toHaveProperty('href', 'https://helm.sh/docs/intro/quickstart/');
    });

    it('renders private repo', () => {
      const { getByRole } = render(<FalcoInstall normalizedName="falco-repo" isPrivate />);

      const alert = getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Important: This repository is private and requires some credentials.');
    });
  });
});
