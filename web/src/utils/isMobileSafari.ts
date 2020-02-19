export default (): boolean => {
  return (
    /iPad|iPhone|iPod/.test(window.navigator.platform) &&
    /^((?!CriOS).)*Safari/.test(window.navigator.userAgent)
  );
}
