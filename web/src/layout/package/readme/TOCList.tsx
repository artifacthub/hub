import { isUndefined } from 'lodash';
import React from 'react';

import { TOCEntryItem } from '../../../types';
import TOCEntry from './TOCEntry';

interface Props {
  index?: number;
  setVisibleTOC: React.Dispatch<React.SetStateAction<boolean>>;
  toc: TOCEntryItem[];
  scrollIntoView: (id?: string) => void;
}

const MAX_VISIBLE_LEVEL = 3;

const TOCList = (props: Props) => {
  return (
    <div>
      {props.toc.map((entry: TOCEntryItem, index: number) => {
        if (!isUndefined(props.index) && props.index >= MAX_VISIBLE_LEVEL) return null;
        return (
          <div key={`toc_${entry.title}_${index}`}>
            <TOCEntry
              entry={entry}
              scrollIntoView={props.scrollIntoView}
              level={props.index || 0}
              setVisibleTOC={props.setVisibleTOC}
            />
            {entry.children && (
              <TOCList
                toc={entry.children}
                setVisibleTOC={props.setVisibleTOC}
                scrollIntoView={props.scrollIntoView}
                index={props.index ? props.index + 1 : 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TOCList;
