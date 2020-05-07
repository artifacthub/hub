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
    default: '/static/media/helm.svg',
    white: '/static/media/helm-white.svg',
  },
  [PackageKind.Falco]: {
    default: '/static/media/falco.svg',
    white: '/static/media/falco-white.svg',
  },
  [PackageKind.Opa]: {
    default: '/static/media/opa.svg',
    white: '/static/media/opa-white.svg',
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
