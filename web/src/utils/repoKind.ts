import { RepositoryKind } from '../types';

const getRepoKind = (repoName: string): RepositoryKind | null => {
  switch (repoName) {
    case 'helm':
      return RepositoryKind.Helm;
    case 'helm-plugin':
      return RepositoryKind.HelmPlugin;
    case 'falco':
      return RepositoryKind.Falco;
    case 'opa':
      return RepositoryKind.OPA;
    case 'olm':
      return RepositoryKind.OLM;
    case 'tbaction':
      return RepositoryKind.TBAction;
    case 'krew':
      return RepositoryKind.Krew;
    case 'tekton-task':
      return RepositoryKind.TektonTask;
    case 'keda-scaler':
      return RepositoryKind.KedaScaler;
    case 'coredns':
      return RepositoryKind.CoreDNS;
    case 'keptn':
      return RepositoryKind.Keptn;
    case 'tekton-pipeline':
      return RepositoryKind.TektonPipeline;
    case 'container':
      return RepositoryKind.Container;
    case 'kubewarden':
      return RepositoryKind.Kubewarden;
    case 'gatekeeper':
      return RepositoryKind.Gatekeeper;
    case 'kyverno':
      return RepositoryKind.Kyverno;
    case 'knative-client-plugin':
      return RepositoryKind.KnativeClientPlugin;
    case 'backstage':
      return RepositoryKind.Backstage;
    case 'argo-template':
      return RepositoryKind.ArgoTemplate;
    case 'kubearmor':
      return RepositoryKind.KubeArmor;
    case 'kcl':
      return RepositoryKind.KCL;
    case 'headlamp':
      return RepositoryKind.Headlamp;
    case 'inspektor-gadget':
      return RepositoryKind.InspektorGadget;
    case 'tekton-stepaction':
      return RepositoryKind.TektonStepAction;
    case 'meshery':
      return RepositoryKind.MesheryDesign;
    case 'opencost':
      return RepositoryKind.OpenCost;
    case 'radius':
      return RepositoryKind.RadiusRecipe;
    default:
      return null;
  }
};

const getRepoKindName = (repoKind: RepositoryKind): string | null => {
  switch (repoKind) {
    case RepositoryKind.Helm:
      return 'helm';
    case RepositoryKind.HelmPlugin:
      return 'helm-plugin';
    case RepositoryKind.Falco:
      return 'falco';
    case RepositoryKind.OPA:
      return 'opa';
    case RepositoryKind.OLM:
      return 'olm';
    case RepositoryKind.TBAction:
      return 'tbaction';
    case RepositoryKind.Krew:
      return 'krew';
    case RepositoryKind.TektonTask:
      return 'tekton-task';
    case RepositoryKind.KedaScaler:
      return 'keda-scaler';
    case RepositoryKind.CoreDNS:
      return 'coredns';
    case RepositoryKind.Keptn:
      return 'keptn';
    case RepositoryKind.TektonPipeline:
      return 'tekton-pipeline';
    case RepositoryKind.Container:
      return 'container';
    case RepositoryKind.Kubewarden:
      return 'kubewarden';
    case RepositoryKind.Gatekeeper:
      return 'gatekeeper';
    case RepositoryKind.Kyverno:
      return 'kyverno';
    case RepositoryKind.KnativeClientPlugin:
      return 'knative-client-plugin';
    case RepositoryKind.Backstage:
      return 'backstage';
    case RepositoryKind.ArgoTemplate:
      return 'argo-template';
    case RepositoryKind.KubeArmor:
      return 'kubearmor';
    case RepositoryKind.KCL:
      return 'kcl';
    case RepositoryKind.Headlamp:
      return 'headlamp';
    case RepositoryKind.InspektorGadget:
      return 'inspektor-gadget';
    case RepositoryKind.TektonStepAction:
      return 'tekton-stepaction';
    case RepositoryKind.MesheryDesign:
      return 'meshery';
    case RepositoryKind.OpenCost:
      return 'opencost';
    case RepositoryKind.RadiusRecipe:
      return 'radius';
    default:
      return null;
  }
};

export { getRepoKind, getRepoKindName };
