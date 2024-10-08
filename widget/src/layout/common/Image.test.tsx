import { fireEvent, render, screen } from '@testing-library/react';

import { RepositoryKind } from '../../types';
import Image from './Image';

const defaultProps = {
  baseUrl: 'https://localhost:8000',
  alt: 'alt image',
};

describe('Image', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<Image {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders pkg image with imageId', () => {
    render(<Image {...defaultProps} imageId="imgID" />);
    const image = screen.getByAltText('alt image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'https://localhost:8000/image/imgID');
    expect(image).toHaveProperty(
      'srcset',
      'https://localhost:8000/image/imgID@1x 1x, https://localhost:8000/image/imgID@2x 2x, https://localhost:8000/image/imgID@3x 3x, https://localhost:8000/image/imgID@4x 4x'
    );
  });

  it('renders Helm chart icon', () => {
    render(<Image {...defaultProps} kind={RepositoryKind.Helm} />);
    const image = screen.getByAltText('alt image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'https://localhost:8000/static/media/placeholder_pkg_helm.png');
  });

  it('renders Helm plugin icon', () => {
    render(<Image {...defaultProps} kind={RepositoryKind.Helm} />);
    const image = screen.getByAltText('alt image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'https://localhost:8000/static/media/placeholder_pkg_helm.png');
  });

  it('renders OLM operator icon', () => {
    render(<Image {...defaultProps} kind={RepositoryKind.OLM} />);
    const image = screen.getByAltText('alt image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'https://localhost:8000/static/media/placeholder_pkg_olm.png');
  });

  it('renders OPA policies icon', () => {
    render(<Image {...defaultProps} kind={RepositoryKind.OPA} />);
    const image = screen.getByAltText('alt image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'https://localhost:8000/static/media/placeholder_pkg_opa.png');
  });

  it('renders Falco rules icon', () => {
    render(<Image {...defaultProps} kind={RepositoryKind.Falco} />);
    const image = screen.getByAltText('alt image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'https://localhost:8000/static/media/placeholder_pkg_falco.png');
  });

  it('renders Tinkerbell actions icon', () => {
    render(<Image {...defaultProps} kind={RepositoryKind.TBAction} />);
    const image = screen.getByAltText('alt image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'https://localhost:8000/static/media/placeholder_pkg_tbaction.png');
  });

  it('renders Krew kubectl plugin icon', () => {
    render(<Image {...defaultProps} kind={RepositoryKind.Krew} />);
    const image = screen.getByAltText('alt image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'https://localhost:8000/static/media/placeholder_pkg_krew.png');
  });

  it('renders Tekton task icon', () => {
    render(<Image {...defaultProps} kind={RepositoryKind.TektonTask} />);
    const image = screen.getByAltText('alt image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'https://localhost:8000/static/media/placeholder_pkg_tekton-task.png');
  });

  it('renders KEDA scaler icon', () => {
    render(<Image {...defaultProps} kind={RepositoryKind.KedaScaler} />);
    const image = screen.getByAltText('alt image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'https://localhost:8000/static/media/placeholder_pkg_keda-scaler.png');
  });

  it('renders CoreDNS icon', () => {
    render(<Image {...defaultProps} kind={RepositoryKind.CoreDNS} />);
    const image = screen.getByAltText('alt image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'https://localhost:8000/static/media/placeholder_pkg_coredns.png');
  });

  it('renders Keptn icon', () => {
    render(<Image {...defaultProps} kind={RepositoryKind.Keptn} />);
    const image = screen.getByAltText('alt image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'https://localhost:8000/static/media/placeholder_pkg_keptn.png');
  });

  it('renders Tekton pipeline icon', () => {
    render(<Image {...defaultProps} kind={RepositoryKind.TektonPipeline} />);
    const image = screen.getByAltText('alt image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'https://localhost:8000/static/media/placeholder_pkg_tekton-task.png');
  });

  it('renders Container icon', () => {
    render(<Image {...defaultProps} kind={RepositoryKind.Container} />);
    const image = screen.getByAltText('alt image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'https://localhost:8000/static/media/placeholder_pkg_container.png');
  });

  it('renders Kubewarden icon', () => {
    render(<Image {...defaultProps} kind={RepositoryKind.Kubewarden} />);
    const image = screen.getByAltText('alt image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'https://localhost:8000/static/media/placeholder_pkg_kubewarden.png');
  });

  it('renders Gatekeeper icon', () => {
    render(<Image {...defaultProps} kind={RepositoryKind.Gatekeeper} />);
    const image = screen.getByAltText('alt image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'https://localhost:8000/static/media/placeholder_pkg_gatekeeper.png');
  });

  it('renders Kyverno icon', () => {
    render(<Image {...defaultProps} kind={RepositoryKind.Kyverno} />);
    const image = screen.getByAltText('alt image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'https://localhost:8000/static/media/placeholder_pkg_kyverno.png');
  });

  it('renders Knative client plugin icon', () => {
    render(<Image {...defaultProps} kind={RepositoryKind.KnativeClientPlugin} />);
    const image = screen.getByAltText('alt image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'https://localhost:8000/static/media/placeholder_pkg_knative.png');
  });

  it('renders Backstage plugin icon', () => {
    render(<Image {...defaultProps} kind={RepositoryKind.Backstage} />);
    const image = screen.getByAltText('alt image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'https://localhost:8000/static/media/placeholder_pkg_backstage.png');
  });

  it('renders KCL icon', () => {
    render(<Image {...defaultProps} kind={RepositoryKind.KCL} />);
    const image = screen.getByAltText('alt image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'https://localhost:8000/static/media/placeholder_pkg_kcl.png');
  });

  it('renders Headlamp icon', () => {
    render(<Image {...defaultProps} kind={RepositoryKind.Headlamp} />);
    const image = screen.getByAltText('alt image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'https://localhost:8000/static/media/placeholder_pkg_headlamp.png');
  });

  it('renders Inspektor Gadget icon', () => {
    render(<Image {...defaultProps} kind={RepositoryKind.InspektorGadget} />);
    const image = screen.getByAltText('alt image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'https://localhost:8000/static/media/placeholder_pkg_inspektor-gadget.png');
  });

  it('renders Tekton stepaction icon', () => {
    render(<Image {...defaultProps} kind={RepositoryKind.TektonStepAction} />);
    const image = screen.getByAltText('alt image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'https://localhost:8000/static/media/placeholder_pkg_tekton-task.png');
  });

  it('renders Meshery Design icon', () => {
    render(<Image {...defaultProps} kind={RepositoryKind.MesheryDesign} />);
    const image = screen.getByAltText('alt image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'https://localhost:8000/static/media/placeholder_pkg_meshery.png');
  });

  it('renders OpenCost plugin icon', () => {
    render(<Image {...defaultProps} kind={RepositoryKind.OpenCost} />);
    const image = screen.getByAltText('alt image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'https://localhost:8000/static/media/placeholder_pkg_opencost.png');
  });

  it('renders Radius recipe icon', () => {
    render(<Image {...defaultProps} kind={RepositoryKind.RadiusRecipe} />);
    const image = screen.getByAltText('alt image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveProperty('src', 'https://localhost:8000/static/media/placeholder_pkg_radius.png');
  });

  it('renders placeholder icon', () => {
    render(<Image {...defaultProps} placeholderIcon={<>icon</>} />);
    expect(screen.getByText('icon')).toBeInTheDocument();
  });

  describe('renders placeholder', () => {
    it('when imageId and kind are not defined', () => {
      render(<Image {...defaultProps} />);
      const image = screen.getByAltText('alt image');
      expect(image).toBeInTheDocument();
      expect(image).toHaveProperty('src', 'https://localhost:8000/static/media/package_placeholder.svg');
    });

    it('when kind is defferent to current ones', () => {
      render(<Image {...defaultProps} kind={30 as RepositoryKind} />);
      const image = screen.getByAltText('alt image');
      expect(image).toBeInTheDocument();
      expect(image).toHaveProperty('src', 'https://localhost:8000/static/media/package_placeholder.svg');
    });

    it('on image error', async () => {
      render(<Image {...defaultProps} imageId="imgID" />);
      const image = screen.getByAltText(defaultProps.alt);
      expect(screen.getByAltText(defaultProps.alt)).toHaveProperty('src', 'https://localhost:8000/image/imgID');

      fireEvent.error(image);

      const placeholder = await screen.findByTestId('placeholderImg');
      expect(placeholder).toBeInTheDocument();
      expect(placeholder).toHaveProperty('src', 'https://localhost:8000/static/media/package_placeholder.svg');
    });
  });
});
