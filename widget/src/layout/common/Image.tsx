import { isNull, isUndefined } from 'lodash';
import { useState } from 'react';
import styled from 'styled-components';

import { RepositoryKind } from '../../types';

interface Props {
  baseUrl: string;
  imageId?: string | null;
  alt: string;
  placeholderIcon?: JSX.Element;
  kind?: RepositoryKind;
}

const PLACEHOLDER_SRC = '/static/media/package_placeholder.svg';

const StyledImage = styled('img')`
  max-width: 100%;
  max-height: 100%;
`;

const Image = (props: Props) => {
  const [error, setError] = useState(false);

  const getSrc = () => {
    return `${props.baseUrl}/image/${props.imageId}`;
  };

  const getPlaceholder = (): string => {
    if (isUndefined(props.kind)) {
      return PLACEHOLDER_SRC;
    } else {
      switch (props.kind) {
        case RepositoryKind.Helm:
        case RepositoryKind.HelmPlugin:
          return '/static/media/placeholder_pkg_helm.png';
        case RepositoryKind.OLM:
          return '/static/media/placeholder_pkg_olm.png';
        case RepositoryKind.OPA:
          return '/static/media/placeholder_pkg_opa.png';
        case RepositoryKind.Falco:
          return '/static/media/placeholder_pkg_falco.png';
        case RepositoryKind.TBAction:
          return '/static/media/placeholder_pkg_tbaction.png';
        case RepositoryKind.Krew:
          return '/static/media/placeholder_pkg_krew.png';
        case RepositoryKind.TektonTask:
        case RepositoryKind.TektonPipeline:
        case RepositoryKind.TektonStepAction:
          return '/static/media/placeholder_pkg_tekton-task.png';
        case RepositoryKind.KedaScaler:
          return '/static/media/placeholder_pkg_keda-scaler.png';
        case RepositoryKind.CoreDNS:
          return '/static/media/placeholder_pkg_coredns.png';
        case RepositoryKind.Keptn:
          return '/static/media/placeholder_pkg_keptn.png';
        case RepositoryKind.Container:
          return '/static/media/placeholder_pkg_container.png';
        case RepositoryKind.Kubewarden:
          return '/static/media/placeholder_pkg_kubewarden.png';
        case RepositoryKind.Gatekeeper:
          return '/static/media/placeholder_pkg_gatekeeper.png';
        case RepositoryKind.Kyverno:
          return '/static/media/placeholder_pkg_kyverno.png';
        case RepositoryKind.KnativeClientPlugin:
          return '/static/media/placeholder_pkg_knative.png';
        case RepositoryKind.Backstage:
          return '/static/media/placeholder_pkg_backstage.png';
        case RepositoryKind.ArgoTemplate:
          return '/static/media/placeholder_pkg_argo.png';
        case RepositoryKind.KubeArmor:
          return '/static/media/placeholder_pkg_kubearmor.png';
        case RepositoryKind.KCL:
          return '/static/media/placeholder_pkg_kcl.png';
        case RepositoryKind.Headlamp:
          return '/static/media/placeholder_pkg_headlamp.png';
        case RepositoryKind.InspektorGadget:
          return '/static/media/placeholder_pkg_inspektor-gadget.png';
        case RepositoryKind.MesheryDesign:
          return '/static/media/placeholder_pkg_meshery.png';
        case RepositoryKind.OpenCost:
          return '/static/media/placeholder_pkg_opencost.png';
        case RepositoryKind.RadiusRecipe:
          return '/static/media/placeholder_pkg_radius.png';
        default:
          return PLACEHOLDER_SRC;
      }
    }
  };

  return (
    <>
      {error || isNull(props.imageId) || isUndefined(props.imageId) ? (
        <>
          {isUndefined(props.placeholderIcon) ? (
            <StyledImage data-testid="placeholderImg" alt={props.alt} src={`${props.baseUrl}${getPlaceholder()}`} />
          ) : (
            <>{props.placeholderIcon}</>
          )}
        </>
      ) : (
        <StyledImage
          alt={props.alt}
          srcSet={`${getSrc()}@1x 1x, ${getSrc()}@2x 2x, ${getSrc()}@3x 3x, ${getSrc()}@4x 4x`}
          src={getSrc()}
          onError={() => setError(true)}
        />
      )}
    </>
  );
};

export default Image;
