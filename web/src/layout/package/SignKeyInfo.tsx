import classNames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { useCallback, useEffect, useState } from 'react';
import { FaKey } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';

import { HelmChartSignKey, RepositoryKind, Signature } from '../../types';
import ElementWithTooltip from '../common/ElementWithTooltip';
import Modal from '../common/Modal';
import CommandBlock from './installation/CommandBlock';
import styles from './SignKeyInfo.module.css';

interface Props {
  visibleKeyInfo: boolean;
  signed: boolean | null;
  repoKind: RepositoryKind;
  signatures?: Signature[];
  signKey?: HelmChartSignKey;
}

const SignKeyInfo = (props: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openStatus, setOpenStatus] = useState<boolean>(false);

  const onClose = () => {
    setOpenStatus(false);
    navigate('', {
      state: location.state,
      replace: true,
    });
  };

  const onOpen = useCallback(() => {
    if (props.signed && props.repoKind === RepositoryKind.Helm && !isUndefined(props.signKey)) {
      setOpenStatus(true);
      navigate('?modal=key-info', {
        state: location.state,
        replace: true,
      });
    }
  }, [props.repoKind, props.signKey, props.signed]);

  useEffect(() => {
    if (props.visibleKeyInfo && !openStatus) {
      onOpen();
    }
  }, []);

  const onlyCosignSignature =
    !isUndefined(props.signatures) && props.signatures.length === 1 && props.signatures[0] === Signature.Cosign;

  if (
    isNull(props.signed) ||
    !props.signed ||
    props.repoKind !== RepositoryKind.Helm ||
    (isUndefined(props.signKey) && onlyCosignSignature)
  )
    return null;

  return (
    <>
      <ElementWithTooltip
        element={
          <button
            className={classNames('btn btn-outline-secondary btn-sm ms-2 px-2 py-0', styles.btn, {
              disabled: isUndefined(props.signKey),
            })}
            onClick={onOpen}
            aria-label="Open sign key modal"
            aria-disabled={isUndefined(props.signKey)}
          >
            <small className="d-flex flex-row align-items-center text-uppercase">
              <FaKey />
              <span className="ms-2 fw-bold">View key info</span>
            </small>
          </button>
        }
        visibleTooltip={isUndefined(props.signKey)}
        tooltipWidth={230}
        tooltipMessage="The publisher hasn't provided any information for this key yet"
        active
      />

      {!isUndefined(props.signKey) && (
        <Modal
          modalDialogClassName={styles.modalDialog}
          header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Sign key information</div>}
          onClose={onClose}
          open={openStatus}
        >
          <div className="mx-0 mx-md-3 my-1 mw-100">
            <CommandBlock language="text" command={props.signKey.fingerprint} title="Fingerprint" />

            <CommandBlock language="text" command={props.signKey.url} title="URL" />
          </div>
        </Modal>
      )}
    </>
  );
};

export default SignKeyInfo;
