import React, { useEffect, useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import { useHistory } from 'react-router-dom';

import { Package, RepositoryKind } from '../../types';
import Modal from '../common/Modal';
import FalcoInstall from './FalcoInstall';
import HelmInstall from './HelmInstall';
import ModalHeader from './ModalHeader';
import OLMInstall from './OLMInstall';
import OPAInstall from './OPAInstall';

interface Props {
  package: Package;
  btnClassName?: string;
  isDisabled: boolean;
  activeChannel?: string;
  visibleInstallationModal: boolean;
}

const InstallationModal = (props: Props) => {
  const history = useHistory();
  const [openStatus, setOpenStatus] = useState<boolean>(false);

  const onOpenModal = () => {
    setOpenStatus(true);
    history.replace({
      search: '?modal=install',
    });
  };

  const onCloseModal = () => {
    setOpenStatus(false);
    history.replace({
      search: '',
    });
  };

  useEffect(() => {
    if (props.visibleInstallationModal && !openStatus) {
      onOpenModal();
    }
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <>
      <button
        data-testid="openModalBtn"
        type="button"
        className={`btn font-weight-bold text-uppercase position-relative btn btn-block ${props.btnClassName}`}
        onClick={onOpenModal}
      >
        <div className="d-flex align-items-center justify-content-center">
          <FiDownload className="mr-2" />
          <span>Install</span>
        </div>
      </button>

      <Modal
        header={<ModalHeader package={props.package!} />}
        disabledOpenBtn={props.isDisabled}
        tooltipMessage={props.isDisabled ? 'Only the current version can be installed' : undefined}
        onClose={onCloseModal}
        open={openStatus}
      >
        <>
          {(() => {
            switch (props.package!.repository.kind) {
              case RepositoryKind.Helm:
                return (
                  <HelmInstall
                    name={props.package.name}
                    version={props.package.version}
                    repository={props.package.repository}
                  />
                );
              case RepositoryKind.Falco:
                return <FalcoInstall normalizedName={props.package.normalizedName!} />;
              case RepositoryKind.OPA:
                return <OPAInstall install={props.package.install} />;
              case RepositoryKind.OLM:
                return (
                  <OLMInstall
                    name={props.package.name}
                    activeChannel={props.activeChannel!}
                    isGlobalOperator={props.package.data!.isGlobalOperator}
                  />
                );
              default:
                return null;
            }
          })()}
        </>
      </Modal>
    </>
  );
};

export default InstallationModal;
