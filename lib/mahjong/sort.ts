const order = ["m", "p", "s", "z"];

export const sortTiles = (tiles: string[]) => {
  return [...tiles].sort((a, b) => {
    const suitA = a[a.length - 1];
    const suitB = b[b.length - 1];

    if (suitA !== suitB) {
      return order.indexOf(suitA) - order.indexOf(suitB);
    }

    return parseInt(a) - parseInt(b);
  });
};
