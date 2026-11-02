/* 统一兑换码入口；更换兑换码时同时更新 accessRevision，让旧解锁记录重新验证。 */
window.OfferConfig = Object.freeze({
  brand: 'Offer 来信局',
  title: '测测你什么时候能够拿到 Offer？',
  requireAccessCode: true,
  accessCode: '1661',
  accessRevision: 'shared-code-20261103',
  storageKey: 'offer-letter-session-v1',
  edition: 'VOL. 01',
  price: '0.99',
  posterFilename: '我的Offer来信.png'
});
