import { generateTypes } from "../generate-types.js";
export default async () => {
    const handlers = {
        async onCleanUpArtifacts(context, artifactPaths, next) {
            await generateTypes(context.config.paths.root, context.config.typechain, context.globalOptions.noTypechain, artifactPaths);
            return next(context, artifactPaths);
        },
    };
    return handlers;
};
//# sourceMappingURL=solidity.js.map