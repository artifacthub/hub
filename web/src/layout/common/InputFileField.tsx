import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useRef, useState } from 'react';
import { MdAddAPhoto } from 'react-icons/md';

import { API } from '../../api';
import { ErrorKind, LogoImage } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import Image from './Image';
import styles from './InputFileField.module.css';

interface Props {
  name: string;
  label: string;
  labelLegend?: JSX.Element;
  value?: string;
  className?: string;
  onImageChange?: (imageId: string) => void;
  onAuthError: () => void;
  placeholderIcon?: JSX.Element;
}

const InputFileField = (props: Props) => {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);

  async function saveImage(data: string | ArrayBuffer) {
    try {
      const logo: LogoImage = await API.saveImage(data);
      setIsSending(false);
      if (!isUndefined(props.onImageChange)) {
        props.onImageChange(logo.imageId);
      }
    } catch (err) {
      setIsSending(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        alertDispatcher.postAlert({
          type: 'danger',
          message: 'An error occurred saving the image, please try again later.',
        });
      } else {
        props.onAuthError();
      }
    }
  }

  const onChange = () => {
    if (
      !isNull(fileInput) &&
      !isNull(fileInput.current) &&
      !isNull(fileInput.current.files) &&
      fileInput.current.files.length > 0
    ) {
      setIsSending(true);
      const file = fileInput.current.files[0];
      if (!file.type.startsWith('image/')) {
        alertDispatcher.postAlert({
          type: 'danger',
          message: 'Sorry, only images are accepted',
        });
        setIsSending(false);
      } else {
        const reader = new FileReader();
        reader.onloadend = (r: ProgressEvent<FileReader>) => {
          if (!isNull(r.target) && !isNull(r.target.result)) {
            saveImage(r.target.result);
          }
        };
        reader.readAsArrayBuffer(file);
      }
    }
  };

  const onClick = () => {
    if (!isNull(fileInput) && !isNull(fileInput.current)) {
      fileInput.current.click();
    }
  };

  return (
    <div className={`form-group mb-4 ${props.className}`}>
      <div className="d-flex flex-column">
        <label className={styles.label} htmlFor={props.name}>
          <span className="font-weight-bold">{props.label}</span>
          {props.labelLegend && <>{props.labelLegend}</>}
        </label>

        <div className="position-relative">
          <button
            data-testid="inputFileBtn"
            className={classnames('btn p-0 overflow-hidden', styles.btn, { [styles.isLoading]: isSending })}
            type="button"
            onClick={onClick}
          >
            {props.value ? (
              <Image imageId={props.value} className={styles.image} alt="Logo" />
            ) : (
              <>{props.placeholderIcon ? <>{props.placeholderIcon}</> : <MdAddAPhoto data-testid="defaultIcon" />}</>
            )}
          </button>
          {isSending && (
            <span className={`position-absolute spinner-border spinner-border-lg text-primary ${styles.spinner}`} />
          )}
        </div>
      </div>

      <input
        data-testid="inputFile"
        type="file"
        id={props.name}
        name={props.name}
        ref={fileInput}
        className="d-none"
        onChange={onChange}
      />
    </div>
  );
};

export default InputFileField;
