import { ObservationEntity } from "src/observation/entities/observation.entity";
import { Repository } from "typeorm";

export class ClimsoftDBUtils {

       public static async insertOrUpdateObsValues(observationRepo: Repository<ObservationEntity>,  observationsData: ObservationEntity[]) {
           return  observationRepo
               .createQueryBuilder()
               .insert()
               .into(ObservationEntity)
               .values(observationsData)
               .orUpdate(
                   [
                       "value",
                       "flag",
                       "qc_status",
                       "final",
                       "comment",
                       "deleted",
                       "saved_to_v4",
                       "entry_user_id",
                   ],
                   [
                       "station_id",
                       "element_id",
                       "source_id",
                       "elevation",
                       "date_time",
                       "period",
                   ],
                   {
                       skipUpdateIfNoValuesChanged: true,
                   }
               )
               .execute();
       }

}