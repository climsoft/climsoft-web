
/**
 * C - create
 * U - update
 * V - View
 */
export interface IBaseNumberService<C, U, V> {
    findOne(id: number): Promise<V>;
    findSome(ids: number[]): Promise<V[]>;
    findAll(): Promise<V[]>;  
    create(item: C, userId: number): Promise<V>;
    update(id: number, item: U, userId: number): Promise<V>;
    delete(id: number, userId: number): Promise<number>;
}
