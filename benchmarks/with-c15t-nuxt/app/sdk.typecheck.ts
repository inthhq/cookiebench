import type { useConsentKernel } from "@c15t/vue/vue-plugin";

export function typeContract(kernel: ReturnType<typeof useConsentKernel>) {
  void kernel.commands.save({ marketing: false, measurement: true });
  // @ts-expect-error Invalid action names must fail consumer compilation.
  void kernel.commands.save("invented-action");
  // @ts-expect-error Permission values must be boolean.
  void kernel.commands.save({ measurement: "yes" });
  // @ts-expect-error Unknown category names must fail consumer compilation.
  void kernel.commands.save({ inventedCategory: true });
}
