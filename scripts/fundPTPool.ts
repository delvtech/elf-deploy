import { Vault__factory } from "../typechain/factories/Vault__factory";
import { ethers } from "hardhat";
import * as readline from "readline-sync";
import {Tranche__factory} from "../typechain/factories/Tranche__factory";
import {ERC20__factory} from "../typechain/factories/ERC20__factory";


// Edit to import the correct version
import goerli from "../addresses/goerli.json";
import mainnet from "../addresses/mainnet.json";

import {initPtPool} from "./ammFundingLib";
import { assert } from "console";


async function fundWithAddresses(addresses: any) {

    const [signer] = await ethers.getSigners();

    const trancheAddress = readline.question("Tranche address: ");
    const trancheFactory = new Tranche__factory(signer);
    const tranche = trancheFactory.attach(trancheAddress);

    const erc20Factory = new ERC20__factory(signer);
    const underlyingAdr = await tranche.underlying()
    const underlyingErc = erc20Factory.attach(underlyingAdr);

    let ptData;
    try {
        const name = (await underlyingErc.symbol()).toLowerCase();
        let ind = -1;
        let i = 0;
    
        if (addresses.tranches[name] == undefined) {
            addresses.tranches[name] = [];
        }
    
        for (let storedTranche of addresses.tranches[name]) {
            if (storedTranche.address == trancheAddress) {
                ind = i;
            }
            i ++;
        }

        ptData = addresses.tranches[name][ind].ptPool;
        assert(ptData != undefined);
    } catch {
        console.log("un inited pools or other formatting problem");
        return
    }
    
    const balancerFactory = new Vault__factory(signer);
    const vault = balancerFactory.attach(addresses.balancerVault);

    const expectedApy = Number.parseFloat(readline.question("Expected APY: "));
    const trancheLength = Number.parseFloat(readline.question("Tranche Length [fraction of year]: "));

    await initPtPool(
        signer,
        vault,
        tranche,
        underlyingErc,
        ptData.poolId,
        expectedApy,
        ptData.timeStretch,
        trancheLength
    )
}

async function main() {
    const [signer] = await ethers.getSigners();
    const network = await signer.provider?.getNetwork();
    switch(network?.chainId) {
        case 5 : {
            
            await fundWithAddresses(goerli);
            break;
        };
        case 1 : {
            await fundWithAddresses(mainnet);
            break;
        };
        default: {
            console.log("Unsupported network");
        }
    }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });