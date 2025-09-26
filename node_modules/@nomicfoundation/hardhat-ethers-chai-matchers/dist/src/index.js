import "./type-extensions.js";
const hardhatChaiMatchersPlugin = {
    id: "hardhat-ethers-chai-matchers",
    hookHandlers: {
        network: () => import("./internal/hook-handlers/network.js"),
    },
    npmPackage: "@nomicfoundation/hardhat-ethers-chai-matchers",
    dependencies: () => [import("@nomicfoundation/hardhat-ethers")],
};
export default hardhatChaiMatchersPlugin;
//# sourceMappingURL=index.js.map