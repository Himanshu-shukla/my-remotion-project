export type DetectedLayout = {
  captionBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  captionConfidence: number;
  avatar: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  avatarConfidence: number;
};

export const detectApproximateLayout = ({
  width,
  height,
}: {
  width: number;
  height: number;
}): DetectedLayout => {
  const captionWidth = Math.round(width * 0.85);
  const captionHeight = Math.round(height * 0.17);
  const captionX = Math.round((width - captionWidth) / 2);

  return {
    captionBox: {
      x: captionX,
      y: Math.round(height * 0.68),
      width: captionWidth,
      height: captionHeight,
    },
    captionConfidence: 0.42,
    avatar: {
      x: Math.round(width * 0.06),
      y: Math.round(height * 0.25),
      width: Math.round(width * 0.4),
      height: Math.round(height * 0.5),
    },
    avatarConfidence: 0.28,
  };
};
