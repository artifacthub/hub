import isUndefined from 'lodash/isUndefined';
import { GoDash } from 'react-icons/go';
import { TiTick } from 'react-icons/ti';

import { RepositoryKind, TektonTaskInPipeline } from '../../types';
import SmallTitle from '../common/SmallTitle';
import styles from './TasksInPipeline.module.css';

interface Props {
  tasks?: TektonTaskInPipeline[];
  kind: RepositoryKind;
}

const TasksInPipeline = (props: Props) => {
  if (isUndefined(props.tasks) || props.tasks.length === 0 || props.kind !== RepositoryKind.TektonPipeline) return null;

  const getParents = (task: TektonTaskInPipeline, index: number) => {
    if (isUndefined(task.runAfter)) return null;

    if (task.runAfter.length === 1) {
      return (
        <div className={`d-flex flex-row align-items-center ${styles.taskParent}`}>
          <small className="text-muted text-uppercase me-1">Run After:</small>
          {task.runAfter[0]}
        </div>
      );
    } else {
      return (
        <div className={styles.taskParent}>
          <div className="d-flex flex-row">
            <small className="text-muted text-uppercase">Run After:</small>
          </div>
          {task.runAfter.map((parent: string) => (
            <div className="d-flex flex-row align-items-center mw-100 mt-1" key={`${index}_parent_${parent}`}>
              <div className="pe-1">
                <GoDash className={styles.icon} />
              </div>
              <div className="text-truncate flex-grow-1">{parent}</div>
            </div>
          ))}
        </div>
      );
    }
  };

  return (
    <>
      <SmallTitle text="Tasks" />
      <div className="mb-3" role="list">
        {props.tasks.map((task: TektonTaskInPipeline, index: number) => (
          <div data-testid="taskItem" key={`task_${task.name}`} role="listitem">
            <div className="d-flex flex-row align-items-baseline mw-100">
              <div className="me-1">
                <TiTick className={`text-muted ${styles.icon}`} />
              </div>
              <div className={`text-truncate text-break ${styles.task}`}>{task.name}</div>
            </div>
            <div>{getParents(task, index)}</div>
          </div>
        ))}
      </div>
    </>
  );
};

export default TasksInPipeline;
