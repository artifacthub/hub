const removeProtocol = (url: string): string => {
  if (!url) return '';
  return url.replace(/(^\w+:|^)\/\//, '');
};

export default removeProtocol;
