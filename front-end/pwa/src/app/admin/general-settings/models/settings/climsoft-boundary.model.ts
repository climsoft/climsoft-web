
export interface ClimsoftBoundaryModel  {
    longitude: number;
    latitude: number;
    zoomLevel: number;
    boundary: number[][][][] | undefined; // multipolygon 
}