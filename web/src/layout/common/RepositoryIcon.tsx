import isUndefined from 'lodash/isUndefined';

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
  [RepositoryKind.Keptn]: {
    default: '/static/media/keptn-integrations.svg',
    white: '/static/media/keptn-integrations-light.svg',
  },
  [RepositoryKind.TektonPipeline]: {
    default: '/static/media/tekton-pkg.svg',
    white: '/static/media/tekton-pkg-light.svg',
  },
  [RepositoryKind.Container]: {
    default: '/static/media/container.svg',
    white: '/static/media/container-light.svg',
  },
  [RepositoryKind.Kubewarden]: {
    default: '/static/media/kubewarden.svg',
    white: '/static/media/kubewarden-light.svg',
  },
  [RepositoryKind.Gatekeeper]: {
    default: '/static/media/gatekeeper.svg',
    white: '/static/media/gatekeeper-light.svg',
  },
  [RepositoryKind.Kyverno]: {
    default: '/static/media/kyverno.svg',
    white: '/static/media/kyverno-light.svg',
  },
  [RepositoryKind.KnativeClientPlugin]: {
    default: '/static/media/knative.svg',
    white: '/static/media/knative-light.svg',
  },
  [RepositoryKind.Backstage]: {
    default: '/static/media/backstage.svg',
    white: '/static/media/backstage-light.svg',
  },
  [RepositoryKind.ArgoTemplate]: {
    default: '/static/media/argo.svg',
    white: '/static/media/argo-light.svg',
  },
  [RepositoryKind.KubeArmor]: {
    default: '/static/media/kubearmor.svg',
    white: '/static/media/kubearmor-light.svg',
  },
  [RepositoryKind.KCL]: {
    default: '/static/media/kcl.svg',
    white: '/static/media/kcl-light.svg',
  },
  [RepositoryKind.Headlamp]: {
    default: '/static/media/headlamp.svg',
    white: '/static/media/headlamp-light.svg',
  },
  [RepositoryKind.InspektorGadget]: {
    default: '/static/media/inspektor-gadget.svg',
    white: '/static/media/inspektor-gadget-light.svg',
  },
  [RepositoryKind.TektonStepAction]: {
    default: '/static/media/tekton-pkg.svg',
    white: '/static/media/tekton-pkg-light.svg',
  },
  [RepositoryKind.MesheryDesign]: {
    default: '/static/media/meshery.svg',
    white: '/static/media/meshery-light.svg',
  },
  [RepositoryKind.OpenCost]: {
    default: '/static/media/opencost.svg',
    white: '/static/media/opencost-light.svg',
  },
  [RepositoryKind.RadiusRecipe]: {
    default: '/static/media/radius.svg',
    white: '/static/media/radius-light.svg',
  },
};

const RepositoryIcon = (props: Props) => {
  if (isUndefined(ICONS[props.kind])) {
    return <></>;
  } else if (!isUndefined(props.type) && props.type === 'white') {
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
