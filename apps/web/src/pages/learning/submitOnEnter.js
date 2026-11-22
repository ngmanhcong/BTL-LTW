export default function submitOnEnter(event) {
  if (
    event.key === 'Enter' &&
    !event.shiftKey &&
    !event.nativeEvent.isComposing &&
    event.keyCode !== 229
  ) {
    event.preventDefault();
    if (!event.repeat) event.currentTarget.form?.requestSubmit();
  }
}
