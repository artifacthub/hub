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
    const { getByAltText } = render(<RepositoryIcon kind={RepositoryKind.Helm} type="white" />);
    const icon = getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/helm-chart-light.svg');
  });

  it('renders Falco icon', () => {
    const { getByAltText } = render(<RepositoryIcon kind={RepositoryKind.Falco} type="white" />);
    const icon = getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/falco-rules-light.svg');
  });

  it('renders OPA icon', () => {
    const { getByAltText } = render(<RepositoryIcon kind={RepositoryKind.OPA} type="white" />);
    const icon = getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/opa-policies-light.svg');
  });

  it('renders OLM icon', () => {
    const { getByAltText } = render(<RepositoryIcon kind={RepositoryKind.OLM} type="white" />);
    const icon = getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/olm-operators-light.svg');
  });

  it('renders Tinkerbell icon', () => {
    const { getByAltText } = render(<RepositoryIcon kind={RepositoryKind.TBAction} type="white" />);
    const icon = getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/tinkerbell-actions-light.svg');
  });

  it('renders Krew icon', () => {
    const { getByAltText } = render(<RepositoryIcon kind={RepositoryKind.Krew} type="white" />);
    const icon = getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/krew-plugins-light.svg');
  });

  it('renders Helm plugin icon', () => {
    const { getByAltText } = render(<RepositoryIcon kind={RepositoryKind.HelmPlugin} type="white" />);
    const icon = getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/helm-chart-light.svg');
  });

  it('renders Tekton icon', () => {
    const { getByAltText } = render(<RepositoryIcon kind={RepositoryKind.TektonTask} type="white" />);
    const icon = getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/tekton-pkg-light.svg');
  });

  it('renders Keda scaler icon', () => {
    const { getByAltText } = render(<RepositoryIcon kind={RepositoryKind.KedaScaler} type="white" />);
    const icon = getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/keda-scaler-light.svg');
  });

  it('renders Core DNS plugin icon', () => {
    const { getByAltText } = render(<RepositoryIcon kind={RepositoryKind.CoreDNS} type="white" />);
    const icon = getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/coredns-plugin-light.svg');
  });

  it('renders Chart icon - default type', () => {
    const { getAllByAltText } = render(<RepositoryIcon kind={RepositoryKind.Helm} />);
    const icons = getAllByAltText('Icon');
    expect(icons).toHaveLength(2);
    expect(icons[0]).toHaveProperty('src', 'http://localhost/static/media/helm-chart.svg');
    expect(icons[0]).toHaveClass('iconLight');
    expect(icons[1]).toHaveProperty('src', 'http://localhost/static/media/helm-chart-light.svg');
    expect(icons[1]).toHaveClass('iconDark');
  });
});
