import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BanksService } from './banks.service';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('banks')
@Controller('banks')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BanksController {
  constructor(private readonly banksService: BanksService) {}

  @Post()
  @Roles(Role.ADMIN, Role.OPERATOR)
  @ApiOperation({ summary: 'Create a new bank account (Admin & Operator only)' })
  create(@Body() createBankDto: CreateBankDto, @CurrentUser() user: any) {
    return this.banksService.create(createBankDto, user.id);
  }

  @Get()
  @Roles(Role.ADMIN, Role.OPERATOR, Role.VIEWER)
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
  @Roles(Role.ADMIN, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Get banks by seller ID' })
  findBySeller(@Param('sellerId') sellerId: string) {
    return this.banksService.findBySeller(sellerId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Get bank by ID' })
  findOne(@Param('id') id: string) {
    return this.banksService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.OPERATOR)
  @ApiOperation({ summary: 'Update bank (Admin & Operator only)' })
  update(
    @Param('id') id: string,
    @Body() updateBankDto: UpdateBankDto,
    @CurrentUser() user: any,
  ) {
    return this.banksService.update(id, updateBankDto, user.id);
  }

  @Patch(':id/default')
  @Roles(Role.ADMIN, Role.OPERATOR)
  @ApiOperation({ summary: 'Set bank as default (Admin & Operator only)' })
  setDefault(@Param('id') id: string, @CurrentUser() user: any) {
    return this.banksService.setDefault(id, user.id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.OPERATOR)
  @ApiOperation({ summary: 'Delete bank (Admin & Operator only)' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.banksService.remove(id, user.id);
  }
}
