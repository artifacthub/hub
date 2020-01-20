export default (text: string): boolean => {
  try {
    const textField = document.createElement('textarea');
    textField.innerText = text;
    document.body.appendChild(textField);
    textField.select();
    document.execCommand('copy');
    textField.remove();
    return true;
  } catch {
    return false;
  }
}
