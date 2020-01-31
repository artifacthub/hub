import React, { useEffect, useState, useReducer, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import isEmpty from 'lodash/isEmpty';
import API from '../../api';
import { PackageDetail } from '../../types';
import Readme from './Readme';
import Info from './Info';
import NoData from '../common/NoData';
import BackToResults from '../navigation/BackToResults';
import Title from './Title';
import Loading from '../common/Loading';
import styles from './Package.module.css';

interface Props {
  isVisible: boolean;
}

interface Cache {
  [key: string]: {
    [key: string]: {
      ts: number,
      detail: PackageDetail | null;
    }
  }
}

interface Action {
  type: string;
  payload: {
    id: string;
    version?: string;
    detail: PackageDetail | null;
  };
}

const EXPIRATION = 30 * 60 * 1000; // 30min

const reducer = (state: Cache, action: Action) => {
  switch (action.type) {
    case 'update':
      return {
        ...state,
        [action.payload.id]: {
          ...state[action.payload.id],
          [action.payload.version!]: {
            ts: Date.now(),
            detail: action.payload.detail,
          },
        },
      };
    case 'updateLatest':
      let versionInfo = {};
      if (!isNull(action.payload.detail) && !isUndefined(action.payload.detail.version)) {
        versionInfo = {
          [action.payload.detail!.version]: {
            ts: Date.now(),
            detail: action.payload.detail,
          },
        };
      }

      return {
        ...state,
        [action.payload.id]: {
          ...state[action.payload.id],
          latest: {
            ts: Date.now(),
            detail: action.payload.detail,
          },
          ...versionInfo,
        },
      };
    default:
      throw new Error('Unexpected action');
  }
};

const Detail = (props: Props) => {
  const { packageId, packageVersion } = useParams();
  const [id, setId] = useState(packageId);
  const [version, setVersion] = useState(packageVersion);
  const [isLoading, setIsLoading] = useState(false);
  const [detail, setDetail] = useState<PackageDetail | null>(null);
  const [packagesCache, dispatch] = useReducer(reducer, {});

  // shouldFetchData ...
  const shouldFetchData = useCallback(
    () => {
      if (isEmpty(packagesCache)) {
        return true;
      }
      if (isUndefined(packagesCache[id!]) || isUndefined(packagesCache[id!][version || 'latest'])) {
        return true;
      }
      if (packagesCache[id!][version || 'latest'].ts + EXPIRATION < Date.now()) {
        return true;
      }
      return false;
    },
    [packagesCache, id, version],
  );

  if (!isUndefined(packageId) && props.isVisible && !isLoading && (id !== packageId || version !== packageVersion || shouldFetchData())) {
    setIsLoading(true);
    setId(packageId);
    setVersion(packageVersion);
  }

  useEffect(() => {
    async function fetchPackageDetail() {
      try {
        let detail = null;
        if (shouldFetchData()) {
          detail = await API.getPackage(id, version);
          dispatch({
            type: isUndefined(version) ? 'updateLatest' : 'update',
            payload: {
              id: id!,
              version: version,
              detail: detail,
            },
          });
        } else {
          detail = packagesCache[id!][version || 'latest'].detail;
        }
        setDetail(detail);
      } catch {
        setDetail(null);
        dispatch({
          type: isUndefined(version) ? 'updateLatest' : 'update',
          payload: {
            id: id!,
            version: version,
            detail: null, // If package is not on database, detail is null
          },
        });
      } finally {
        setIsLoading(false);
      }
    };
    if (!isUndefined(id)) {
      fetchPackageDetail();
    }
  }, [id, version, packagesCache, shouldFetchData]);

  if (!props.isVisible) return null;

  return (
    <>
      <BackToResults />

      {!isNull(detail) && !isLoading && <Title {...detail} />}

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
