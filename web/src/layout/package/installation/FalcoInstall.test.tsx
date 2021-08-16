import { render, screen } from '@testing-library/react';
import React from 'react';

import FalcoInstall from './FalcoInstall';

describe('FalcoInstall', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<FalcoInstall normalizedName="falco-repo" />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<FalcoInstall normalizedName="falco-repo" />);

      expect(
        screen.getByText(
          'helm upgrade falco -f https://api.securityhub.dev/resources/falco-rules/falco-repo/custom-rules.yaml stable/falco'
        )
      ).toBeInTheDocument();

      const helmLink = screen.getByText('Need Helm?');
      expect(helmLink).toBeInTheDocument();
      expect(helmLink).toHaveProperty('href', 'https://helm.sh/docs/intro/quickstart/');
    });

    it('renders private repo', () => {
      render(<FalcoInstall normalizedName="falco-repo" isPrivate />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Important: This repository is private and requires some credentials.');
    });
  });
});
