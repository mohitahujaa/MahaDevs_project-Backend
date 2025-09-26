import "hardhat/types/config";
import type { TypechainConfig, TypechainUserConfig } from "./types.js";
declare module "hardhat/types/config" {
    interface HardhatUserConfig {
        typechain?: TypechainUserConfig;
    }
    interface HardhatConfig {
        readonly typechain: TypechainConfig;
    }
}
import "hardhat/types/global-options";
declare module "hardhat/types/global-options" {
    interface GlobalOptions {
        noTypechain: boolean;
    }
}
//# sourceMappingURL=type-extensions.d.ts.map