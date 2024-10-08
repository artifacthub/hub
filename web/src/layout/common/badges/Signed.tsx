import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { FaFileSignature } from 'react-icons/fa';

import { HelmChartSignKey, RepositoryKind, Signature } from '../../../types';
import CommandBlock from '../../package/installation/CommandBlock';
import Badge from './Badge';
import styles from './Badge.module.css';

interface Props {
  signed: null | boolean;
  signatures?: Signature[];
  repoKind: RepositoryKind;
  signKey?: HelmChartSignKey;
  className?: string;
  dropdownAlignment?: 'start' | 'end';
  noDropdown?: boolean;
  smallSize?: boolean;
}

const SIGNATURE_NAME = {
  [Signature.Cosign]: 'cosign',
  [Signature.Prov]: 'chart provenance file',
};

const Signed = (props: Props) => {
  const notSupported = ![
    RepositoryKind.Container,
    RepositoryKind.Helm,
    RepositoryKind.InspektorGadget,
    RepositoryKind.Kubewarden,
    RepositoryKind.TektonPipeline,
    RepositoryKind.TektonTask,
    RepositoryKind.TektonStepAction,
  ].includes(props.repoKind);

  return (
    <Badge
      title="Signed"
      bgColor="#645CBB"
      icon={<FaFileSignature className={styles.signedIcon} />}
      active={!notSupported && !isNull(props.signed) && props.signed}
      className={props.className}
      dropdownAlignment={props.dropdownAlignment}
      noDropdown={props.noDropdown}
      smallSize={props.smallSize}
      popoverContent={
        <>
          <div className="fs-6 fw-semibold border-bottom border-1 mb-3 pb-1">Signed</div>

          {notSupported ? (
            <p className="mb-0">Artifact Hub does not support any form of signature for this package kind yet.</p>
          ) : (
            <>
              {!isNull(props.signed) && props.signed ? (
                <>
                  <p>
                    This package has been <span className="fw-bold">signed</span>.
                  </p>
                  {!isUndefined(props.signatures) && (
                    <p className="mb-0">
                      Signature:{' '}
                      {props.signatures.map((sign: Signature) => {
                        return (
                          <code key={`signature_${sign}`} className="me-1">
                            {SIGNATURE_NAME[sign]}
                          </code>
                        );
                      })}
                    </p>
                  )}
                  {!isUndefined(props.signKey) && (
                    <>
                      <div className="fs-6 fw-semibold border-bottom border-1 mt-4 mb-3 pb-1">Sign key information</div>
                      <CommandBlock
                        language="text"
                        command={props.signKey.fingerprint}
                        title="Fingerprint"
                        btnClassname="mt-0"
                      />

                      <div className={styles.secondBlock}>
                        <CommandBlock language="text" command={props.signKey.url} title="URL" btnClassname="mt-0" />
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p className="mb-0">
                  This package has not been <span className="fw-bold">signed</span>.
                </p>
              )}
            </>
          )}
        </>
      }
    />
  );
};

export default Signed;
