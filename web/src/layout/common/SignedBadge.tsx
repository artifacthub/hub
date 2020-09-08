import isUndefined from 'lodash/isUndefined';
import React from 'react';
import { FaAward } from 'react-icons/fa';

import { RepositoryKind } from '../../types';
import Label from './Label';
import LabelWithTooltip from './LabelWithTooltip';

interface Props {
  signed: null | boolean;
  className?: string;
  repositoryKind?: RepositoryKind;
}

const SignedBadge = (props: Props) => (
  <LabelWithTooltip
    active={props.signed}
    className={props.className}
    label={<Label text="Signed" icon={<FaAward />} labelStyle="success" />}
    tooltipMessage="This chart has a provenance file"
    visibleTooltip={!isUndefined(props.repositoryKind) && props.repositoryKind === RepositoryKind.Helm}
  />
);

export default SignedBadge;
