import { toBigInt } from "@nomicfoundation/hardhat-utils/bigint";
import { getAddressOf } from "./account.js";
import { assertCanBeConvertedToBigint } from "./asserts.js";
export function getAddresses(accounts) {
    return Promise.all(accounts.map((account) => getAddressOf(account)));
}
export async function getBalances(ethers, accounts, blockNumber) {
    return Promise.all(accounts.map(async (account) => {
        const address = await getAddressOf(account);
        const result = await ethers.provider.getBalance(address, blockNumber);
        assertCanBeConvertedToBigint(result);
        return toBigInt(result);
    }));
}
//# sourceMappingURL=balance.js.map