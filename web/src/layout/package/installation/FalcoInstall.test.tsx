import { render, screen } from '@testing-library/react';

import FalcoInstall from './FalcoInstall';

describe('FalcoInstall', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const { asFragment } = render(<FalcoInstall normalizedName="falco-repo" />);

    expect(
      await screen.findByText(
        'helm upgrade falco -f https://api.securityhub.dev/resources/falco-rules/falco-repo/custom-rules.yaml stable/falco'
      )
    ).toBeInTheDocument();

    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      render(<FalcoInstall normalizedName="falco-repo" />);

      expect(
        await screen.findByText(
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
