import { render } from '@testing-library/react';
import React from 'react';

import { PackageKind } from '../../types';
import PackageIcon from './PackageIcon';

describe('PackageIcon', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<PackageIcon kind={PackageKind.Chart} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders Chart icon', () => {
    const { getByAltText } = render(<PackageIcon kind={PackageKind.Chart} />);
    const icon = getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/helm-chart.svg');
  });

  it('renders Falco icon', () => {
    const { getByAltText } = render(<PackageIcon kind={PackageKind.Falco} />);
    const icon = getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/falco-rules.svg');
  });

  it('renders OPA icon', () => {
    const { getByAltText } = render(<PackageIcon kind={PackageKind.Opa} />);
    const icon = getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/opa-policies.svg');
  });

  it('renders Chart icon - white version', () => {
    const { getByAltText } = render(<PackageIcon kind={PackageKind.Chart} type="white" />);
    const icon = getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/helm-chart-white.svg');
  });
});
