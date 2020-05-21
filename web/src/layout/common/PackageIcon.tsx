import isUndefined from 'lodash/isUndefined';
import React from 'react';

import { PackageKind } from '../../types';

interface Props {
  kind: PackageKind;
  className?: string;
  type?: 'default' | 'white';
}

const ICONS = {
  [PackageKind.Chart]: {
    default: '/static/media/helm-chart.svg',
    white: '/static/media/helm-chart-white.svg',
  },
  [PackageKind.Falco]: {
    default: '/static/media/falco-rules.svg',
    white: '/static/media/falco-rules-white.svg',
  },
  [PackageKind.Opa]: {
    default: '/static/media/opa-policies.svg',
    white: '/static/media/opa-policies-white.svg',
  },
};

const PackageIcon = (props: Props) => {
  let src = ICONS[props.kind].default;
  if (!isUndefined(props.type)) {
    src = ICONS[props.kind][props.type];
  }

  return <img alt="Icon" src={src} className={props.className} />;
};

export default PackageIcon;
