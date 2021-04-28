import { isNull, isUndefined } from 'lodash';
import React, { useState } from 'react';
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
  max-width: calc(100% - 8px);
  max-height: calc(100% - 8px);
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
          return '/static/media/placeholder_pkg_tekton-task.png';
        case RepositoryKind.KedaScaler:
          return '/static/media/placeholder_pkg_keda-scaler.png';
        case RepositoryKind.CoreDNS:
          return '/static/media/placeholder_pkg_coredns.png';
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
            <StyledImage alt={props.alt} src={`${props.baseUrl}${getPlaceholder()}`} />
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
