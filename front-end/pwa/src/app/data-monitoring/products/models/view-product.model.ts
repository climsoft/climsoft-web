export interface ViewProductModel {
    id: number;
    systemKey: string | null;
    supersetUuid: string;
    name: string;
    description: string | null;
    category: string | null;
    disabled: boolean;
}

export interface ProductGuestTokenModel {
    token: string;
    supersetUuid: string;
}

export interface CreateUpdateProductModel {
    supersetUuid: string;
    name: string;
    description: string | null;
    category: string | null;
    disabled: boolean;
}
