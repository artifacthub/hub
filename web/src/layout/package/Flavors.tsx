import compact from 'lodash/compact';
import trim from 'lodash/trim';
import uniq from 'lodash/uniq';
import { useCallback, useEffect, useState } from 'react';

import SmallTitle from '../common/SmallTitle';
import styles from './Flavors.module.css';

interface Props {
  title: string;
  flavors?: string;
}

const Flavors = (props: Props) => {
  const cleanFlavors = useCallback((): string[] => {
    let flavors: string[] = [];
    if (props.flavors) {
      flavors = uniq(compact(props.flavors.split(',')));
    }

    return flavors;
  }, [props.flavors]);

  const [flavors, setFlavors] = useState<string[]>(cleanFlavors());

  useEffect(() => {
    setFlavors(cleanFlavors());
  }, [cleanFlavors, props.flavors]);

  if (flavors.length === 0) return null;

  return (
    <>
      <SmallTitle text={props.title} />
      <div className="mb-3">
        {flavors.map((flavor: string) => (
          <div data-testid="flavor" className={`text-truncate mb-1 ${styles.text}`} key={`flavor_${flavor}`}>
            <div className="d-flex align-items-center">
              <span className="pe-1">&#183;</span>
              <small>{trim(flavor)}</small>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default Flavors;
