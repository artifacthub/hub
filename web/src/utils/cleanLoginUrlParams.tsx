export default (url: string): string => {
  const urlParams = new URLSearchParams(url);
  urlParams.delete('modal');
  urlParams.delete('redirect');
  return urlParams.toString();
};
