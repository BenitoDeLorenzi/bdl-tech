export function currencyDisplay(value: string) {
  if (!value) return "";
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(number)
    : "";
}
export function currencyValue(input: string): string | null {
  if (input.includes("-")) return null;
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  const cents = Number(digits);
  if (!Number.isSafeInteger(cents) || cents > 99999999999) return null;
  return (cents / 100).toFixed(2);
}

// Integer arithmetic matches Postgres rounding for positive entry costs.
export function entryCostTotal(
  quantity: string,
  unitCost: string,
): number | null {
  if (
    !/^\d+(\.\d{1,3})?$/.test(quantity) ||
    !/^\d+(\.\d{1,2})?$/.test(unitCost)
  )
    return null;
  const [q, fraction = ""] = quantity.split(".");
  const [cost, cents = ""] = unitCost.split(".");
  const milliunits = BigInt(q) * BigInt(1000) + BigInt(fraction.padEnd(3, "0"));
  const unitCents = BigInt(cost) * BigInt(100) + BigInt(cents.padEnd(2, "0"));
  return Number((milliunits * unitCents + BigInt(500)) / BigInt(1000)) / 100;
}
