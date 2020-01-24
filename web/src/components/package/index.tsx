import React from 'react';
import { useParams } from 'react-router-dom';
import isNull from 'lodash/isNull';
import Readme from './Readme';
import Info from './Info';
import useFetchPackageDetail from '../../hooks/useFetchPackageDetail';
import NoData from '../common/NoData';
import BackToResults from '../navigation/BackToResults';
import Title from './Title';
import Loading from '../common/Loading';
import styles from './Package.module.css';

const Detail = () => {
  const { packageId, packageVersion } = useParams();
  const { detail, isLoading } = useFetchPackageDetail(packageId, packageVersion);

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
