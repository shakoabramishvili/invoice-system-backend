import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BuyersService } from './buyers.service';
import { CreateBuyerDto } from './dto/create-buyer.dto';
import { UpdateBuyerDto } from './dto/update-buyer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('buyers')
@Controller('buyers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BuyersController {
  constructor(private readonly buyersService: BuyersService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Create a new buyer (Admin, Manager & Operator only)' })
  create(@Body() createBuyerDto: CreateBuyerDto, @CurrentUser() user: any) {
    return this.buyersService.create(createBuyerDto, user.id);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.ACCOUNTANT, Role.VIEWER)
  @ApiOperation({ summary: 'Get all buyers' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'legalType', required: false, type: String })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('legalType') legalType?: string,
  ) {
    return this.buyersService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
      search,
      legalType,
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.ACCOUNTANT, Role.VIEWER)
  @ApiOperation({ summary: 'Get buyer by ID' })
  findOne(@Param('id') id: string) {
    return this.buyersService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Update buyer (Admin, Manager & Operator only)' })
  update(
    @Param('id') id: string,
    @Body() updateBuyerDto: UpdateBuyerDto,
    @CurrentUser() user: any,
  ) {
    return this.buyersService.update(id, updateBuyerDto, user.id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Delete buyer (Admin, Manager & Operator only)' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.buyersService.remove(id, user.id);
  }
}
