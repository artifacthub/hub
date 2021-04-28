import { isUndefined } from 'lodash';
import React from 'react';
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
];

const Wrapper = styled('span')`
  background-color: var(--color-ah-primary-5);
  border: 1px solid var(--color-ah-primary-10);
  border-radius: 50rem;
  display: flex;
  align-items: center;
  padding: 0.1em 0.4em;
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
  height: 15px;

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
        <Icon
          kind={props.kind}
          baseUrl={props.baseUrl}
          theme={props.theme}
          className={props.theme === 'dark' ? 'grayedOut' : ''}
        />
      </div>
      <RepoName>{repo.name}</RepoName>
    </Wrapper>
  );
};

export default RepositoryIconLabel;
