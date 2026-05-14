import { z } from "zod";
import { COMP_NAME, CompositionProps } from "../../types/constants";
import { useRendering } from "../helpers/use-rendering";
import { AlignEnd } from "./AlignEnd";
import { Button } from "./Button";
import { InputContainer } from "./Container";
import { DownloadButton } from "./DownloadButton";
import { ErrorComp } from "./Error";
import { ProgressBar } from "./ProgressBar";
import { Spacing } from "./Spacing";

export const RenderControls: React.FC<{
  inputProps: z.infer<typeof CompositionProps>;
  disabled?: boolean;
  disabledReason?: string;
}> = ({ inputProps, disabled, disabledReason }) => {
  const { renderMedia, state, undo } = useRendering(COMP_NAME, inputProps);
  const isInvoking = state.status === "invoking";

  return (
    <InputContainer>
      {state.status === "init" ||
      isInvoking ||
      state.status === "error" ? (
        <>
          <AlignEnd>
            <Button
              disabled={isInvoking || disabled}
              loading={isInvoking}
              onClick={renderMedia}
            >
              Render video
            </Button>
          </AlignEnd>
          {disabled && disabledReason ? (
            <div className="text-subtitle text-sm pt-geist-half">
              {disabledReason}
            </div>
          ) : null}
          {state.status === "error" ? (
            <ErrorComp message={state.error.message}></ErrorComp>
          ) : null}
        </>
      ) : null}
      {state.status === "rendering" || state.status === "done" ? (
        <>
          <ProgressBar
            progress={state.status === "rendering" ? state.progress : 1}
          />
          <Spacing></Spacing>
          <AlignEnd>
            <DownloadButton undo={undo} state={state}></DownloadButton>
          </AlignEnd>
        </>
      ) : null}
    </InputContainer>
  );
};
