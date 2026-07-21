export function formatIndianNumber(number: number): string {
  if (!number || isNaN(number)) return "₹0";

  const isNegative = number < 0;
  const absNumber = Math.abs(number);
  const value = Math.round(absNumber);

  if (absNumber >= 10000000) {
    const crores = Math.floor(value / 10000000);
    const remainder = value % 10000000;
    const lakhs = Math.floor(remainder / 100000);
    const lastFive = remainder % 100000;
    const lastThree = lastFive % 1000;
    const middleTwo = Math.floor((lastFive - lastThree) / 1000);

    if (lakhs > 0) {
      if (lastFive > 0) {
        return `${isNegative ? "-" : ""}₹${crores},${lakhs.toString().padStart(2, "0")},${middleTwo.toString().padStart(2, "0")},${lastThree.toString().padStart(3, "0")}`;
      } else {
        return `${isNegative ? "-" : ""}₹${crores},${lakhs.toString().padStart(2, "0")},00,000`;
      }
    } else {
      return `${isNegative ? "-" : ""}₹${crores},00,00,000`;
    }
  } else if (absNumber >= 100000) {
    const lakhs = Math.floor(value / 100000);
    const remainder = value % 100000;
    const thousands = Math.floor(remainder / 1000);
    const lastThree = remainder % 1000;

    if (thousands > 0) {
      return `${isNegative ? "-" : ""}₹${lakhs},${thousands.toString().padStart(2, "0")},${lastThree.toString().padStart(3, "0")}`;
    } else {
      return `${isNegative ? "-" : ""}₹${lakhs},00,000`;
    }
  } else {
    return `${isNegative ? "-" : ""}₹${value.toLocaleString("en-IN")}`;
  }
}