import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import API from '../../api';
import { PackageDetail } from '../../types';
import Readme from './Readme';
import Info from './Info';
import NoData from '../common/NoData';
import BackToResults from '../navigation/BackToResults';
import Title from './Title';
import Loading from '../common/Loading';
import styles from './Package.module.css';

const Detail = () => {
  const { packageId, packageVersion } = useParams();
  const [id, setId] = useState(packageId);
  const [version, setVersion] = useState(packageVersion);
  const [isLoading, setIsLoading] = useState(true);
  const [detail, setDetail] = useState<PackageDetail | null>(null);

  if (!isUndefined(packageId) && !isLoading && (id !== packageId || version !== packageVersion)) {
    setId(packageId);
    setVersion(packageVersion);
  }

  useEffect(() => {
    async function fetchPackageDetail() {
      try {
        setDetail(await API.getPackage(id, version));
      } catch {
        setDetail(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPackageDetail();
  }, [id, version]);

  return (
    <>
      <BackToResults />

      <div className="position-relative flex-grow-1">
        {isLoading && <Loading />}

        {!isNull(detail) && <Title package={detail} />}

        <div className="container">
          {isNull(detail) && !isLoading ? (
            <NoData>No data available for this package</NoData>
          ) : (
            <div className="row">
              {!isNull(detail) && (
                <div className={styles.readme}>
                  {isNull(detail.readme) ? (
                    <NoData>No README file available for this package</NoData>
                  ) : (
                    <Readme markdownContent={detail.readme} />
                  )}
                </div>
              )}

              <div className="col col-auto pl-5 pb-4 d-none d-md-block">
                {!isNull(detail) && <Info package={detail} />}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Detail;
