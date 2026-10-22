export const formatNumber = (value) => {
  return Intl.NumberFormat("en", {
    notation: "compact",
  }).format(value);
};
