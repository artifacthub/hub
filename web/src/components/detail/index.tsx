import React from 'react';
import { useParams } from 'react-router-dom';
import isNull from 'lodash/isNull';
import Readme from './Readme';
import Info from './Info';
import useFetchPackageDetail from '../../hooks/useFetchPackageDetail';
import NoData from '../common/NoData';

const Detail = () => {
  const { packageId, packageVersion } = useParams();
  const { detail, isLoading } = useFetchPackageDetail(packageId, packageVersion);

  return (
    <div className="container">
      {isLoading ? (
        <div className="text-center m-5">
          <div className="spinner-border" role="status">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="row">
          {isNull(detail) ? (
            <NoData content="No data available for this package" />
          ) : (
            <>
              <div className="col-lg-8 col-md-7 col-sm-12 mb-3">
                {isNull(detail!.readme) ? (
                  <NoData content="No README file available for this package" />
                ) : (
                  <Readme markdownContent={detail.readme} />
                )}
              </div>

              <div className="col-lg-4 col-md-5 col-sm-12 position-relative">
                <Info package={detail} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Detail;
