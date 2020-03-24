export function Exists<T>(maybe: T | null | undefined): Promise<T> {
    if (maybe !== undefined && maybe !== null)
        return Promise.resolve(maybe);
    return Promise.reject('is null');
}