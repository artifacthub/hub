import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import { BsDot } from 'react-icons/bs';
import { FaAward } from 'react-icons/fa';

import { RepositoryKind, Signature } from '../../types';
import ElementWithTooltip from './ElementWithTooltip';
import Label from './Label';
import styles from './SignedBadge.module.css';

interface Props {
  signed: null | boolean;
  signatures?: Signature[];
  className?: string;
  repositoryKind?: RepositoryKind;
}

interface Messages {
  [key: string]: JSX.Element;
}

const signMessages: Messages = {
  [Signature.Prov]: <>This chart has a provenance file</>,
  [Signature.Cosign]: (
    <span>
      This chart has been signed with <span className="fw-bold">cosign</span> (Sigstore)
    </span>
  ),
};

const SignedBadge = (props: Props) => {
  const getTooltipMessage = (): JSX.Element | string => {
    if (props.signatures) {
      if (props.signatures.length === 1) {
        return signMessages[props.signatures[0]];
      } else {
        return (
          <>
            {props.signatures.map((sign: Signature, index: number) => {
              return (
                <div
                  className={classnames('d-flex flex-row align-items-start', { 'mt-1': index !== 0 })}
                  key={`message_${sign}`}
                >
                  <BsDot className={`mt-1 position-relative ${styles.iconDot}`} />
                  <div className="text-start">{signMessages[sign]}</div>
                </div>
              );
            })}
          </>
        );
      }
    }

    return '';
  };

  const message = getTooltipMessage();

  return (
    <ElementWithTooltip
      active={props.signed}
      className={props.className}
      element={<Label text="Signed" icon={<FaAward />} />}
      tooltipWidth={340}
      tooltipMessage={message}
      visibleTooltip={
        !isUndefined(props.repositoryKind) && props.repositoryKind === RepositoryKind.Helm && message !== ''
      }
    />
  );
};

export default SignedBadge;
