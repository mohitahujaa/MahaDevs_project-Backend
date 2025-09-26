import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { PREVIOUS_MATCHER_NAME } from "../constants.js";
export function preventAsyncMatcherChaining(context, matcherName, chaiUtils, allowSelfChaining = false) {
    const previousMatcherName = chaiUtils.flag(context, PREVIOUS_MATCHER_NAME);
    if (previousMatcherName === undefined) {
        chaiUtils.flag(context, PREVIOUS_MATCHER_NAME, matcherName);
        return;
    }
    if (previousMatcherName === matcherName && allowSelfChaining) {
        return;
    }
    throw new HardhatError(HardhatError.ERRORS.CHAI_MATCHERS.GENERAL.MATCHER_CANNOT_BE_CHAINED_AFTER, {
        matcher: matcherName,
        previousMatcher: previousMatcherName,
    });
}
//# sourceMappingURL=prevent-chaining.js.map