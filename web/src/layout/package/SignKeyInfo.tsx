import classNames from 'classnames';
import { isNull, isUndefined } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';
import { FaKey } from 'react-icons/fa';
import { useHistory } from 'react-router-dom';

import { HelmChartSignKey, RepositoryKind, SearchFiltersURL } from '../../types';
import ElementWithTooltip from '../common/ElementWithTooltip';
import Modal from '../common/Modal';
import CommandBlock from './installation/CommandBlock';
import styles from './SignKeyInfo.module.css';

interface Props {
  visibleKeyInfo: boolean;
  signed: boolean | null;
  repoKind: RepositoryKind;
  signKey?: HelmChartSignKey;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
}

const SignKeyInfo = (props: Props) => {
  const history = useHistory();
  const [openStatus, setOpenStatus] = useState<boolean>(false);

  const onClose = () => {
    setOpenStatus(false);
    history.replace({
      search: '',
      state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
    });
  };

  const onOpen = useCallback(() => {
    if (props.signed && props.repoKind === RepositoryKind.Helm && !isUndefined(props.signKey)) {
      setOpenStatus(true);
      history.replace({
        search: '?modal=key-info',
        state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
      });
    }
  }, [history, props.fromStarredPage, props.repoKind, props.searchUrlReferer, props.signKey, props.signed]);

  useEffect(() => {
    if (props.visibleKeyInfo && !openStatus) {
      onOpen();
    }
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  if (isNull(props.signed) || !props.signed || props.repoKind !== RepositoryKind.Helm) return null;

  return (
    <>
      <ElementWithTooltip
        element={
          <button
            className={classNames('btn btn-outline-secondary btn-sm ml-2', styles.btn, {
              disabled: isUndefined(props.signKey),
            })}
            onClick={onOpen}
            aria-label="Open sign key modal"
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
