import isEmpty from 'lodash/isEmpty';
import { nanoid } from 'nanoid';
import { ChangeEvent, Dispatch, MouseEvent as ReactMouseEvent, SetStateAction, useEffect } from 'react';
import { HiPlus } from 'react-icons/hi';
import { MdClose } from 'react-icons/md';

import { ContainerTag } from '../../../types';
import InputField from '../../common/InputField';
import styles from './TagsList.module.css';

interface Props {
  tags: ContainerTag[];
  setContainerTags: Dispatch<SetStateAction<ContainerTag[]>>;
  repeatedTagNames: boolean;
  setRepeatedTagNames: Dispatch<SetStateAction<boolean>>;
}

const EMPTY_TAG = { name: '', mutable: false };

const TagsList = (props: Props) => {
  const cleanRepeatedError = () => {
    if (props.repeatedTagNames) {
      props.setRepeatedTagNames(false);
    }
  };

  const deleteTag = (index: number) => {
    cleanRepeatedError();
    const updatedTags = [...props.tags];
    updatedTags.splice(index, 1);
    props.setContainerTags(updatedTags);
  };

  const addTag = () => {
    props.setContainerTags([...props.tags, { ...EMPTY_TAG, id: nanoid() }]);
  };

  const onUpdateTag = (index: number, field: 'name' | 'mutable', value?: string) => {
    cleanRepeatedError();
    const tagToUpdate: ContainerTag = props.tags[index];
    if (field === 'name') {
      tagToUpdate[field] = value as string;
    } else {
      tagToUpdate[field] = !tagToUpdate.mutable;
    }
    const updatedTags = [...props.tags];
    updatedTags[index] = tagToUpdate;
    props.setContainerTags(updatedTags);
  };

  useEffect(() => {
    if (isEmpty(props.tags)) {
      props.setContainerTags([{ ...EMPTY_TAG, id: nanoid() }]);
    }
  }, [props.tags]);

  return (
    <div className="mb-4">
      <label className={`form-check-label fw-bold mb-2 ${styles.label}`}>
        Tags
        <button
          type="button"
          className={`btn btn-primary btn-sm ms-2 p-0 position-relative lh-1 ${styles.btn} ${styles.inTitle}`}
          onClick={addTag}
          disabled={props.tags.length === 10}
          aria-label="Add tag"
        >
          <HiPlus />
        </button>
      </label>

      {props.tags.length > 0 && (
        <>
          {props.tags.map((item: ContainerTag, idx: number) => {
            return (
              <div
                className="d-flex flex-row align-items-stretch justify-content-between"
                key={`tag_${item.name}_${idx}`}
              >
                <InputField
                  className="flex-grow-1"
                  type="text"
                  name={`tag_${idx}`}
                  autoComplete="off"
                  value={item.name}
                  placeholder="Tag name"
                  onBlur={(e: ChangeEvent<HTMLInputElement>) => {
                    onUpdateTag(idx, 'name', e.target.value);
                  }}
                  smallBottomMargin
                />

                <div className="d-flex flex-row align-items-center mb-3 ms-3 flex-nowrap">
                  <div className={`ms-2 me-5 position-relative ${styles.inputWrapper}`}>
                    <div className="form-check form-switch ps-0">
                      <label htmlFor={`mutable_${idx}`} className={`form-check-label fw-bold ${styles.label}`}>
                        Mutable
                      </label>
                      <input
                        id={`mutable_${idx}`}
                        type="checkbox"
                        className="form-check-input position-absolute ms-2"
                        role="switch"
                        value="true"
                        checked={item.mutable}
                        onChange={() => {
                          onUpdateTag(idx, 'mutable');
                        }}
                      />
                    </div>
                  </div>

                  <div className={`position-relative text-end ${styles.btnWrapper}`}>
                    <button
                      className={`btn btn-danger btn-sm ms-auto p-0 position-relative lh-1 ${styles.btn}`}
                      type="button"
                      onClick={(event: ReactMouseEvent<HTMLButtonElement, MouseEvent>) => {
                        event.preventDefault();
                        event.stopPropagation();
                        deleteTag(idx);
                      }}
                      aria-label="Delete tag from repository"
                    >
                      <MdClose />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {props.repeatedTagNames && <div className="form-text text-danger mt-0">Tags names must be unique.</div>}

      <div className="form-text text-muted mt-2">
        The tags you'd like to list on Artifact Hub must be explicitly added. You can add up to{' '}
        <span className="fw-bold">10</span> (they can be edited later though). Mutable tags will be processed
        periodically, whereas immutable tags will be only processed once.
      </div>
    </div>
  );
};

export default TagsList;
