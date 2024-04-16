import { PointDTO } from "../dtos/point.dto"; 

export class PointColumnTransformer {
    public from(dbValue: any): PointDTO | null {
        if (dbValue) {
            // console.log("point dbvalue", dbValue, " typeof: ", typeof dbValue)
            // postgresql dbValue comes in the format of a Postgres point e.g (x,y) which typeorm automatically converts to aplain object  {x, y}.
            // Extract x and y from the converted plain object 
            return { x: dbValue.x, y: dbValue.y };
        }
        return null;
    }

    public to(point: PointDTO | null): string | null {
        if (point) {
            return `(${point.x},${point.y})`;
        }
        return null;
    }
} 