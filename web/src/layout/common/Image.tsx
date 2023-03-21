import classnames from 'classnames';
import { isUndefined } from 'lodash';
import isNull from 'lodash/isNull';
import { useRef, useState } from 'react';

import { RepositoryKind } from '../../types';

interface Props {
  imageId?: string | null;
  alt: string;
  className?: string;
  classNameForSquare?: string;
  placeholderIcon?: JSX.Element;
  kind?: RepositoryKind;
}

const PLACEHOLDER_SRC = '/static/media/package_placeholder.svg';

const Image = (props: Props) => {
  const image = useRef<HTMLImageElement | null>(null);
  const [error, setError] = useState(false);
  const [isSquare, setIsSquare] = useState<boolean | undefined>();

  const getSrc = () => {
    return `/image/${props.imageId}`;
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
        default:
          return PLACEHOLDER_SRC;
      }
    }
  };

  const onLoad = () => {
    if (!isNull(image) && image.current) {
      setIsSquare(image.current.width === image.current.height);
    }
  };

  return (
    <>
      {error || isNull(props.imageId) || isUndefined(props.imageId) ? (
        <>
          {isUndefined(props.placeholderIcon) ? (
            <img
              data-testid="placeholderImg"
              alt={props.alt}
              src={getPlaceholder()}
              className={props.className}
              aria-hidden="true"
            />
          ) : (
            <>{props.placeholderIcon}</>
          )}
        </>
      ) : (
        <img
          ref={image}
          alt={props.alt}
          srcSet={`${getSrc()}@1x 1x, ${getSrc()}@2x 2x, ${getSrc()}@3x 3x, ${getSrc()}@4x 4x`}
          src={getSrc()}
          className={classnames(props.className, {
            [props.classNameForSquare as string]:
              !isUndefined(props.classNameForSquare) && !isUndefined(isSquare) && isSquare,
          })}
          onError={() => setError(true)}
          onLoad={onLoad}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default Image;
