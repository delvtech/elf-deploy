import { BigNumber } from "ethers";
import ethers from "ethers";

export const bnFloatMultiplier = (number: BigNumber, multiplier: number) => {
    return number.mul(Math.round(1e10 * multiplier)).div(1e10);
  };

export const fmtFloat = (number : BigNumber, one : BigNumber) => {
  const zeros = one.add((number).mod(one)).toString();
  return  `${(number).div(one).toNumber()}.${zeros.slice(1)}`
}