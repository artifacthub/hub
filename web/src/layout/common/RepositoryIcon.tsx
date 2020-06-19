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
    white: '/static/media/helm-chart-white.svg',
  },
  [RepositoryKind.Falco]: {
    default: '/static/media/falco-rules.svg',
    white: '/static/media/falco-rules-white.svg',
  },
  [RepositoryKind.OPA]: {
    default: '/static/media/opa-policies.svg',
    white: '/static/media/opa-policies-white.svg',
  },
  [RepositoryKind.OLM]: {
    default: '/static/media/olm-operators.svg',
    white: '/static/media/olm-operators-white.svg',
  },
};

const RepositoryIcon = (props: Props) => {
  let src = ICONS[props.kind].default;
  if (!isUndefined(props.type)) {
    src = ICONS[props.kind][props.type];
  }

  return <img alt="Icon" src={src} className={props.className} />;
};

export default RepositoryIcon;
