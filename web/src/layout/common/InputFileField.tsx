import 'react-image-crop/src/ReactCrop.scss';

import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BiCrop, BiImageAlt } from 'react-icons/bi';
import { MdAddAPhoto } from 'react-icons/md';
import ReactCrop, { centerCrop, Crop, makeAspectCrop, PixelCrop } from 'react-image-crop';

import API from '../../api';
import { ErrorKind, LogoImage } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import Image from './Image';
import styles from './InputFileField.module.css';
import Loading from './Loading';
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
  circularCrop: boolean;
}

const InputFileField = (props: Props) => {
  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const [upImg, setUpImg] = useState<ArrayBuffer | string | null>(null);
  const [crop, setCrop] = useState<Crop | undefined>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [image, setImage] = useState<any>(null);

  async function saveImage(data: string | ArrayBuffer) {
    try {
      const logo: LogoImage = await API.saveImage(data);
      setIsSending(false);
      if (!isUndefined(props.onImageChange)) {
        props.onImageChange(logo.imageId);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    setCrop(undefined);
    setUpImg(null);
    setCompletedCrop(null);
    setImage(null);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onImageLoad = useCallback((e: any) => {
    const { width, height } = e.currentTarget;

    const cropped = centerCrop(
      makeAspectCrop(
        {
          // You don't need to pass a complete crop into
          // makeAspectCrop or centerCrop.
          unit: '%',
          width: 90,
        },
        1,
        width,
        height
      ),
      width,
      height
    );

    imgRef.current = e.currentTarget;
    setCrop(cropped);
  }, []);

  useEffect(() => {
    if (!isNull(completedCrop) && openStatus) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const img: any = imgRef.current;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const canvas: any = previewCanvasRef.current;

      if (!isNull(canvas) && !isNull(img)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  }, [completedCrop]);

  const onClick = () => {
    if (!isNull(fileInput) && !isNull(fileInput.current)) {
      fileInput.current.click();
    }
  };

  return (
    <>
      <div className={` mb-4 ${props.className}`}>
        <div className="d-flex flex-column">
          <label className={`form-label ${styles.label}`} htmlFor={props.name}>
            <span className="fw-bold">{props.label}</span>
            {props.labelLegend && <>{props.labelLegend}</>}
          </label>

          <div className="position-relative">
            <button
              className={classnames(
                'btn p-0 overflow-hidden position-relative lh-1 fs-2',
                styles.btn,
                { 'opacity-50': isSending },
                { [`rounded-circle border border-2 bg-white ${styles.circularBtn}`]: props.circularCrop }
              )}
              type="button"
              onClick={onClick}
              aria-label="Add image"
              disabled={isSending}
            >
              {props.value ? (
                <Image
                  imageId={props.value}
                  className="mh-100 mw-100"
                  classNameForSquare={`position-absolute w-100 h-100 top-0 start-0 ${styles.imageAsBg}`}
                  alt="Logo"
                />
              ) : (
                <>{props.placeholderIcon ? <>{props.placeholderIcon}</> : <MdAddAPhoto data-testid="defaultIcon" />}</>
              )}
            </button>
            {isSending && <Loading spinnerClassName={`position-absolute text-primary ${styles.spinner}`} noWrapper />}
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
                  <BiImageAlt className="me-2" />
                  <span>Save original</span>
                </div>
              </button>

              <button
                type="button"
                className="btn btn-sm btn-secondary ms-3"
                disabled={!completedCrop?.width || !completedCrop?.height}
                onClick={() => saveCroppedImage(previewCanvasRef.current, completedCrop)}
              >
                <div className="d-flex flex-row align-items-center">
                  <BiCrop className="me-2" />
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
                    crop={crop}
                    aspect={1}
                    circularCrop={props.circularCrop}
                    onChange={(c) => setCrop(c)}
                    onComplete={(c: PixelCrop) => setCompletedCrop(c)}
                  >
                    <img alt={props.label} src={upImg as string} onLoad={onImageLoad} />
                  </ReactCrop>
                )}
              </div>
            </div>
            <div className="d-flex flex-row align-items-center mt-3">
              <div className="fw-bold me-3 text-uppercase">Preview</div>
              <div
                className={classnames(
                  'overflow-hidden position-relative border border-3 bg-white',
                  styles.imageWrapper,
                  { 'rounded-circle': props.circularCrop }
                )}
              >
                {completedCrop && (
                  <canvas
                    className={classnames('mw-100 mh-100', styles.imageAsBg, { 'rounded-circle': props.circularCrop })}
                    ref={previewCanvasRef}
                  />
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default InputFileField;
