import classnames from 'classnames';
import { isUndefined } from 'lodash';
import React, { forwardRef, useContext, useEffect, useImperativeHandle, useState } from 'react';

import { AppCtx } from '../../context/AppCtx';
import { AuthorizerAction, RefActionBtn } from '../../types';
import authorizer from '../../utils/authorizer';
import styles from './ActionBtn.module.css';

interface Props {
  testId: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: JSX.Element;
  className?: string;
  contentClassName?: string;
  action: AuthorizerAction;
  disabled?: boolean;
}

const ActionBtn = forwardRef((props: Props, ref: React.Ref<RefActionBtn>) => {
  const { ctx } = useContext(AppCtx);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(true);
  const [onBtnHover, setOnBtnHover] = useState<boolean>(false);
  const [visibleTooltipStatus, setVisibleTooltipStatus] = useState<boolean>(false);
  const [activeOrg, setActiveOrg] = useState<undefined | string>(undefined);
  const [updateView, setUpdateView] = useState<number>(0);

  useImperativeHandle(ref, () => ({
    reRender: () => {
      setUpdateView((updateView: number) => ++updateView);
    },
  }));

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (!visibleTooltipStatus && onBtnHover) {
      timeout = setTimeout(() => {
        setVisibleTooltipStatus(true);
      }, 2000);
    }
    if (visibleTooltipStatus && !onBtnHover) {
      timeout = setTimeout(() => {
        setVisibleTooltipStatus(false);
      }, 50);
    }
    return () => {
      if (!isUndefined(timeout)) {
        clearTimeout(timeout);
      }
    };
  }, [onBtnHover, visibleTooltipStatus]);

  useEffect(() => {
    if (activeOrg) {
      setIsAuthorized(
        authorizer.check({
          action: props.action,
          user: ctx.user!.alias!,
          organizationName: activeOrg,
          onCompletion: () => setUpdateView((updateView: number) => ++updateView),
        })
      );
    }
  }, [activeOrg, updateView]); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    if (activeOrg !== ctx.prefs.controlPanel.selectedOrg) {
      setActiveOrg(ctx.prefs.controlPanel.selectedOrg);
    }
  }, [ctx.prefs.controlPanel.selectedOrg]); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <span
      className="position-relative"
      onMouseEnter={() => {
        setOnBtnHover(true);
      }}
      onMouseLeave={() => {
        setOnBtnHover(false);
      }}
    >
      <button
        data-testid={props.testId}
        type="button"
        className={classnames(props.className, {
          [`disabled ${styles.disabled}`]: !isAuthorized || (!isUndefined(props.disabled) && props.disabled),
        })}
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => (isAuthorized ? props.onClick(e) : null)}
      >
        <div className={`d-flex flex-row align-items-center ${props.contentClassName}`}>{props.children}</div>
      </button>

      {!isAuthorized && visibleTooltipStatus && (
        <div className="position-absolute">
          <div className={`tooltip bs-tooltip-bottom ${styles.tooltip}`} role="tooltip">
            <div className={`arrow ${styles.tooltipArrow}`} />
            <div className={`tooltip-inner ${styles.tooltipContent}`}>You are not allowed to perform this action</div>
          </div>
        </div>
      )}
    </span>
  );
});

export default ActionBtn;
