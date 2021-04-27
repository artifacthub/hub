import isUndefined from 'lodash/isUndefined';
import React from 'react';

import { RepositoryKind } from '../../types';

interface Props {
  kind: RepositoryKind;
  className?: string;
  type?: 'default' | 'white';
}

const ICONS = {
  [RepositoryKind.Helm]: {
    default: '/static/media/helm-chart.svg',
    white: '/static/media/helm-chart-light.svg',
  },
  [RepositoryKind.Falco]: {
    default: '/static/media/falco-rules.svg',
    white: '/static/media/falco-rules-light.svg',
  },
  [RepositoryKind.OPA]: {
    default: '/static/media/opa-policies.svg',
    white: '/static/media/opa-policies-light.svg',
  },
  [RepositoryKind.OLM]: {
    default: '/static/media/olm-operators.svg',
    white: '/static/media/olm-operators-light.svg',
  },
  [RepositoryKind.TBAction]: {
    default: '/static/media/tinkerbell-actions.svg',
    white: '/static/media/tinkerbell-actions-light.svg',
  },
  [RepositoryKind.Krew]: {
    default: '/static/media/krew-plugins.svg',
    white: '/static/media/krew-plugins-light.svg',
  },
  [RepositoryKind.HelmPlugin]: {
    default: '/static/media/helm-chart.svg',
    white: '/static/media/helm-chart-light.svg',
  },
  [RepositoryKind.TektonTask]: {
    default: '/static/media/tekton-pkg.svg',
    white: '/static/media/tekton-pkg-light.svg',
  },
  [RepositoryKind.KedaScaler]: {
    default: '/static/media/keda-scaler.svg',
    white: '/static/media/keda-scaler-light.svg',
  },
  [RepositoryKind.CoreDNS]: {
    default: '/static/media/coredns-plugin.svg',
    white: '/static/media/coredns-plugin-light.svg',
  },
};

const RepositoryIcon = (props: Props) => {
  if (!isUndefined(props.type) && props.type === 'white') {
    return <img alt="Icon" src={ICONS[props.kind][props.type]} className={props.className} />;
  } else {
    return (
      <>
        <img alt="Icon" src={ICONS[props.kind].default} className={`${props.className} iconLight`} />
        <img alt="Icon" src={ICONS[props.kind].white} className={`${props.className} iconDark`} />
      </>
    );
  }
};

export default RepositoryIcon;
