import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BanksService } from './banks.service';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('banks')
@Controller('banks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BanksController {
  constructor(private readonly banksService: BanksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new bank account' })
  create(@Body() createBankDto: CreateBankDto, @CurrentUser() user: any) {
    return this.banksService.create(createBankDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all banks' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.banksService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get('seller/:sellerId')
  @ApiOperation({ summary: 'Get banks by seller ID' })
  findBySeller(@Param('sellerId') sellerId: string) {
    return this.banksService.findBySeller(sellerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bank by ID' })
  findOne(@Param('id') id: string) {
    return this.banksService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update bank' })
  update(
    @Param('id') id: string,
    @Body() updateBankDto: UpdateBankDto,
    @CurrentUser() user: any,
  ) {
    return this.banksService.update(id, updateBankDto, user.id);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Set bank as default' })
  setDefault(@Param('id') id: string, @CurrentUser() user: any) {
    return this.banksService.setDefault(id, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete bank (soft delete)' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.banksService.remove(id, user.id);
  }
}
