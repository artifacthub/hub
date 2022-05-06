import { render, screen } from '@testing-library/react';

import PublisherInstructionsInstall from './PublisherInstructionsInstall';
jest.mock('react-markdown', () => () => <div>Install using Helm</div>);
jest.mock('remark-gfm', () => () => <div />);

describe('PublisherInstructionsInstall', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(
      <PublisherInstructionsInstall install="## Install using Helm\n\n```\nhelm upgrade falco -f https://api.securityhub.dev/resources/falco-rules/cve-2019-11246/custom-rules.yaml stable/falco\n```\n" />
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(
        <PublisherInstructionsInstall install="## Install using Helm\n\n```\nhelm upgrade falco -f https://api.securityhub.dev/resources/falco-rules/cve-2019-11246/custom-rules.yaml stable/falco\n```\n" />
      );

      expect(screen.getByText(/Install using Helm/)).toBeInTheDocument();
    });
  });
});
