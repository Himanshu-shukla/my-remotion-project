import { CalculateMetadataFunction, Composition } from "remotion";
import {
  COMP_NAME,
  defaultMyCompProps,
  DURATION_IN_FRAMES,
  getVideoFrameOption,
  MANUAL_REEL_COMP_NAME,
  CompositionProps,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from "../../types/constants";
import {
  defaultManualTemplate,
  ManualReelProps,
} from "../../packages/template-engine/manual-template-schema";
import { Main } from "./MyComp/Main";
import { NextLogo } from "./MyComp/NextLogo";
import { ReelComposition } from "./ReelComposition";
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

const calculateManualReelMetadata: CalculateMetadataFunction<
  z.infer<typeof ManualReelProps>
> = ({ props }) => {
  const template = props.template ?? defaultManualTemplate;

  return {
    durationInFrames: Math.max(1, Math.ceil(template.duration * template.fps)),
    width: template.width,
    height: template.height,
    fps: template.fps,
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
        id={MANUAL_REEL_COMP_NAME}
        component={ReelComposition}
        durationInFrames={defaultManualTemplate.duration * defaultManualTemplate.fps}
        fps={defaultManualTemplate.fps}
        width={defaultManualTemplate.width}
        height={defaultManualTemplate.height}
        defaultProps={{
          template: defaultManualTemplate,
          assets: {},
        }}
        calculateMetadata={calculateManualReelMetadata}
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
