export const detectLayout = ({
  width,
  height,
}: {
  width: number;
  height: number;
}) => {
  if (height > width) {
    return "vertical";
  }

  if (width > height) {
    return "horizontal";
  }

  return "square";
};
