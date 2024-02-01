import { SetMetadata } from '@nestjs/common';

export const IS_DATA_EDITOR_KEY = 'isAdmin';

export const DatEditor = () => SetMetadata(IS_DATA_EDITOR_KEY, true);