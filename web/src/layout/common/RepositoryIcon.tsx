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
};

const RepositoryIcon = (props: Props) => {
  let src = ICONS[props.kind].default;
  if (!isUndefined(props.type)) {
    src = ICONS[props.kind][props.type];
  }

  return <img alt="Icon" src={src} className={`${props.className} repoIcon`} />;
};

export default RepositoryIcon;
