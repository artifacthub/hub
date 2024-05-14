import isUndefined from 'lodash/isUndefined';
import { useEffect, useState } from 'react';
import { FaCaretDown, FaCaretUp } from 'react-icons/fa';

interface Props {
  visibleItems?: number;
  items: JSX.Element[];
  open?: boolean;
  onBtnClick?: (open: boolean) => void;
  forceCollapseList?: boolean;
}

const DEFAULT_VISIBLE_ITEMS = 5;

const ExpandableList = (props: Props) => {
  const [open, setOpenStatus] = useState(props.open || false);
  const numVisibleItems = props.visibleItems || DEFAULT_VISIBLE_ITEMS;
  const list = props.items.slice(0, open ? props.items.length : numVisibleItems);

  const onBtnClick = () => {
    if (!isUndefined(props.onBtnClick)) {
      props.onBtnClick(!open);
    }
    setOpenStatus(!open);
  };

  useEffect(() => {
    if (!isUndefined(props.open) && open !== props.open) {
      setOpenStatus(props.open);
    }
  }, [props.open]);

  useEffect(() => {
    if (props.forceCollapseList && open) {
      setOpenStatus(!open);
    }
  }, [props.forceCollapseList]);

  return (
    <>
      {list}

      {props.items.length > numVisibleItems && (
        <button data-testid="expandableListBtn" className="btn btn-link btn-sm p-0" onClick={() => onBtnClick()}>
          {open ? (
            <div className="d-flex align-items-center">
              <FaCaretUp className="me-1" />
              Show less...
            </div>
          ) : (
            <div className="d-flex align-items-center">
              <FaCaretDown className="me-1" />
              Show more...
            </div>
          )}
        </button>
      )}
    </>
  );
};

export default ExpandableList;
