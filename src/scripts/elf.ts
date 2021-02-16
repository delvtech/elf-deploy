import { Signer } from "ethers";
import hre from "hardhat";
import { AYVault, Elf, ElfFactory, ERC20, YVaultAssetProxy } from "types";
import { Elf__factory } from "../types";

export async function deployElf<T extends ERC20>(
  elfFactoryContract: ElfFactory,
  baseAssetContract: T,
  signer: Signer
): Promise<Elf> {
  // TODO: make the vault type configurable
  const VaultDeployer = await hre.ethers.getContractFactory("AYVault");
  const vaultContract = (await VaultDeployer.deploy(
    baseAssetContract.address
  )) as AYVault;

  // TODO: make the asset proxy type configurable
  const AssetProxyDeployer = await hre.ethers.getContractFactory(
    "YVaultAssetProxy"
  );
  const assetProxyContract = (await AssetProxyDeployer.deploy(
    vaultContract.address,
    baseAssetContract.address
  )) as YVaultAssetProxy;

  await elfFactoryContract.newPool(
    baseAssetContract.address,
    assetProxyContract.address
  );

  const elfContract = await getLastDeployedElf(elfFactoryContract, signer);

  await assetProxyContract.setPool(elfContract.address);

  return elfContract;
}

// TODO: figure out a better way to get the elf address?
const getLastDeployedElf = async (
  elfFactoryContract: ElfFactory,
  signer: Signer
) => {
  const signerAddress = await signer.getAddress();
  const filter = elfFactoryContract.filters.NewPool(signerAddress, null);
  const results = await elfFactoryContract.queryFilter(filter);
  // ugly line to grab the second argument passed to the event, which is the pool address.
  const elfAddress = results[results.length - 1]?.args?.[1] as string;
  const elfContract = Elf__factory.connect(elfAddress, signer);

  return elfContract;
};
