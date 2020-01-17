import React, { useState } from 'react';
import { FaCaretDown, FaCaretUp } from 'react-icons/fa';

interface Props {
  visibleItems?: number;
  items: JSX.Element[];
}

const DEFAULT_VISIBLE_ITEMS = 5;

const ExpandableList = (props: Props) => {
  const [open, setOpenStatus] = useState(false);
  const list = props.items.slice(0, open ? props.items.length : DEFAULT_VISIBLE_ITEMS);

  return (
    <>
      {list}

      <button className="btn btn-link btn-sm pl-0" onClick={() => setOpenStatus(!open)}>
        {open ? (
          <div className="d-flex align-items-center">
            <FaCaretUp className="mr-1" />
            Show less...
          </div>
        ) : (
          <div className="d-flex align-items-center">
            <FaCaretDown className="mr-1" />
            Show more...
          </div>
        )}
      </button>
    </>
  );
}

export default ExpandableList;
