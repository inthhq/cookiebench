// installPageInteraction marks #page-action from the page's own client effect,
// so on a React page the mark means hydration has committed.
const hydratedSelector = '#page-action[data-interaction-installed="true"]';

/** Run once the page has hydrated, as a client effect would. */
export function afterHydration(run: () => void): void {
  if (document.querySelector(hydratedSelector)) {
    run();
    return;
  }
  const observer = new MutationObserver(() => {
    if (document.querySelector(hydratedSelector)) {
      observer.disconnect();
      run();
    }
  });
  observer.observe(document.documentElement, {
    attributeFilter: ["data-interaction-installed"],
    subtree: true,
  });
}
