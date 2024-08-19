import { render, screen } from '@testing-library/react';

import { RepositoryKind } from '../../types';
import RepositoryIcon from './RepositoryIcon';

describe('RepositoryIcon', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<RepositoryIcon kind={RepositoryKind.Helm} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders Chart icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.Helm} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/helm-chart-light.svg');
  });

  it('renders Falco icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.Falco} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/falco-rules-light.svg');
  });

  it('renders OPA icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.OPA} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/opa-policies-light.svg');
  });

  it('renders OLM icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.OLM} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/olm-operators-light.svg');
  });

  it('renders Tinkerbell icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.TBAction} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/tinkerbell-actions-light.svg');
  });

  it('renders Krew icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.Krew} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/krew-plugins-light.svg');
  });

  it('renders Helm plugin icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.HelmPlugin} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/helm-chart-light.svg');
  });

  it('renders Tekton task icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.TektonTask} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/tekton-pkg-light.svg');
  });

  it('renders Keda scaler icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.KedaScaler} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/keda-scaler-light.svg');
  });

  it('renders Core DNS plugin icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.CoreDNS} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/coredns-plugin-light.svg');
  });

  it('renders Keptn integration icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.Keptn} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/keptn-integrations-light.svg');
  });

  it('renders Tekton pipeline icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.TektonPipeline} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/tekton-pkg-light.svg');
  });

  it('renders Container icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.Container} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/container-light.svg');
  });

  it('renders Kubewarden integration icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.Kubewarden} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/kubewarden-light.svg');
  });

  it('renders Gatekeeper policy icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.Gatekeeper} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/gatekeeper-light.svg');
  });

  it('renders Kyverno policy icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.Kyverno} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/kyverno-light.svg');
  });

  it('renders Knative client plugin icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.KnativeClientPlugin} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/knative-light.svg');
  });

  it('renders Backstage plugin icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.Backstage} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/backstage-light.svg');
  });

  it('renders Inspektor gadget icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.InspektorGadget} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/inspektor-gadget-light.svg');
  });

  it('renders Tekton StepAction icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.TektonStepAction} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/tekton-pkg-light.svg');
  });

  it('renders Meshery design icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.MesheryDesign} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/meshery-light.svg');
  });

  it('renders Opencost plugin icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.OpenCost} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/opencost-light.svg');
  });

  it('renders Radius recipe icon', () => {
    render(<RepositoryIcon kind={RepositoryKind.RadiusRecipe} type="white" />);
    const icon = screen.getByAltText('Icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveProperty('src', 'http://localhost/static/media/radius-light.svg');
  });

  it('renders empty icon', () => {
    render(<RepositoryIcon kind={101 as RepositoryKind} type="white" />);
    expect(() => screen.getByAltText('Icon')).toThrow();
  });

  it('renders Chart icon - default type', () => {
    render(<RepositoryIcon kind={RepositoryKind.Helm} />);
    const icons = screen.getAllByAltText('Icon');
    expect(icons).toHaveLength(2);
    expect(icons[0]).toHaveProperty('src', 'http://localhost/static/media/helm-chart.svg');
    expect(icons[0]).toHaveClass('iconLight');
    expect(icons[1]).toHaveProperty('src', 'http://localhost/static/media/helm-chart-light.svg');
    expect(icons[1]).toHaveClass('iconDark');
  });
});
