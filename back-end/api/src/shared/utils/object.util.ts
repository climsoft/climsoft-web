export class ObjectUtils {

    static areObjectsEqual<T extends object>(oldChanges: T, newChanges: T, propertiesToExclude?: (keyof T)[]): boolean {
        const keysToCheck = Object.keys(oldChanges) as (keyof T)[];
    
        for (const key of keysToCheck) {
            if (propertiesToExclude?.includes(key)) {
                continue;
            }
    
            if (oldChanges[key] !== newChanges[key]) {
                return false;
            }
        }
    
        return true;
    }

}