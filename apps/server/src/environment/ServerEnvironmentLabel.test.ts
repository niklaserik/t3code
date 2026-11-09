import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner";

import * as HostProcess from "@t3tools/shared/HostProcess";

import * as ProcessRunner from "../processRunner.ts";
import { resolveServerEnvironmentLabel } from "./ServerEnvironmentLabel.ts";

const resolveLabel = (environment: Readonly<Record<string, string>>) =>
  resolveServerEnvironmentLabel({ cwdBaseName: "workspace" }).pipe(
    Effect.provide(FileSystem.layerNoop({})),
    Effect.provideService(HostProcess.Platform, "darwin"),
    Effect.provideService(HostProcess.Hostname, "shared-host"),
    Effect.provideService(HostProcess.Environment, environment),
    Effect.provideService(
      ProcessRunner.ProcessRunner,
      ProcessRunner.ProcessRunner.of({
        run: () =>
          Effect.succeed({
            stdout: "Mac Computer Name",
            stderr: "",
            code: ChildProcessSpawner.ExitCode(0),
            timedOut: false,
            stdoutTruncated: false,
            stderrTruncated: false,
            stdoutInvalidUtf8: false,
            stderrInvalidUtf8: false,
          }),
      }),
    ),
  );

it.effect("uses a configured label to distinguish servers on one hostname", () =>
  Effect.gen(function* () {
    const first = yield* resolveLabel({ T3CODE_ENVIRONMENT_LABEL: " Studio " });
    const second = yield* resolveLabel({ T3CODE_ENVIRONMENT_LABEL: "Build Mac" });

    expect(first).toBe("Studio");
    expect(second).toBe("Build Mac");
  }),
);

it.effect.each([undefined, "", " \t\n "])(
  "uses the automatic label fallback when the configured label is %s",
  (configuredLabel) =>
    Effect.gen(function* () {
      const label = yield* resolveLabel(
        configuredLabel === undefined ? {} : { T3CODE_ENVIRONMENT_LABEL: configuredLabel },
      );

      expect(label).toBe("Mac Computer Name");
    }),
);
