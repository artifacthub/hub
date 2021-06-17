import classNames from 'classnames';
import { isNull, isUndefined } from 'lodash';
import React, { useState } from 'react';
import { FaKey } from 'react-icons/fa';

import { HelmChartSignKey, RepositoryKind } from '../../types';
import ElementWithTooltip from '../common/ElementWithTooltip';
import Modal from '../common/Modal';
import CommandBlock from './installation/CommandBlock';
import styles from './SignKeyInfo.module.css';

interface Props {
  signed: boolean | null;
  repoKind: RepositoryKind;
  signKey?: HelmChartSignKey;
}

const SignKeyInfo = (props: Props) => {
  const [openStatus, setOpenStatus] = useState<boolean>(false);

  if (isNull(props.signed) || !props.signed || props.repoKind !== RepositoryKind.Helm) return null;

  return (
    <>
      <ElementWithTooltip
        element={
          <button
            data-testid="signKeyBtn"
            className={classNames('btn btn-outline-secondary btn-sm ml-2', styles.btn, {
              disabled: isUndefined(props.signKey),
            })}
            onClick={() => setOpenStatus(true)}
            aria-label="Open modal"
            aria-disabled={isUndefined(props.signKey)}
          >
            <small className="d-flex flex-row align-items-center text-uppercase">
              <FaKey />
              <span className="ml-2 font-weight-bold">View key info</span>
            </small>
          </button>
        }
        visibleTooltip={isUndefined(props.signKey)}
        tooltipClassName={styles.tooltip}
        tooltipMessage="The publisher hasn't provided any information for this key yet"
        active
      />

      {!isUndefined(props.signKey) && (
        <Modal
          modalDialogClassName={styles.modalDialog}
          header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Sign key information</div>}
          onClose={() => setOpenStatus(false)}
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
