import React, { useEffect, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { FiPlus, FiDownload } from 'react-icons/fi';
import { IoIosArrowBack } from 'react-icons/io';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { API } from '../../api';
import { PackageKind, Package, SearchFiltersURL } from '../../types';
import SubNavbar from '../navigation/SubNavbar';
import Image from '../common/Image';
import Readme from './Readme';
import Details from './Details';
import NoData from '../common/NoData';
import ChartInstall from './ChartInstall';
import Modal from '../common/Modal';
import ModalHeader from './ModalHeader';
import Loading from '../common/Loading';
import useScrollRestorationFix from '../../hooks/useScrollRestorationFix';
import styles from './PackageView.module.css';
import prepareQueryString from '../../utils/prepareQueryString';

interface Props {
  searchUrlReferer: SearchFiltersURL | null;
  repoName: string;
  packageName: string;
  version?: string;
}

const PackageView = (props: Props) => {
  const history = useHistory();
  const [repoName, setRepoName] = useState(props.repoName);
  const [packageName, setPackageName] = useState(props.packageName);
  const [version, setVersion] = useState(props.version);
  const [isLoading, setIsLoading] = useState(false);
  const [detail, setDetail] = useState<Package | null>(null);
  const { text, pageNumber, filters } = props.searchUrlReferer || {};

  useScrollRestorationFix();

  useEffect(() => {
    if (!isUndefined(props.repoName) && !isLoading) {
      setRepoName(props.repoName);
      setPackageName(props.packageName);
      setVersion(props.version);
    }
  }, [props.repoName, props.packageName, props.version, isLoading]);

  useEffect(() => {
    setIsLoading(true);
    async function fetchPackageDetail() {
      try {
        setDetail(await API.getPackage(repoName, packageName, version));
      } catch {
        setDetail(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPackageDetail();
    window.scrollTo(0, 0); // Scroll to top when a new version is loaded
  }, [repoName, packageName, version]);

  const InstallationModal = (buttonIcon: boolean, buttonType?: string): JSX.Element => (
    <Modal
      buttonType={buttonType}
      buttonTitle="Install"
      buttonIcon={buttonIcon ? <FiDownload className="mr-2" /> : undefined}
      header={<ModalHeader package={detail!} />}
      className={styles.modalInstallationWrapper}
    >
      <>
        {(() => {
          switch (detail!.kind) {
            case PackageKind.Chart:
              return (
                <ChartInstall
                  name={detail!.name}
                  version={detail!.version}
                  repository={detail!.chartRepository!}
                />
              );
            default:
              return null;
          }
        })()}
      </>
    </Modal>
  );

  return (
    <>
      {!isUndefined(text) && !isNull(props.searchUrlReferer) && (
        <SubNavbar>
          <button
            data-testid="goBack"
            className={`btn btn-link btn-sm pl-0 d-flex align-items-center ${styles.link}`}
            onClick={() => {
              history.push({
                pathname: '/search',
                search: prepareQueryString({
                  pageNumber: pageNumber || 1,
                  text: text,
                  filters: filters || {},
                }),
                state: { fromDetail: true },
              });
            }}
          >
            <IoIosArrowBack className="mr-2" />
            Back to "<span className="font-weight-bold">{text}</span>" results
          </button>
        </SubNavbar>
      )}

      <div className="position-relative flex-grow-1">
        {isLoading && <Loading />}

        {!isNull(detail) && (
          <div className={`jumbotron ${styles.jumbotron}`}>
            <div className="container">
              <div className="d-flex align-items-center mb-3">
                <div className={`d-flex align-items-center justify-content-center p-1 overflow-hidden ${styles.imageWrapper}`}>
                  <Image
                    className={styles.image}
                    alt={detail.displayName || detail.name}
                    imageId={detail.logoImageId}
                  />
                </div>

                <div className="ml-3">
                  <div className="h3 mb-0">{detail.displayName || detail.name}</div>

                  {(() => {
                    switch (detail.kind) {
                      case PackageKind.Chart:
                        return (
                          <Link
                            data-testid="link"
                            className={`text-muted text-uppercase`}
                            to={{
                              pathname: '/search',
                              search: prepareQueryString({
                                pageNumber: 1,
                                filters: {
                                  repo: [detail.chartRepository!.name],
                                },
                              }),
                            }}
                          >
                            <u><small>
                              {detail.chartRepository!.displayName || detail.chartRepository!.name}
                            </small></u>
                          </Link>
                        );
                      default:
                        return null;
                    }
                  })()}
                </div>
              </div>

              <p className="mb-0">{detail.description}</p>

              <div className="d-block d-md-none">
                <div className="d-inline-block mr-2">
                  <Modal
                    buttonType="btn-outline-secondary"
                    buttonTitle="Info"
                    buttonIcon={<FiPlus className="mr-2" />}
                    header={<ModalHeader package={detail} />}
                    className={styles.wrapper}
                  >
                    <Details
                      package={detail}
                      searchUrlReferer={props.searchUrlReferer}
                    />
                  </Modal>
                </div>

                <div className="d-inline-block">
                  {InstallationModal(true, 'btn-outline-secondary')}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="container">
          {isNull(detail) && !isLoading ? (
            <NoData>No data available for this package</NoData>
          ) : (
            <div className="row">
              {!isNull(detail) && (
                <div className={styles.readme}>
                  {isNull(detail.readme) || isUndefined(detail.readme) ? (
                    <NoData>No README file available for this package</NoData>
                  ) : (
                    <Readme markdownContent={detail.readme} />
                  )}
                </div>
              )}

              <div className="col col-auto pl-5 pb-4 d-none d-md-block">
                {!isNull(detail) && (
                  <>
                    {InstallationModal(false)}

                    <div className={`card shadow-sm position-relative ${styles.info}`}>
                      <div className="card-body">
                        <Details
                          package={detail}
                          searchUrlReferer={props.searchUrlReferer}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PackageView;
