export type SaleTarget = {
  name: string;
  url: string;
};

export const saleTargets: SaleTarget[] = [
  {
    name: "Yahya",
    url: "https://script.google.com/macros/s/AKfycbyyJqlRYAkD9LaDfpN1tCDV1Hq8iEDz0HDiH8kNLdKt7TYueL5kRbvrT4ncYM3jRdkHvw/exec",
  },
  {
    name: "Fery",
    url: "https://script.google.com/macros/s/AKfycbzHaqDnw_TSBMbSDDRE3ZMSUDIuHmXsJ0QnLuyApRvUQ6QnT0Es2XLwnr-5wvVukFl1dw/exec",
  },
  {
    name: "Toha",
    url: "https://script.google.com/macros/s/AKfycbzM9owJgDcfZaix04Hypk-5DnBBpJ2zX2Zp0ubu1uThlK21TongrFluIQhqbnrcVk8sLQ/exec",
  },
  {
    name: "Kasmawati",
    url: "https://script.google.com/macros/s/AKfycbwQH9mleNjkYczL-6QLyQkJ9oAqgsdnVMbDvnn4nr9rT3H-tihRy7QFFiGmGfnFMPSiNg/exec",
  },
  {
    name: "Mira",
    url: "https://script.google.com/macros/s/AKfycbxJh33HeNYuaT-_uxUci799nhwTzKRT1dhn23Cd5I-Lb-tl9EWdSJQ9nz6iYakSEM2IiQ/exec",
  },
];

export function resolveSaleTarget(name: string) {
  return saleTargets.find((target) => target.name === name) ?? null;
}
