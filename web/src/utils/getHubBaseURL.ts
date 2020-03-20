export default (): string => {
  let hubBaseUrl = '';
  if (process.env.NODE_ENV === 'development') {
    hubBaseUrl = `${process.env.REACT_APP_HUB_BASE_URL}`;
  }

  return hubBaseUrl;
};
