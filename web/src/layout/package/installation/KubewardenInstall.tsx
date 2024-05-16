import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import sortBy from 'lodash/sortBy';
import { ChangeEvent, useState } from 'react';

import { ContainerImage } from '../../../types';
import ExternalLink from '../../common/ExternalLink';
import CommandBlock from './CommandBlock';
import styles from './ContentInstall.module.css';
import PrivateRepoWarning from './PrivateRepoWarning';

interface Props {
  images: ContainerImage[] | null;
  isPrivate?: boolean;
}

const DEFAULT_IMAGE = 'policy';

interface Legend {
  [key: string]: string;
}

const LEGENDS: Legend = {
  policy: 'Primary location',
  'policy-alternative-location': 'Alternative location',
};

const KubewardenInstall = (props: Props) => {
  const [activeImage, setActiveImage] = useState<string>(DEFAULT_IMAGE);

  const getActiveContainerImage = (name: string) => {
    const img = props.images!.find((i: ContainerImage) => i.name === name);
    return img!.image;
  };

  if (isNull(props.images)) return null;

  const sortedImages = sortBy(props.images, 'name');

  return (
    <>
      {props.images.length > 1 && (
        <>
          <div className="my-2">
            <small className="text-muted mt-2 mb-1">Source</small>
          </div>

          <div className={styles.selectWrapper}>
            <select
              className="form-select form-select-sm mb-1"
              aria-label="source-select"
              value={activeImage}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setActiveImage(e.target.value)}
            >
              {sortedImages.map((img: ContainerImage) => (
                <option key={`image_${img.name}`} value={img.name}>
                  {LEGENDS[img.name!]}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div className="my-2">
        <div className="d-flex align-items-center mt-3 mb-1 text-muted">
          <small>The policy can be obtained using</small>
          <ExternalLink
            href="https://github.com/kubewarden/kwctl/"
            className={`btn btn-link p-0 ps-1 fw-bold ${styles.btnInLegend}`}
            label="Download kwctl"
          >
            kwctl
          </ExternalLink>
          <small>:</small>
        </div>
      </div>

      <CommandBlock command={`kwctl pull ${getActiveContainerImage(activeImage)}`} />

      {!isUndefined(props.isPrivate) && props.isPrivate && <PrivateRepoWarning />}
    </>
  );
};

export default KubewardenInstall;
