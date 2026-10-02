/** Continuous recorded PRNG; choose from the full fraction, not alternating low bits. */
export function seededOrder<T>(items: readonly T[], seed: number): () => T[] {
  let state = seed % 4_294_967_296;
  return () => {
    const order = [...items];
    for (let index = order.length - 1; index > 0; index -= 1) {
      state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
      const other = Math.floor((state / 4_294_967_296) * (index + 1));
      [order[index], order[other]] = [order[other], order[index]];
    }
    return order;
  };
}
