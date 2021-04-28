import React from 'react';

import { RepositoryKind } from '../../types';
import SVGIcons from './SVGIcons';

interface Props {
  baseUrl: string;
  kind: RepositoryKind;
  className?: string;
}

interface IconsList {
  [key: number]: JSX.Element;
}

const ICONS: IconsList = {
  [RepositoryKind.Helm]: <SVGIcons name="helm" />,
  [RepositoryKind.HelmPlugin]: <SVGIcons name="helm-plugin" />,
  [RepositoryKind.OPA]: <SVGIcons name="opa" />,
  [RepositoryKind.OLM]: <SVGIcons name="olm" />,
  [RepositoryKind.Falco]: <SVGIcons name="falco" />,
  [RepositoryKind.TektonTask]: <SVGIcons name="tekton" />,
  [RepositoryKind.TBAction]: <SVGIcons name="tinkerbell" />,
  [RepositoryKind.Krew]: <SVGIcons name="krew" />,
  [RepositoryKind.KedaScaler]: <SVGIcons name="keda" />,
  [RepositoryKind.CoreDNS]: <SVGIcons name="coredns" />,
};

const RepositoryIcon = (props: Props) => <div className={props.className}>{ICONS[props.kind]}</div>;

export default RepositoryIcon;
