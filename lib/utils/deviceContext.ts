export type DeviceType = "mobile" | "tablet" | "desktop";
export type PresentationArm = "single_card" | "scrollable_list";

export interface DeviceContext {
  viewport: { width: number; height: number };
  isTouch: boolean;
  deviceType: DeviceType;
  presentationArm: PresentationArm;
}

export function getDeviceContext(): DeviceContext {
  const isClient = typeof window !== "undefined";
  const width = isClient ? window.innerWidth : 1200;
  const height = isClient ? window.innerHeight : 800;

  const isTouch = isClient ? (navigator.maxTouchPoints > 0) : false;

  let deviceType: DeviceType = "desktop";
  if (width < 768) {
    deviceType = "mobile";
  } else if (width <= 1024) {
    deviceType = "tablet";
  }

  const presentationArm: PresentationArm =
    Math.random() < 0.5 ? "single_card" : "scrollable_list";

  return {
    viewport: { width, height },
    isTouch,
    deviceType,
    presentationArm,
  };
}
