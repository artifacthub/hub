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
  [RepositoryKind.Keptn]: <SVGIcons name="keptn" />,
  [RepositoryKind.TektonPipeline]: <SVGIcons name="tekton" />,
  [RepositoryKind.Container]: <SVGIcons name="container" />,
  [RepositoryKind.Kubewarden]: <SVGIcons name="kubewarden" />,
  [RepositoryKind.Gatekeeper]: <SVGIcons name="gatekeeper" />,
  [RepositoryKind.Kyverno]: <SVGIcons name="kyverno" />,
  [RepositoryKind.KnativeClientPlugin]: <SVGIcons name="knative" />,
  [RepositoryKind.Backstage]: <SVGIcons name="backstage" />,
  [RepositoryKind.ArgoTemplate]: <SVGIcons name="argo" />,
  [RepositoryKind.KubeArmor]: <SVGIcons name="kubearmor" />,
  [RepositoryKind.KCL]: <SVGIcons name="kcl" />,
  [RepositoryKind.Headlamp]: <SVGIcons name="headlamp" />,
  [RepositoryKind.InspektorGadget]: <SVGIcons name="inspektor-gadget" />,
  [RepositoryKind.TektonStepAction]: <SVGIcons name="tekton" />,
  [RepositoryKind.MesheryDesign]: <SVGIcons name="meshery" />,
  [RepositoryKind.OpenCost]: <SVGIcons name="opencost" />,
  [RepositoryKind.RadiusRecipe]: <SVGIcons name="radius" />,
};

const RepositoryIcon = (props: Props) => (
  <div data-testid="repoIcon" className={props.className}>
    {ICONS[props.kind]}
  </div>
);

export default RepositoryIcon;
