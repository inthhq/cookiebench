// controlledWorkload() from @cookiebench/fixture-support reads
// window.location. SvelteKit renders the provider on the server too, so the
// same list is built here from the request URL, which carries the same
// `scripts` and `token` parameters.
export function controlledWorkload(url: {
  readonly searchParams: Pick<URLSearchParams, "get">;
}) {
  const count = Number(url.searchParams.get("scripts") ?? "2");
  if (!Number.isSafeInteger(count) || count < 0 || count > 1000) {
    throw new Error("Invalid controlled script count.");
  }
  const token =
    url.searchParams.get("token") ?? url.searchParams.get("cbToken") ?? "fixture";
  return Array.from({ length: count }, (_, index) => {
    const category =
      index % 2 === 0 ? ("measurement" as const) : ("marketing" as const);
    const id = `controlled-${index}`;
    const query = new URLSearchParams({ category, id });
    query.set("token", token);
    return { category, id, src: `/controlled/script?${query}` };
  });
}
