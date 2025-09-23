import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { readUtf8File } from "@nomicfoundation/hardhat-utils/fs";
import { bigintReviver } from "../internal/utils/bigintReviver.js";
export async function readDeploymentParameters(filepath) {
    try {
        const { default: { parse }, } = await import("json5");
        const rawFile = await readUtf8File(filepath);
        return await parse(rawFile.toString(), bigintReviver);
    }
    catch (e) {
        if (HardhatError.isHardhatError(e)) {
            throw e;
        }
        if (e instanceof Error) {
            throw new HardhatError(HardhatError.ERRORS.IGNITION.INTERNAL.FAILED_TO_PARSE_DEPLOYMENT_PARAMETERS, {
                filepath,
            }, e);
        }
        throw e;
    }
}
//# sourceMappingURL=read-deployment-parameters.js.map