import { render } from '@testing-library/react';
import React from 'react';

import PublisherInstructionsInstall from './PublisherInstructionsInstall';

describe('PublisherInstructionsInstall', () => {
  it('creates snapshot', () => {
    const result = render(
      <PublisherInstructionsInstall install="## Install using Helm\n\n```\nhelm upgrade falco -f https://api.securityhub.dev/resources/falco-rules/cve-2019-11246/custom-rules.yaml stable/falco\n```\n" />
    );
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText } = render(
        <PublisherInstructionsInstall install="## Install using Helm\n\n```\nhelm upgrade falco -f https://api.securityhub.dev/resources/falco-rules/cve-2019-11246/custom-rules.yaml stable/falco\n```\n" />
      );

      expect(getByText(/Install using Helm/g)).toBeInTheDocument();
      expect(
        getByText(
          /helm upgrade falco -f https:\/\/api.securityhub.dev\/resources\/falco-rules\/cve-2019-11246\/custom-rules.yaml stable\/falco/g
        )
      ).toBeInTheDocument();
    });
  });
});
