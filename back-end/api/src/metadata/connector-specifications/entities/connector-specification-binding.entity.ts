import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ConnectorSpecificationEntity } from "./connector-specifications.entity";
import { StationEntity } from "src/metadata/stations/entities/station.entity";

/**
 * One binding of a specification to a station, for one connector — "read
 * `rwanda/KAZO/*.txt` with source specification 5 as station 13794568".
 *
 * These used to live inside `connector_specifications.parameters` as a JSONB
 * array. They were moved out for one reason above all others: **a binding needs
 * an identity of its own**.
 *
 * Nothing in the array was a stable name for a binding. The run tiers therefore
 * had to identify one by its content — first by `specification_id` alone, then
 * by `(specification_id, station_id)` once it turned out that reusing a source
 * specification across stations with identical loggers is the normal case, not
 * an edge case. Both are the same mistake at different depths, because content
 * is not identity: a station can legitimately be bound to the same
 * specification twice over two directories (a live folder and an archive
 * folder, which the pattern grammar cannot express in one pattern — directory
 * segments are literal and there is no brace expansion). Under a content key
 * those two bindings collapse into one row and discovery dies on a duplicate
 * key.
 *
 * With an id, `connector_run_specs` and `connector_run_files` key on
 * `binding_id` and the question stops arising. Editing a binding's pattern,
 * station or specification keeps its id, so its run history and its
 * de-duplication ledger stay attached to it. Deleting a binding and adding an
 * equivalent one does NOT — the new row is a new binding, and its files are
 * re-imported once. That is the intended reading of "a new binding tallies
 * afresh".
 *
 * Two further things fall out of being a table rather than a blob: a station
 * can be joined to (which connector ingests station X is now a query, not a
 * JSONB scan), and a bound station cannot be deleted out from under a running
 * connector.
 *
 * What did NOT move is the rest of `parameters` — protocol, port, credentials,
 * remote path, the export observation window. Those are scalars describing one
 * server connection and are perfectly well served by JSONB.
 */
@Entity("connector_specification_bindings")
export class ConnectorSpecificationBindingEntity {
    @PrimaryGeneratedColumn({ name: "id" })
    id!: number;

    // Every read of a connector's bindings filters on this. Named, not left to
    // TypeORM's generated hash, so that a `synchronize`-built install and a
    // migration-built one end up with the SAME index rather than one of each on
    // the same column.
    @Index("idx_connector_specification_bindings_connector")
    @Column({ name: "connector_specification_id", type: "int" })
    connectorSpecificationId!: number;

    // Deleting a connector discards its bindings. Their run history survives:
    // the run tiers hold `binding_id` as a plain integer with no foreign key, so
    // that a finished run keeps showing what it did even after the
    // configuration behind it is gone.
    @ManyToOne(() => ConnectorSpecificationEntity, { onDelete: "CASCADE" })
    @JoinColumn({ name: "connector_specification_id" })
    connectorSpecification!: ConnectorSpecificationEntity;

    /**
     * Import: `source_templates` id. Export: `export_specifications` id.
     *
     * No foreign key, because the column targets a different table depending on
     * the owning connector's `connector_type`, and a column can only reference
     * one. The connector type is immutable after creation, so a row is never
     * ambiguous about which table it means — but the database cannot be told
     * that. Referential integrity for this column is enforced by the import
     * processor, which throws `NotFoundException` when a specification has gone.
     */
    @Column({ name: "specification_id", type: "int" })
    specificationId!: number;

    /**
     * Station the files are read as, or null when the specification carries the
     * station itself.
     *
     * Null rather than the empty string here, unlike the run tiers: this is an
     * ordinary nullable column, not part of a key, so there is no reason to
     * borrow their sentinel. `ON DELETE NO ACTION` (the default) is deliberate —
     * deleting a station that a connector is actively ingesting should fail
     * loudly rather than silently unbind it or cascade the binding away.
     */
    @Column({ name: "station_id", type: "varchar", nullable: true })
    @Index("idx_connector_specification_bindings_station")
    stationId!: string | null;

    @ManyToOne(() => StationEntity, { nullable: true })
    @JoinColumn({ name: "station_id" })
    station!: StationEntity | null;

    /**
     * Import: the glob this binding reads, in the grammar of
     * connector-file-pattern.util.ts. Export: null — an export generates its
     * files rather than matching them.
     */
    @Column({ name: "file_pattern", type: "varchar", nullable: true })
    filePattern!: string | null;

    /**
     * Import: file-name globs that are never data, dropped from what
     * `file_pattern` matches — e.g. `*_info.csv` for a logger's description
     * file sitting beside its data files under the same extension. Grammar in
     * `parseExcludePatterns` (connector-file-pattern.util.ts). Export: empty.
     *
     * Usually empty. It exists because the include glob has no way to say
     * "not": without it, such a file matches, fails the transform, and is
     * retried and reported as a failure on every run. An excluded file costs
     * neither a transfer nor a failure — it gets a run-file row recording it as
     * `excluded` and nothing else, and the run-specs tier counts it in
     * `excluded_count`, so the exclusion is inspectable rather than silent.
     *
     * Removing an entry needs no special handling: `excluded` is not a status
     * `markDiscovered` carries forward, so the next run queues the file as
     * pending again.
     *
     * Stored normalised — `syncBindings` runs `normaliseExcludePatterns` on the
     * way in, so entries are trimmed and blanks (what a stray comma in the
     * authoring form leaves) never reach a row. Readers can take the array as
     * it comes; only `parseExcludePatterns` re-normalises, because it has to
     * walk the entries to compile them anyway.
     */
    @Column({ name: "exclude_patterns", type: "varchar", array: true, default: () => "'{}'" })
    excludePatterns!: string[];

    /**
     * Take this binding out of the connector's runs, leaving the rest working.
     *
     * The operational case it exists for: one binding starts erroring — a
     * directory renamed on the file server, a source specification that no
     * longer matches the files — and a sysadmin needs it to stop NOW, without
     * losing its configuration and without stopping the connector's other
     * bindings. Deleting it was previously the only option, and deleting is not
     * reversible: a re-added binding is a new binding with a new id, so its
     * whole de-duplication ledger is gone and every file it ever read is
     * imported again.
     *
     * Disabling is reversible precisely because the id survives it. A disabled
     * binding is skipped before its directory is even listed, so it costs
     * nothing at all while off, and on re-enable change detection resolves its
     * baseline to the last run that actually covered it — see
     * `ConnectorRunSpecService.findBaselineRunIds`. Only genuinely new or
     * changed files are then imported.
     */
    @Column({ name: "disabled", type: "bool", default: false })
    disabled!: boolean;

    /**
     * The order the sysadmin arranged the bindings in, by dragging them in the
     * authoring dialog.
     *
     * It carries execution meaning, deliberately: discovery walks
     * `parameters.specifications` in the order it receives them, so this is the
     * order a connector lists and ingests its patterns in. A sysadmin who needs
     * one directory read before another expresses it here.
     *
     * Written by `syncBindings` as each binding's index in the submitted array —
     * the API has no `sortOrder` field, the array's own order IS the input — and
     * every read orders by it: `loadBindings` for the cache the processors work
     * from, and `findBindings` for the authoring round trip. Removing either
     * ORDER BY would leave the order down to whatever the heap returns.
     */
    @Column({ name: "sort_order", type: "int", default: 0 })
    sortOrder!: number;
}
