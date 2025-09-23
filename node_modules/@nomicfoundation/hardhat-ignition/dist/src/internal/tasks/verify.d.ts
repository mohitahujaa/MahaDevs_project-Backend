import type { NewTaskActionFunction } from "hardhat/types/tasks";
interface TaskVerifyArguments {
    deploymentId: string;
    force: boolean;
}
declare const verifyTask: NewTaskActionFunction<TaskVerifyArguments>;
export default verifyTask;
//# sourceMappingURL=verify.d.ts.map