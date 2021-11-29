import 'react-image-crop/dist/ReactCrop.css';

import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BiCrop, BiImageAlt } from 'react-icons/bi';
import { MdAddAPhoto } from 'react-icons/md';
import ReactCrop from 'react-image-crop';

import API from '../../api';
import { ErrorKind, LogoImage } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import Image from './Image';
import styles from './InputFileField.module.css';
import Modal from './Modal';

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

const DEFAULT_CROP: ReactCrop.Crop = { aspect: 1 };

const InputFileField = (props: Props) => {
  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const [upImg, setUpImg] = useState<ArrayBuffer | string | null>(null);
  const [crop, setCrop] = useState<ReactCrop.Crop>(DEFAULT_CROP);
  const [completedCrop, setCompletedCrop] = useState<ReactCrop.Crop | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [image, setImage] = useState<any>(null);

  async function saveImage(data: string | ArrayBuffer) {
    try {
      const logo: LogoImage = await API.saveImage(data);
      setIsSending(false);
      if (!isUndefined(props.onImageChange)) {
        props.onImageChange(logo.imageId);
      }
    } catch (err: any) {
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

  const onClose = () => {
    setOpenStatus(false);
    if (!isNull(fileInput) && !isNull(fileInput.current)) {
      fileInput.current!.value = '';
    }
    setCrop(DEFAULT_CROP);
    setUpImg(null);
    setCompletedCrop(null);
    setImage(null);
  };

  const saveOriginal = (file: any) => {
    setIsSending(true);
    const reader = new FileReader();
    reader.onloadend = (r: ProgressEvent<FileReader>) => {
      if (!isNull(r.target) && !isNull(r.target.result)) {
        saveImage(r.target.result);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const saveCroppedImage = (canvas: any, crop: any) => {
    if (!crop || !canvas) {
      alertDispatcher.postAlert({
        type: 'danger',
        message: 'An error occurred saving the image, please try again later.',
      });
      return;
    }

    setIsSending(true);
    canvas.toBlob(
      (blob: any) => {
        saveImage(blob);
        onClose();
      },
      'image/png',
      1
    );
  };

  const onSelectFile = () => {
    if (
      !isNull(fileInput) &&
      !isNull(fileInput.current) &&
      !isNull(fileInput.current.files) &&
      fileInput.current.files.length > 0
    ) {
      setIsSending(false);
      setImage(fileInput.current.files[0]);
      const file = fileInput.current.files[0];
      if (!file.type.startsWith('image/')) {
        alertDispatcher.postAlert({
          type: 'danger',
          message: 'Sorry, only images are accepted',
        });
      } else {
        const type = file.type;
        if (type === 'image/svg+xml') {
          saveOriginal(file);
        } else {
          setOpenStatus(true);
          const reader = new FileReader();
          reader.addEventListener('load', () => {
            setUpImg(reader.result);
          });
          reader.readAsDataURL(file);
        }
      }
      setIsSending(false);
    }
  };

  const onLoad = useCallback((img) => {
    const initialCrop = () => {
      const width = img.width > img.height ? (img.height / img.width) * 100 : 100;
      const height = img.height > img.width ? (img.width / img.height) * 100 : 100;
      const x = width === 100 ? 0 : (100 - width) / 2;
      const y = height === 100 ? 0 : (100 - height) / 2;

      setCrop({
        unit: '%',
        aspect: 1,
        width,
        height,
        x,
        y,
      });
    };

    imgRef.current = img;
    initialCrop();
    return false;
  }, []);

  // Update completedCrop after loading image
  useEffect(() => {
    if (openStatus && isNull(completedCrop) && crop !== DEFAULT_CROP) {
      const img: any = imgRef.current;
      setCompletedCrop({
        unit: 'px',
        aspect: 1,
        width: (img.width * crop.width!) / 100,
        height: (img.height * crop.height!) / 100,
        x: (img.width * crop.x!) / 100,
        y: (img.height * crop.y!) / 100,
      });
    }
  }, [openStatus, crop, completedCrop]);

  useEffect(() => {
    if (!isNull(completedCrop) && openStatus) {
      const img: any = imgRef.current;
      const canvas: any = previewCanvasRef.current;

      if (!isNull(canvas) && !isNull(img)) {
        const tmpCrop: any = completedCrop;

        const scaleX = img.naturalWidth / img.width;
        const scaleY = img.naturalHeight / img.height;
        const ctx = canvas.getContext('2d');
        const pixelRatio = window.devicePixelRatio;

        canvas.width = tmpCrop.width * pixelRatio;
        canvas.height = tmpCrop.height * pixelRatio;

        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(
          img,
          tmpCrop.x * scaleX,
          tmpCrop.y * scaleY,
          tmpCrop.width * scaleX,
          tmpCrop.height * scaleY,
          0,
          0,
          tmpCrop.width,
          tmpCrop.height
        );
      }
    }
  }, [completedCrop]); /* eslint-disable-line react-hooks/exhaustive-deps */

  const onClick = () => {
    if (!isNull(fileInput) && !isNull(fileInput.current)) {
      fileInput.current.click();
    }
  };

  return (
    <>
      <div className={`form-group mb-4 ${props.className}`}>
        <div className="d-flex flex-column">
          <label className={styles.label} htmlFor={props.name}>
            <span className="font-weight-bold">{props.label}</span>
            {props.labelLegend && <>{props.labelLegend}</>}
          </label>

          <div className="position-relative">
            <button
              className={classnames('btn p-0 overflow-hidden position-relative', styles.btn, {
                [styles.isLoading]: isSending,
              })}
              type="button"
              onClick={onClick}
              aria-label="Add image"
              disabled={isSending}
            >
              {props.value ? (
                <Image
                  imageId={props.value}
                  className={styles.image}
                  classNameForSquare={styles.imageAsBg}
                  alt="Logo"
                />
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
          type="file"
          id={props.name}
          name={props.name}
          ref={fileInput}
          className="d-none"
          onChange={onSelectFile}
        />
      </div>

      {openStatus && (
        <Modal
          header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Crop image</div>}
          open={openStatus}
          modalClassName={styles.modal}
          onClose={onClose}
          closeButton={
            <>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => {
                  if (!isNull(image)) {
                    saveImage(image);
                    onClose();
                  }
                }}
                disabled={isNull(image)}
                aria-label="Save original"
              >
                <div className="d-flex flex-row align-items-center">
                  <BiImageAlt className="mr-2" />
                  <span>Save original</span>
                </div>
              </button>

              <button
                type="button"
                className="btn btn-sm btn-secondary ml-3"
                disabled={!completedCrop?.width || !completedCrop?.height}
                onClick={() => saveCroppedImage(previewCanvasRef.current, completedCrop)}
              >
                <div className="d-flex flex-row align-items-center">
                  <BiCrop className="mr-2" />
                  <span>Save cropped image</span>
                </div>
              </button>
            </>
          }
        >
          <div className="w-100 h-100 d-flex flex-column">
            <div className={`flex-grow-1 d-flex align-items-center justify-content-center pt-1 ${styles.cropWrapper}`}>
              <div className="overflow-auto mx-auto mw-100 mh-100">
                {upImg && (
                  <ReactCrop
                    src={upImg as string}
                    onImageLoaded={onLoad}
                    crop={crop}
                    circularCrop
                    onChange={(c) => setCrop(c)}
                    onComplete={(c: ReactCrop.Crop) => setCompletedCrop(c)}
                  />
                )}
              </div>
            </div>
            <div className="d-flex flex-row align-items-center mt-3">
              <div className="font-weight-bold mr-3 text-uppercase">Preview</div>
              <div className={`overflow-hidden position-relative ${styles.imageWrapper}`}>
                <canvas className={`${styles.canvas} ${styles.imageAsBg}`} ref={previewCanvasRef} />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default InputFileField;
