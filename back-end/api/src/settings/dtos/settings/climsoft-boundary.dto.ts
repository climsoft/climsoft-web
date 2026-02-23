import { IsInt, IsNumber, Min, Validate, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from "class-validator";

@ValidatorConstraint({ name: 'isMultiPolygon', async: false })
class IsMultiPolygonConstraint implements ValidatorConstraintInterface {
    validate(value: any, _args?: ValidationArguments) {
        if (value === null || value === undefined) return true; // optional
        if (!Array.isArray(value)) return false;

        // multipolygon => array of polygons => array of linear rings => array of points => [lon, lat,...]
        return value.every((polygon: any) =>
            Array.isArray(polygon) && polygon.every((ring: any) =>
                Array.isArray(ring) && ring.every((point: any) =>
                    Array.isArray(point) && point.length >= 2 && point.every((coord: any) => typeof coord === 'number')
                )
            )
        );
    }

    defaultMessage(_args?: ValidationArguments) {
        return 'boundary must be a multipolygon array of numbers (number[][][][])';
    }
}

export class ClimsoftBoundaryDto {
    @IsNumber()
    longitude: number;

    @IsNumber()
    latitude: number;

    @IsInt()
    @Min(0)
    zoomLevel: number;

    @Validate(IsMultiPolygonConstraint)
    boundary: number[][][][]; // multipolygon
}