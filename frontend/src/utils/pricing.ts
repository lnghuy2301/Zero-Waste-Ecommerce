export function effectivePrice(variant: any): number {
  let price = Number(variant?.price || 0)
  const promo = variant?.promotion
  const now = Date.now()
  if (
    promo?.isActive &&
    new Date(promo.startDate).getTime() <= now &&
    new Date(promo.endDate).getTime() >= now
  ) {
    price =
      promo.discountType === 'PERCENT'
        ? price * (1 - Number(promo.discountValue) / 100)
        : price - Number(promo.discountValue)
  }
  return Math.round(Math.max(0, price) * 100) / 100
}
