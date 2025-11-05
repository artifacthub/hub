import { render, screen } from '@testing-library/react';

import { RepositoryKind } from '../../types';
import RepositoryIcon from './RepositoryIcon';

const hasClassContaining = (element: Element, token: string): boolean =>
  Array.from(element.classList).some((cls) => cls.includes(token));

const expectIconSrcContains = (element: Element, asset: string) => {
  const src = element.getAttribute('src');
  expect(src).not.toBeNull();
  expect(src).toContain(`/static/media/${asset}`);
};

describe('RepositoryIcon', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<RepositoryIcon kind={RepositoryKind.Helm} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders Chart icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.Helm} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expectIconSrcContains(icon, 'helm-chart-light');
  });

  it('renders Falco icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.Falco} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expectIconSrcContains(icon, 'falco-rules-light');
  });

  it('renders OPA icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.OPA} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expectIconSrcContains(icon, 'opa-policies-light');
  });

  it('renders OLM icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.OLM} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expectIconSrcContains(icon, 'olm-operators-light');
  });

  it('renders Tinkerbell icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.TBAction} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expectIconSrcContains(icon, 'tinkerbell-actions-light');
  });

  it('renders Krew icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.Krew} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expectIconSrcContains(icon, 'krew-plugins-light');
  });

  it('renders Helm plugin icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.HelmPlugin} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expectIconSrcContains(icon, 'helm-chart-light');
  });

  it('renders Tekton task icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.TektonTask} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expectIconSrcContains(icon, 'tekton-pkg-light');
  });

  it('renders Keda scaler icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.KedaScaler} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expectIconSrcContains(icon, 'keda-scaler-light');
  });

  it('renders Core DNS plugin icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.CoreDNS} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expectIconSrcContains(icon, 'coredns-plugin-light');
  });

  it('renders Keptn integration icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.Keptn} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expectIconSrcContains(icon, 'keptn-integrations-light');
  });

  it('renders Tekton pipeline icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.TektonPipeline} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expectIconSrcContains(icon, 'tekton-pkg-light');
  });

  it('renders Container icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.Container} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expectIconSrcContains(icon, 'container-light');
  });

  it('renders Kubewarden integration icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.Kubewarden} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expectIconSrcContains(icon, 'kubewarden-light');
  });

  it('renders Gatekeeper policy icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.Gatekeeper} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expectIconSrcContains(icon, 'gatekeeper-light');
  });

  it('renders Kyverno policy icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.Kyverno} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expectIconSrcContains(icon, 'kyverno-light');
  });

  it('renders Knative client plugin icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.KnativeClientPlugin} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expectIconSrcContains(icon, 'knative-light');
  });

  it('renders Backstage plugin icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.Backstage} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expectIconSrcContains(icon, 'backstage-light');
  });

  it('renders Inspektor gadget icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.InspektorGadget} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expectIconSrcContains(icon, 'inspektor-gadget-light');
  });

  it('renders Tekton StepAction icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.TektonStepAction} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expectIconSrcContains(icon, 'tekton-pkg-light');
  });

  it('renders Meshery design icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.MesheryDesign} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expectIconSrcContains(icon, 'meshery-light');
  });

  it('renders Opencost plugin icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.OpenCost} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expectIconSrcContains(icon, 'opencost-light');
  });

  it('renders Radius recipe icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.RadiusRecipe} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expectIconSrcContains(icon, 'radius-light');
  });

  it('renders empty icon', () => {
    render(<RepositoryIcon kind={101 as RepositoryKind} type="white" />);
    expect(() => screen.getByAltText('Icon')).toThrow();
  });

  it('renders Chart icon - default type', () => {
    render(<RepositoryIcon kind={RepositoryKind.Helm} />);
    const icons = screen.getAllByAltText('Icon');
    expect(icons).toHaveLength(2);
    expectIconSrcContains(icons[0], 'helm-chart');
    expect(hasClassContaining(icons[0], 'iconLight')).toBe(true);
    expectIconSrcContains(icons[1], 'helm-chart-light');
    expect(hasClassContaining(icons[1], 'iconDark')).toBe(true);
  });
});
