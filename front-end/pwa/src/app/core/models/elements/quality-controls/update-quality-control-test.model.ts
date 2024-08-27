import { CreateQualityControlTestModel } from "./quality-controls/create-quality-control-test.model";

export interface UpdateQualityControlTestDto extends CreateQualityControlTestModel {
    id: number;
}