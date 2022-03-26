import { ethers } from "hardhat";
import { ERC20__factory } from "../typechain/factories/ERC20__factory";
import { Tranche__factory } from "../typechain/factories/Tranche__factory";
import { ZapSwapCurve__factory } from "../typechain/factories/ZapSwapCurve__factory";
import * as readline from "readline-sync";

// 1) For each principal token, the balancerVault must be an approved spender
// 2) For each principal token's base token, the balancerVault must be an
//    approved spender. This can be checked if already set
// 3) For each erc20 member of the base token's pool, both the zapSwapCurve
//    contract and the base token pool contract should be approved spenders
// 4) If any of the erc20 members of the base token pools contract is also an lp
//    token of a different curve pool, then we call that erc20 a meta token.
//    We then repeat step 3 with the meta token in place of the base token
//
// Notes:
// - Curve is notoriously unpredictable in contract structure so path finding
//   all these tokens and their structure is a hard problem. Therefore it is
//   recommended to express the relationships manually for all curve based
//   tokens
// - Also the crv3crypto/crvtricrypto have use pool wrappers to use ETH and
//   WETH. We should approve both the wrapper as we would the normal pool
//   and the original pool

const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const _3CRV = "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490";
const _3CRV_POOL = "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7";

const LUSD = "0x5f98805A4E8be255a32880FDeC7F6728C6568bA0";
const LUSD3CRV = "0xEd279fDD11cA84bEef15AF5D39BB4d4bEE23F0cA";
const LUSD3CRV_POOL = "0xEd279fDD11cA84bEef15AF5D39BB4d4bEE23F0cA";

const ALUSD = "0xBC6DA0FE9aD5f3b0d58160288917AA56653660E9";
const ALUSD3CRV = "0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c";
const ALUSD3CRV_POOL = "0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c";

const MIM = "0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3";
const MIM3LP3CRV = "0x5a6A4D54456819380173272A5E8E9B9904BdF41B";
const MIM3LP3CRV_POOL = "0x5a6A4D54456819380173272A5E8E9B9904BdF41B";

const WBTC = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599";
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const CRV3CRYPTO = "0xc4AD29ba4B3c580e6D59105FFf484999997675Ff";
const CRV3CRYPTO_POOL = "0xD51a44d3FaE010294C616388b506AcdA1bfAAE46";
const CRV3CRYPTO_POOL_WRAPPER = "0x3993d34e7e99Abf6B6f367309975d1360222D446";

const CRVTRICRYPTO = "0xcA3d75aC011BF5aD07a98d02f18225F9bD9A6BDF";
const CRVTRICRYPTO_POOL = "0x80466c64868E1ab14a1Ddf27A676C3fcBE638Fe5";
const CRVTRICRYPTO_POOL_WRAPPER = "0x331aF2E331bd619DefAa5DAc6c038f53FCF9F785";

const STETH = "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84";
const STECRV = "0x06325440D014e39736583c165C2963BA99fAf14E";
const STECRV_POOL = "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022";

const EURS = "0xdB25f211AB05b1c97D595516F45794528a807ad8";
const SEUR = "0xD71eCFF9342A5Ced620049e616c5035F1dB98620";
const EURSCRV = "0x194eBd173F6cDacE046C53eACcE9B953F28411d1";
const EURSCRV_POOL = "0x0Ce6a5fF5217e38315f87032CF90686C96627CAA";

interface TrancheInfo {
  address: string;
  expiration: number;
}
type TrancheData = Record<string, TrancheInfo[]>;

export async function setZapSwapCurveApprovals(addresses: any) {
  if (!addresses?.zaps?.zapSwapCurve) {
    console.log("Error: zapSwapCurve not deployed");
    return;
  }
  if (addresses.balancerVault == undefined || addresses.balancerVault == "") {
    console.log("Error: please init");
    return;
  }

  const [signer] = await ethers.getSigners();
  const zapSwapCurve = ZapSwapCurve__factory.connect(
    addresses.zaps.zapSwapCurve,
    signer
  );

  const BALANCER_VAULT = addresses.balancerVault;

  const build3CrvMappings = (basePool: string) => [
    { token: DAI, spender: _3CRV_POOL },
    { token: USDC, spender: _3CRV_POOL },
    { token: USDT, spender: _3CRV_POOL },
    { token: DAI, spender: zapSwapCurve.address },
    { token: USDC, spender: zapSwapCurve.address },
    { token: USDT, spender: zapSwapCurve.address },
    { token: _3CRV, spender: basePool },
    { token: _3CRV, spender: zapSwapCurve.address },
  ];

  // manually edit accordingly for any new curve based tranche
  const tokensAndSpendersByUnderlying: Record<
    string,
    { token: string; spender: string }[]
  > = {
    [LUSD3CRV]: [
      ...build3CrvMappings(LUSD3CRV_POOL),
      { token: LUSD, spender: LUSD3CRV_POOL },
      { token: LUSD, spender: zapSwapCurve.address },
      { token: LUSD3CRV, spender: BALANCER_VAULT },
    ],
    [ALUSD3CRV]: [
      ...build3CrvMappings(ALUSD3CRV_POOL),
      { token: ALUSD, spender: ALUSD3CRV_POOL },
      { token: ALUSD, spender: zapSwapCurve.address },
      { token: ALUSD3CRV, spender: BALANCER_VAULT },
    ],
    [MIM3LP3CRV]: [
      ...build3CrvMappings(MIM3LP3CRV_POOL),
      { token: MIM, spender: MIM3LP3CRV_POOL },
      { token: MIM, spender: zapSwapCurve.address },
      { token: MIM3LP3CRV_POOL, spender: BALANCER_VAULT },
    ],
    [CRV3CRYPTO]: [
      { token: USDT, spender: CRV3CRYPTO_POOL },
      { token: USDT, spender: CRV3CRYPTO_POOL_WRAPPER },
      { token: USDT, spender: zapSwapCurve.address },
      { token: WBTC, spender: CRV3CRYPTO_POOL },
      { token: WBTC, spender: CRV3CRYPTO_POOL_WRAPPER },
      { token: WBTC, spender: zapSwapCurve.address },
      { token: WETH, spender: CRV3CRYPTO_POOL },
      { token: WETH, spender: zapSwapCurve.address },
      { token: CRV3CRYPTO, spender: CRV3CRYPTO_POOL },
      { token: CRV3CRYPTO, spender: CRV3CRYPTO_POOL_WRAPPER },
      { token: CRV3CRYPTO, spender: BALANCER_VAULT },
    ],
    [CRVTRICRYPTO]: [
      { token: USDT, spender: CRVTRICRYPTO_POOL },
      { token: USDT, spender: CRVTRICRYPTO_POOL_WRAPPER },
      { token: USDT, spender: zapSwapCurve.address },
      { token: WBTC, spender: CRVTRICRYPTO_POOL },
      { token: WBTC, spender: CRVTRICRYPTO_POOL_WRAPPER },
      { token: WBTC, spender: zapSwapCurve.address },
      { token: WETH, spender: CRVTRICRYPTO_POOL },
      { token: WETH, spender: zapSwapCurve.address },
      { token: CRVTRICRYPTO, spender: CRVTRICRYPTO_POOL },
      { token: CRVTRICRYPTO, spender: CRVTRICRYPTO_POOL_WRAPPER },
      { token: CRVTRICRYPTO, spender: BALANCER_VAULT },
    ],
    [STECRV]: [
      { token: STETH, spender: STECRV_POOL },
      { token: STETH, spender: zapSwapCurve.address },
      { token: STECRV, spender: STECRV_POOL },
      { token: STECRV, spender: BALANCER_VAULT },
    ],
    [EURSCRV]: [
      { token: EURS, spender: EURSCRV_POOL },
      { token: EURS, spender: zapSwapCurve.address },
      { token: SEUR, spender: EURSCRV_POOL },
      { token: SEUR, spender: zapSwapCurve.address },
      { token: EURSCRV, spender: EURSCRV_POOL },
      { token: EURSCRV_POOL, spender: BALANCER_VAULT },
    ],
  };

  // extract only active tranches
  let activeTranches: TrancheInfo[] = [];
  for (const tranchesByPrincipalToken of Object.values(
    addresses.tranches as TrancheData
  )) {
    const currentTime = Math.round(Date.now() / 1000);
    activeTranches = [
      ...activeTranches,
      ...tranchesByPrincipalToken.filter((x) => x.expiration > currentTime),
    ];
  }

  // Extract principal - underlying address correspondance
  const principalTokenAddresses = activeTranches.map(({ address }) => address);
  const underlyingAddresses = await Promise.all(
    principalTokenAddresses.map(async (address) => {
      const contract = Tranche__factory.connect(address, signer);
      return await contract.underlying();
    })
  );

  // List of unique tokens and spenders to be approved, pending allowance
  // filtration
  let tokensAndSpendersUnchecked: { token: string; spender: string }[] = [];

  for (let i = 0; i < principalTokenAddresses.length; i++) {
    const principalAddress = principalTokenAddresses[i];
    const underlyingTokenAddress = underlyingAddresses[i];

    // If we detect a new tranche that has an underlying that is unspecifed in
    // the above list we indicate it and continue.
    // User sho
    if (!tokensAndSpendersByUnderlying[underlyingTokenAddress]) {
      console.log(
        `No underlying approval relations found for tranche address ${principalAddress}`
      );
      continue;
    }

    tokensAndSpendersUnchecked = [
      ...tokensAndSpendersUnchecked,
      ...tokensAndSpendersByUnderlying[underlyingTokenAddress].filter(
        ({ token, spender }) =>
          !tokensAndSpendersUnchecked.some(
            (ts) => ts.spender === spender && ts.token === token
          )
      ),
      { token: principalAddress, spender: BALANCER_VAULT },
    ];
  }

  // Tokens and spenders filtered with an allowance check
  const tokensAndSpendersWithSymbol = (
    await Promise.all(
      tokensAndSpendersUnchecked.map(async ({ token, spender }) => {
        const tokenContract = ERC20__factory.connect(token, signer);

        const [allowance, symbol] = await Promise.all([
          tokenContract.allowance(zapSwapCurve.address, spender),
          tokenContract.symbol(),
        ]);

        if (allowance.gt(0)) {
          return;
        } else {
          return { token, spender, symbol };
        }
      })
    )
  ).filter(
    (x): x is { token: string; spender: string; symbol: string } =>
      x !== undefined
  );

  if (tokensAndSpendersWithSymbol.length === 0) {
    console.log("No allowances to be made!");
    return;
  }

  tokensAndSpendersWithSymbol.forEach(({ token, spender, symbol }) =>
    console.log(`Approving ${spender} to use token ${token} :: ${symbol}`)
  );

  const tokens = tokensAndSpendersWithSymbol.map(({ token }) => token);
  const spenders = tokensAndSpendersWithSymbol.map(({ spender }) => spender);

  const submitApprovals = readline.question("Confirm set approvals [Y/N]: ");

  if (submitApprovals === "Y") {
    const gas = readline.question("Set gas price: ");
    console.log("Submitting approvals...");
    const tx = await zapSwapCurve.setApprovalsFor(
      tokens,
      spenders,
      spenders.map(() => ethers.constants.MaxUint256),
      {
        maxFeePerGas: ethers.utils.parseUnits(gas, "gwei"),
      }
    );
    console.log(tx.hash);
    await tx.wait(1);
    console.log("Approvals submitted...");
  }
}
