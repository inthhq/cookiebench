export function requiredElement<T extends Element = HTMLElement>(
  selector: string
): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Fixture element ${selector} was not rendered.`);
  }
  return element;
}
