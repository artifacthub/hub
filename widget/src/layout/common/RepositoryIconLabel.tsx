import { isUndefined } from 'lodash';
import styled from 'styled-components';

import { RepositoryKind } from '../../types';
import RepositoryIcon from './RepositoryIcon';

interface Props {
  baseUrl: string;
  kind: RepositoryKind;
  theme: string;
}

export interface RepoKindDef {
  kind: RepositoryKind;
  name: string;
}

const REPOSITORY_KINDS: RepoKindDef[] = [
  {
    kind: RepositoryKind.Helm,
    name: 'Helm chart',
  },
  {
    kind: RepositoryKind.HelmPlugin,
    name: 'Helm plugin',
  },
  {
    kind: RepositoryKind.Falco,
    name: 'Falco rules',
  },
  {
    kind: RepositoryKind.OPA,
    name: 'OPA policies',
  },
  {
    kind: RepositoryKind.OLM,
    name: 'OLM operator',
  },
  {
    kind: RepositoryKind.TBAction,
    name: 'Tinkerbell action',
  },
  {
    kind: RepositoryKind.Krew,
    name: 'Krew kubectl plugin',
  },
  {
    kind: RepositoryKind.TektonTask,
    name: 'Tekton task',
  },
  {
    kind: RepositoryKind.KedaScaler,
    name: 'KEDA scaler',
  },
  {
    kind: RepositoryKind.CoreDNS,
    name: 'CoreDNS plugin',
  },
  {
    kind: RepositoryKind.Keptn,
    name: 'Keptn integration',
  },
  {
    kind: RepositoryKind.TektonPipeline,
    name: 'Tekton pipeline',
  },
  {
    kind: RepositoryKind.Container,
    name: 'Container image',
  },
  {
    kind: RepositoryKind.Kubewarden,
    name: 'Kubewarden policy',
  },
  {
    kind: RepositoryKind.Gatekeeper,
    name: 'Gatekeeper policy',
  },
  {
    kind: RepositoryKind.Kyverno,
    name: 'Kyverno policy',
  },
  {
    kind: RepositoryKind.KnativeClientPlugin,
    name: 'Knative client plugin',
  },
  {
    kind: RepositoryKind.Backstage,
    name: 'Backstage plugin',
  },
  {
    kind: RepositoryKind.ArgoTemplate,
    name: 'Argo templates',
  },
  {
    kind: RepositoryKind.KubeArmor,
    name: 'KubeArmor policies',
  },
  {
    kind: RepositoryKind.KCL,
    name: 'KCL module',
  },
  {
    kind: RepositoryKind.Headlamp,
    name: 'Headlamp plugin',
  },
  {
    kind: RepositoryKind.InspektorGadget,
    name: 'Inspektor Gadget',
  },
  {
    kind: RepositoryKind.TektonStepAction,
    name: 'Tekton stepaction',
  },
  {
    kind: RepositoryKind.MesheryDesign,
    name: 'Meshery design',
  },
  {
    kind: RepositoryKind.OpenCost,
    name: 'OpenCost plugin',
  },
  {
    kind: RepositoryKind.RadiusRecipe,
    name: 'Radius recipe',
  },
];

const Wrapper = styled('span')`
  background-color: var(--bg-badge);
  border: 1px solid var(--color-ah-black-15);
  display: flex;
  align-items: center;
  padding: 0.25em 0.4em;
  font-size: 75%;
  display: flex;
  align-items: center;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
`;

const RepoName = styled('div')`
  margin-left: 0.25rem;
`;

const Icon = styled(RepositoryIcon)`
  height: 12px;

  & svg:not(:root) {
    width: auto;
    height: 100%;
  }

  &.grayedOut {
    filter: grayscale(1) brightness(1.5);
  }
`;

const RepositoryIconLabel = (props: Props) => {
  const repo = REPOSITORY_KINDS.find((repoKind: RepoKindDef) => repoKind.kind === props.kind);

  if (isUndefined(repo)) return null;

  return (
    <Wrapper>
      <div>
        <Icon kind={props.kind} baseUrl={props.baseUrl} className={props.theme === 'dark' ? 'grayedOut' : ''} />
      </div>
      <RepoName>{repo.name}</RepoName>
    </Wrapper>
  );
};

export default RepositoryIconLabel;
