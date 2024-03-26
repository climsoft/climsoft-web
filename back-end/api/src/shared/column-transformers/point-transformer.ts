import { PointColumnModel } from "./point-column.model";

export class PointColumnTransformer {
    public from(dbValue: any): PointColumnModel | null {
        if (dbValue) {
            // console.log("point dbvalue", dbValue, " typeof: ", typeof dbValue)
            // postgresql dbValue comes in the format of a Postgres point e.g (x,y) which typeorm automatically converts to aplain object  {x, y}.
            // Extract x and y from the converted plain object 
            return { x: dbValue.x, y: dbValue.y };
        }
        return null;
    }

    public to(point: PointColumnModel | null): string | null {
        if (point) {
            return `(${point.x},${point.y})`;
        }
        return null;
    }
}