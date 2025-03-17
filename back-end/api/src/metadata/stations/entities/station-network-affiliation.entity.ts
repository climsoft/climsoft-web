import { AppBaseEntity } from "src/shared/entity/app-base-entity";
import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { StationEntity } from "./station.entity";
import { NetworkAffiliationEntity } from "../../network-affiliations/entities/network-affiliation.entity";

@Entity("station_network_affiliations")
export class StationNetworkAffiliationEntity extends AppBaseEntity {

    @PrimaryColumn({ type: "varchar", name: "station_id" })
    @Index()
    stationId: string;

    // ManyToOne relationship with StationEntity
    @ManyToOne(() => StationEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "station_id" })
    station: StationEntity;

    @PrimaryColumn({ type: "int", name: "network_affiliation_id" })
    @Index()
    networkAffiliationId: number;

    // ManyToOne relationship with NetworkAffiliationEntity
    @ManyToOne(() => NetworkAffiliationEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "network_affiliation_id" })
    networkAffiliation: NetworkAffiliationEntity;

}
