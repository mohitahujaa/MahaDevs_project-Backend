import { markTestWorkerDone } from "hardhat/internal/coverage";
export const mochaHooks = {
    async afterAll() {
        await markTestWorkerDone("mocha");
    },
};
//# sourceMappingURL=coverage.js.map