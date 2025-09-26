import "./type-extensions.js";
const hardhatNetworkHelpersPlugin = {
    id: "hardhat-network-helpers",
    hookHandlers: {
        network: () => import("./internal/hook-handlers/network.js"),
    },
    npmPackage: "@nomicfoundation/hardhat-network-helpers",
};
export default hardhatNetworkHelpersPlugin;
//# sourceMappingURL=index.js.map