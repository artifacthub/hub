import isUndefined from 'lodash/isUndefined';

import SmallTitle from '../common/SmallTitle';
import ContainerRegistry from './ContainerRegistry';

interface Props {
  locations?: string[];
}

const ContainerAlternativeLocations = (props: Props) => {
  if (isUndefined(props.locations) || props.locations.length === 0) return null;

  return (
    <>
      <SmallTitle text="Alternative Locations" />
      <div className="mb-3" role="list">
        {props.locations.map((url: string, index: number) => (
          <div key={`url_${index}`} role="listitem">
            <ContainerRegistry url={url} />
          </div>
        ))}
      </div>
    </>
  );
};

export default ContainerAlternativeLocations;
