import classnames from 'classnames';
import React, { useEffect, useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import { useHistory } from 'react-router-dom';

import { Package, RepositoryKind, SearchFiltersURL } from '../../../types';
import ElementWithTooltip from '../../common/ElementWithTooltip';
import Modal from '../../common/Modal';
import ModalHeader from '../ModalHeader';
import FalcoInstall from './FalcoInstall';
import HelmInstall from './HelmInstall';
import HelmOCIInstall from './HelmOCIInstall';
import OLMInstall from './OLMInstall';
import OPAInstall from './OPAInstall';

interface Props {
  package: Package;
  isDisabled: boolean;
  activeChannel?: string;
  visibleInstallationModal: boolean;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
}

const InstallationModal = (props: Props) => {
  const history = useHistory();
  const [openStatus, setOpenStatus] = useState<boolean>(false);

  const onOpenModal = () => {
    if (!props.isDisabled) {
      setOpenStatus(true);
      history.replace({
        search: '?modal=install',
        state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
      });
    }
  };

  const onCloseModal = () => {
    setOpenStatus(false);
    history.replace({
      search: '',
      state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
    });
  };

  useEffect(() => {
    if (props.visibleInstallationModal && !openStatus) {
      onOpenModal();
    }
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <>
      <ElementWithTooltip
        element={
          <button
            data-testid="openModalBtn"
            type="button"
            className={classnames(
              'btn font-weight-bold text-uppercase position-relative btn-block btn-secondary btn-sm text-nowrap',
              { disabled: props.isDisabled }
            )}
            onClick={onOpenModal}
          >
            <div className="d-flex align-items-center justify-content-center">
              <FiDownload className="mr-2" />
              <span>Install</span>
            </div>
          </button>
        }
        visibleTooltip={props.isDisabled}
        tooltipMessage="Only the current version can be installed"
        active
      />

      <Modal header={<ModalHeader package={props.package!} />} onClose={onCloseModal} open={openStatus}>
        <>
          {(() => {
            switch (props.package!.repository.kind) {
              case RepositoryKind.Helm:
                if (props.package.repository.url.startsWith('oci://')) {
                  return (
                    <HelmOCIInstall
                      name={props.package.name}
                      version={props.package.version}
                      repository={props.package.repository}
                    />
                  );
                } else {
                  return (
                    <HelmInstall
                      name={props.package.name}
                      version={props.package.version}
                      repository={props.package.repository}
                    />
                  );
                }
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
