
import { graduationService } from "./graduationService";
import { classService } from "./classService";
import { studentService } from "./studentService";
import { financeService } from "./financeService";

export * from "./types";

export const graduationModuleService = {
    ...graduationService,
    ...classService,
    ...studentService,
    ...financeService,
};
