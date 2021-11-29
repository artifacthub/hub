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

  it('does not render when name is not in the list', () => {
    render(<SVGIcons name="not-listed" />);
    expect(screen.getByTestId('iconWrapper')).toBeEmptyDOMElement();
  });
});
