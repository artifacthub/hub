import { render, screen } from '@testing-library/react';

import SVGIcons from './SVGIcons';

describe('SVGIcons', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<SVGIcons name="logo" />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders logo', () => {
    render(<SVGIcons name="logo" />);
    expect(screen.getByTitle('logo'));
  });

  it('renders stars', () => {
    render(<SVGIcons name="stars" />);
    expect(screen.getByTitle('stars'));
  });

  it('renders verified', () => {
    render(<SVGIcons name="verified" />);
    expect(screen.getByTitle('verified'));
  });

  it('renders official', () => {
    render(<SVGIcons name="official" />);
    expect(screen.getByTitle('official'));
  });

  it('renders helm icon', () => {
    render(<SVGIcons name="helm" />);
    expect(screen.getByTitle('helm'));
  });

  it('renders helm-plugin icon', () => {
    render(<SVGIcons name="helm-plugin" />);
    expect(screen.getByTitle('helm-plugin'));
  });

  it('renders falco icon', () => {
    render(<SVGIcons name="falco" />);
    expect(screen.getByTitle('falco'));
  });

  it('renders opa icon', () => {
    render(<SVGIcons name="opa" />);
    expect(screen.getByTitle('opa'));
  });

  it('renders tinkerbell icon', () => {
    render(<SVGIcons name="tinkerbell" />);
    expect(screen.getByTitle('tinkerbell'));
  });

  it('renders tekton icon', () => {
    render(<SVGIcons name="tekton" />);
    expect(screen.getByTitle('tekton'));
  });

  it('renders olm icon', () => {
    render(<SVGIcons name="olm" />);
    expect(screen.getByTitle('olm'));
  });

  it('renders krew icon', () => {
    render(<SVGIcons name="krew" />);
    expect(screen.getByTitle('krew'));
  });

  it('renders keda icon', () => {
    render(<SVGIcons name="keda" />);
    expect(screen.getByTitle('keda'));
  });

  it('renders coredns icon', () => {
    render(<SVGIcons name="coredns" />);
    expect(screen.getByTitle('coredns'));
  });

  it('renders keptn icon', () => {
    render(<SVGIcons name="keptn" />);
    expect(screen.getByTitle('keptn'));
  });

  it('renders container icon', () => {
    render(<SVGIcons name="container" />);
    expect(screen.getByTitle('container'));
  });

  it('renders kubewarden icon', () => {
    render(<SVGIcons name="kubewarden" />);
    expect(screen.getByTitle('kubewarden'));
  });

  it('renders gatekeeper icon', () => {
    render(<SVGIcons name="gatekeeper" />);
    expect(screen.getByTitle('gatekeeper'));
  });

  it('renders kyverno icon', () => {
    render(<SVGIcons name="kyverno" />);
    expect(screen.getByTitle('kyverno'));
  });

  it('renders knative icon', () => {
    render(<SVGIcons name="knative" />);
    expect(screen.getByTitle('knative'));
  });

  it('renders backstage icon', () => {
    render(<SVGIcons name="backstage" />);
    expect(screen.getByTitle('backstage'));
  });

  it('renders KCL icon', () => {
    render(<SVGIcons name="kcl" />);
    expect(screen.getByTitle('kcl'));
  });

  it('renders Headlamp icon', () => {
    render(<SVGIcons name="headlamp" />);
    expect(screen.getByTitle('headlamp'));
  });

  it('renders Inspektor Gadget icon', () => {
    render(<SVGIcons name="inspektor-gadget" />);
    expect(screen.getByTitle('inspektor-gadget'));
  });

  it('renders Meshery design icon', () => {
    render(<SVGIcons name="meshery" />);
    expect(screen.getByTitle('meshery'));
  });

  it('renders OpenCost plugin icon', () => {
    render(<SVGIcons name="opencost" />);
    expect(screen.getByTitle('opencost'));
  });

  it('renders Radius recipe icon', () => {
    render(<SVGIcons name="radius" />);
    expect(screen.getByTitle('radius'));
  });

  it('does not render when name is not in the list', () => {
    render(<SVGIcons name="not-listed" />);
    expect(screen.getByTestId('iconWrapper')).toBeEmptyDOMElement();
  });
});
