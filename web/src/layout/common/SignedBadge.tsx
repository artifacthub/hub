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

const getMessage = (sign: Signature, repoKind?: RepositoryKind): JSX.Element => {
  if (isUndefined(repoKind)) return <></>;

  let pkgName: string = '';
  switch (repoKind) {
    case RepositoryKind.Helm:
      pkgName = 'chart';
      break;

    case RepositoryKind.Container:
      pkgName = 'container image';
      break;

    case RepositoryKind.Kubewarden:
      pkgName = 'policy';
      break;
  }

  switch (sign) {
    case Signature.Prov:
      return <>This {pkgName} has a provenance file</>;

    case Signature.Cosign:
      return (
        <span>
          This {pkgName} has been signed with <span className="fw-bold">cosign</span> (Sigstore)
        </span>
      );
  }
};

const SIGNED_REPO_KINDS = [RepositoryKind.Helm, RepositoryKind.Container, RepositoryKind.Kubewarden];

const SignedBadge = (props: Props) => {
  const getTooltipMessage = (): JSX.Element | string => {
    if (props.signatures) {
      if (props.signatures.length === 1) {
        return getMessage(props.signatures[0], props.repositoryKind);
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
                  <div className="text-start">{getMessage(sign, props.repositoryKind)}</div>
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
      tooltipWidth={385}
      tooltipMessage={message}
      visibleTooltip={
        !isUndefined(props.repositoryKind) && SIGNED_REPO_KINDS.includes(props.repositoryKind) && message !== ''
      }
    />
  );
};

export default SignedBadge;
