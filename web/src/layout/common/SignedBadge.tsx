import isUndefined from 'lodash/isUndefined';
import React from 'react';
import { FaAward } from 'react-icons/fa';

import { RepositoryKind } from '../../types';
import ElementWithTooltip from './ElementWithTooltip';
import Label from './Label';

interface Props {
  signed: null | boolean;
  className?: string;
  repositoryKind?: RepositoryKind;
}

const SignedBadge = (props: Props) => (
  <ElementWithTooltip
    active={props.signed}
    className={props.className}
    element={<Label text="Signed" icon={<FaAward />} labelStyle="success" />}
    tooltipMessage="This chart has a provenance file"
    visibleTooltip={!isUndefined(props.repositoryKind) && props.repositoryKind === RepositoryKind.Helm}
  />
);

export default SignedBadge;
