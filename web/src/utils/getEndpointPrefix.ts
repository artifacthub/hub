export default (): string => {
  let endpoint = '';
  if (process.env.NODE_ENV === 'development') {
    endpoint = `${process.env.REACT_APP_API_ENDPOINT}`;
  }

  return endpoint;
}
