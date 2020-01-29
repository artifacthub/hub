import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import isNull from 'lodash/isNull';
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
  const [id, setId] = useState(packageId); /* eslint-disable-line @typescript-eslint/no-unused-vars */
  const [version, setVersion] = useState(packageVersion); /* eslint-disable-line @typescript-eslint/no-unused-vars */
  const [isLoading, setIsLoading] = useState(true);
  const [detail, setDetail] = useState<PackageDetail | null>(null);

  if (id !== packageId || version !== packageVersion) {
    setId(packageId);
    setVersion(packageVersion);
  }

  useEffect(() => {
    async function fetchPackageDetail() {
      try {
        setDetail(await API.getPackage(id, version));
      } finally {
        setIsLoading(false);
      }
    };
    fetchPackageDetail();
  }, [id, version]);

  return (
    <>
      <BackToResults />

      {!isNull(detail) && <Title {...detail} />}

      <div className="container">
        {isLoading ? (
          <Loading />
        ) : (
          <>
            {isNull(detail) ? (
              <NoData>No data available for this package</NoData>
            ) : (
              <div className="row">
                <div className={styles.readme}>
                  {isNull(detail!.readme) ? (
                    <NoData>No README file available for this package</NoData>
                  ) : (
                    <Readme markdownContent={detail.readme} />
                  )}
                </div>

                <div className="col col-auto pl-5 pb-4">
                  <Info package={detail} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default Detail;
