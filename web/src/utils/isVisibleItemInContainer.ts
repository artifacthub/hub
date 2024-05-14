import isNull from 'lodash/isNull';

const isVisibleItemInContainer = function (ele: HTMLDivElement | null, container: HTMLDivElement | null): boolean {
  if (!isNull(ele) && !isNull(container)) {
    const { bottom, height, top } = ele.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    return top <= containerRect.top ? containerRect.top - top <= height : bottom - containerRect.bottom <= height;
  }
  return false;
};

export default isVisibleItemInContainer;
