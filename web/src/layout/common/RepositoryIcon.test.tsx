import { render } from '@testing-library/react';
import React from 'react';

import { RepositoryKind } from '../../types';
import RepositoryIcon from './RepositoryIcon';

describe('RepositoryIcon', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<RepositoryIcon kind={RepositoryKind.Helm} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders Chart icon', () => {
    const { getByAltText } = render(<RepositoryIcon kind={RepositoryKind.Helm} />);
    const icon = getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/helm-chart.svg');
  });

  it('renders Falco icon', () => {
    const { getByAltText } = render(<RepositoryIcon kind={RepositoryKind.Falco} />);
    const icon = getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/falco-rules.svg');
  });

  it('renders OPA icon', () => {
    const { getByAltText } = render(<RepositoryIcon kind={RepositoryKind.OPA} />);
    const icon = getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/opa-policies.svg');
  });

  it('renders OLM icon', () => {
    const { getByAltText } = render(<RepositoryIcon kind={RepositoryKind.OLM} />);
    const icon = getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/olm-operators.svg');
  });

  it('renders Chart icon - light version', () => {
    const { getByAltText } = render(<RepositoryIcon kind={RepositoryKind.Helm} type="white" />);
    const icon = getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/helm-chart-light.svg');
  });
});
