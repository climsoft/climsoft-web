export interface CreateUpdateNetworkAffiliationModel  {
    name: string;
    description: string | null;
    parentNetworkId: number | null;
    extraMetadata: string | null;
    comment: string | null;
}