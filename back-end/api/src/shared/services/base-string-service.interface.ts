

/**
 * C - create
 * U - update
 * V - View
 */
export interface IBaseStringService<C, U, V> {
    findOne(id: string): Promise<V>;
    findSome(ids: string[]): Promise<V[]>;
    find(): Promise<V[]>;   
    create(item: C, userId: number): Promise<V>;
    update(id: string, item: U, userId: number): Promise<V>;
    delete(id: string, userId: number): Promise<string>;
}
