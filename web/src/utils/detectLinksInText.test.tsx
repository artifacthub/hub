import { render } from '@testing-library/react';
import React from 'react';

import detectLinksInText from './detectLinksInText';

describe('detectLinksInText', () => {
  it('renders text without link', () => {
    const { getByText } = render(<>{detectLinksInText('text')}</>);
    expect(getByText('text')).toBeInTheDocument();
  });

  it('renders text with link', () => {
    const { getByText } = render(
      <>
        {detectLinksInText(
          'More information here: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.19/#resourcerequirements-v1-core'
        )}
      </>
    );

    const link = getByText(
      'https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.19/#resourcerequirements-v1-core'
    );
    expect(link).toBeInTheDocument();
    expect(link).toHaveClass('d-inline text-secondary');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute(
      'href',
      'https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.19/#resourcerequirements-v1-core'
    );
  });

  it('renders text with link and custom class', () => {
    const { getByText } = render(
      <>
        {detectLinksInText(
          'More information here: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.19/#resourcerequirements-v1-core',
          'customClass'
        )}
      </>
    );

    const link = getByText(
      'https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.19/#resourcerequirements-v1-core'
    );
    expect(link).toBeInTheDocument();
    expect(link).toHaveClass('customClass');
  });
});
