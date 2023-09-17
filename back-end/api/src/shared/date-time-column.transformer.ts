import { ValueTransformer } from "typeorm";

//TypeORM uses Date js constructor when getting dates from the database. These changes the actual date string values that are in the database
//Thisclass transforms the cahanged date string back to the original database string
//See typeorm github comments
//https://github.com/typeorm/typeorm/issues/2176
export class DateTimeColumn implements ValueTransformer {
	to(date: string) {
        console.log('saved date', date);
        return date;
        //return DateTime.fromISO(date, { zone: 'utc' });
	}

	from(date: string) {
        //return DateTime.fromJSDate(new Date(date)).toUTC();

        const jsDate = new Date(date);
        const appTimezoneOffset = jsDate.getTimezoneOffset() * 60000;
        const actualDate = new Date(jsDate.getTime() - appTimezoneOffset);

        console.log('typeOrm date', date, 'JS date', jsDate, 'actual db date', actualDate);
        return actualDate.toISOString().slice(0, 19).replace('T', ' ');
	}
}