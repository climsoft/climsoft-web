import { AppBaseEntity } from "src/shared/entity/app-base-entity";
import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { StationEntity } from "./station.entity";
import { NetworkAffiliationEntity } from "./network-affiliation.entity";

@Entity("station_network_affiliations")
export class StationNetworkAffiliationEntity extends AppBaseEntity {

    @PrimaryColumn({ type: "varchar", name: "station_id" })
    stationId: string;

    @PrimaryColumn({ type: "int", name: "network_affiliation_id" })
    networkAffiliationId: number;

    // ManyToOne relationship with StationEntity
    @ManyToOne(() => StationEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "station_id" })
    station: StationEntity;

    // ManyToOne relationship with NetworkAffiliationEntity
    @ManyToOne(() => NetworkAffiliationEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "network_affiliation_id" })
    source: NetworkAffiliationEntity;

}
