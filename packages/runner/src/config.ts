import {
  DeviceProfile,
  FixtureConfig,
  ScenarioConfig,
} from "@cookiebench/schema";
import { Schema } from "effect";

export const RunConfig = Schema.Struct({
  executablePath: Schema.optionalKey(Schema.String),
  fixtures: Schema.Array(FixtureConfig).check(
    Schema.isMinLength(1),
    Schema.makeFilter(
      (fixtures) =>
        fixtures.every(
          (fixture) =>
            fixture.deployment !== undefined &&
            (!fixture.baseline || fixture.deployment.backend === "none")
        ),
      {
        message:
          "New runs must declare fixture deployment; no-CMP baselines must use backend 'none'.",
      }
    )
  ),
  iterations: Schema.Number.check(
    Schema.isInt(),
    Schema.isGreaterThan(0),
    Schema.isLessThanOrEqualTo(10_000)
  ),
  profile: DeviceProfile,
  scenarios: Schema.Array(ScenarioConfig).check(Schema.isMinLength(1)),
  seed: Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
  warmups: Schema.optionalKey(
    Schema.Number.check(
      Schema.isInt(),
      Schema.isGreaterThanOrEqualTo(0),
      Schema.isLessThanOrEqualTo(100)
    )
  ),
}).check(
  Schema.makeFilter(
    (config) =>
      (!config.profile.isMobile ||
        (config.profile.hasTouch !== undefined &&
          config.profile.userAgent !== undefined)) &&
      new Set(config.fixtures.map((fixture) => fixture.id)).size ===
        config.fixtures.length &&
      new Set(config.scenarios.map((scenario) => scenario.id)).size ===
        config.scenarios.length &&
      config.scenarios.every(
        (scenario) =>
          scenario.workload.scriptCount === 0 ||
          scenario.workload.categories.length > 0
      )
  )
);
export type RunConfig = typeof RunConfig.Type;
export const decodeRunConfig = Schema.decodeUnknownSync(RunConfig, {
  onExcessProperty: "error",
});
