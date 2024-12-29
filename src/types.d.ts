declare module '@turf/turf' {
    export function length(line: any, options?: {
        units?: string;
    }): number;
    
    export function lineString(coordinates: number[][]): {
        type: 'Feature';
        geometry: {
            type: 'LineString';
            coordinates: number[][];
        };
        properties: {};
    };
} 