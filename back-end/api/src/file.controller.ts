import { Controller, Get, Header, StreamableFile } from '@nestjs/common';
//import { createReadStream } from 'fs';
import * as fs from 'node:fs';
//import { join } from 'node:path';
import * as path from 'node:path';


// TODO. Delete this controller later.

@Controller('file')
export class FileController {

    @Get()
    @Header('Content-Type', 'application/json')
    @Header('Content-Disposition', 'attachment; filename="package.json"')
    getStaticFile(): StreamableFile {

        //todo. refactor this to come from database as id that points to file directory
        //note all files will be saved in a directory that has a corresponding id in the databaSE
        //see https://docs.nestjs.com/techniques/streaming-files
        const file = fs.createReadStream(path.join(process.cwd(), 'public', 'gadm41_KEN_0.json'));
        return new StreamableFile(file);
    }

}
