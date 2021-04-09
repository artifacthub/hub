import classnames from 'classnames';
import { isNull, isUndefined } from 'lodash';
import React, { useEffect, useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import { useHistory } from 'react-router-dom';

import { Package, SearchFiltersURL, Version } from '../../../types';
import getInstallMethods, {
  InstallMethod,
  InstallMethodKind,
  InstallMethodOutput,
} from '../../../utils/getInstallMethods';
import ElementWithTooltip from '../../common/ElementWithTooltip';
import Modal from '../../common/Modal';
import Tabs from '../../common/Tabs';
import ModalHeader from '../ModalHeader';
import CustomInstall from './CustomInstall';
import FalcoInstall from './FalcoInstall';
import HelmInstall from './HelmInstall';
import HelmOCIInstall from './HelmOCIInstall';
import HelmPluginInstall from './HelmPluginInstall';
import KrewInstall from './KrewInstall';
import OLMInstall from './OLMInstall';
import OLMOCIInstall from './OLMOCIInstall';
import TektonInstall from './TektonInstall';

interface Props {
  package?: Package | null;
  sortedVersions: Version[];
  activeChannel?: string;
  visibleInstallationModal: boolean;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
}

const InstallationModal = (props: Props) => {
  const history = useHistory();
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [installMethods, setInstallMethods] = useState<InstallMethodOutput | null>(null);
  const isDisabled = !isNull(installMethods) && !isUndefined(installMethods.errorMessage);

  const onOpenModal = () => {
    if (!isDisabled) {
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

  useEffect(() => {
    if (openStatus) {
      setOpenStatus(false);
    }
    setInstallMethods(
      getInstallMethods({
        pkg: props.package,
        sortedVersions: props.sortedVersions,
        activeChannel: props.activeChannel,
      })
    );
  }, [props.package, props.activeChannel]); /* eslint-disable-line react-hooks/exhaustive-deps */

  if (isNull(installMethods) || (installMethods.methods.length === 0 && isUndefined(installMethods.errorMessage)))
    return null;

  return (
    <>
      <ElementWithTooltip
        element={
          <button
            data-testid="openModalBtn"
            type="button"
            className={classnames(
              'btn font-weight-bold text-uppercase position-relative btn-block btn-secondary btn-sm text-nowrap',
              { disabled: isDisabled }
            )}
            onClick={onOpenModal}
          >
            <div className="d-flex align-items-center justify-content-center">
              <FiDownload className="mr-2" />
              <span>Install</span>
            </div>
          </button>
        }
        visibleTooltip={isDisabled}
        tooltipMessage={installMethods.errorMessage || ''}
        active
      />

      <Modal
        header={
          <ModalHeader
            displayName={props.package!.displayName}
            name={props.package!.name}
            logoImageId={props.package!.logoImageId}
            repoKind={props.package!.repository.kind}
          />
        }
        onClose={onCloseModal}
        open={openStatus}
      >
        <>
          {installMethods.methods.length > 0 && (
            <>
              {props.package && props.package.prerelease && (
                <div className="alert alert-warning mt-1 mb-4" data-testid="prerelease-alert">
                  This package version is a <span className="font-weight-bold">pre-release</span> and it is not ready
                  for production use.
                </div>
              )}

              <Tabs
                tabs={installMethods.methods.map((method: InstallMethod) => ({
                  name: method.label,
                  title: method.title,
                  shortTitle: method.shortTitle,
                  content: (
                    <>
                      {(() => {
                        switch (method.kind) {
                          case InstallMethodKind.Custom:
                            return <CustomInstall install={method.props.install!} />;
                          case InstallMethodKind.Helm:
                            return (
                              <HelmInstall
                                name={method.props.name!}
                                version={method.props.version}
                                repository={method.props.repository!}
                                contentUrl={method.props.contentUrl}
                                label={method.label}
                              />
                            );
                          case InstallMethodKind.HelmOCI:
                            return (
                              <HelmOCIInstall
                                name={method.props.name!}
                                version={method.props.version}
                                repository={method.props.repository!}
                              />
                            );
                          case InstallMethodKind.OLM:
                            return (
                              <OLMInstall
                                name={method.props.name!}
                                activeChannel={method.props.activeChannel!}
                                isGlobalOperator={method.props.isGlobalOperator}
                                isPrivate={method.props.isPrivate}
                              />
                            );
                          case InstallMethodKind.OLMOCI:
                            return (
                              <OLMOCIInstall
                                name={method.props.name!}
                                repository={method.props.repository!}
                                activeChannel={method.props.activeChannel!}
                              />
                            );
                          case InstallMethodKind.Falco:
                            return (
                              <FalcoInstall
                                normalizedName={method.props.normalizedName!}
                                isPrivate={method.props.isPrivate}
                              />
                            );
                          case InstallMethodKind.Krew:
                            return <KrewInstall name={method.props.name!} repository={method.props.repository!} />;
                          case InstallMethodKind.HelmPlugin:
                            return <HelmPluginInstall repository={method.props.repository!} />;
                          case InstallMethodKind.Tekton:
                            return (
                              <TektonInstall contentUrl={method.props.contentUrl!} isPrivate={method.props.isPrivate} />
                            );
                          default:
                            return null;
                        }
                      })()}
                    </>
                  ),
                }))}
                active={installMethods.methods[0].label}
                noDataContent="Sorry, the information for installation is missing."
              />
            </>
          )}
        </>
      </Modal>
    </>
  );
};

export default InstallationModal;
