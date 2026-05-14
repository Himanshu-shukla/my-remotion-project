import { CalculateMetadataFunction, Composition } from "remotion";
import {
  COMP_NAME,
  defaultMyCompProps,
  DURATION_IN_FRAMES,
  getVideoFrameOption,
  CompositionProps,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from "../../types/constants";
import { Main } from "./MyComp/Main";
import { NextLogo } from "./MyComp/NextLogo";
import { z } from "zod";

const calculateMyCompMetadata: CalculateMetadataFunction<
  z.infer<typeof CompositionProps>
> = ({ props }) => {
  const frameOption = getVideoFrameOption(props.videoFrameId);
  const durationInFrames = Math.max(
    1,
    Math.ceil(props.videoDurationInSeconds * VIDEO_FPS),
  );

  return {
    durationInFrames,
    width: frameOption.width,
    height: frameOption.height,
    props,
  };
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id={COMP_NAME}
        component={Main}
        durationInFrames={DURATION_IN_FRAMES}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={defaultMyCompProps}
        calculateMetadata={calculateMyCompMetadata}
      />
      <Composition
        id="NextLogo"
        component={NextLogo}
        durationInFrames={300}
        fps={30}
        width={140}
        height={140}
        defaultProps={{
          outProgress: 0,
        }}
      />
    </>
  );
};
