export interface BrandingEntitlements {
  canRemoveWatermark: boolean
}

export const FREE_BRANDING_ENTITLEMENTS: BrandingEntitlements = {
  canRemoveWatermark: false,
}

export function shouldShowWatermark(
  entitlements: BrandingEntitlements = FREE_BRANDING_ENTITLEMENTS
): boolean {
  return !entitlements.canRemoveWatermark
}
