import { render, screen } from '@testing-library/react';

import detectLinksInText from './detectLinksInText';

describe('detectLinksInText', () => {
  it('renders text without link', () => {
    render(<>{detectLinksInText('text')}</>);
    expect(screen.getByText('text')).toBeInTheDocument();
  });

  it('renders text with link', () => {
    render(
      <>
        {detectLinksInText(
          'More information here: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.19/#resourcerequirements-v1-core'
        )}
      </>
    );

    const link = screen.getByText(
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
    render(
      <>
        {detectLinksInText(
          'More information here: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.19/#resourcerequirements-v1-core',
          'customClass'
        )}
      </>
    );

    const link = screen.getByText(
      'https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.19/#resourcerequirements-v1-core'
    );
    expect(link).toBeInTheDocument();
    expect(link).toHaveClass('customClass');
  });
});
