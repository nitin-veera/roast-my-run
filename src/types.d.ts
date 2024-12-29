declare module '@turf/turf' {
    interface LineStringFeature {
        type: 'Feature';
        geometry: {
            type: 'LineString';
            coordinates: number[][];
        };
        properties: Record<string, unknown>;
    }

    interface LengthOptions {
        units?: 'kilometers' | 'miles' | 'degrees';
    }

    export function length(line: LineStringFeature, options?: LengthOptions): number;
    
    export function lineString(coordinates: number[][]): LineStringFeature;
} 