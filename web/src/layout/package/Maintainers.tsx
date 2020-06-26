import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React from 'react';
import { GiEnvelope } from 'react-icons/gi';

import { Maintainer } from '../../types';
import ExternalLink from '../common/ExternalLink';
import SmallTitle from '../common/SmallTitle';

interface Props {
  maintainers?: Maintainer[] | undefined;
}

const Maintainers = (props: Props) => (
  <>
    <SmallTitle text="Maintainers" />
    {isUndefined(props.maintainers) || isNull(props.maintainers) || props.maintainers.length === 0 ? (
      <p data-testid="maintainers">-</p>
    ) : (
      <div data-testid="maintainers" className="mb-3">
        {props.maintainers.map((maintainer: Maintainer) => (
          <div className="mb-1" key={maintainer.email}>
            <ExternalLink href={`mailto:${maintainer.email}`} className="text-primary py-1 py-sm-0">
              <div className="d-flex align-items-center">
                <GiEnvelope className="text-muted mr-2 h6 mb-0" />
                <>{maintainer.name || maintainer.email}</>
              </div>
            </ExternalLink>
          </div>
        ))}
      </div>
    )}
  </>
);

export default Maintainers;
