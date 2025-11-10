import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { SellersService } from './sellers.service';
import { CreateSellerDto } from './dto/create-seller.dto';
import { UpdateSellerDto } from './dto/update-seller.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, LegalType } from '@prisma/client';

@ApiTags('sellers')
@Controller('sellers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Create a new seller (Admin, Manager & Operator only)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'stamp', maxCount: 1 },
    ]),
  )
  create(
    @Body() createSellerDto: CreateSellerDto,
    @UploadedFiles() files: { logo?: Express.Multer.File[]; stamp?: Express.Multer.File[] },
    @CurrentUser() user: any,
  ) {
    return this.sellersService.create(createSellerDto, files, user.id);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.ACCOUNTANT, Role.VIEWER)
  @ApiOperation({ summary: 'Get all sellers' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'legalType', required: false, enum: LegalType })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('legalType') legalType?: string,
  ) {
    return this.sellersService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
      search,
      legalType,
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.ACCOUNTANT, Role.VIEWER)
  @ApiOperation({ summary: 'Get seller by ID' })
  findOne(@Param('id') id: string) {
    return this.sellersService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Update seller (Admin, Manager & Operator only)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'stamp', maxCount: 1 },
    ]),
  )
  update(
    @Param('id') id: string,
    @Body() updateSellerDto: UpdateSellerDto,
    @UploadedFiles() files: { logo?: Express.Multer.File[]; stamp?: Express.Multer.File[] },
    @CurrentUser() user: any,
  ) {
    return this.sellersService.update(id, updateSellerDto, files, user.id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Delete seller (Admin, Manager & Operator only)' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.sellersService.remove(id, user.id);
  }
}
