import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrencyService } from './currency.service';

@ApiTags('currency')
@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get('test')
  @ApiOperation({ summary: 'Test endpoint to parse exchange rates from all sources' })
  async test() {
    return this.currencyService.parseAllSources();
  }
}
